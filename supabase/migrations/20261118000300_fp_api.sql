-- FingerPay 3/3: the API surface. fp_app may EXECUTE only functions named fp.api_* (granted at
-- the bottom). Every function re-derives scope from the authenticated actor or terminal and
-- never accepts a merchant_id from the caller, so a buggy or compromised route handler cannot
-- read or move another store's money.
--
-- Error codes (SQLSTATE): FP400 bad input · FP401 unauthenticated · FP402 insufficient funds ·
-- FP403 forbidden · FP404 not found · FP409 conflict/replay · FP423 inactive/locked.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ── Internal guards & helpers (not granted) ────────────────────────────────────────────────
CREATE FUNCTION fp.require_staff(p_actor uuid, p_roles text[]) RETURNS fp.staff
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE v_staff fp.staff; v_merchant_status text;
BEGIN
  SELECT * INTO v_staff FROM fp.staff WHERE auth_user_id = p_actor;
  IF NOT FOUND OR v_staff.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'unknown or disabled staff account' USING ERRCODE = 'FP401';
  END IF;
  IF NOT (v_staff.role = ANY (p_roles)) THEN
    RAISE EXCEPTION 'role % may not perform this action', v_staff.role USING ERRCODE = 'FP403';
  END IF;
  IF v_staff.merchant_id IS NOT NULL THEN
    SELECT status INTO v_merchant_status FROM fp.merchants WHERE merchant_id = v_staff.merchant_id;
    IF v_merchant_status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'store is %', v_merchant_status USING ERRCODE = 'FP423';
    END IF;
  END IF;
  RETURN v_staff;
END $$;

-- Every terminal call: terminal active, store active, signed timestamp fresh, nonce unused.
-- The server has already verified the ECDSA signature over (method, path, terminal, timestamp,
-- nonce, body hash) before calling; this is the database half of replay protection.
CREATE FUNCTION fp.terminal_guard(p_terminal_id uuid, p_nonce bytea, p_signed_at timestamptz) RETURNS uuid
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_term record;
BEGIN
  SELECT t.status, t.merchant_id, m.status AS merchant_status INTO v_term
    FROM fp.terminals t JOIN fp.merchants m ON m.merchant_id = t.merchant_id
   WHERE t.terminal_id = p_terminal_id FOR UPDATE OF t;
  IF NOT FOUND OR v_term.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'terminal is not active' USING ERRCODE = 'FP401';
  END IF;
  IF v_term.merchant_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'store is %', v_term.merchant_status USING ERRCODE = 'FP423';
  END IF;
  IF p_signed_at IS NULL OR abs(extract(epoch FROM clock_timestamp() - p_signed_at)) > 60 THEN
    RAISE EXCEPTION 'request timestamp is outside the 60 second window' USING ERRCODE = 'FP401';
  END IF;
  IF p_nonce IS NULL OR octet_length(p_nonce) NOT BETWEEN 16 AND 32 THEN
    RAISE EXCEPTION 'nonce must be 16 to 32 bytes' USING ERRCODE = 'FP400';
  END IF;
  -- Nonces older than the 60 s window can never be replayed, so 5 minutes of history is enough.
  DELETE FROM fp.request_nonces WHERE terminal_id = p_terminal_id AND seen_at < now() - interval '5 minutes';
  INSERT INTO fp.request_nonces(terminal_id, nonce) VALUES (p_terminal_id, p_nonce) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'replayed request' USING ERRCODE = 'FP409';
  END IF;
  UPDATE fp.terminals SET last_seen_at = now() WHERE terminal_id = p_terminal_id;
  RETURN v_term.merchant_id;
END $$;

CREATE FUNCTION fp.check_amount(p_amount numeric) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'amount must be PKR 0.01 to PKR 100,000 with at most 2 decimals' USING ERRCODE = 'FP400';
  END IF;
END $$;

CREATE FUNCTION fp.sms(p_customer uuid, p_attempt uuid, p_kind text, p_body text) RETURNS uuid
LANGUAGE sql SET search_path = '' AS $$
  INSERT INTO fp.sms_outbox(customer_id, attempt_id, kind, body)
  VALUES (p_customer, p_attempt, p_kind, p_body) RETURNING sms_id
$$;

-- The shopper's name is shown to the merchant only for a settled sale, never on a decline
-- (a decline would leak "this person has no money" to the shopkeeper).
CREATE FUNCTION fp.attempt_result(p_attempt_id uuid, p_replayed boolean) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'attempt_id', a.attempt_id, 'charge_id', a.charge_id, 'outcome', a.outcome, 'amount', a.amount,
    'mdr_fee', a.mdr_fee, 'net_to_merchant', a.net_to_merchant, 'cashback', a.cashback,
    'raast_ref', a.raast_ref, 'processing_ms', a.processing_ms, 'occurred_at', a.occurred_at,
    'customer_display_name', CASE WHEN a.outcome = 'SUCCESS' THEN c.display_name END,
    'replayed', p_replayed)
  FROM fp.payment_attempts a LEFT JOIN fp.customers c ON c.customer_id = a.customer_id
  WHERE a.attempt_id = p_attempt_id
$$;

-- Reverse a settled payment exactly: merchant, fee income and cashback all flow back, and a
-- referral bonus the payment triggered is clawed back if the referrer still holds it.
CREATE FUNCTION fp.reverse_payment(p_attempt fp.payment_attempts, p_kind text, p_idempotency_key text,
  p_actor text, p_memo text) RETURNS uuid
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_cust_acct uuid; v_merch_acct uuid; v_entries jsonb; v_referral record;
  v_pool uuid := fp.system_account('MARKETING_POOL');
  v_month date := date_trunc('month', p_attempt.created_at AT TIME ZONE 'Asia/Karachi')::date;
BEGIN
  SELECT account_id INTO v_cust_acct FROM fp.accounts WHERE customer_id = p_attempt.customer_id;
  SELECT account_id INTO v_merch_acct FROM fp.accounts WHERE merchant_id = p_attempt.merchant_id;
  v_entries := jsonb_build_array(jsonb_build_object('account_id', v_merch_acct, 'amount', -p_attempt.net_to_merchant));
  IF p_attempt.fp_revenue > 0 THEN
    v_entries := v_entries || jsonb_build_array(jsonb_build_object('account_id', fp.system_account('FP_FEE_INCOME'), 'amount', -p_attempt.fp_revenue));
  END IF;
  IF p_attempt.bank_revenue > 0 THEN
    v_entries := v_entries || jsonb_build_array(jsonb_build_object('account_id', fp.system_account('BANK_FEE_INCOME'), 'amount', -p_attempt.bank_revenue));
  END IF;
  v_entries := v_entries || jsonb_build_array(jsonb_build_object('account_id', v_cust_acct, 'amount', p_attempt.amount));
  IF p_attempt.cashback > 0 THEN
    v_entries := v_entries || jsonb_build_array(
      jsonb_build_object('account_id', v_cust_acct, 'amount', -p_attempt.cashback),
      jsonb_build_object('account_id', v_pool, 'amount', p_attempt.cashback));
  END IF;
  IF p_attempt.referral_journal_id IS NOT NULL THEN
    SELECT e.account_id, e.amount, a.balance INTO v_referral
      FROM fp.journal_entries e JOIN fp.accounts a ON a.account_id = e.account_id
     WHERE e.journal_id = p_attempt.referral_journal_id AND e.amount > 0
       FOR UPDATE OF a;
    IF v_referral.balance >= v_referral.amount THEN
      v_entries := v_entries || jsonb_build_array(
        jsonb_build_object('account_id', v_referral.account_id, 'amount', -v_referral.amount),
        jsonb_build_object('account_id', v_pool, 'amount', v_referral.amount));
    ELSE
      PERFORM fp.audit('SYSTEM', p_actor, 'referral.clawback_skipped', 'payment_attempt',
                       p_attempt.attempt_id::text, jsonb_build_object('reason', 'referrer balance too low'));
    END IF;
  END IF;
  UPDATE fp.merchant_monthly_stats SET tx_count = greatest(tx_count - 1, 0), gross = greatest(gross - p_attempt.amount, 0)
   WHERE merchant_id = p_attempt.merchant_id AND month = v_month;
  RETURN fp.post_journal(p_kind, p_idempotency_key, p_actor, p_memo, v_entries);
END $$;

-- ── Identity & health ──────────────────────────────────────────────────────────────────────
-- Called by the server right after it verifies the Supabase Auth JWT (and AAL2 where needed).
CREATE FUNCTION fp.api_staff_context(p_auth_user_id uuid)
RETURNS TABLE (role text, merchant_id uuid, display_name text, status text, store_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.role, s.merchant_id, s.display_name, s.status, m.store_name
  FROM fp.staff s LEFT JOIN fp.merchants m ON m.merchant_id = s.merchant_id
  WHERE s.auth_user_id = p_auth_user_id
$$;

CREATE FUNCTION fp.api_health() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('db', 'ok',
    'merchants', (SELECT count(*) FROM fp.merchants),
    'customers', (SELECT count(*) FROM fp.customers),
    'terminals', (SELECT count(*) FROM fp.terminals WHERE status = 'ACTIVE'))
$$;

CREATE FUNCTION fp.api_rate_limit(p_bucket text, p_window_seconds integer, p_max integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_window timestamptz; v_hits integer;
BEGIN
  IF p_bucket IS NULL OR length(p_bucket) NOT BETWEEN 1 AND 200 OR p_window_seconds NOT BETWEEN 1 AND 86400
     OR p_max NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION 'invalid rate limit arguments' USING ERRCODE = 'FP400';
  END IF;
  v_window := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  DELETE FROM fp.rate_limits WHERE bucket = p_bucket AND window_start < v_window;
  INSERT INTO fp.rate_limits AS r (bucket, window_start, hits) VALUES (p_bucket, v_window, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO v_hits;
  RETURN v_hits <= p_max;
END $$;

-- ── Terminals ──────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION fp.api_pair_terminal(p_actor uuid, p_label text, p_public_key_spki bytea) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_staff fp.staff; v_terminal uuid;
BEGIN
  v_staff := fp.require_staff(p_actor, ARRAY['MERCHANT_OWNER']);
  -- Uncompressed ECDSA P-256 SubjectPublicKeyInfo: fixed 27-byte prefix + 64-byte point.
  IF p_public_key_spki IS NULL OR octet_length(p_public_key_spki) <> 91
     OR substring(p_public_key_spki FROM 1 FOR 27) <> '\x3059301306072a8648ce3d020106082a8648ce3d03010703420004'::bytea THEN
    RAISE EXCEPTION 'public key must be an uncompressed ECDSA P-256 SPKI' USING ERRCODE = 'FP400';
  END IF;
  INSERT INTO fp.terminals(merchant_id, label, public_key_spki, paired_by)
  VALUES (v_staff.merchant_id, btrim(p_label), p_public_key_spki, p_actor) RETURNING terminal_id INTO v_terminal;
  PERFORM fp.audit('STAFF', p_actor::text, 'terminal.paired', 'terminal', v_terminal::text,
                   jsonb_build_object('label', btrim(p_label), 'key_sha256', encode(sha256(p_public_key_spki), 'hex')));
  RETURN v_terminal;
END $$;

CREATE FUNCTION fp.api_revoke_terminal(p_actor uuid, p_terminal_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_staff fp.staff;
BEGIN
  v_staff := fp.require_staff(p_actor, ARRAY['MERCHANT_OWNER','BANK_ADMIN']);
  UPDATE fp.terminals SET status = 'REVOKED', revoked_at = now()
   WHERE terminal_id = p_terminal_id AND status = 'ACTIVE'
     AND (v_staff.role = 'BANK_ADMIN' OR merchant_id = v_staff.merchant_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'terminal not found' USING ERRCODE = 'FP404'; END IF;
  UPDATE fp.charge_sessions SET status = 'CANCELLED', closed_at = now()
   WHERE terminal_id = p_terminal_id AND status = 'AWAITING_THUMB';
  PERFORM fp.audit('STAFF', p_actor::text, 'terminal.revoked', 'terminal', p_terminal_id::text);
END $$;

-- Public key lookup so the server can verify a terminal's request signature.
CREATE FUNCTION fp.api_terminal_auth(p_terminal_id uuid)
RETURNS TABLE (public_key_spki bytea, merchant_id uuid, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT t.public_key_spki, t.merchant_id, t.status FROM fp.terminals t WHERE t.terminal_id = p_terminal_id
$$;

-- ── Checkout ───────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION fp.api_open_charge(p_terminal_id uuid, p_nonce bytea, p_signed_at timestamptz,
  p_actor uuid, p_amount numeric)
RETURNS TABLE (charge_id uuid, amount numeric, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_merchant uuid; v_staff fp.staff; v_charge fp.charge_sessions;
BEGIN
  v_merchant := fp.terminal_guard(p_terminal_id, p_nonce, p_signed_at);
  v_staff := fp.require_staff(p_actor, ARRAY['MERCHANT_OWNER','MERCHANT_CASHIER']);
  IF v_staff.merchant_id <> v_merchant THEN
    RAISE EXCEPTION 'this staff member does not work at the terminal''s store' USING ERRCODE = 'FP403';
  END IF;
  PERFORM fp.check_amount(p_amount);
  -- "New sale" replaces whatever the terminal was waiting on.
  UPDATE fp.charge_sessions cs
     SET status = CASE WHEN cs.expires_at <= now() THEN 'EXPIRED' ELSE 'CANCELLED' END, closed_at = now()
   WHERE cs.terminal_id = p_terminal_id AND cs.status = 'AWAITING_THUMB';
  INSERT INTO fp.charge_sessions(terminal_id, merchant_id, amount, opened_by)
  VALUES (p_terminal_id, v_merchant, p_amount, p_actor) RETURNING * INTO v_charge;
  PERFORM fp.audit('STAFF', p_actor::text, 'charge.opened', 'charge', v_charge.charge_id::text,
                   jsonb_build_object('terminal_id', p_terminal_id, 'amount', p_amount));
  RETURN QUERY SELECT v_charge.charge_id, v_charge.amount, v_charge.expires_at;
END $$;

CREATE FUNCTION fp.api_cancel_charge(p_terminal_id uuid, p_nonce bytea, p_signed_at timestamptz, p_charge_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM fp.terminal_guard(p_terminal_id, p_nonce, p_signed_at);
  UPDATE fp.charge_sessions SET status = 'CANCELLED', closed_at = now()
   WHERE charge_id = p_charge_id AND terminal_id = p_terminal_id AND status = 'AWAITING_THUMB';
  RETURN FOUND;
END $$;

-- The whole payment pipeline in one transaction (SPEC §6.2): one database round trip from the
-- server, so the < 3 s target holds even across regions.
CREATE FUNCTION fp.api_thumb_pay(p_terminal_id uuid, p_nonce bytea, p_signed_at timestamptz,
  p_received_at timestamptz, p_charge_id uuid, p_thumb_lookup bytea) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_merchant  uuid;
  v_store     text;
  v_charge    fp.charge_sessions;
  v_cust      fp.customers;
  v_cust_acct record;
  v_limits    fp.account_limits;
  v_outcome   text;
  v_attempt   uuid := gen_random_uuid();
  v_fee       record;
  v_cashback  numeric := 0;
  v_is_first  boolean := false;
  v_pool      uuid := fp.system_account('MARKETING_POOL');
  v_pool_bal  numeric;
  v_merch_acct uuid;
  v_journal   uuid;
  v_referral_journal uuid;
  v_referrer  record;
  v_ref       text;
  v_entries   jsonb;
  v_day_total numeric;
  v_day_count integer;
  v_month     date := date_trunc('month', now() AT TIME ZONE 'Asia/Karachi')::date;
  v_stats     record;
  v_balance   numeric;
  v_ms        integer;
BEGIN
  v_merchant := fp.terminal_guard(p_terminal_id, p_nonce, p_signed_at);
  IF p_thumb_lookup IS NULL OR octet_length(p_thumb_lookup) <> 32 THEN
    RAISE EXCEPTION 'thumb lookup must be 32 bytes' USING ERRCODE = 'FP400';
  END IF;

  SELECT * INTO v_charge FROM fp.charge_sessions
   WHERE charge_id = p_charge_id AND terminal_id = p_terminal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown charge' USING ERRCODE = 'FP404'; END IF;
  -- Idempotent: a retried request for a paid charge returns the original receipt, never a 2nd debit.
  IF v_charge.status = 'COMPLETED' THEN RETURN fp.attempt_result(v_charge.result_attempt_id, true); END IF;
  IF v_charge.status = 'AWAITING_THUMB' AND v_charge.expires_at <= now() THEN
    UPDATE fp.charge_sessions SET status = 'EXPIRED', closed_at = now() WHERE charge_id = v_charge.charge_id;
    v_charge.status := 'EXPIRED';
  END IF;
  IF v_charge.status <> 'AWAITING_THUMB' THEN
    RETURN jsonb_build_object('outcome', 'CHARGE_' || v_charge.status, 'charge_id', v_charge.charge_id);
  END IF;
  SELECT store_name INTO v_store FROM fp.merchants WHERE merchant_id = v_merchant;

  -- Decide the outcome.
  IF (SELECT count(*) FROM fp.payment_attempts WHERE terminal_id = p_terminal_id
        AND outcome = 'DECLINED_UNREGISTERED_THUMB' AND created_at > now() - interval '10 minutes') >= 10 THEN
    v_outcome := 'DECLINED_TERMINAL_THROTTLED';  -- brute-force guard against thumb guessing
  ELSE
    -- Locking the shopper serializes their concurrent payments, so limits and the duplicate
    -- check below cannot be raced.
    SELECT * INTO v_cust FROM fp.customers WHERE thumb_lookup = p_thumb_lookup FOR UPDATE;
    IF NOT FOUND THEN
      v_outcome := 'DECLINED_UNREGISTERED_THUMB';
    ELSE
      SELECT account_id, balance, status INTO v_cust_acct FROM fp.accounts
       WHERE customer_id = v_cust.customer_id FOR UPDATE;
      SELECT * INTO v_limits FROM fp.account_limits WHERE account_type = v_cust.account_type;
      SELECT coalesce(sum(amount), 0), count(*) INTO v_day_total, v_day_count FROM fp.payment_attempts
       WHERE customer_id = v_cust.customer_id AND outcome = 'SUCCESS'
         AND created_at >= fp.karachi_day_start(fp.karachi_today());
      v_outcome := CASE
        WHEN v_cust.status <> 'ACTIVE' OR v_cust_acct.status <> 'ACTIVE' THEN 'DECLINED_ACCOUNT_INACTIVE'
        WHEN v_cust.thumb_locked THEN 'DECLINED_THUMB_LOCKED'
        WHEN EXISTS (SELECT 1 FROM fp.payment_attempts
                      WHERE customer_id = v_cust.customer_id AND merchant_id = v_merchant
                        AND amount = v_charge.amount AND outcome = 'SUCCESS'
                        AND created_at > now() - interval '15 seconds') THEN 'DECLINED_DUPLICATE_TAP'
        WHEN v_charge.amount > v_limits.per_tap_max
          OR v_day_count + 1 > v_limits.daily_count_max
          OR v_day_total + v_charge.amount > v_limits.daily_amount_max THEN 'DECLINED_LIMIT'
        WHEN v_cust_acct.balance < v_charge.amount THEN 'DECLINED_LOW_BALANCE'
        ELSE 'SUCCESS' END;
    END IF;
  END IF;

  IF v_outcome = 'SUCCESS' THEN
    SELECT * INTO v_fee FROM fp.mdr_breakdown(v_charge.amount);
    v_is_first := v_cust.first_payment_at IS NULL;
    v_cashback := fp.cashback_for(v_charge.amount, v_cust.account_type, v_is_first);
    IF v_cashback > 0 THEN
      SELECT balance INTO v_pool_bal FROM fp.accounts WHERE account_id = v_pool FOR UPDATE;
      IF v_pool_bal < v_cashback THEN v_cashback := 0; END IF;  -- pool empty: pay, but no cashback
    END IF;
    SELECT account_id INTO v_merch_acct FROM fp.accounts WHERE merchant_id = v_merchant;
    v_ref := fp.new_ref('RAAST-PK');
    v_entries := jsonb_build_array(
      jsonb_build_object('account_id', v_cust_acct.account_id, 'amount', -v_charge.amount),
      jsonb_build_object('account_id', v_merch_acct, 'amount', v_fee.net_to_merchant));
    IF v_fee.fp_revenue > 0 THEN
      v_entries := v_entries || jsonb_build_array(jsonb_build_object('account_id', fp.system_account('FP_FEE_INCOME'), 'amount', v_fee.fp_revenue));
    END IF;
    IF v_fee.bank_revenue > 0 THEN
      v_entries := v_entries || jsonb_build_array(jsonb_build_object('account_id', fp.system_account('BANK_FEE_INCOME'), 'amount', v_fee.bank_revenue));
    END IF;
    IF v_cashback > 0 THEN
      v_entries := v_entries || jsonb_build_array(
        jsonb_build_object('account_id', v_pool, 'amount', -v_cashback),
        jsonb_build_object('account_id', v_cust_acct.account_id, 'amount', v_cashback));
    END IF;
    v_journal := fp.post_journal('PAYMENT', 'payment:' || v_charge.charge_id, 'terminal:' || p_terminal_id, v_ref, v_entries);

    -- Referral bonus: paid to the referring student on the referee's first payment.
    IF v_is_first AND v_cust.referred_by IS NOT NULL THEN
      SELECT c.customer_id, c.status, a.account_id, a.status AS account_status INTO v_referrer
        FROM fp.customers c JOIN fp.accounts a ON a.customer_id = c.customer_id
       WHERE c.customer_id = v_cust.referred_by;
      SELECT balance INTO v_pool_bal FROM fp.accounts WHERE account_id = v_pool FOR UPDATE;
      IF v_referrer.status = 'ACTIVE' AND v_referrer.account_status = 'ACTIVE' AND v_pool_bal >= 100 THEN
        v_referral_journal := fp.post_journal('REFERRAL_BONUS', 'referral:' || v_cust.customer_id, 'system',
          'Referral bonus', jsonb_build_array(
            jsonb_build_object('account_id', v_pool, 'amount', -100.00),
            jsonb_build_object('account_id', v_referrer.account_id, 'amount', 100.00)));
      END IF;
    END IF;

    v_ms := greatest(0, (extract(epoch FROM clock_timestamp() - coalesce(p_received_at, now())) * 1000)::integer);
    INSERT INTO fp.payment_attempts(attempt_id, charge_id, terminal_id, merchant_id, customer_id, amount, outcome,
      mdr_fee, fp_revenue, bank_revenue, net_to_merchant, cashback, raast_ref, journal_id, referral_journal_id, processing_ms)
    VALUES (v_attempt, v_charge.charge_id, p_terminal_id, v_merchant, v_cust.customer_id, v_charge.amount, 'SUCCESS',
      v_fee.mdr_fee, v_fee.fp_revenue, v_fee.bank_revenue, v_fee.net_to_merchant, v_cashback, v_ref, v_journal,
      v_referral_journal, v_ms);

    UPDATE fp.customers SET first_payment_at = now() WHERE customer_id = v_cust.customer_id AND first_payment_at IS NULL;
    UPDATE fp.charge_sessions SET status = 'COMPLETED', result_attempt_id = v_attempt, closed_at = now()
     WHERE charge_id = v_charge.charge_id;

    -- Monthly volume and the PKR 500 high-volume rebate (once per store per month).
    INSERT INTO fp.merchant_monthly_stats AS s (merchant_id, month, tx_count, gross)
    VALUES (v_merchant, v_month, 1, v_charge.amount)
    ON CONFLICT (merchant_id, month) DO UPDATE SET tx_count = s.tx_count + 1, gross = s.gross + EXCLUDED.gross
    RETURNING s.tx_count, s.rebate_journal_id INTO v_stats;
    IF v_stats.tx_count >= 500 AND v_stats.rebate_journal_id IS NULL THEN
      SELECT balance INTO v_pool_bal FROM fp.accounts WHERE account_id = v_pool FOR UPDATE;
      IF v_pool_bal >= 500 THEN
        UPDATE fp.merchant_monthly_stats SET rebate_journal_id = fp.post_journal('MERCHANT_REBATE',
            'rebate:' || v_merchant || ':' || v_month, 'system', 'High-volume rebate', jsonb_build_array(
              jsonb_build_object('account_id', v_pool, 'amount', -500.00),
              jsonb_build_object('account_id', v_merch_acct, 'amount', 500.00)))
         WHERE merchant_id = v_merchant AND month = v_month;
      END IF;
    END IF;

    SELECT balance INTO v_balance FROM fp.accounts WHERE account_id = v_cust_acct.account_id;
    PERFORM fp.sms(v_cust.customer_id, v_attempt, 'PAYMENT_RECEIPT',
      'Allied Bank FingerPay: ' || fp.fmt_pkr(v_charge.amount) || ' paid at ' || v_store || ' via Raast Ref #' || v_ref || '.'
      || CASE WHEN v_cashback > 0 THEN ' Cashback Earned: ' || fp.fmt_pkr(v_cashback) || '.' ELSE '' END
      || ' Available Balance: ' || fp.fmt_pkr(v_balance) || '. Not you? Reply DISPUTE. Reply LOCK to block thumb payments.');
    IF v_referral_journal IS NOT NULL THEN
      PERFORM fp.sms(v_referrer.customer_id, NULL, 'REFERRAL_BONUS',
        'Allied Bank FingerPay: A friend you referred made their first thumb payment. Referral Bonus: PKR 100.00 credited.');
    END IF;
    PERFORM fp.audit('TERMINAL', p_terminal_id::text, 'payment.settled', 'payment_attempt', v_attempt::text,
      jsonb_build_object('charge_id', v_charge.charge_id, 'amount', v_charge.amount, 'raast_ref', v_ref));
  ELSE
    v_ms := greatest(0, (extract(epoch FROM clock_timestamp() - coalesce(p_received_at, now())) * 1000)::integer);
    INSERT INTO fp.payment_attempts(attempt_id, charge_id, terminal_id, merchant_id, customer_id, amount, outcome, processing_ms)
    VALUES (v_attempt, v_charge.charge_id, p_terminal_id, v_merchant, v_cust.customer_id, v_charge.amount, v_outcome, v_ms);
    UPDATE fp.charge_sessions
       SET thumb_attempts = thumb_attempts + 1,
           status    = CASE WHEN thumb_attempts + 1 >= 3 THEN 'LOCKED' ELSE status END,
           closed_at = CASE WHEN thumb_attempts + 1 >= 3 THEN now() ELSE closed_at END
     WHERE charge_id = v_charge.charge_id;
    -- Tell the real shopper whenever their thumb was used and declined: it is how they spot misuse.
    IF v_outcome IN ('DECLINED_LOW_BALANCE','DECLINED_LIMIT') THEN
      PERFORM fp.sms(v_cust.customer_id, v_attempt, 'DECLINE_NOTICE',
        'Allied Bank FingerPay: A payment of ' || fp.fmt_pkr(v_charge.amount) || ' at ' || v_store || ' was declined ('
        || CASE v_outcome WHEN 'DECLINED_LOW_BALANCE' THEN 'insufficient balance' ELSE 'above your thumb-pay limit' END
        || '). No fee was charged. Not you? Reply LOCK.');
    ELSIF v_outcome = 'DECLINED_THUMB_LOCKED' THEN
      PERFORM fp.sms(v_cust.customer_id, v_attempt, 'SECURITY_ALERT',
        'Allied Bank FingerPay: Someone tried to pay ' || fp.fmt_pkr(v_charge.amount) || ' at ' || v_store
        || ' with your thumb while thumb payments are locked. The payment was blocked.');
    END IF;
    PERFORM fp.audit('TERMINAL', p_terminal_id::text, 'payment.declined', 'payment_attempt', v_attempt::text,
      jsonb_build_object('charge_id', v_charge.charge_id, 'outcome', v_outcome));
  END IF;
  RETURN fp.attempt_result(v_attempt, false);
END $$;

-- Offline rule (spec §10): the terminal never queues a sale. It tells the cashier to take
-- cash at once and uploads this informational row when it reconnects.
CREATE FUNCTION fp.api_record_offline_fallback(p_terminal_id uuid, p_nonce bytea, p_signed_at timestamptz,
  p_actor uuid, p_amount numeric, p_occurred_at timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_merchant uuid; v_staff fp.staff; v_attempt uuid;
BEGIN
  v_merchant := fp.terminal_guard(p_terminal_id, p_nonce, p_signed_at);
  v_staff := fp.require_staff(p_actor, ARRAY['MERCHANT_OWNER','MERCHANT_CASHIER']);
  IF v_staff.merchant_id <> v_merchant THEN
    RAISE EXCEPTION 'this staff member does not work at the terminal''s store' USING ERRCODE = 'FP403';
  END IF;
  PERFORM fp.check_amount(p_amount);
  IF p_occurred_at IS NULL OR p_occurred_at < now() - interval '24 hours' OR p_occurred_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'offline events must be uploaded within 24 hours' USING ERRCODE = 'FP400';
  END IF;
  INSERT INTO fp.payment_attempts(terminal_id, merchant_id, amount, outcome, recorded_by, occurred_at)
  VALUES (p_terminal_id, v_merchant, p_amount, 'OFFLINE_CASH_FALLBACK', p_actor, p_occurred_at)
  RETURNING attempt_id INTO v_attempt;
  PERFORM fp.audit('TERMINAL', p_terminal_id::text, 'payment.offline_fallback', 'payment_attempt', v_attempt::text,
                   jsonb_build_object('amount', p_amount, 'occurred_at', p_occurred_at));
  RETURN v_attempt;
END $$;

-- ── Merchant ledger (View B) ───────────────────────────────────────────────────────────────
CREATE FUNCTION fp.api_merchant_ledger(p_actor uuid, p_day date)
RETURNS TABLE (attempt_id uuid, occurred_at timestamptz, shopper text, gross numeric, mdr_fee numeric,
               net_to_merchant numeric, cashback numeric, raast_ref text, status text, outcome text, terminal_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_staff fp.staff; v_day date := coalesce(p_day, fp.karachi_today());
BEGIN
  v_staff := fp.require_staff(p_actor, ARRAY['MERCHANT_OWNER','MERCHANT_CASHIER']);
  RETURN QUERY
  SELECT a.attempt_id, a.occurred_at,
         CASE WHEN a.outcome = 'SUCCESS' THEN c.display_name END,
         a.amount, a.mdr_fee, a.net_to_merchant, a.cashback, a.raast_ref,
         CASE WHEN a.outcome = 'SUCCESS' AND r.reversal_id IS NOT NULL THEN 'REVERSED'
              WHEN a.outcome = 'SUCCESS' THEN 'SETTLED'
              WHEN a.outcome = 'OFFLINE_CASH_FALLBACK' THEN 'OFFLINE_CASH'
              ELSE 'DECLINED' END,
         a.outcome, t.label
    FROM fp.payment_attempts a
    JOIN fp.terminals t ON t.terminal_id = a.terminal_id
    LEFT JOIN fp.customers c ON c.customer_id = a.customer_id
    LEFT JOIN fp.reversals r ON r.attempt_id = a.attempt_id AND r.status = 'POSTED'
   WHERE a.merchant_id = v_staff.merchant_id
     AND a.occurred_at >= fp.karachi_day_start(v_day) AND a.occurred_at < fp.karachi_day_start(v_day + 1)
   ORDER BY a.occurred_at DESC;
END $$;

CREATE FUNCTION fp.api_merchant_summary(p_actor uuid, p_day date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_staff fp.staff; v_day date := coalesce(p_day, fp.karachi_today()); v_out jsonb;
BEGIN
  v_staff := fp.require_staff(p_actor, ARRAY['MERCHANT_OWNER','MERCHANT_CASHIER']);
  WITH settled AS (
    SELECT a.* FROM fp.payment_attempts a
     WHERE a.merchant_id = v_staff.merchant_id AND a.outcome = 'SUCCESS'
       AND NOT EXISTS (SELECT 1 FROM fp.reversals r WHERE r.attempt_id = a.attempt_id AND r.status = 'POSTED')
  ), today AS (
    SELECT * FROM settled
     WHERE occurred_at >= fp.karachi_day_start(v_day) AND occurred_at < fp.karachi_day_start(v_day + 1)
  )
  SELECT jsonb_build_object(
    'day', v_day,
    'gross_sales', coalesce((SELECT sum(amount) FROM today), 0),
    'mdr_fees', coalesce((SELECT sum(mdr_fee) FROM today), 0),
    'card_pos_fees_at_2_5pct', round(coalesce((SELECT sum(amount) FROM today), 0) * 0.025, 2),
    'fees_saved_vs_card_pos', round(coalesce((SELECT sum(amount) FROM today), 0) * 0.025, 2)
                              - coalesce((SELECT sum(mdr_fee) FROM today), 0),
    'net_settled_today', coalesce((SELECT sum(net_to_merchant) FROM today), 0),
    'transactions_today', (SELECT count(*) FROM today),
    'declines_today', (SELECT count(*) FROM fp.payment_attempts a WHERE a.merchant_id = v_staff.merchant_id
        AND a.outcome LIKE 'DECLINED_%' AND a.occurred_at >= fp.karachi_day_start(v_day)
        AND a.occurred_at < fp.karachi_day_start(v_day + 1)),
    'allied_bank_balance', (SELECT balance FROM fp.accounts WHERE merchant_id = v_staff.merchant_id),
    'screenshots_avoided', (SELECT count(*) FROM settled),
    'month_tx_count', coalesce((SELECT tx_count FROM fp.merchant_monthly_stats WHERE merchant_id = v_staff.merchant_id
        AND month = date_trunc('month', now() AT TIME ZONE 'Asia/Karachi')::date), 0))
  INTO v_out;
  RETURN v_out;
END $$;

CREATE FUNCTION fp.api_void_payment(p_actor uuid, p_attempt_id uuid, p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_staff fp.staff; v_attempt fp.payment_attempts; v_journal uuid; v_reversal uuid; v_store text;
BEGIN
  v_staff := fp.require_staff(p_actor, ARRAY['MERCHANT_OWNER']);
  SELECT * INTO v_attempt FROM fp.payment_attempts WHERE attempt_id = p_attempt_id;
  IF NOT FOUND OR v_attempt.merchant_id <> v_staff.merchant_id THEN
    RAISE EXCEPTION 'sale not found' USING ERRCODE = 'FP404';  -- same answer for "not yours"
  END IF;
  IF v_attempt.outcome <> 'SUCCESS' THEN RAISE EXCEPTION 'only settled sales can be voided' USING ERRCODE = 'FP409'; END IF;
  IF (v_attempt.created_at AT TIME ZONE 'Asia/Karachi')::date <> fp.karachi_today() THEN
    RAISE EXCEPTION 'only today''s sales can be voided; older sales go through a bank dispute' USING ERRCODE = 'FP409';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'give a reason (3 to 500 characters)' USING ERRCODE = 'FP400';
  END IF;
  PERFORM 1 FROM fp.charge_sessions WHERE charge_id = v_attempt.charge_id FOR UPDATE;  -- serialize reversals
  IF EXISTS (SELECT 1 FROM fp.reversals WHERE attempt_id = v_attempt.attempt_id AND status <> 'REJECTED') THEN
    RAISE EXCEPTION 'this sale is already reversed or has a refund pending' USING ERRCODE = 'FP409';
  END IF;
  v_journal := fp.reverse_payment(v_attempt, 'VOID', 'void:' || v_attempt.attempt_id, 'staff:' || p_actor,
                                  'Same-day void: ' || btrim(p_reason));
  INSERT INTO fp.reversals(attempt_id, kind, reason, status, requested_by, decided_by, decided_at, journal_id)
  VALUES (v_attempt.attempt_id, 'VOID', btrim(p_reason), 'POSTED', p_actor, p_actor, now(), v_journal)
  RETURNING reversal_id INTO v_reversal;
  SELECT store_name INTO v_store FROM fp.merchants WHERE merchant_id = v_attempt.merchant_id;
  PERFORM fp.sms(v_attempt.customer_id, v_attempt.attempt_id, 'VOID',
    'Allied Bank FingerPay: ' || v_store || ' cancelled your ' || fp.fmt_pkr(v_attempt.amount)
    || ' payment (Ref #' || v_attempt.raast_ref || '). The amount is back in your account.');
  PERFORM fp.audit('STAFF', p_actor::text, 'payment.voided', 'payment_attempt', v_attempt.attempt_id::text,
                   jsonb_build_object('reversal_id', v_reversal, 'journal_id', v_journal));
  RETURN jsonb_build_object('reversal_id', v_reversal, 'journal_id', v_journal);
END $$;

-- ── Branch enrollment (View C) ─────────────────────────────────────────────────────────────
-- The server has already: verified the branch officer (AAL2), called the NADRA gateway,
-- encrypted the PII, and computed the HMAC lookups. Duplicates return a result instead of
-- raising so the fraud signal is audited, not rolled back.
CREATE FUNCTION fp.api_enroll_customer(
  p_actor uuid, p_customer_id uuid, p_display_name text, p_account_type text,
  p_full_name_enc bytea, p_cnic_enc bytea, p_cnic_idx bytea, p_cnic_last4 text,
  p_phone_enc bytea, p_phone_last4 text,
  p_account_no_enc bytea, p_account_no_idx bytea, p_account_no_last4 text,
  p_opening_balance numeric, p_thumb_lookup bytea, p_thumb_key_version smallint,
  p_nadra_ref text, p_consent_version text, p_referral_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_staff fp.staff; v_referrer uuid; v_code text; v_account uuid; v_dupe text;
BEGIN
  v_staff := fp.require_staff(p_actor, ARRAY['BRANCH_OFFICER','BRANCH_MANAGER']);
  IF p_customer_id IS NULL OR p_account_type NOT IN ('SHOPPER_SALARY','STUDENT_NON_PTA') THEN
    RAISE EXCEPTION 'invalid customer id or account type' USING ERRCODE = 'FP400';
  END IF;
  IF p_opening_balance IS NULL OR p_opening_balance < 0 OR p_opening_balance > 1000000
     OR p_opening_balance <> round(p_opening_balance, 2) THEN
    RAISE EXCEPTION 'opening balance must be PKR 0 to PKR 1,000,000' USING ERRCODE = 'FP400';
  END IF;

  v_dupe := CASE
    WHEN EXISTS (SELECT 1 FROM fp.customers WHERE thumb_lookup = p_thumb_lookup) THEN 'DUPLICATE_THUMB'
    WHEN EXISTS (SELECT 1 FROM fp.customers WHERE cnic_idx = p_cnic_idx) THEN 'DUPLICATE_CNIC'
    WHEN EXISTS (SELECT 1 FROM fp.accounts WHERE account_no_idx = p_account_no_idx) THEN 'DUPLICATE_ACCOUNT'
  END;
  IF v_dupe IS NOT NULL THEN
    PERFORM fp.audit('STAFF', p_actor::text, 'enrollment.rejected', 'customer', p_customer_id::text,
                     jsonb_build_object('reason', v_dupe));
    RETURN jsonb_build_object('ok', false, 'error', v_dupe);
  END IF;

  IF nullif(btrim(p_referral_code), '') IS NOT NULL THEN
    SELECT customer_id INTO v_referrer FROM fp.customers
     WHERE referral_code = upper(btrim(p_referral_code)) AND status = 'ACTIVE' AND account_type = 'STUDENT_NON_PTA';
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'UNKNOWN_REFERRAL_CODE'); END IF;
  END IF;
  IF p_account_type = 'STUDENT_NON_PTA' THEN
    v_code := 'FP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  END IF;

  INSERT INTO fp.customers(customer_id, display_name, full_name_enc, cnic_enc, cnic_idx, cnic_last4, phone_enc, phone_last4,
    account_type, thumb_lookup, thumb_key_version, referral_code, referred_by, nadra_ref, nadra_verified_at,
    consent_version, consented_at, enrolled_by)
  VALUES (p_customer_id, btrim(p_display_name), p_full_name_enc, p_cnic_enc, p_cnic_idx, p_cnic_last4, p_phone_enc, p_phone_last4,
    p_account_type, p_thumb_lookup, p_thumb_key_version, v_code, v_referrer, p_nadra_ref, now(),
    p_consent_version, now(), p_actor);
  INSERT INTO fp.accounts(kind, customer_id, account_no_enc, account_no_idx, account_no_last4)
  VALUES ('CUSTOMER_CASA', p_customer_id, p_account_no_enc, p_account_no_idx, p_account_no_last4)
  RETURNING account_id INTO v_account;
  -- Simulation of the existing Allied Bank balance. In production the bank holds this money.
  IF p_opening_balance > 0 THEN
    PERFORM fp.post_journal('OPENING_BALANCE', 'opening:' || v_account, 'staff:' || p_actor, 'Opening balance',
      jsonb_build_array(jsonb_build_object('account_id', fp.system_account('OPENING_EQUITY'), 'amount', -p_opening_balance),
                        jsonb_build_object('account_id', v_account, 'amount', p_opening_balance)));
  END IF;
  PERFORM fp.sms(p_customer_id, NULL, 'ENROLLMENT',
    'Allied Bank FingerPay: Your thumb is now linked to account ending ' || p_account_no_last4
    || '. Pay at any FingerPay store with one tap. Reply LOCK anytime to block thumb payments.');
  PERFORM fp.audit('STAFF', p_actor::text, 'customer.enrolled', 'customer', p_customer_id::text,
                   jsonb_build_object('account_type', p_account_type, 'referred', v_referrer IS NOT NULL));
  RETURN jsonb_build_object('ok', true, 'customer_id', p_customer_id, 'referral_code', v_code);
END $$;

CREATE FUNCTION fp.api_find_customer(p_actor uuid, p_cnic_idx bytea)
RETURNS TABLE (customer_id uuid, display_name text, account_type text, status text, thumb_locked boolean, cnic_last4 text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
  PERFORM fp.require_staff(p_actor, ARRAY['BRANCH_OFFICER','BRANCH_MANAGER','BANK_ADMIN']);
  RETURN QUERY SELECT c.customer_id, c.display_name, c.account_type, c.status, c.thumb_locked, c.cnic_last4
                 FROM fp.customers c WHERE c.cnic_idx = p_cnic_idx;
END $$;

-- Locking is open to the shopper (SMS) and branch staff; unlocking needs a branch visit.
CREATE FUNCTION fp.api_set_thumb_lock(p_actor uuid, p_customer_id uuid, p_locked boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM fp.require_staff(p_actor, ARRAY['BRANCH_OFFICER','BRANCH_MANAGER','BANK_ADMIN']);
  UPDATE fp.customers SET thumb_locked = p_locked WHERE customer_id = p_customer_id AND thumb_locked <> p_locked;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM fp.sms(p_customer_id, NULL, 'THUMB_LOCK', 'Allied Bank FingerPay: Thumb payments are now '
    || CASE WHEN p_locked THEN 'LOCKED. Visit any Allied Bank branch with your CNIC to unlock.' ELSE 'UNLOCKED at your branch.' END);
  PERFORM fp.audit('STAFF', p_actor::text, CASE WHEN p_locked THEN 'customer.thumb_locked' ELSE 'customer.thumb_unlocked' END,
                   'customer', p_customer_id::text);
  RETURN true;
END $$;

-- ── SMS (View D): the shopper replies to a FingerPay SMS. No app, no data plan, no smartphone.
-- Called by the inbound-SMS webhook (provider-signed) or the demo simulator.
CREATE FUNCTION fp.api_sms_reply(p_sms_id uuid, p_command text, p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_sms fp.sms_outbox; v_attempt fp.payment_attempts; v_cmd text := upper(btrim(coalesce(p_command, '')));
        v_existing text; v_ref text; v_dispute uuid;
BEGIN
  SELECT * INTO v_sms FROM fp.sms_outbox WHERE sms_id = p_sms_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not found' USING ERRCODE = 'FP404'; END IF;

  IF v_cmd = 'LOCK' THEN
    UPDATE fp.customers SET thumb_locked = true WHERE customer_id = v_sms.customer_id AND NOT thumb_locked;
    IF FOUND THEN
      PERFORM fp.sms(v_sms.customer_id, NULL, 'THUMB_LOCK',
        'Allied Bank FingerPay: Thumb payments are now LOCKED. Visit any Allied Bank branch with your CNIC to unlock.');
      PERFORM fp.audit('CUSTOMER_SMS', v_sms.customer_id::text, 'customer.thumb_locked', 'customer', v_sms.customer_id::text,
                       jsonb_build_object('via_sms', p_sms_id));
    END IF;
    RETURN jsonb_build_object('command', 'LOCK', 'thumb_locked', true);
  ELSIF v_cmd = 'DISPUTE' THEN
    IF v_sms.kind <> 'PAYMENT_RECEIPT' OR v_sms.attempt_id IS NULL THEN
      RAISE EXCEPTION 'only payment receipts can be disputed' USING ERRCODE = 'FP409';
    END IF;
    SELECT * INTO v_attempt FROM fp.payment_attempts WHERE attempt_id = v_sms.attempt_id;
    SELECT tracking_ref INTO v_existing FROM fp.disputes
     WHERE attempt_id = v_attempt.attempt_id AND status IN ('OPEN_WITH_ALLIED_BANK','REFUND_PENDING_APPROVAL');
    IF FOUND THEN  -- replying twice returns the same ticket
      RETURN jsonb_build_object('command', 'DISPUTE', 'tracking_ref', v_existing, 'duplicate', true);
    END IF;
    v_ref := fp.new_ref('ABL-DSP');
    INSERT INTO fp.disputes(tracking_ref, attempt_id, customer_id, channel, reason)
    VALUES (v_ref, v_attempt.attempt_id, v_sms.customer_id, 'SMS_REPLY',
            left(coalesce(nullif(btrim(p_reason), ''), 'Reported by SMS reply: possible double charge'), 255))
    RETURNING dispute_id INTO v_dispute;
    PERFORM fp.sms(v_sms.customer_id, v_attempt.attempt_id, 'DISPUTE_RAISED',
      'Allied Bank FingerPay: Dispute #' || v_ref || ' opened for ' || fp.fmt_pkr(v_attempt.amount)
      || ' (Ref #' || v_attempt.raast_ref || '). Allied Bank will contact you within 3 working days.');
    PERFORM fp.audit('CUSTOMER_SMS', v_sms.customer_id::text, 'dispute.raised', 'dispute', v_dispute::text,
                     jsonb_build_object('tracking_ref', v_ref, 'attempt_id', v_attempt.attempt_id));
    RETURN jsonb_build_object('command', 'DISPUTE', 'tracking_ref', v_ref, 'duplicate', false);
  END IF;
  RAISE EXCEPTION 'unknown command: reply LOCK or DISPUTE' USING ERRCODE = 'FP400';
END $$;

CREATE FUNCTION fp.api_sms_feed(p_actor uuid, p_limit integer)
RETURNS TABLE (sms_id uuid, created_at timestamptz, customer_display_name text, phone_last4 text, kind text,
               body text, attempt_id uuid, can_dispute boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
  PERFORM fp.require_staff(p_actor, ARRAY['BRANCH_OFFICER','BRANCH_MANAGER','BANK_ADMIN','AUDITOR']);
  RETURN QUERY
  SELECT m.sms_id, m.created_at, c.display_name, c.phone_last4, m.kind, m.body, m.attempt_id,
         m.kind = 'PAYMENT_RECEIPT' AND NOT EXISTS (SELECT 1 FROM fp.disputes d WHERE d.attempt_id = m.attempt_id
           AND d.status IN ('OPEN_WITH_ALLIED_BANK','REFUND_PENDING_APPROVAL'))
    FROM fp.sms_outbox m JOIN fp.customers c ON c.customer_id = m.customer_id
   ORDER BY m.created_at DESC
   LIMIT least(greatest(coalesce(p_limit, 50), 1), 200);
END $$;

-- ── Disputes → refunds, with maker-checker ─────────────────────────────────────────────────
CREATE FUNCTION fp.api_open_disputes(p_actor uuid)
RETURNS TABLE (dispute_id uuid, tracking_ref text, status text, created_at timestamptz, customer_display_name text,
               amount numeric, raast_ref text, store_name text, reversal_id uuid, requested_by uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
  PERFORM fp.require_staff(p_actor, ARRAY['BRANCH_OFFICER','BRANCH_MANAGER','BANK_ADMIN','AUDITOR']);
  RETURN QUERY
  SELECT d.dispute_id, d.tracking_ref, d.status, d.created_at, c.display_name, a.amount, a.raast_ref, m.store_name,
         r.reversal_id, r.requested_by
    FROM fp.disputes d
    JOIN fp.payment_attempts a ON a.attempt_id = d.attempt_id
    JOIN fp.customers c ON c.customer_id = d.customer_id
    JOIN fp.merchants m ON m.merchant_id = a.merchant_id
    LEFT JOIN fp.reversals r ON r.dispute_id = d.dispute_id AND r.status = 'PENDING_APPROVAL'
   WHERE d.status IN ('OPEN_WITH_ALLIED_BANK','REFUND_PENDING_APPROVAL')
   ORDER BY d.created_at;
END $$;

CREATE FUNCTION fp.api_request_refund(p_actor uuid, p_dispute_id uuid, p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_dispute fp.disputes; v_reversal uuid;
BEGIN
  PERFORM fp.require_staff(p_actor, ARRAY['BRANCH_OFFICER','BANK_ADMIN']);
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'give a reason (3 to 500 characters)' USING ERRCODE = 'FP400';
  END IF;
  SELECT * INTO v_dispute FROM fp.disputes WHERE dispute_id = p_dispute_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'dispute not found' USING ERRCODE = 'FP404'; END IF;
  IF v_dispute.status <> 'OPEN_WITH_ALLIED_BANK' THEN
    RAISE EXCEPTION 'dispute is %', v_dispute.status USING ERRCODE = 'FP409';
  END IF;
  IF EXISTS (SELECT 1 FROM fp.reversals WHERE attempt_id = v_dispute.attempt_id AND status <> 'REJECTED') THEN
    RAISE EXCEPTION 'this sale is already reversed' USING ERRCODE = 'FP409';
  END IF;
  INSERT INTO fp.reversals(attempt_id, kind, dispute_id, reason, status, requested_by)
  VALUES (v_dispute.attempt_id, 'REFUND', p_dispute_id, btrim(p_reason), 'PENDING_APPROVAL', p_actor)
  RETURNING reversal_id INTO v_reversal;
  UPDATE fp.disputes SET status = 'REFUND_PENDING_APPROVAL' WHERE dispute_id = p_dispute_id;
  PERFORM fp.audit('STAFF', p_actor::text, 'refund.requested', 'reversal', v_reversal::text,
                   jsonb_build_object('dispute_id', p_dispute_id));
  RETURN v_reversal;
END $$;

CREATE FUNCTION fp.api_decide_refund(p_actor uuid, p_reversal_id uuid, p_approve boolean, p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rev fp.reversals; v_attempt fp.payment_attempts; v_dispute fp.disputes; v_journal uuid;
BEGIN
  PERFORM fp.require_staff(p_actor, ARRAY['BRANCH_MANAGER','BANK_ADMIN']);
  SELECT * INTO v_rev FROM fp.reversals WHERE reversal_id = p_reversal_id FOR UPDATE;
  IF NOT FOUND OR v_rev.kind <> 'REFUND' THEN RAISE EXCEPTION 'refund request not found' USING ERRCODE = 'FP404'; END IF;
  IF v_rev.status <> 'PENDING_APPROVAL' THEN RAISE EXCEPTION 'refund is already %', v_rev.status USING ERRCODE = 'FP409'; END IF;
  IF v_rev.requested_by = p_actor THEN
    RAISE EXCEPTION 'maker-checker: the person who requested a refund cannot approve it' USING ERRCODE = 'FP403';
  END IF;
  SELECT * INTO v_attempt FROM fp.payment_attempts WHERE attempt_id = v_rev.attempt_id;
  SELECT * INTO v_dispute FROM fp.disputes WHERE dispute_id = v_rev.dispute_id FOR UPDATE;
  IF p_approve THEN
    v_journal := fp.reverse_payment(v_attempt, 'REFUND', 'refund:' || p_reversal_id, 'staff:' || p_actor,
                                    'Dispute ' || v_dispute.tracking_ref || coalesce(': ' || nullif(btrim(p_note), ''), ''));
    UPDATE fp.reversals SET status = 'POSTED', decided_by = p_actor, decided_at = now(), journal_id = v_journal
     WHERE reversal_id = p_reversal_id;
    UPDATE fp.disputes SET status = 'RESOLVED_REFUNDED', resolved_at = now() WHERE dispute_id = v_dispute.dispute_id;
    PERFORM fp.sms(v_attempt.customer_id, v_attempt.attempt_id, 'REFUND',
      'Allied Bank FingerPay: Dispute #' || v_dispute.tracking_ref || ' resolved. ' || fp.fmt_pkr(v_attempt.amount)
      || ' has been refunded to your account.');
  ELSE
    UPDATE fp.reversals SET status = 'REJECTED', decided_by = p_actor, decided_at = now() WHERE reversal_id = p_reversal_id;
    UPDATE fp.disputes SET status = 'RESOLVED_REJECTED', resolved_at = now() WHERE dispute_id = v_dispute.dispute_id;
    PERFORM fp.sms(v_attempt.customer_id, v_attempt.attempt_id, 'REFUND',
      'Allied Bank FingerPay: Dispute #' || v_dispute.tracking_ref || ' was reviewed and closed without a refund. Visit your branch for details.');
  END IF;
  PERFORM fp.audit('STAFF', p_actor::text, CASE WHEN p_approve THEN 'refund.approved' ELSE 'refund.rejected' END,
                   'reversal', p_reversal_id::text, jsonb_build_object('journal_id', v_journal));
  RETURN jsonb_build_object('reversal_id', p_reversal_id, 'approved', p_approve, 'journal_id', v_journal);
END $$;

-- ── Audit & integrity (auditors) ───────────────────────────────────────────────────────────
CREATE FUNCTION fp.api_audit_tail(p_actor uuid, p_limit integer)
RETURNS TABLE (seq bigint, occurred_at timestamptz, actor_type text, actor_id text, action text,
               entity_type text, entity_id text, details jsonb, row_hash text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
  PERFORM fp.require_staff(p_actor, ARRAY['AUDITOR','BANK_ADMIN']);
  RETURN QUERY SELECT l.seq, l.occurred_at, l.actor_type, l.actor_id, l.action, l.entity_type, l.entity_id, l.details,
                      encode(l.row_hash, 'hex')
                 FROM fp.audit_log l ORDER BY l.seq DESC LIMIT least(greatest(coalesce(p_limit, 100), 1), 500);
END $$;

CREATE FUNCTION fp.api_verify_integrity(p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_chain record;
BEGIN
  PERFORM fp.require_staff(p_actor, ARRAY['AUDITOR','BANK_ADMIN']);
  SELECT * INTO v_chain FROM fp.verify_audit_chain();
  RETURN jsonb_build_object('audit_chain_ok', v_chain.ok, 'audit_rows_checked', v_chain.checked,
    'first_bad_seq', v_chain.first_bad_seq, 'accounts_out_of_balance', fp.verify_balances(),
    'chain_head', (SELECT encode(row_hash, 'hex') FROM fp.audit_chain_head WHERE id));
END $$;

-- ── Demo only: who can be "tapped" in the simulator. Never granted here; the demo seed grants
-- it, so a production database cannot list customers this way even if the route leaked.
CREATE FUNCTION fp.api_demo_finger_tray()
RETURNS TABLE (customer_id uuid, display_name text, account_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT c.customer_id, c.display_name, c.account_type FROM fp.customers c WHERE c.status = 'ACTIVE'
  ORDER BY c.created_at
$$;

-- ── Grants: fp_app gets EXECUTE on fp.api_* (minus the demo tray) and nothing else. ────────
DO $$ DECLARE r text; f regprocedure; BEGIN
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fp FROM PUBLIC;
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','fp_app'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fp FROM %I', r);
    END IF;
  END LOOP;
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'fp' AND p.proname LIKE 'api\_%' AND p.proname <> 'api_demo_finger_tray' LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO fp_app', f);
  END LOOP;
END $$;

COMMIT;
