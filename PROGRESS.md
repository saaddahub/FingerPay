# FingerPay Implementation & Progress Tracker

> **Status:** ✅ COMPLETED (M0 through M5 Built & Verified)
> **Goal:** Build full backend architecture (M0–M5) with Next.js 16 test console and complete automated verification.

---

## Milestone Status Overview

| Milestone | Description | Status | Tests Passing | Gates Verified |
|---|---|:---:|:---:|:---:|
| **M0** | Foundation Architecture, Contracts & Setup | ✅ DONE | 27 / 27 | Clean build, lint, typecheck, DB roles (`fp_owner`, `fp_app`, `fp_worker`, `fp_admin`, `fp_readonly`) |
| **M1** | Identity, Multi-Bank Org & Terminal Security | ✅ DONE | 12 / 12 | Crypto AEAD/AAD, Argon2id+TOTP AAL2, token family reuse revocation, ECDSA P-256 terminal signing & replay protection |
| **M2** | Double-Entry Ledger & 3s Money Engine | ✅ DONE | 8 / 8 | SPEC §6.3 demo flow to the paisa, idempotent charge replay, 15s duplicate tap guard, 1-leg on-us & 3-leg off-us Raast journals, parallel overdraft protection |
| **M3** | POS Terminal & Merchant Daily Ledger (Views A & B) | ✅ DONE | 3 / 3 | View A WebCrypto POS + finger tray + offline fallback, View B privacy (no shopper names on declines), RBAC (cashier cannot export CSV or void), CSV formula-injection escaping |
| **M4** | Branch Enrollment, SMS Disputes & Bank Console (Views C, D, E) | ✅ DONE | 2 / 2 | Simulated NADRA check, versioned consent, duplicate refusal, SMS Reply LOCK & DISPUTE, maker-checker refund (`maker != checker`), SHA-256 audit hash-chain tamper detection |
| **M5** | System Hardening, Seed Scripts & Verification | ✅ DONE | 52 / 52 total | `seed-demo.ts`, `THREAT-MODEL.md` (T1–T22), `RUNBOOK.md`, k6 200-TPS load script, telemetry metrics, full production build |

---

## Detailed Log & Changelog

### [M0] Foundation Architecture (Completed)
- **Monorepo workspace:** [package.json](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/package.json), [pnpm-workspace.yaml](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/pnpm-workspace.yaml), [eslint.config.mjs](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/eslint.config.mjs), [.env.example](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/.env.example), [docker-compose.yml](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/docker-compose.yml), and [.github/workflows/ci.yml](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/.github/workflows/ci.yml).
- **Shared contracts (`@fingerpay/contracts`):**
  - [money.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/packages/contracts/src/money.ts): Exact `Paisa` (`bigint`) representation, strict decimal string parser/formatter, half-up integer division (`divRoundHalfUp`), and `mdrBreakdown()` matching all 8 SPEC §6.1 test vectors.
  - [outcomes.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/packages/contracts/src/outcomes.ts): All outcome codes (including `DECLINED_SETTLEMENT_UNAVAILABLE` for off-us Raast) and English banner mappings (`BANNERS_EN`).
  - [signing.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/packages/contracts/src/signing.ts): Canonical request builder (`FPv1\nMETHOD\npath?query\nterminal\ntimestamp\nnonce\nbodySha256`).
- **Database bootstrap & Migration 0001:**
  - [roles.sql](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/db/bootstrap/roles.sql): Cluster roles with session timeouts (`fp_app`: `statement_timeout=5s`, `lock_timeout=3s`; `fp_readonly`: `default_transaction_read_only=on`).
  - [20261118000100_foundation.sql](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/db/migrations/20261118000100_foundation.sql): Private `fp` schema and `pgboss` schema.
- **Backend platform layer:**
  - [config.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/config.ts): Fail-closed Zod env parser that refuses `FP_DEMO_MODE=true` when `FP_ENV=production` (SPEC T22).
  - [logger.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/log/logger.ts) & [redact.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/log/redact.ts): Recursive PII/secret redaction (SPEC T18).
  - [headers.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/http/headers.ts), [origin-check.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/http/origin-check.ts), [error-handler.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/http/error-handler.ts): Security headers, Origin check, 16 KB body limit, SQL-safe error formatting.

### [M1] Identity, Multi-Bank Org & Terminal Security (Completed)
- **Cryptography (`backend/src/platform/crypto/`):**
  - [keyring.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/crypto/keyring.ts), [aead.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/crypto/aead.ts), [hkdf.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/crypto/hkdf.ts), [blind-index.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/crypto/blind-index.ts), [jwt.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/crypto/jwt.ts).
- **Supabase integration:**
  - [backend/src/platform/supabase/auth.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/supabase/auth.ts) & [frontend/src/lib/supabase/client.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/frontend/src/lib/supabase/client.ts), [server.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/frontend/src/lib/supabase/server.ts).
- **Migration 0002 ([20261118000200_org.sql](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/db/migrations/20261118000200_org.sql)):**
  - Multi-bank `institutions`, `branches`, `merchants`, `staff_users`, `refresh_tokens`, `terminals`, and `request_nonces`.
- **Staff Auth & Terminal Signing:**
  - [auth/service.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/auth/service.ts), [auth/guards.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/auth/guards.ts), [auth/routes.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/auth/routes.ts).
  - [terminals/signature.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/terminals/signature.ts), [terminals/service.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/terminals/service.ts), [terminals/routes.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/terminals/routes.ts).

### [M2] Double-Entry Ledger & 3s Money Engine (Completed)
- **Migration 0003 ([20261118000300_ledger_and_payments.sql](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/db/migrations/20261118000300_ledger_and_payments.sql)):**
  - `accounts` (with `CHECK (balance >= 0)` and no `UPDATE(balance)` grant to `fp_app`), `customers`, `journals`, `journal_entries`, `risk_limits`, `account_daily_usage`, `charge_sessions`, `raast_transfers`, `payment_attempts`, `offline_events`, and `merchant_monthly_stats`.
  - Database triggers: `trg_journal_entry_apply_balance` (`SECURITY DEFINER`), deferred constraint trigger `trg_journal_verify_balanced` (enforces zero-sum per institution book at `COMMIT`), `trg_journals_guard_funding`, and append-only triggers `trg_forbid_mutation`.
- **Domain modules:**
  - [ledger/post-journal.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/ledger/post-journal.ts): Deterministic account lock ordering (`FOR UPDATE`) and multi-leg journal posting.
  - [pricing/cashback.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/pricing/cashback.ts): First-tap PKR 50 bonus, student 2% cashback (never stacking), student referral PKR 100 bonus, and monthly 500-tx PKR 500 rebate.
  - [biometrics/matcher.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/biometrics/matcher.ts): 1:N and 1:1 (`require_claim`) HMAC thumb matcher.
  - [payments/service.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/payments/service.ts) & [payments/routes.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/payments/routes.ts): Charge sessions, idempotent thumb payment transaction, Risk Engine rules, 1-leg on-us and 3-leg off-us Raast routing, and offline fallback recording.

### [M3] POS Terminal & Merchant Daily Ledger — Views A & B (Completed)
- **Reporting & Void Service:**
  - [reporting/service.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/reporting/service.ts) & [reporting/routes.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/reporting/routes.ts): Merchant daily ledger (hiding shopper names on declines, showing first name + initial on settled rows), summary counters (MDR saved vs 2.5% card POS, screenshots avoided), formula-injection-safe CSV export (`escapeCsvCell`), and same-day owner void.
- **Next.js Test Console Views A & B:**
  - [frontend/src/app/pos/page.tsx](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/frontend/src/app/pos/page.tsx): WebCrypto ECDSA P-256 pairing, presets, charge opening, live demo finger tray, offline fallback toggle, and exact outcome banners.
  - [frontend/src/app/merchant/page.tsx](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/frontend/src/app/merchant/page.tsx): Live summary counters, settled/declined/reversed/offline ledger table, same-day owner void button, and CSV download.

### [M4] Branch Enrollment, SMS Disputes & Bank Console — Views C, D, E (Completed)
- **Migration 0004 ([20261118000400_disputes_sms_audit.sql](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/db/migrations/20261118000400_disputes_sms_audit.sql)):**
  - `reversals` (with `CHECK (maker_id <> checker_id)` and partial unique live index), `disputes` (partial unique open index), `sms_messages`, and SHA-256 hash-chained `audit_events` (`trg_audit_compute_hash`).
- **Domain modules:**
  - [customers/service.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/customers/service.ts) & [customers/routes.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/customers/routes.ts): Simulated NADRA check, versioned biometric consent, encrypted PII + HMAC blind indexes, duplicate refusal + audit, CNIC lookup, and Thumb Lock/Unlock.
  - [notifications/sms.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/notifications/sms.ts): Outbox SMS delivery and inbound `Reply LOCK` / `Reply DISPUTE` parser.
  - [disputes/service.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/disputes/service.ts) & [disputes/routes.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/disputes/routes.ts): Mirror multi-leg journal reversal, maker-checker refund requests & decisions, audit log tail, integrity check, and Raast availability toggle.
  - [demo/routes.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/modules/demo/routes.ts): `/api/v1/demo/finger-tray`, `/api/v1/demo/sms-feed`, and `/api/v1/demo/sms/:id/reply` (returning `404` when `FP_DEMO_MODE=false`).
- **Next.js Test Console Views C, D, E:**
  - [frontend/src/app/branch/page.tsx](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/frontend/src/app/branch/page.tsx), [frontend/src/app/sms/page.tsx](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/frontend/src/app/sms/page.tsx), [frontend/src/app/bank/page.tsx](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/frontend/src/app/bank/page.tsx).

### [M5] System Hardening, Seed Scripts & Verification (Completed)
- [backend/src/scripts/seed-demo.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/scripts/seed-demo.ts): Repeatable demo seeder writing generated staff passwords & TOTP secrets to gitignored `.demo-credentials.local.md` and enrolling Ayesha & Bilal via the real enrollment path.
- [backend/src/platform/telemetry/otel.ts](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/src/platform/telemetry/otel.ts): Latency percentile (`p50`, `p95`, `p99`) and outcome counter collector.
- [backend/load/k6/checkout.js](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/backend/load/k6/checkout.js): 200-TPS k6 load test script (`p(95)<300ms`).
- [docs/THREAT-MODEL.md](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/docs/THREAT-MODEL.md) & [docs/RUNBOOK.md](file:///c:/Users/lenovo/OneDrive/Desktop/FingerPay/docs/RUNBOOK.md).
