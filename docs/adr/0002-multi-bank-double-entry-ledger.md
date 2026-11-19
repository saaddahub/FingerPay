# ADR 0002 — Multi-Bank Books & Hot-Account Asynchronous Roll-ups

- **Status:** Accepted (2026-11-18)
- **Deciders:** Engineering

## Context

1. Updating a single global fee-income or marketing-pool row synchronously on every checkout serialises all concurrent transactions on that row lock (Q9).
2. Supporting multiple banks with on-us and off-us SBP Raast routing requires each institution's ledger book to balance independently (Q16).

## Decision

- Every `accounts` and `journal_entries` row carries `book_institution_id`.
- On-us payments post 1 balanced leg in the bank's book; off-us payments post 3 balanced legs (issuer bank book, simulated SBP Raast book with RRN, acquirer bank book).
- Shopper and merchant CASA accounts use `balance_mode = 'SYNC'` (locked in fixed `id` order, updated synchronously by trigger, enforced `CHECK (balance >= 0)`).
- House accounts (fee income, clearing, settlement) use `balance_mode = 'ASYNC'` (never locked on the hot path; rolled up every 5 s by the worker from watermark).
- Marketing cashback pools are pre-funded per issuing bank and sharded into 8 buckets (`bucket 0..7`) so cashback debits do not contend on a single row.
