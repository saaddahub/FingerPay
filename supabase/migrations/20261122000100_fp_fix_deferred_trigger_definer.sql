-- Fix deferred constraint trigger permissions: when deferred triggers fire at COMMIT time,
-- the active session role may be fp_app (which has no direct table privileges).
-- Running the trigger functions as SECURITY DEFINER with a pinned search_path lets them
-- verify ledger invariants under the owner's privileges without exposing table access.
CREATE OR REPLACE FUNCTION fp.assert_journal_balanced() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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

CREATE OR REPLACE FUNCTION fp.audit_chain() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_head record;
BEGIN
  SELECT seq, row_hash INTO v_head FROM fp.audit_chain_head WHERE id FOR UPDATE;
  NEW.seq := v_head.seq + 1;
  NEW.prev_hash := v_head.row_hash;
  NEW.row_hash := fp.audit_row_hash(NEW.prev_hash, NEW.seq, NEW.occurred_at, NEW.actor_type, NEW.actor_id,
                                    NEW.action, NEW.entity_type, NEW.entity_id, NEW.details);
  UPDATE fp.audit_chain_head SET seq = NEW.seq, row_hash = NEW.row_hash WHERE id;
  RETURN NEW;
END $$;
