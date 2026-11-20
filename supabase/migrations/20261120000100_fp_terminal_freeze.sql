-- Terminal freeze, terminal listing and a terminal's own status (Android terminal, 2026-11-20).
-- Freeze is the app's "freeze card": a frozen terminal opens no charges until an owner unfreezes it.
-- Owners and cashiers may freeze (a cashier who spots a stolen phone shouldn't wait); only owners unfreeze.
-- Also closes the DESIGN.md backend gap "no API lists a shop's terminals".
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE fp.terminals ADD COLUMN frozen_at timestamptz;
ALTER TABLE fp.terminals ADD COLUMN frozen_by uuid REFERENCES fp.staff;
ALTER TABLE fp.terminals ADD CHECK ((frozen_at IS NULL) = (frozen_by IS NULL));

-- Same body as 20261118000300, plus the frozen check before anything is written.
CREATE OR REPLACE FUNCTION fp.api_open_charge(p_terminal_id uuid, p_nonce bytea, p_signed_at timestamptz,
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
  IF EXISTS (SELECT 1 FROM fp.terminals t WHERE t.terminal_id = p_terminal_id AND t.frozen_at IS NOT NULL) THEN
    RAISE EXCEPTION 'terminal is frozen' USING ERRCODE = 'FP423';
  END IF;
  PERFORM fp.check_amount(p_amount);
  UPDATE fp.charge_sessions cs
     SET status = CASE WHEN cs.expires_at <= now() THEN 'EXPIRED' ELSE 'CANCELLED' END, closed_at = now()
   WHERE cs.terminal_id = p_terminal_id AND cs.status = 'AWAITING_THUMB';
  INSERT INTO fp.charge_sessions(terminal_id, merchant_id, amount, opened_by)
  VALUES (p_terminal_id, v_merchant, p_amount, p_actor) RETURNING * INTO v_charge;
  PERFORM fp.audit('STAFF', p_actor::text, 'charge.opened', 'charge', v_charge.charge_id::text,
                   jsonb_build_object('terminal_id', p_terminal_id, 'amount', p_amount));
  RETURN QUERY SELECT v_charge.charge_id, v_charge.amount, v_charge.expires_at;
END $$;

-- Scope comes from the actor's own store; the terminal must belong to it.
CREATE FUNCTION fp.api_set_terminal_frozen(p_actor uuid, p_terminal_id uuid, p_frozen boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_staff fp.staff; v_term fp.terminals;
BEGIN
  IF p_frozen IS NULL THEN RAISE EXCEPTION 'frozen must be true or false' USING ERRCODE = 'FP400'; END IF;
  v_staff := fp.require_staff(p_actor, CASE WHEN p_frozen THEN ARRAY['MERCHANT_OWNER','MERCHANT_CASHIER'] ELSE ARRAY['MERCHANT_OWNER'] END);
  SELECT * INTO v_term FROM fp.terminals
   WHERE terminal_id = p_terminal_id AND merchant_id = v_staff.merchant_id AND status = 'ACTIVE' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'terminal not found' USING ERRCODE = 'FP404'; END IF;
  IF p_frozen AND v_term.frozen_at IS NULL THEN
    UPDATE fp.terminals SET frozen_at = now(), frozen_by = p_actor WHERE terminal_id = p_terminal_id;
    UPDATE fp.charge_sessions SET status = 'CANCELLED', closed_at = now()
     WHERE terminal_id = p_terminal_id AND status = 'AWAITING_THUMB';
    PERFORM fp.audit('STAFF', p_actor::text, 'terminal.frozen', 'terminal', p_terminal_id::text);
  ELSIF NOT p_frozen AND v_term.frozen_at IS NOT NULL THEN
    UPDATE fp.terminals SET frozen_at = NULL, frozen_by = NULL WHERE terminal_id = p_terminal_id;
    PERFORM fp.audit('STAFF', p_actor::text, 'terminal.unfrozen', 'terminal', p_terminal_id::text);
  END IF;
  RETURN jsonb_build_object('terminal_id', p_terminal_id, 'frozen', p_frozen);
END $$;

-- An owner's terminals, so a lost phone can be frozen or revoked from another device.
CREATE FUNCTION fp.api_list_terminals(p_actor uuid)
RETURNS TABLE (terminal_id uuid, label text, status text, frozen boolean, paired_at timestamptz, last_seen_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_staff fp.staff;
BEGIN
  v_staff := fp.require_staff(p_actor, ARRAY['MERCHANT_OWNER']);
  RETURN QUERY
  SELECT t.terminal_id, t.label, t.status, t.frozen_at IS NOT NULL, t.paired_at, t.last_seen_at
    FROM fp.terminals t WHERE t.merchant_id = v_staff.merchant_id ORDER BY t.paired_at;
END $$;

-- A terminal's own state (signed request): what the app shows on its "This terminal" card.
CREATE FUNCTION fp.api_terminal_status(p_terminal_id uuid, p_nonce bytea, p_signed_at timestamptz)
RETURNS TABLE (label text, frozen boolean, store_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
  PERFORM fp.terminal_guard(p_terminal_id, p_nonce, p_signed_at);
  RETURN QUERY
  SELECT t.label, t.frozen_at IS NOT NULL, m.store_name
    FROM fp.terminals t JOIN fp.merchants m ON m.merchant_id = t.merchant_id
   WHERE t.terminal_id = p_terminal_id;
END $$;

REVOKE ALL ON FUNCTION fp.api_set_terminal_frozen(uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION fp.api_list_terminals(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION fp.api_terminal_status(uuid, bytea, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fp.api_set_terminal_frozen(uuid, uuid, boolean) TO fp_app;
GRANT EXECUTE ON FUNCTION fp.api_list_terminals(uuid) TO fp_app;
GRANT EXECUTE ON FUNCTION fp.api_terminal_status(uuid, bytea, timestamptz) TO fp_app;

COMMIT;
