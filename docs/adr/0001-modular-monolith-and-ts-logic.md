# ADR 0001 — Standalone TypeScript Modular Monolith with DB Trigger Guardrails

- **Status:** Accepted (2026-11-18)
- **Deciders:** Engineering

## Context

SPEC v2 proposed Next.js route handlers on Vercel calling Postgres `SECURITY DEFINER` stored procedures (`fp.api_*`). During architecture review (Q2, Q3, Q4, Q5), we prioritized:
1. Zero serverless cold starts on the < 3-second checkout path and warm Postgres connection pools.
2. All domain logic in TypeScript (Kysely) for testability, maintainability, and refactoring speed.
3. Vendor-neutral PostgreSQL 16+ and self-owned staff authentication so the stack can move to an in-country SBP-approved data center without code changes.

## Decision

- Run a containerised TypeScript modular monolith (`backend/`) on Fastify 5 + Kysely, producing two process types (`api` and `worker`) from one Docker image.
- Enforce financial and tamper-resistance invariants at the database layer via **roles, triggers, and constraints** rather than stored procedures:
  - `fp_app` has no `UPDATE` privilege on `accounts.balance`; balances move exclusively via an `AFTER INSERT` trigger on `journal_entries`.
  - A deferred constraint trigger enforces zero-sum balance per `(journal_id, book_institution_id)` at `COMMIT`.
  - Append-only triggers block `UPDATE`, `DELETE`, and `TRUNCATE` on `journals`, `journal_entries`, `payment_attempts`, `raast_transfers`, and `audit_events`.
  - `FUNDING` journals require `current_user = 'fp_admin'`, which the API process never uses.
