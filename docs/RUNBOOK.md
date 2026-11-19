# FingerPay — Operations & Developer Runbook

## 1. Local Development Quickstart

```powershell
# 1. Start PostgreSQL 17 (auto-runs roles.sql bootstrap on first start)
corepack pnpm run db:up

# 2. Apply SQL migrations (0001..0004)
corepack pnpm run db:migrate

# 3. Seed demo institutions, stores, staff & personas (Ayesha & Bilal)
corepack pnpm --filter @fingerpay/backend seed:demo
# Staff passwords and TOTP secrets are written to .demo-credentials.local.md

# 4. Run Backend API (port 4000) and Next.js Test Console (port 3000)
corepack pnpm run dev
```

## 2. Verification & Quality Gates

```powershell
# Typecheck all packages
corepack pnpm -r typecheck

# Lint all packages
corepack pnpm run lint

# Unit tests (contracts + backend crypto, money vectors, pricing, CSV escaping)
corepack pnpm -r test

# HTTP security hardening tests (headers, CSRF Origin check, 16 KB body limit, zero SQL leak)
corepack pnpm --filter @fingerpay/backend test:security

# Full PostgreSQL integration tests (M0–M4: roles, auth, MFA, terminals, SPEC §6.3 demo flow, off-us Raast, disputes, tamper detection)
corepack pnpm --filter @fingerpay/backend test:integration

# Production build (contracts, backend, frontend)
corepack pnpm -r build
```

## 3. Cryptographic Key Rotation (`FP_KEYRING`)

1. Generate a new 32-byte key:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. Add the new key version to `FP_KEYRING` while retaining old versions for decryption:
   ```json
   {"active":2,"keys":{"1":"<old-base64>","2":"<new-base64>"}}
   ```
3. Redeploy the API; new enrollments and MFA secrets encrypt under version `2` while existing ciphertexts decrypt transparently via the version header embedded in bytes `1..2` of each AES-256-GCM blob.

## 4. Audit & Ledger Integrity Check

At any time, a `BANK_ADMIN` or `AUDITOR` (authenticated at AAL2) can run:
- `GET /api/v1/bank/integrity` (or click **Run Integrity Check** in View E of the test console).
- Verifies:
  1. Every row in `fp.audit_events` from genesis (`000...0`) matches `sha256(prev_hash | actor_type | actor_id | action | entity | entity_id | details)`.
  2. Every journal in `fp.journals` sums to `0.00` per institution book (`unbalancedJournals == 0`).
  3. Every account balance in `fp.accounts` equals `SUM(fp.journal_entries.amount)` (`mismatchedAccounts == 0`).
