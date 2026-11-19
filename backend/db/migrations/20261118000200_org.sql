-- migrate:up

-- 1. Multi-bank institutions
CREATE TABLE fp.institutions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text UNIQUE NOT NULL,
  name                  text NOT NULL,
  kind                  text NOT NULL CHECK (kind IN ('BANK', 'CENTRAL', 'FINGERPAY')),
  raast_participant_code text UNIQUE,
  raast_available       boolean NOT NULL DEFAULT true,
  dispute_prefix        text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- 2. Branches
CREATE TABLE fp.branches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES fp.institutions(id) ON DELETE RESTRICT,
  code           text NOT NULL,
  name           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);

-- 3. Merchants
CREATE TABLE fp.merchants (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id        uuid NOT NULL REFERENCES fp.institutions(id) ON DELETE RESTRICT,
  name                  text NOT NULL,
  settlement_account_id uuid, -- Linked to accounts table in M2
  status                text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')) DEFAULT 'ACTIVE',
  require_claim         boolean NOT NULL DEFAULT false,
  terminal_trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- 4. Staff users
CREATE TABLE fp.staff_users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text UNIQUE NOT NULL,
  password_hash    text NOT NULL,
  role             text NOT NULL CHECK (role IN (
    'MERCHANT_CASHIER',
    'MERCHANT_OWNER',
    'BRANCH_OFFICER',
    'BRANCH_MANAGER',
    'BANK_ADMIN',
    'AUDITOR',
    'DEMO_OBSERVER'
  )),
  institution_id   uuid REFERENCES fp.institutions(id) ON DELETE RESTRICT,
  branch_id        uuid REFERENCES fp.branches(id) ON DELETE RESTRICT,
  merchant_id      uuid REFERENCES fp.merchants(id) ON DELETE RESTRICT,
  totp_secret_enc  bytea,
  mfa_enrolled_at  timestamptz,
  status           text NOT NULL CHECK (status IN ('ACTIVE', 'LOCKED', 'SUSPENDED')) DEFAULT 'ACTIVE',
  failed_logins    integer NOT NULL DEFAULT 0,
  locked_until     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 5. Rotating refresh tokens with family tracking
CREATE TABLE fp.refresh_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES fp.staff_users(id) ON DELETE CASCADE,
  family_id  uuid NOT NULL,
  token_hash text UNIQUE NOT NULL,
  aal        smallint NOT NULL CHECK (aal IN (1, 2)),
  expires_at timestamptz NOT NULL,
  rotated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_family ON fp.refresh_tokens (family_id);

-- 6. POS terminals
CREATE TABLE fp.terminals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      uuid NOT NULL REFERENCES fp.merchants(id) ON DELETE CASCADE,
  label            text NOT NULL DEFAULT 'POS Terminal',
  public_key_spki  text NOT NULL,
  key_sha256       text NOT NULL,
  status           text NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED')) DEFAULT 'ACTIVE',
  throttled_until  timestamptz,
  paired_by        uuid NOT NULL REFERENCES fp.staff_users(id),
  revoked_by       uuid REFERENCES fp.staff_users(id),
  revoked_at       timestamptz,
  last_seen_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_terminals_merchant ON fp.terminals (merchant_id);

-- 7. Request nonces for terminal replay protection (60s window)
CREATE TABLE fp.request_nonces (
  terminal_id uuid NOT NULL REFERENCES fp.terminals(id) ON DELETE CASCADE,
  nonce       text NOT NULL,
  seen_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (terminal_id, nonce)
);
CREATE INDEX idx_request_nonces_seen_at ON fp.request_nonces (seen_at);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON fp.institutions, fp.branches, fp.merchants, fp.staff_users, fp.refresh_tokens, fp.terminals, fp.request_nonces TO fp_app, fp_worker;
GRANT SELECT ON fp.institutions, fp.branches, fp.merchants, fp.terminals TO fp_readonly;

-- migrate:down

DROP TABLE IF EXISTS fp.request_nonces CASCADE;
DROP TABLE IF EXISTS fp.terminals CASCADE;
DROP TABLE IF EXISTS fp.refresh_tokens CASCADE;
DROP TABLE IF EXISTS fp.staff_users CASCADE;
DROP TABLE IF EXISTS fp.merchants CASCADE;
DROP TABLE IF EXISTS fp.branches CASCADE;
DROP TABLE IF EXISTS fp.institutions CASCADE;
