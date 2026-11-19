-- migrate:up

-- 1. Accounts (Customer CASA, Merchant CASA, and System accounts per institution book)
CREATE TABLE fp.accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_institution_id uuid NOT NULL REFERENCES fp.institutions(id) ON DELETE RESTRICT,
  owner_type          text NOT NULL CHECK (owner_type IN ('CUSTOMER', 'MERCHANT', 'SYSTEM')),
  owner_id            uuid,
  kind                text NOT NULL CHECK (kind IN (
    'CUSTOMER_CASA',
    'MERCHANT_CASA',
    'FP_FEE_RECEIVABLE',
    'BANK_FEE_INCOME',
    'MARKETING_POOL',
    'RAAST_OUTWARD_CLEARING',
    'RAAST_INWARD_CLEARING',
    'SBP_SETTLEMENT',
    'OPENING_EQUITY'
  )),
  bucket              smallint NOT NULL DEFAULT 0,
  account_no_enc      bytea CHECK (
    account_no_enc IS NULL OR (octet_length(account_no_enc) >= 31 AND get_byte(account_no_enc, 0) = 1)
  ),
  account_no_hmac     bytea UNIQUE CHECK (
    account_no_hmac IS NULL OR octet_length(account_no_hmac) = 32
  ),
  balance             numeric(14,2) NOT NULL DEFAULT 0.00,
  balance_mode        text NOT NULL CHECK (balance_mode IN ('SYNC', 'ASYNC')) DEFAULT 'SYNC',
  status              text NOT NULL CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')) DEFAULT 'ACTIVE',
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_non_negative_balance CHECK (
    kind IN ('OPENING_EQUITY', 'RAAST_INWARD_CLEARING', 'SBP_SETTLEMENT') OR balance >= 0
  )
);
CREATE INDEX idx_accounts_owner ON fp.accounts (owner_type, owner_id);
CREATE INDEX idx_accounts_book_kind ON fp.accounts (book_institution_id, kind, bucket);

-- 2. Customers (Shoppers: encrypted PII, HMAC blind indexes, Thumb Lock, versioned consent, NADRA ref)
CREATE TABLE fp.customers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    uuid NOT NULL REFERENCES fp.institutions(id) ON DELETE RESTRICT,
  display_name      text NOT NULL,
  full_name_enc     bytea NOT NULL CHECK (octet_length(full_name_enc) >= 31 AND get_byte(full_name_enc, 0) = 1),
  cnic_enc          bytea NOT NULL CHECK (octet_length(cnic_enc) >= 31 AND get_byte(cnic_enc, 0) = 1),
  cnic_hmac         bytea UNIQUE NOT NULL CHECK (octet_length(cnic_hmac) = 32),
  cnic_last4        char(4) NOT NULL,
  phone_enc         bytea NOT NULL CHECK (octet_length(phone_enc) >= 31 AND get_byte(phone_enc, 0) = 1),
  phone_hmac        bytea NOT NULL CHECK (octet_length(phone_hmac) = 32),
  phone_last4       char(4) NOT NULL,
  thumb_lookup      bytea UNIQUE NOT NULL CHECK (octet_length(thumb_lookup) = 32),
  thumb_key_version smallint NOT NULL DEFAULT 1,
  account_type      text NOT NULL CHECK (account_type IN ('SHOPPER_SALARY', 'STUDENT_NON_PTA')),
  casa_account_id   uuid NOT NULL REFERENCES fp.accounts(id) ON DELETE RESTRICT,
  status            text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')) DEFAULT 'ACTIVE',
  thumb_locked_at   timestamptz,
  consent_version   text NOT NULL,
  consent_at        timestamptz NOT NULL,
  nadra_ref         text NOT NULL,
  nadra_verified_at timestamptz NOT NULL,
  referral_code     text UNIQUE,
  referred_by       uuid REFERENCES fp.customers(id),
  first_payment_at  timestamptz,
  demo_token        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_phone_hmac ON fp.customers (phone_hmac);

-- 3. Double-entry journals and journal_entries (append-only)
CREATE TABLE fp.journals (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL CHECK (kind IN ('PAYMENT', 'VOID', 'REFUND', 'REFERRAL', 'REBATE', 'FUNDING')),
  ref_type   text NOT NULL,
  ref_id     uuid NOT NULL,
  memo       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_journals_ref ON fp.journals (ref_type, ref_id);

CREATE TABLE fp.journal_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id          uuid NOT NULL REFERENCES fp.journals(id) ON DELETE RESTRICT,
  book_institution_id uuid NOT NULL REFERENCES fp.institutions(id) ON DELETE RESTRICT,
  account_id          uuid NOT NULL REFERENCES fp.accounts(id) ON DELETE RESTRICT,
  amount              numeric(14,2) NOT NULL CHECK (amount <> 0),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_entries_journal ON fp.journal_entries (journal_id);
CREATE INDEX idx_journal_entries_account ON fp.journal_entries (account_id, created_at);

-- 3a. Guardrail: FUNDING journals can only be posted by fp_admin or fp_owner.
CREATE OR REPLACE FUNCTION fp.trg_journals_guard_funding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.kind = 'FUNDING' AND current_user NOT IN ('fp_admin', 'fp_owner', 'postgres') THEN
    RAISE EXCEPTION 'FUNDING journals require fp_admin role' USING ERRCODE = 'FP403';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journals_guard_funding
BEFORE INSERT ON fp.journals
FOR EACH ROW EXECUTE FUNCTION fp.trg_journals_guard_funding();

-- 3b. Guardrail: Balances move ONLY via journal_entries AFTER INSERT trigger (SECURITY DEFINER).
-- For SYNC accounts, updates balance immediately inside the transaction.
-- For ASYNC hot accounts, updates balance via trigger as well or rollup, keeping balance == SUM(entries).
CREATE OR REPLACE FUNCTION fp.trg_journal_entry_apply_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE fp.accounts
     SET balance = balance + NEW.amount
   WHERE id = NEW.account_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account % not found', NEW.account_id USING ERRCODE = 'FP404';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER journal_entry_apply_balance
AFTER INSERT ON fp.journal_entries
FOR EACH ROW EXECUTE FUNCTION fp.trg_journal_entry_apply_balance();

-- 3c. Guardrail: Deferred constraint trigger ensures every journal sums to zero per book at COMMIT.
CREATE OR REPLACE FUNCTION fp.trg_journal_verify_balanced()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_unbalanced integer;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM fp.journal_entries
   WHERE journal_id = NEW.journal_id;

  IF v_count < 2 THEN
    RAISE EXCEPTION 'Journal % must have at least 2 entries (found %)', NEW.journal_id, v_count
      USING ERRCODE = 'FP400';
  END IF;

  SELECT COUNT(*) INTO v_unbalanced
    FROM (
      SELECT book_institution_id, SUM(amount) AS leg_sum
        FROM fp.journal_entries
       WHERE journal_id = NEW.journal_id
       GROUP BY book_institution_id
      HAVING SUM(amount) <> 0
    ) u;

  IF v_unbalanced > 0 THEN
    RAISE EXCEPTION 'Journal % has unbalanced book leg(s)', NEW.journal_id
      USING ERRCODE = 'FP400';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER journal_verify_balanced
AFTER INSERT ON fp.journal_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fp.trg_journal_verify_balanced();

-- 3d. Guardrail: Append-only trigger for ledger, attempts, and raast_transfers.
CREATE OR REPLACE FUNCTION fp.trg_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Table %.% is append-only; % is forbidden', TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'FP403';
END;
$$;

CREATE TRIGGER journals_append_only
BEFORE UPDATE OR DELETE ON fp.journals
FOR EACH ROW EXECUTE FUNCTION fp.trg_forbid_mutation();

CREATE TRIGGER journals_no_truncate
BEFORE TRUNCATE ON fp.journals
EXECUTE FUNCTION fp.trg_forbid_mutation();

CREATE TRIGGER journal_entries_append_only
BEFORE UPDATE OR DELETE ON fp.journal_entries
FOR EACH ROW EXECUTE FUNCTION fp.trg_forbid_mutation();

CREATE TRIGGER journal_entries_no_truncate
BEFORE TRUNCATE ON fp.journal_entries
EXECUTE FUNCTION fp.trg_forbid_mutation();

-- 4. Risk Engine limits and daily usage
CREATE TABLE fp.risk_limits (
  account_type text PRIMARY KEY CHECK (account_type IN ('SHOPPER_SALARY', 'STUDENT_NON_PTA')),
  per_tap      numeric(14,2) NOT NULL CHECK (per_tap > 0),
  daily_amount numeric(14,2) NOT NULL CHECK (daily_amount >= per_tap),
  daily_count  integer NOT NULL CHECK (daily_count > 0)
);

INSERT INTO fp.risk_limits (account_type, per_tap, daily_amount, daily_count) VALUES
  ('SHOPPER_SALARY', 5000.00, 15000.00, 20),
  ('STUDENT_NON_PTA', 2000.00, 5000.00, 15);

CREATE TABLE fp.account_daily_usage (
  account_id uuid NOT NULL REFERENCES fp.accounts(id) ON DELETE CASCADE,
  day_pkt    date NOT NULL,
  amount     numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  tap_count  integer NOT NULL DEFAULT 0 CHECK (tap_count >= 0),
  PRIMARY KEY (account_id, day_pkt)
);

-- 5. Charge sessions, Raast transfers, payment attempts, offline events, monthly stats
CREATE TABLE fp.charge_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id     uuid NOT NULL REFERENCES fp.terminals(id) ON DELETE RESTRICT,
  merchant_id     uuid NOT NULL REFERENCES fp.merchants(id) ON DELETE RESTRICT,
  opened_by       uuid NOT NULL REFERENCES fp.staff_users(id) ON DELETE RESTRICT,
  amount          numeric(14,2) NOT NULL CHECK (amount > 0),
  status          text NOT NULL CHECK (status IN ('OPEN', 'PAID', 'LOCKED', 'EXPIRED', 'CANCELLED')) DEFAULT 'OPEN',
  failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 3),
  expires_at      timestamptz NOT NULL,
  paid_attempt_id uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- SPEC §4.2: one open charge per terminal
CREATE UNIQUE INDEX idx_charge_one_open_per_terminal
  ON fp.charge_sessions (terminal_id)
  WHERE status = 'OPEN';

CREATE TABLE fp.raast_transfers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raast_ref           text UNIQUE NOT NULL,
  from_institution_id uuid NOT NULL REFERENCES fp.institutions(id),
  to_institution_id   uuid NOT NULL REFERENCES fp.institutions(id),
  amount              numeric(14,2) NOT NULL CHECK (amount > 0),
  status              text NOT NULL CHECK (status IN ('SETTLED', 'REJECTED')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER raast_transfers_append_only
BEFORE UPDATE OR DELETE ON fp.raast_transfers
FOR EACH ROW EXECUTE FUNCTION fp.trg_forbid_mutation();

CREATE TABLE fp.payment_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id     uuid NOT NULL REFERENCES fp.charge_sessions(id) ON DELETE RESTRICT,
  terminal_id   uuid NOT NULL REFERENCES fp.terminals(id) ON DELETE RESTRICT,
  merchant_id   uuid NOT NULL REFERENCES fp.merchants(id) ON DELETE RESTRICT,
  customer_id   uuid REFERENCES fp.customers(id) ON DELETE RESTRICT,
  outcome       text NOT NULL,
  routing       text NOT NULL CHECK (routing IN ('ON_US', 'OFF_US')),
  gross         numeric(14,2) NOT NULL CHECK (gross > 0),
  fee           numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (fee >= 0),
  fp_share      numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (fp_share >= 0),
  bank_share    numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (bank_share >= 0),
  net           numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (net >= 0),
  cashback      numeric(14,2) NOT NULL DEFAULT 0.00 CHECK (cashback >= 0),
  journal_id    uuid REFERENCES fp.journals(id) ON DELETE RESTRICT,
  raast_ref     text,
  processing_ms integer NOT NULL CHECK (processing_ms >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attempts_fee_split_chk CHECK (fee = fp_share + bank_share),
  CONSTRAINT attempts_success_vs_decline_chk CHECK (
    (outcome = 'SUCCESS' AND net = gross - fee AND journal_id IS NOT NULL AND raast_ref IS NOT NULL)
    OR
    (outcome <> 'SUCCESS' AND fee = 0 AND fp_share = 0 AND bank_share = 0 AND net = 0 AND cashback = 0 AND journal_id IS NULL AND raast_ref IS NULL)
  )
);
CREATE INDEX idx_payment_attempts_merchant_created ON fp.payment_attempts (merchant_id, created_at DESC);
CREATE INDEX idx_payment_attempts_customer_created ON fp.payment_attempts (customer_id, created_at DESC);
CREATE INDEX idx_payment_attempts_terminal_created ON fp.payment_attempts (terminal_id, created_at DESC);

CREATE TRIGGER payment_attempts_append_only
BEFORE UPDATE OR DELETE ON fp.payment_attempts
FOR EACH ROW EXECUTE FUNCTION fp.trg_forbid_mutation();

CREATE TRIGGER payment_attempts_no_truncate
BEFORE TRUNCATE ON fp.payment_attempts
EXECUTE FUNCTION fp.trg_forbid_mutation();

CREATE TABLE fp.offline_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id uuid NOT NULL REFERENCES fp.terminals(id) ON DELETE RESTRICT,
  merchant_id uuid NOT NULL REFERENCES fp.merchants(id) ON DELETE RESTRICT,
  amount      numeric(14,2) CHECK (amount IS NULL OR amount > 0),
  occurred_at timestamptz NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER offline_events_append_only
BEFORE UPDATE OR DELETE ON fp.offline_events
FOR EACH ROW EXECUTE FUNCTION fp.trg_forbid_mutation();

CREATE TABLE fp.merchant_monthly_stats (
  merchant_id       uuid NOT NULL REFERENCES fp.merchants(id) ON DELETE CASCADE,
  month_pkt         char(7) NOT NULL, -- 'YYYY-MM'
  settled_count     integer NOT NULL DEFAULT 0 CHECK (settled_count >= 0),
  rebate_journal_id uuid REFERENCES fp.journals(id),
  PRIMARY KEY (merchant_id, month_pkt)
);

-- Least-privilege grants:
-- fp_app can SELECT and INSERT accounts, but can ONLY UPDATE status (NEVER balance!).
GRANT SELECT, INSERT ON fp.accounts TO fp_app, fp_worker, fp_admin;
GRANT UPDATE (status) ON fp.accounts TO fp_app, fp_worker, fp_admin;

GRANT SELECT, INSERT, UPDATE ON fp.customers TO fp_app, fp_worker, fp_admin;
GRANT SELECT, INSERT ON fp.journals, fp.journal_entries TO fp_app, fp_worker, fp_admin;
GRANT SELECT ON fp.risk_limits TO fp_app, fp_worker, fp_admin, fp_readonly;
GRANT SELECT, INSERT, UPDATE ON fp.risk_limits TO fp_admin;
GRANT SELECT, INSERT, UPDATE ON fp.account_daily_usage TO fp_app, fp_worker, fp_admin;
GRANT SELECT, INSERT, UPDATE ON fp.charge_sessions TO fp_app, fp_worker, fp_admin;
GRANT SELECT, INSERT ON fp.raast_transfers, fp.payment_attempts, fp.offline_events TO fp_app, fp_worker, fp_admin;
GRANT SELECT, INSERT, UPDATE ON fp.merchant_monthly_stats TO fp_app, fp_worker, fp_admin;
GRANT SELECT ON fp.accounts, fp.journals, fp.journal_entries, fp.payment_attempts, fp.raast_transfers, fp.merchant_monthly_stats TO fp_readonly;

-- migrate:down

DROP TABLE IF EXISTS fp.merchant_monthly_stats CASCADE;
DROP TABLE IF EXISTS fp.offline_events CASCADE;
DROP TABLE IF EXISTS fp.payment_attempts CASCADE;
DROP TABLE IF EXISTS fp.raast_transfers CASCADE;
DROP TABLE IF EXISTS fp.charge_sessions CASCADE;
DROP TABLE IF EXISTS fp.account_daily_usage CASCADE;
DROP TABLE IF EXISTS fp.risk_limits CASCADE;
DROP TABLE IF EXISTS fp.journal_entries CASCADE;
DROP TABLE IF EXISTS fp.journals CASCADE;
DROP TABLE IF EXISTS fp.customers CASCADE;
DROP TABLE IF EXISTS fp.accounts CASCADE;
DROP FUNCTION IF EXISTS fp.trg_forbid_mutation() CASCADE;
DROP FUNCTION IF EXISTS fp.trg_journal_verify_balanced() CASCADE;
DROP FUNCTION IF EXISTS fp.trg_journal_entry_apply_balance() CASCADE;
DROP FUNCTION IF EXISTS fp.trg_journals_guard_funding() CASCADE;
