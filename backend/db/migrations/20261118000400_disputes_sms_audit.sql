-- migrate:up

-- 1. Reversals (same-day owner VOID and maker-checker REFUND)
CREATE TABLE fp.reversals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      uuid NOT NULL REFERENCES fp.payment_attempts(id) ON DELETE RESTRICT,
  kind            text NOT NULL CHECK (kind IN ('VOID', 'REFUND')),
  amount          numeric(14,2) NOT NULL CHECK (amount > 0),
  reason          text NOT NULL CHECK (char_length(reason) >= 3),
  maker_id        uuid NOT NULL REFERENCES fp.staff_users(id) ON DELETE RESTRICT,
  checker_id      uuid REFERENCES fp.staff_users(id) ON DELETE RESTRICT,
  status          text NOT NULL CHECK (status IN ('PENDING_CHECKER', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING_CHECKER',
  journal_id      uuid REFERENCES fp.journals(id) ON DELETE RESTRICT,
  decision_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  decided_at      timestamptz,
  -- SPEC §4.2: maker != checker
  CONSTRAINT reversals_maker_ne_checker_chk CHECK (checker_id IS NULL OR maker_id <> checker_id)
);
-- SPEC §4.2: at most one live (pending or approved) reversal per sale
CREATE UNIQUE INDEX idx_reversals_one_live_per_attempt
  ON fp.reversals (attempt_id)
  WHERE status IN ('PENDING_CHECKER', 'APPROVED');

-- 2. Disputes (opened via SMS Reply DISPUTE or branch officer)
CREATE TABLE fp.disputes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket      text UNIQUE NOT NULL,
  attempt_id  uuid NOT NULL REFERENCES fp.payment_attempts(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES fp.customers(id) ON DELETE RESTRICT,
  source      text NOT NULL CHECK (source IN ('SMS', 'BRANCH')),
  reason      text NOT NULL,
  status      text NOT NULL CHECK (status IN ('OPEN', 'REFUND_REQUESTED', 'REFUNDED', 'REJECTED')) DEFAULT 'OPEN',
  reversal_id uuid REFERENCES fp.reversals(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
-- SPEC §4.2: one open dispute per payment
CREATE UNIQUE INDEX idx_disputes_one_open_per_attempt
  ON fp.disputes (attempt_id)
  WHERE status IN ('OPEN', 'REFUND_REQUESTED');

-- 3. SMS outbox & inbound log
CREATE TABLE fp.sms_messages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction          text NOT NULL CHECK (direction IN ('OUT', 'IN')),
  customer_id        uuid REFERENCES fp.customers(id) ON DELETE SET NULL,
  phone_hmac         bytea NOT NULL CHECK (octet_length(phone_hmac) = 32),
  phone_last4        char(4) NOT NULL,
  template           text NOT NULL,
  body               text NOT NULL,
  related_attempt_id uuid REFERENCES fp.payment_attempts(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_messages_created ON fp.sms_messages (created_at DESC);
CREATE INDEX idx_sms_messages_customer ON fp.sms_messages (customer_id, created_at DESC);

-- 4. Hash-chained tamper-evident audit log (SPEC §3 T9 & §4.2)
CREATE TABLE fp.audit_events (
  id          bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_type  text NOT NULL CHECK (actor_type IN ('STAFF', 'TERMINAL', 'SHOPPER_SMS', 'SYSTEM')),
  actor_id    text NOT NULL,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash   text NOT NULL,
  row_hash    text NOT NULL
);

CREATE OR REPLACE FUNCTION fp.trg_audit_compute_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prev_hash text;
  v_canonical text;
BEGIN
  -- Serialize audit inserts to maintain a strict hash chain
  LOCK TABLE fp.audit_events IN EXCLUSIVE MODE;

  SELECT row_hash INTO v_prev_hash
    FROM fp.audit_events
   ORDER BY id DESC
   LIMIT 1;

  IF v_prev_hash IS NULL THEN
    v_prev_hash := pg_catalog.repeat('0', 64);
  END IF;

  NEW.prev_hash := v_prev_hash;
  v_canonical := pg_catalog.concat_ws(
    '|',
    v_prev_hash,
    NEW.actor_type,
    NEW.actor_id,
    NEW.action,
    NEW.entity,
    NEW.entity_id,
    NEW.details::text
  );
  NEW.row_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_canonical, 'UTF8')), 'hex');
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_compute_hash
BEFORE INSERT ON fp.audit_events
FOR EACH ROW EXECUTE FUNCTION fp.trg_audit_compute_hash();

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON fp.audit_events
FOR EACH ROW EXECUTE FUNCTION fp.trg_forbid_mutation();

CREATE TRIGGER audit_events_no_truncate
BEFORE TRUNCATE ON fp.audit_events
EXECUTE FUNCTION fp.trg_forbid_mutation();

-- Grants
GRANT SELECT, INSERT, UPDATE ON fp.reversals, fp.disputes TO fp_app, fp_worker, fp_admin;
GRANT SELECT, INSERT ON fp.sms_messages, fp.audit_events TO fp_app, fp_worker, fp_admin;
GRANT USAGE, SELECT ON SEQUENCE fp.audit_events_id_seq TO fp_app, fp_worker, fp_admin;
GRANT SELECT ON fp.reversals, fp.disputes, fp.sms_messages, fp.audit_events TO fp_readonly;

-- migrate:down

DROP TABLE IF EXISTS fp.audit_events CASCADE;
DROP FUNCTION IF EXISTS fp.trg_audit_compute_hash() CASCADE;
DROP TABLE IF EXISTS fp.sms_messages CASCADE;
DROP TABLE IF EXISTS fp.disputes CASCADE;
DROP TABLE IF EXISTS fp.reversals CASCADE;
