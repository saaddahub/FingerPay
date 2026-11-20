-- FingerPay 2/3: ledger integrity, audit hash chain, fee math, money movement.
-- Everything here is internal: no role but the owner may execute these functions.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ── Append-only tables ─────────────────────────────────────────────────────────────────────
CREATE FUNCTION fp.forbid_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'fp.% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['journals','journal_entries','payment_attempts','audit_log'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON fp.%I FOR EACH ROW EXECUTE FUNCTION fp.forbid_mutation()', t || '_append_only', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON fp.%I FOR EACH STATEMENT EXECUTE FUNCTION fp.forbid_mutation()', t || '_no_truncate', t);
  END LOOP;
END $$;

-- ── Double entry: every journal must have >= 2 lines summing to zero at COMMIT. This guards
-- against any writer, including a migration or an owner session, not just fp.post_journal.
CREATE FUNCTION fp.assert_journal_balanced() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_total numeric; v_lines int;
BEGIN
  SELECT coalesce(sum(amount), 0), count(*) INTO v_total, v_lines
    FROM fp.journal_entries WHERE journal_id = NEW.journal_id;
  IF v_total <> 0 OR v_lines < 2 THEN
    RAISE EXCEPTION 'journal % is unbalanced (sum %, % lines)', NEW.journal_id, v_total, v_lines
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER journals_balanced AFTER INSERT ON fp.journals
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fp.assert_journal_balanced();
CREATE CONSTRAINT TRIGGER journal_entries_balanced AFTER INSERT ON fp.journal_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fp.assert_journal_balanced();

-- ── Audit hash chain: row_hash = sha256(prev_hash || canonical row). Editing, deleting or
-- reordering any row breaks every hash after it (checked by fp.verify_audit_chain).
CREATE FUNCTION fp.audit_row_hash(p_prev bytea, p_seq bigint, p_at timestamptz, p_actor_type text,
  p_actor_id text, p_action text, p_entity_type text, p_entity_id text, p_details jsonb) RETURNS bytea
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT sha256(p_prev || convert_to(concat_ws(chr(31), p_seq::text,
    to_char(p_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    p_actor_type, p_actor_id, p_action, p_entity_type, p_entity_id, p_details::text), 'UTF8'))
$$;

CREATE FUNCTION fp.audit_chain() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_head record;
BEGIN
  -- shortcut: one global chain serializes audit writes; fine for a pilot, shard by day at scale.
  SELECT seq, row_hash INTO v_head FROM fp.audit_chain_head WHERE id FOR UPDATE;
  NEW.seq := v_head.seq + 1;
  NEW.prev_hash := v_head.row_hash;
  NEW.row_hash := fp.audit_row_hash(NEW.prev_hash, NEW.seq, NEW.occurred_at, NEW.actor_type, NEW.actor_id,
                                    NEW.action, NEW.entity_type, NEW.entity_id, NEW.details);
  UPDATE fp.audit_chain_head SET seq = NEW.seq, row_hash = NEW.row_hash WHERE id;
  RETURN NEW;
END $$;
CREATE TRIGGER audit_log_chain BEFORE INSERT ON fp.audit_log FOR EACH ROW EXECUTE FUNCTION fp.audit_chain();

CREATE FUNCTION fp.audit(p_actor_type text, p_actor_id text, p_action text, p_entity_type text,
  p_entity_id text, p_details jsonb DEFAULT '{}'::jsonb) RETURNS void
LANGUAGE sql SET search_path = '' AS $$
  INSERT INTO fp.audit_log(actor_type, actor_id, action, entity_type, entity_id, details, prev_hash, row_hash)
  VALUES (p_actor_type, p_actor_id, p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb),
          '\x0000000000000000000000000000000000000000000000000000000000000000'::bytea,
          '\x0000000000000000000000000000000000000000000000000000000000000000'::bytea);  -- set by the chain trigger
$$;

CREATE FUNCTION fp.verify_audit_chain(OUT ok boolean, OUT checked bigint, OUT first_bad_seq bigint)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE r record; v_prev bytea := sha256(convert_to('fingerpay-audit-genesis-v1', 'UTF8')); v_head record;
BEGIN
  checked := 0;
  FOR r IN SELECT * FROM fp.audit_log ORDER BY seq LOOP
    IF r.seq <> checked + 1 OR r.prev_hash <> v_prev OR r.row_hash <> fp.audit_row_hash(v_prev, r.seq,
       r.occurred_at, r.actor_type, r.actor_id, r.action, r.entity_type, r.entity_id, r.details) THEN
      ok := false; first_bad_seq := r.seq; RETURN;
    END IF;
    v_prev := r.row_hash; checked := checked + 1;
  END LOOP;
  SELECT seq, row_hash INTO v_head FROM fp.audit_chain_head WHERE id;
  IF v_head.seq <> checked OR v_head.row_hash <> v_prev THEN
    ok := false; first_bad_seq := checked + 1; RETURN;  -- tail rows deleted or head rewritten
  END IF;
  ok := true;
END $$;

-- Every cached balance must equal the sum of its ledger lines.
CREATE FUNCTION fp.verify_balances() RETURNS bigint
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT count(*) FROM fp.accounts a
  LEFT JOIN (SELECT account_id, sum(amount) AS total FROM fp.journal_entries GROUP BY account_id) e
    USING (account_id)
  WHERE a.balance <> coalesce(e.total, 0)
$$;

-- ── Money helpers ──────────────────────────────────────────────────────────────────────────
-- Postgres round(numeric) rounds half away from zero, which is half-up for these positive
-- amounts. The server must never recompute fees with banker's rounding (SPEC §6.1).
CREATE FUNCTION fp.mdr_breakdown(p_gross numeric, OUT mdr_fee numeric, OUT fp_revenue numeric,
  OUT bank_revenue numeric, OUT net_to_merchant numeric)
LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT f, round(f * 0.70, 2), f - round(f * 0.70, 2), p_gross - f
  FROM (SELECT CASE WHEN p_gross <= 100.00 THEN 0.00
                    ELSE least(round(p_gross * 0.0045, 2), 25.00) END AS f) s
$$;

-- First qualifying tap and student cashback never stack: the first payment decides.
CREATE FUNCTION fp.cashback_for(p_gross numeric, p_account_type text, p_is_first_payment boolean) RETURNS numeric
LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT CASE
    WHEN p_is_first_payment AND p_gross >= 150.00 THEN 50.00
    WHEN p_account_type = 'STUDENT_NON_PTA' THEN least(round(p_gross * 0.02, 2), 20.00)
    ELSE 0.00 END
$$;

CREATE FUNCTION fp.fmt_pkr(p numeric) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT 'PKR ' || to_char(p, 'FM999,999,999,990.00')
$$;

CREATE FUNCTION fp.karachi_today() RETURNS date
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT (now() AT TIME ZONE 'Asia/Karachi')::date $$;

CREATE FUNCTION fp.karachi_day_start(p_day date) RETURNS timestamptz
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT p_day::timestamp AT TIME ZONE 'Asia/Karachi' $$;

-- 48 random bits per day: unique constraint still guards collisions.
CREATE FUNCTION fp.new_ref(p_prefix text) RETURNS text
LANGUAGE sql VOLATILE SET search_path = '' AS $$
  SELECT p_prefix || '-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYYYMMDD') || '-'
         || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
$$;

CREATE FUNCTION fp.system_account(p_kind text) RETURNS uuid
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT account_id FROM fp.accounts WHERE kind = p_kind
$$;

-- ── The only code path that changes a balance. ─────────────────────────────────────────────
-- p_entries: [{"account_id": "...", "amount": "-180.00"}, ...], applied in order, so debits
-- listed first are checked against the balance before credits are added.
-- Idempotent: the same key with the same payload returns the original journal; the same key
-- with a different payload is rejected.
CREATE FUNCTION fp.post_journal(p_kind text, p_idempotency_key text, p_actor text, p_memo text, p_entries jsonb)
RETURNS uuid
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_digest  bytea;
  v_existing record;
  v_journal uuid;
  v_line    record;
  v_total   numeric := 0;
  v_lines   int := 0;
  v_acct    record;
  v_new     numeric;
BEGIN
  IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' THEN
    RAISE EXCEPTION 'journal entries must be a JSON array' USING ERRCODE = 'FP400';
  END IF;
  v_digest := sha256(convert_to(p_kind || chr(31) || p_entries::text, 'UTF8'));

  SELECT journal_id, payload_sha256 INTO v_existing FROM fp.journals WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.payload_sha256 <> v_digest THEN
      RAISE EXCEPTION 'idempotency key % was already used for a different journal', p_idempotency_key
        USING ERRCODE = 'FP409';
    END IF;
    RETURN v_existing.journal_id;
  END IF;

  FOR v_line IN SELECT (x->>'account_id')::uuid AS account_id, (x->>'amount')::numeric AS amount
                FROM jsonb_array_elements(p_entries) AS x LOOP
    IF v_line.account_id IS NULL OR v_line.amount IS NULL OR v_line.amount = 0
       OR v_line.amount <> round(v_line.amount, 2) THEN
      RAISE EXCEPTION 'invalid journal line %', v_line USING ERRCODE = 'FP400';
    END IF;
    v_total := v_total + v_line.amount;
    v_lines := v_lines + 1;
  END LOOP;
  IF v_lines < 2 OR v_total <> 0 THEN
    RAISE EXCEPTION 'journal must have at least 2 lines summing to zero (got % lines, sum %)', v_lines, v_total
      USING ERRCODE = 'FP400';
  END IF;

  -- Lock every account in one fixed order so concurrent journals cannot deadlock.
  PERFORM 1 FROM fp.accounts
   WHERE account_id IN (SELECT (x->>'account_id')::uuid FROM jsonb_array_elements(p_entries) AS x)
   ORDER BY account_id FOR UPDATE;

  INSERT INTO fp.journals(kind, idempotency_key, payload_sha256, memo, actor)
  VALUES (p_kind, p_idempotency_key, v_digest, coalesce(p_memo, ''), p_actor)
  RETURNING journal_id INTO v_journal;

  FOR v_line IN SELECT (x->>'account_id')::uuid AS account_id, (x->>'amount')::numeric AS amount
                FROM jsonb_array_elements(p_entries) WITH ORDINALITY AS t(x, ord) ORDER BY ord LOOP
    SELECT balance, allow_negative, status INTO v_acct FROM fp.accounts WHERE account_id = v_line.account_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'unknown account %', v_line.account_id USING ERRCODE = 'FP404';
    END IF;
    IF v_acct.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'account % is %', v_line.account_id, v_acct.status USING ERRCODE = 'FP423';
    END IF;
    v_new := v_acct.balance + v_line.amount;
    IF v_new < 0 AND NOT v_acct.allow_negative THEN
      RAISE EXCEPTION 'insufficient funds in account %', v_line.account_id USING ERRCODE = 'FP402';
    END IF;
    UPDATE fp.accounts SET balance = v_new WHERE account_id = v_line.account_id;
    INSERT INTO fp.journal_entries(journal_id, account_id, amount, balance_after)
    VALUES (v_journal, v_line.account_id, v_line.amount, v_new);
  END LOOP;

  PERFORM fp.audit('SYSTEM', p_actor, 'journal.posted', 'journal', v_journal::text,
                   jsonb_build_object('kind', p_kind, 'payload_sha256', encode(v_digest, 'hex')));
  RETURN v_journal;
END $$;

-- ── Lock it down ───────────────────────────────────────────────────────────────────────────
DO $$ DECLARE r text; BEGIN
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fp FROM PUBLIC;
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role','fp_app'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fp FROM %I', r);
    END IF;
  END LOOP;
END $$;

COMMIT;
