# FingerPay: Complete Documentation

> **What this is:** every FingerPay document merged into one, as of 2026-11-18:
> - `FingerPay Project Report and Developer Specification.pdf` (v1, the original project report)
> - `docs/SPEC.md` (v2, the security-first specification)
> - `PRODUCT.md` (product truth)
> - `docs/design/BRIEF.md` (design brief)
>
> **When they disagree:** SPEC v2 wins on anything technical, security, money or data. The PDF's story, personas, pricing and copy still stand, with the corrections listed in Part 2 §0 already applied here. The v1 database schema, public gateway routes and Python/FastAPI backend are replaced and are not repeated (see Appendix B).
>
> **For code, the separate files stay the source of truth.** `docs/SPEC.md` is what the build and tests follow. If you change a rule, change it there too.

**Disclaimer (required wherever FingerPay is shown):** *FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.*

## Contents

- **Part 1: Product**
  - P1 Executive summary
  - P2 The problem
  - P3 Users and personas
  - P4 Positioning and operating context
  - P5 Product principles
  - P6 Pricing and unit economics
  - P7 Website stats and "How it works" copy
  - P8 Terminology, privacy and honesty rules
- **Part 2: Security-first engineering specification (SPEC v2)**: §0 changes from the PDF · §1 product · §2 architecture · §3 threat model · §4 security architecture · §5 features · §6 money rules · §7 data model · §8 API · §9 setup · §10 web build plan · §11 Android terminal · §12 research · §13 unique features · §14 open decisions
- **Part 3: Design brief**
  - D1 The design doc set
  - D2 Audience, goal and landing strategy
  - D3 Brand asset
  - D4 The user's taste and design playbook
  - D5 Hard design constraints and quality bar
  - D6 Accessibility and inclusion
  - D7 How each design doc is written
- **Appendices**: A Team · B What the v1 PDF specified that v2 replaced

---

# Part 1: Product

## P1. Executive summary

FingerPay removes checkout friction in everyday Pakistani retail: neighbourhood kiryana stores, bakeries, milk shops and university canteens. Today digital payments often slow the queue down instead of speeding it up:
- Shopkeepers spend each evening checking 20+ doubtful transfer screenshots, and hunt for change on PKR 1,000 notes.
- Shoppers leave their phones at home on quick morning errands, run out of battery, or carry non-PTA phones that can't receive SIM OTPs for mobile banking.

FingerPay replaces phones, cards, PINs, QR codes and cash with one thumb tap:
1. A shopper links their thumb once at an Allied Bank branch, against their NADRA CNIC and Allied Bank account.
2. At any participating counter, the cashier enters the bill and the shopper taps their thumb.
3. The Risk Engine matches the thumb, checks balance and fraud rules, and settles the payment (Raast, simulated in the prototype).
4. A bold confirmation appears on the merchant's own screen in under 3 seconds, and the shopper gets an SMS receipt.

| Area | Decision |
|---|---|
| Primary motive | A checkout under 3 seconds with no phone, card or cash, that gives merchants certainty on their own screen and gives shoppers effortless daily spending |
| Stack | Next.js 16 on Vercel + Supabase Postgres (replaces the PDF's Python/FastAPI; see §0 row 10) |
| Database | Postgres, with a double-entry, append-only ledger enforced by the database itself (§4.2, §7) |
| Hardware | On-screen simulation triggers for the web prototype. The R307 scanner is a bench demo only; production needs a certified secure scanner (§4.4, §11) |
| Scope now | Website + demo console + API. The Android merchant terminal comes after (§11) |

## P2. The problem

Existing payment methods in Pakistan fail high-frequency micro-retail:
- **Cash:** change shortages and theft risk.
- **QR and wallet transfers:** need a smartphone, mobile data, multi-step PIN entry and screenshot checking.
- **Card POS machines:** merchant discount rates of 2.0–2.5%, and the shopper must carry a debit card.

Net margins in Pakistani groceries sit between 8% and 12%, so shopkeepers reject 2.5% card machines.

## P3. Users and personas

**Who uses FingerPay**
- **Website visitors (first audience): competition judges and investors.** They watch a pitch or open the link, and must leave understanding the idea and believing it is real and safe. The site needs no sign-up or form.
- **Merchant staff:** kiryana, bakery and campus-canteen owners and cashiers, taking payments at a busy counter. Owners also read the day's ledger and settlement.
- **Shoppers:** salary-account holders and students, many on non-PTA phones with no data plan. They pay with a thumb only and get receipts by SMS. Shoppers have no app, by design.
- **Bank staff:** Allied Bank (proposed partner) branch officers and managers who enroll shoppers, plus bank admins and auditors. They use web consoles with MFA.

**Demo personas** (fictional, seeded in every demo database; balances and accounts in §9.3)

| Persona | Profile | Pain points and what the prototype must show |
|---|---|---|
| **Rasheed Ahmed**, merchant, 52, Johar Town, Lahore | Kiryana store owner with one helper, open 7 AM–11 PM. Basic WhatsApp user. Allied Bank business account | Hates fake screenshots, phone juggling and PKR 1,000 change. Needs a bold on-screen confirmation, same-day settlement, and an immediate TAKE CASH alert if the internet drops |
| **Ayesha Khan**, everyday shopper, 34, Bahria Town, Lahore | Primary schoolteacher and mother of two. Allied Bank salary account. Moderate tech comfort | Leaves her phone on the kitchen table on morning bread and milk runs. Needs one-tap checkout, strict privacy, SMS receipts and first-purchase cashback |
| **Bilal Hussain**, phone-free payer, 21, hostel near Johar Town | BS university student. Allied Bank student account. Non-PTA, Wi-Fi-only phone | Locked out of mobile banking because he has no local SIM for OTPs. Needs phone-free payments at campus canteens, student referrals, and a clear instant decline when his balance is low |

## P4. Positioning and operating context

**Positioning**
- The thumb is the whole wallet: no phone, card, PIN or cash at the counter.
- Every shopper feature works over plain SMS: receipts, Reply DISPUTE, Reply LOCK. This includes non-PTA phones.
- No fingerprint image is ever stored. The database holds only a keyed HMAC of the scan token.
- Thumb Lock by SMS, inspired by real AePS cloned-fingerprint fraud (§12).
- The merchant gets certainty on their own screen: no transfer screenshots to check.

**Operating context**
- Counters in kiryana stores, bakeries and campus canteens during rush hour.
- Shopkeepers who use WhatsApp, not dashboards.
- Unreliable internet: the terminal says TAKE CASH and never queues a sale.
- Branch enrollment needs a NADRA CNIC check (simulated) and biometric consent.

## P5. Product principles

1. **Trust is the product.** Show the security mechanisms honestly. Never claim partnerships or results that don't exist.
2. **The counter moment rules.** Anything on the merchant side must work in under 3 seconds, mid-rush, at a glance.
3. **Inclusion over features.** If it can't work over SMS on a basic phone, it isn't a shopper feature.
4. **Privacy by default.** The merchant learns only what a sale needs.

## P6. Pricing and unit economics

The exact formulas, rounding and test vectors are in §6.1–6.2. This is the reasoning behind them.

| Parameter | Rule | Why |
|---|---|---|
| Micro-ticket waiver | 0% fee on bills ≤ PKR 100 | Builds the habit on tea, snacks and single bread or milk purchases |
| Standard fee (MDR) | 0.45% on bills above PKR 100, capped at PKR 25 | On a PKR 180 sale the fee is PKR 0.81 and Rasheed receives PKR 179.19 |
| Fee split | 70% FingerPay / 30% Allied Bank | On PKR 0.81, FingerPay books PKR 0.57 and the bank PKR 0.24, plus zero-cost CASA float |
| Declines | PKR 0, always | A low-balance decline never touches the shopper's balance |
| First-tap cashback | PKR 50 on the first payment of PKR 150 or more | Onboarding incentive, paid from the marketing pool |
| Student perks | 2% cashback (max PKR 20) + PKR 100 referral bonus | Paid on the referee's first payment, not at enrollment, so enrollment farming earns nothing (§6.2) |
| High-volume rebate | PKR 500 once a month at 500 settled transactions | Rewards high-volume merchants |
| Terminal rent | PKR 0 for the 90-day trial, then PKR 500/month | Displayed only; billing is out of prototype scope |

**Against card POS:** "5x cheaper" is fair against 2.0–2.5% card machines (4.4–5.6×). Don't compare against Raast QR, where SBP subsidises merchant payments until June 2026 (§12, §14 item 7).

## P7. Website stats and "How it works" copy

Use these on the website and dashboard counters. They come from the PDF §3 with the v2 corrections applied. Don't add any other stats.

| Stat | Value | Subtitle |
|---|---|---|
| End-to-end checkout speed | < 3 seconds | From thumb tap to bold on-screen confirmation and settlement |
| Customer hardware needed | 0 phones · 0 cards · 0 cash | Works when the shopper's phone is at home, dead or non-PTA blocked |
| Fake screenshot risk | 0 screenshots checked | Replaces the 20+ transfer screenshots shopkeepers check every evening |
| Biometric privacy | 0 raw images stored | Only a keyed HMAC of the scan token is kept, never a fingerprint image |
| Target ticket size | PKR 150–180 | Daily bread, milk, eggs and canteen snacks, without PKR 1,000 change trouble |
| Kiryana operating window | 7:00 AM – 11:00 PM | Built for morning school runs and evening grocery rushes |
| Merchant fee | 0.45% (0% on bills ≤ PKR 100) | 5x cheaper than 2.0–2.5% card POS machines |
| Settlement | Instant, account to account (simulated Raast) | Straight into the merchant's Allied Bank business account |

**"How it works" in 4 steps (ready to paste)**
1. **Shopkeeper enters the amount.** The cashier types the bill total on the FingerPay terminal (for example PKR 180) and presses Charge.
2. **Customer taps their thumb.** The shopper places their thumb on the scanner. No smartphone, mobile data, QR scan, card or PIN is needed.
3. **Risk Engine verifies and settles.** FingerPay matches the thumb, checks the linked Allied Bank balance and risk rules, and moves the money instantly via SBP Raast (simulated).
4. **Confirmed in under 3 seconds.** "Payment Successful — PKR 180 Received" appears on the shop's own screen, and an SMS receipt goes to the shopper.

**Example shopper SMS receipt:** "Allied Bank FingerPay: PKR 180.00 paid at Rasheed Kiryana Store via Raast Ref #RST-99281. Cashback Earned: PKR 50.00. Available Balance: PKR 14,870.00." (The shopper's balance appears only in their own SMS, never on a merchant screen.)

## P8. Terminology, privacy and honesty rules

**Terminology**
- Call it the "Risk Engine", never "AI".
- Fee: 0.45% on sales above PKR 100, capped at PKR 25. Declines charge PKR 0.
- Per-tap limits: PKR 5,000 for salary accounts, PKR 2,000 for students.

**Privacy rules for every screen**
- No shopper names on declines.
- No shopper balance on any merchant screen.
- Shoppers shown as first name and initial.
- Phone and CNIC shown as last 4 digits only.

**Honesty rules**
- All bank, identity (NADRA) and payment (SBP Raast) integrations are simulated, and labelled so.
- Allied Bank, NADRA and SBP Raast are *proposed* partners. No partner logos.
- There are no real customers, testimonials, partner agreements, press or photography. Don't invent any.
- Money is an exact decimal computed in the database. The UI only displays it.

---

# Part 2: Security-first engineering specification (SPEC v2)

> Status v2.0, 2026-11-18. Copied from `docs/SPEC.md`, which stays the source of truth for the build. Section numbers (§) are kept, so cross-references work. "PDF §n" means the original project report, now merged into Part 1.
>
> **Database:** written, not just described: [`supabase/migrations/`](../supabase/migrations/), tested by [`supabase/tests/fp_db.test.mjs`](../supabase/tests/fp_db.test.mjs) (`npm run test:db`, 97 checks, real Postgres 18 via PGlite). Visual design is out of scope in this part; see Part 3.

## 0. What changed from the PDF, and why

Security is the top priority, so every row below is a deliberate correction. Items 1–9 are security fixes; 10–25 fix logic, privacy or honesty problems.

| # | PDF v1 said | Problem | v2 decision |
|---|---|---|---|
| 1 | NADRA / Allied Bank / Raast "gateways" are public routes (`POST /api/v1/gateways/raast/settle` …) | Anyone on the internet could call "settle" and move money | Gateways are internal. Money moves only inside one database function (`fp.api_thumb_pay`) reachable only by the server's restricted role |
| 2 | No login, roles or terminal identity anywhere | No way to tell a cashier from an attacker | Supabase Auth for staff (MFA for bank roles), signed requests from paired terminals, six roles (§4.1) |
| 3 | Store `SHA-256(cnic + salt + token)` and the POS "sends Ayesha's pre-seeded biometric hash" | The stored value *is* the credential: a database leak lets anyone pay as anyone. It is also inconsistent: the CNIC is not available at the till | Server-side HMAC-SHA256 with a key that never enters the database. The terminal sends a capture token; the database stores only `HMAC(key, token)` (§4.3) |
| 4 | "Irreversible SHA-256 hash" of a fingerprint | Two scans of one thumb are never byte-identical, so hashing cannot work for real biometrics. Fine for simulation only | Simulation is labelled as such. Real hardware needs template matching (§4.4) |
| 5 | CNIC, phone, account numbers in plain text, `UNIQUE` | PII exposed to anyone with database access | AES-256-GCM encryption in the app, HMAC "blind index" for uniqueness and lookup, last 4 digits for display |
| 6 | `nadra_verified BOOLEAN DEFAULT TRUE` | An unverified row looks verified by default | `nadra_ref` and `nadra_verified_at` are `NOT NULL`: no verification, no row |
| 7 | Balances are columns the code overwrites | No history, no proof, easy to tamper with | Double-entry ledger, append-only, enforced by the database itself; balance must equal the sum of its ledger lines |
| 8 | No audit trail | Insider changes are invisible | Hash-chained audit log; editing any row breaks the chain (tested) |
| 9 | Thumb-only payments up to PKR 10,000 with no PIN | Single factor. India's AePS shows cloned fingerprints drain accounts | PKR 5,000 per tap (salary) / PKR 2,000 (student), plus daily caps (§4.9) |
| 10 | Python / FastAPI backend | You asked for Supabase like your other projects; two backends is more attack surface | Next.js 16 route handlers on Vercel + Supabase Postgres, the same stack as PNLF |
| 11 | `transactions.raast_tx_ref NOT NULL` even for declines | Declines would need fake references | `payment_attempts`: every attempt logged, a Raast reference only on success |
| 12 | Duplicate-tap guard = same amount within 15 s | Doesn't stop a retried request for the same sale | Each sale is a server-issued charge session: retries replay the receipt, never debit twice. The 15 s guard stays as a second layer |
| 13 | `MERCHANT_BUSINESS` in the enrollment selector, but the `users` table forbids it | Contradiction | Shopper enrollment only. Merchants are onboarded separately (seeded for the prototype) |
| 14 | `processing_ms DEFAULT 420` | A fake speed number | Measured from request receipt to settlement |
| 15 | Fee split rounding unspecified | Two independent roundings can drift by a paisa | Bank share = fee − FingerPay share; half-up rounding (§6.1) |
| 16 | Cashback stacking undefined; Bilal seeded `first_tx_completed = FALSE` | Bilal's demo would earn PKR 50, not the 2% the PDF shows | First-tap bonus and student 2% never stack; Bilal is seeded as an existing user |
| 17 | Offline logged server-side as a transaction from `merchants.terminal_status` | An offline terminal cannot reach the server, and offline is per device | The terminal detects offline, shows TAKE CASH, uploads an informational event later |
| 18 | Merchant ledger shows shopper name + masked CNIC | A shop has no need for a CNIC; showing names on declines leaks "this person is broke" | First name + initial, settled sales only. No CNIC, no shopper balance on any merchant screen |
| 19 | No refunds or voids | A mistyped PKR 1,800 could only be fixed by editing the ledger | Same-day void (owner) and dispute refunds with maker-checker approval |
| 20 | "Flag double charge" button next to any SMS | No owner, no limit | Modelled as the shopper replying DISPUTE to that SMS; one open dispute per payment |
| 21 | "AI Core" / "AI Risk Engine" | It is a rules engine | Call it the Risk Engine. Technical judges will ask |
| 22 | "In partnership with Allied Bank, NADRA and SBP Raast" | Unless signed, claiming this publicly is misleading | "Proposed partners", every integration labelled *simulated*, no logos, disclaimer on the site (§10.6) |
| 23 | R307 USB scanner | UART module, matches on the chip, no liveness detection | Fine for a bench demo; production needs a certified secure scanner (§4.4) |
| 24 | ABL shopper → ABL merchant "over Raast" | Same-bank transfers normally settle on the bank's own books | Keep the "Raast (simulated)" label; Raast matters once merchants bank elsewhere |
| 25 | Seed hashes in `seed.sql` | Secret-derived values would sit in git | The seed script enrolls personas through the real enrollment API |

---

## 1. Product (unchanged in spirit)

**Motive:** a phone-free, card-free, cash-free checkout under 3 seconds for kiryana stores, bakeries and campus canteens. The merchant gets certainty on their own screen; the shopper pays with a thumb.

**Loop:** cashier enters the amount → shopper taps their thumb → the Risk Engine checks and settles → bold confirmation on the shop screen + SMS receipt to the shopper.

**Six pillars** (PDF §2), restated honestly:
1. Your thumb is your wallet: no phone, card, PIN or cash at checkout.
2. Merchant screen certainty: no transfer screenshots to check.
3. Non-PTA phone inclusion: every shopper feature works over plain SMS.
4. No raw fingerprint images, ever, anywhere (§4.4).
5. Instant settlement into the merchant's bank account (simulated Raast in the prototype).
6. Instant offline clarity: if the internet drops, the terminal says TAKE CASH. Nothing is ever left pending.

**Personas** (PDF §4) stay: Rasheed Ahmed (merchant), Ayesha Khan (salary shopper), Bilal Hussain (student, non-PTA phone).

---

## 2. Architecture

```
 Shopper's thumb                     Branch officer (MFA)          Auditor / bank admin (MFA)
       │                                    │                                │
 ┌─────▼──────────────┐            ┌────────▼─────────┐            ┌─────────▼────────┐
 │ Merchant terminal  │            │ Branch portal    │            │ Bank console     │
 │ (browser now,      │            │ (web)            │            │ (web)            │
 │  Android later)    │            └────────┬─────────┘            └─────────┬────────┘
 │ ECDSA P-256 key,   │   signed requests   │   Supabase session (cookies)   │
 │ non-extractable    ├─────────────┐       │                                │
 └────────────────────┘             ▼       ▼                                ▼
                         ┌──────────────────────────────────────────────────────────┐
                         │ Next.js 16 on Vercel (region sin1)                       │
                         │  • verifies Supabase JWT (+ AAL2), terminal signature    │
                         │  • zod validation, rate limits, security headers         │
                         │  • crypto: AES-256-GCM, HMAC (keys from env, never DB)   │
                         │  • simulated NADRA + SMS gateways (server modules)       │
                         └──────────────┬───────────────────────────────────────────┘
                                        │ Postgres over TLS, role fp_app (EXECUTE fp.api_* only)
                         ┌──────────────▼───────────────────────────────────────────┐
                         │ Supabase (ap-southeast-1, like PNLF)                     │
                         │  Auth: staff accounts, TOTP MFA, sign-ups disabled       │
                         │  Postgres private schema `fp` (not exposed to Data API): │
                         │   ledger · attempts · audit chain · RLS deny-all         │
                         └──────────────────────────────────────────────────────────┘
```

**Why this shape**
- **Same stack as PNLF** (Next.js + `@supabase/ssr` + Supabase Auth + Vercel), so the team already knows it.
- **Business logic lives in Postgres functions.** One checkout = one database round trip, so the < 3 s target holds even across regions. The database enforces its own invariants no matter what the app code does.
- **Keys stay out of the database.** Encryption and HMAC run in the Next.js server; a database dump alone reveals neither PII nor usable thumbs.
- **Co-locate:** Vercel functions in `sin1` (Singapore), next to Supabase `ap-southeast-1`.

**Repository layout** (PNLF-style)
```
FingerPay/
  docs/SPEC.md                    ← this file
  supabase/migrations/            ← schema + security + API (source of truth for data)
  supabase/tests/fp_db.test.mjs   ← database test suite (npm run test:db)
  src/app/                        ← Next.js routes: marketing site, demo console, /api/v1
  src/lib/supabase/               ← copied from PNLF (client.ts, server.ts, middleware.ts), fail-closed
  src/lib/fp/                     ← crypto.ts, db.ts, terminal-auth.ts, gateways/, errors.ts
  scripts/seed-demo.ts            ← creates staff (Auth admin API) + personas via the real API
  android/                        ← later (§11)
```

---

## 3. Threat model

**Assets:** shoppers' and merchants' money · biometric identifiers · CNIC, phone and account numbers · terminal keys · staff accounts · integrity of the ledger and audit log · checkout availability.

**Adversaries:** internet attacker · malicious merchant or cashier · thief with a stolen terminal phone · fraudster with a cloned fingerprint · insider with database access · someone holding a leaked API key.

| ID | Threat | Controls | Verified by |
|---|---|---|---|
| T1 | Forged debit through the API | No public settle route. `fp_app` may only EXECUTE `fp.api_*`. Terminal signature + nonce + 60 s window | `fp_app can execute only fp.api_*`, `fp_app cannot call post_journal directly` |
| T2 | Replay of a captured request | ECDSA signature covers timestamp + nonce + body hash; nonce stored, single use | `replayed nonce rejected`, `stale signed timestamp rejected` |
| T3 | Database dump leaks thumbs / CNICs | HMAC keys and AES keys live only in server env; blobs are AES-256-GCM; DB `CHECK`s reject non-encrypted values | Design + format `CHECK`s |
| T4 | Leaked `anon` or `service_role` key | Schema `fp` not exposed to the Data API; those roles have no USAGE on it | `anon and service_role cannot even see schema fp`, `service_role cannot call FingerPay functions` |
| T5 | Merchant charges a shopper who isn't there | Fresh capture per charge (hardware), per-tap + daily limits, SMS on every payment and decline, reply DISPUTE, refunds | Limit and SMS tests |
| T6 | Cashier refunds or voids to themselves | Reversals pay back only the original payer. Void = owner only, same day. Refund = maker + different checker | `cashier cannot void`, `maker cannot approve their own refund` |
| T7 | Double charge (double tap, retry, race) | Charge sessions are idempotent; shopper row locked; 15 s duplicate guard | `retrying a paid charge replays the receipt`, `replay did not debit twice`, duplicate test |
| T8 | Overdraft by racing two payments | Row locks in fixed order; balance re-checked inside `post_journal`; `CHECK (balance >= 0)` | Design; concurrency test runs in CI on real Postgres (§10, M1) |
| T9 | Insider edits the ledger or audit log | Append-only triggers (even for the owner), no UPDATE grants, hash chain + verifier; anchor the chain head daily (§4.10) | `ledger lines cannot be updated, even by the owner`, `superuser tampering with audit row 5 is detected` |
| T10 | Guessing thumbs at a terminal | 3 attempts per charge, then locked; 10 unknown thumbs in 10 min pauses the terminal | `charge locks after 3 failed thumbs`, `terminal paused …` |
| T11 | Cloned / silicone fingerprint (AePS-style) | Thumb Lock by SMS, low limits, alerts to the real owner; production scanners with presentation-attack detection | `locked thumb is declined`, `… security alert SMS` |
| T12 | Wrong person matched at scale (1:N) | Production uses a claimed identity (1:1); see §4.4 | Decision for the team (§14) |
| T13 | Stolen terminal phone | Owner revokes the device key; every till action also needs a staff login; key is non-extractable | `api_revoke_terminal`; design |
| T14 | Stolen staff password | TOTP MFA (AAL2) for bank roles; sign-ups disabled; short JWTs; CAPTCHA on login | Supabase settings checklist (§4.7) |
| T15 | XSS, CSRF, clickjacking | Strict CSP with nonces, SameSite=Strict cookies, Origin check, `frame-ancestors 'none'` | M1 header test |
| T16 | One store reads another store's data (IDOR) | Database derives the store from the authenticated actor; never takes a `merchant_id` from the client | `bank staff cannot read a store ledger via the merchant API` |
| T17 | Privacy leak to the merchant | No shopper names on declines; no shopper balance on any merchant screen | `declines never show the shopper name …`, `ledger hides shopper names …` |
| T18 | Secrets or PII in logs | Structured logs with a redaction list; tokens, CNICs, phones never logged | M1 log-redaction test |
| T19 | CSV formula injection in the ledger export | Cells starting with `= + - @ TAB CR` are prefixed with `'` | M2 test |
| T20 | Supply-chain attack | Lockfiles, `npm audit` + Dependabot in CI, secret scanning (gitleaks) | CI |
| T21 | Abuse / denial of service | Postgres-backed rate limits, Vercel Firewall rules, 16 KB body limit, `statement_timeout` 5 s for `fp_app` | M1 |
| T22 | Demo shortcuts left on in production | Demo routes need `FP_DEMO_MODE=true` **and** a staff session; the demo DB grant is applied only by the demo seed; startup refuses demo mode when `FP_ENV=production` | `demo finger tray is not granted by migrations` |

---

## 4. Security architecture

### 4.1 Identities and roles

| Who | How they prove it | Roles |
|---|---|---|
| Staff | Supabase Auth email + password; **TOTP MFA (AAL2) required** for bank roles; public sign-ups **disabled** | `BRANCH_OFFICER`, `BRANCH_MANAGER`, `BANK_ADMIN`, `AUDITOR` (MFA required) · `MERCHANT_OWNER`, `MERCHANT_CASHIER` (MFA optional) |
| Terminal | ECDSA P-256 key pair created on the device, private key non-extractable; public key registered by the store owner | Bound to exactly one store |
| Shopper | Their thumb at a terminal; their registered phone for SMS replies | No login and no app, by design |

**Permission matrix** (enforced inside each database function, re-checked by route guards)

| Action | Cashier | Owner | Branch officer | Branch manager | Bank admin | Auditor |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Open charge / take payment | ✅ | ✅ | | | | |
| Read store ledger & summary | ✅ | ✅ | | | | |
| Export ledger CSV, void same-day sale, pair/revoke terminal | | ✅ | | | revoke | |
| Enroll shopper, look up shopper, lock/unlock thumb | | | ✅ | ✅ | lock/unlock | |
| Request refund (maker) | | | ✅ | | ✅ | |
| Approve/reject refund (checker, must differ from maker) | | | | ✅ | ✅ | |
| SMS feed, open disputes | | | ✅ | ✅ | ✅ | ✅ |
| Audit log, integrity check | | | | | ✅ | ✅ |

### 4.2 Database security (implemented)

- **Private schema `fp`.** Never listed in Supabase's exposed schemas; `anon`, `authenticated` and `service_role` have no USAGE on it. A leaked Supabase key cannot touch money.
- **Least-privilege app role `fp_app`.** It may EXECUTE the vetted `fp.api_*` functions and nothing else: no SELECT, INSERT, UPDATE or DELETE on any table. It has `statement_timeout 5s`, `lock_timeout 3s` and `idle_in_transaction_session_timeout 15s`.
- **The database is the API.** Each `fp.api_*` function is `SECURITY DEFINER` with `search_path = ''` and fully qualified names, the PNLF convention. Each one re-derives scope from the actor (`fp.require_staff`) or the terminal (`fp.terminal_guard`), so even a buggy route handler cannot cross stores.
- **RLS is on for every table, with no policies.** That makes it deny-all as defence in depth, in case any role is ever granted table access by mistake. Supabase's advisor will list these as "RLS enabled, no policy" (INFO). That is intentional.
- **Double-entry ledger.** `fp.post_journal` is the only code that changes a balance. It needs ≥ 2 lines summing to zero, locks accounts in a fixed order, and re-checks funds. A deferred constraint trigger rejects any unbalanced journal at COMMIT, even one written by the owner.
- **Append-only:** `journals`, `journal_entries`, `payment_attempts`, `audit_log` reject UPDATE, DELETE and TRUNCATE.
- **Tamper-evident audit:** each row's `row_hash = sha256(prev_hash ‖ canonical row)`. `fp.verify_audit_chain()` finds the first broken row; `fp.verify_balances()` finds any balance that doesn't match its ledger.
- **Rules enforced as constraints**, so code cannot break them:
  - a decline always has 0 fee and 0 cashback, and no Raast reference
  - `net = gross − fee` and `fee = FingerPay share + bank share`
  - money has at most 2 decimals and balances cannot go negative (except the simulation's opening-equity account)
  - maker ≠ checker
  - one live reversal per sale, and one open dispute per payment
  - one open charge per terminal
  - a terminal key must be a P-256 public key

### 4.3 Cryptography (server)

| Purpose | Algorithm | Key | Stored as |
|---|---|---|---|
| PII (full name, CNIC, phone, account no.) | AES-256-GCM, 96-bit random nonce, AAD = `fp:v1:<table>:<column>:<row id>` | `FP_KEYRING` (versioned, rotatable) | `0x01 ‖ key version (2 B) ‖ nonce (12 B) ‖ ciphertext ‖ tag (16 B)` |
| CNIC / account number lookup ("blind index") | HMAC-SHA256 over the normalized value (13 CNIC digits; account no. uppercased, no spaces) | `FP_LOOKUP_KEY` (long-lived) | 32 bytes, `UNIQUE` |
| Thumb lookup | HMAC-SHA256 over the capture token | subkey of `FP_LOOKUP_KEY` (`thumb-v1`), version in `thumb_key_version` | 32 bytes, `UNIQUE` |
| Demo thumb token | HMAC-SHA256(`FP_DEMO_KEY`, `"cust:" + customer_id`); "unregistered" = 32 random bytes | `FP_DEMO_KEY` (demo deployments only) | never stored |

- Subkeys come from HKDF-SHA256 with distinct `info` labels, so a key is never used for two purposes.
- The AAD binds each ciphertext to its row and column. Copying Ayesha's encrypted CNIC into Bilal's row fails decryption.
- **Rotation:**
  - Encryption keys rotate by adding a version and re-encrypting lazily on read, or by batch.
  - CNIC and account indexes can be rebuilt by decrypting.
  - Thumb lookups **cannot** be rebuilt, because the tokens are never stored. Instead, on a successful tap under the old key version, the server recomputes the lookup under the new version (lazy migration).
- **Where the keys live:** Vercel environment variables marked *Sensitive*, and a local `.env.local` (gitignored). `shortcut: keys held in env vars; move to a cloud KMS with envelope encryption before any real customer data.`
- Node's built-in `crypto` covers all of this. No crypto dependency is added.

### 4.4 Biometrics

**Never, anywhere:** raw fingerprint images, base64 images, or `BYTEA` blobs of images in the database, payloads or logs. In the prototype, a thumb is a 32-byte simulation token. The database stores only `HMAC(key, token)`.

**Why simulation hashing doesn't carry over to real fingerprints.** Each scan of a thumb produces a slightly different image and template. Matching is a similarity score against a stored template, not an equality check. A real system needs:
1. **A secure scanner.** In India, the UIDAI "L1 registered device" model requires the scanner to sign and encrypt each capture inside a trusted execution environment or secure element, with liveness detection, so the host phone cannot inject or replay a capture.
2. **Server-side matching** against encrypted templates (ISO/IEC 19794-2 format), e.g. a vendor SDK or the open-source SourceAFIS. Templates are encrypted with the PII keyring.
3. **Presentation-attack detection** tested to ISO/IEC 30107-3, and a measured false-match rate of 1 in 10,000 or better (the NIST and FIDO benchmark).

**The 1:N problem (the biggest production decision).** Thumb-only means comparing one finger against every enrolled user. The chance that a random wrong thumb matches *someone* is 1 − (1 − FMR)^N:

| Enrolled users N | FMR 1 in 10,000 | FMR 1 in 100,000 |
|---:|---:|---:|
| 1,000 | 9.5% | 1.0% |
| 10,000 | 63.2% | 9.5% |
| 100,000 | 99.99% | 63.2% |

So thumb-only identification works for a demo or a single campus, but not for a city. **Production option that stays phone-free:** the shopper types the last 4 digits of their CNIC or phone on the till keypad, then taps (1:1 verification). The alternative is two fingers. The API already separates "capture" from "lookup", so either choice fits without schema changes.

**R307 assessment** (the PDF's scanner):
- **Interface:** UART at TTL level (default 57,600 baud), so it needs a USB-TTL adapter (CP2102/CH340) to reach an Android phone over OTG.
- **Matching:** on the module itself, against a local library of up to 1,000 templates in a proprietary format.
- **Missing:** liveness detection and a secure element.

Verdict: fine for a bench demo of "real hardware", but not secure enough for real money. If you demo it, set the module password and treat it as a capture device only.

### 4.5 Terminal request signing

**Pairing.** The store owner signs in on the device. The device generates a key pair:
- **Browser:** WebCrypto `generateKey({name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign'])`, stored in IndexedDB.
- **Android:** Keystore, using StrongBox when available.

The device sends its SPKI public key to `POST /api/v1/terminals/pair`, which calls `fp.api_pair_terminal`. Only the key's SHA-256 is written to the audit log.

**Every terminal request** carries:
```
X-FP-Terminal:  <terminal uuid>
X-FP-Timestamp: <ISO-8601 UTC, ms>
X-FP-Nonce:     <base64url, 16 random bytes>
X-FP-Signature: <base64url, ECDSA P-256 / SHA-256, IEEE-P1363 r‖s (64 bytes)>

signed string = "FPv1\n" + METHOD + "\n" + path?query + "\n" + terminal + "\n"
              + timestamp + "\n" + nonce + "\n" + base64url(SHA-256(body))
```

**Server order of checks:**
1. Strict header parse.
2. Rate limit.
3. Fetch the public key with `fp.api_terminal_auth` (cache ≤ 30 s, so a revocation takes effect within 30 s).
4. `crypto.verify('sha256', …, {dsaEncoding: 'ieee-p1363'})`.
5. Verify the cashier's Supabase session.
6. Call the database. The database enforces terminal and store status, the 60 s window and nonce uniqueness inside the same transaction as the action.

Failures return a generic 401 and are logged as security events.

### 4.6 Web application security

- **Headers** (Next.js middleware, extending PNLF's):
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'nonce-{n}' 'strict-dynamic'; style-src 'self' 'nonce-{n}'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://<project>.supabase.co; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`. Add `require-trusted-types-for 'script'` if Next.js and Astryx run clean under it; drop it with a note if not.
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
  - `Cross-Origin-Opener-Policy: same-origin`
  - Drop PNLF's deprecated `X-XSS-Protection`.
- **Cookies:** Supabase SSR cookies with `Secure`, `SameSite=Strict`, `HttpOnly` where the library allows.
- **CSRF:** every state change is a `POST` with a JSON body. An `Origin` allowlist check backs up SameSite=Strict.
- **Input:** a zod schema (`.strict()`) on every route, as in PNLF. Bodies are capped at 16 KB. Amounts travel as strings and are parsed to exact decimals, never JavaScript floats.
- **Errors:** database SQLSTATEs map to HTTP: FP400 → 400, FP401 → 401, FP402 → 402, FP403 → 403, FP404 → 404, FP409 → 409, FP423 → 423. Anything else → 500 with a correlation id. No SQL text ever reaches the client.
- **Logging:** structured JSON with a redaction list (`authorization`, `cookie`, `cnic`, `phone`, `token`, `thumb`, `account`, `password`, `x-fp-signature`). Security events (signature failure, replay, throttle, rate limit, MFA failure) go to a separate stream.
- **CSV export:** quote every cell; escape cells starting with `= + - @ TAB CR`.
- **Supabase clients copied from PNLF:** `client.ts`, `server.ts`, `middleware.ts`. One change: **fail closed.** In production, a missing environment variable throws instead of falling back to `placeholder.supabase.co`. `service.ts` (the service-role client) is **not** copied into the app.

### 4.7 Supabase hardening checklist

- [ ] Project `fingerpay`, region **ap-southeast-1** (same as PNLF). Vercel function region **sin1**.
- [ ] Data API exposed schemas: leave the default; **never add `fp`**. Keep `public` empty.
- [ ] Auth:
  - [ ] Sign-ups **off**.
  - [ ] TOTP MFA **on**.
  - [ ] Password minimum 12 characters, with mixed character classes.
  - [ ] CAPTCHA (Cloudflare Turnstile) on sign-in.
  - [ ] JWT expiry **900 s**.
  - [ ] Refresh-token rotation on, reuse interval 10 s.
  - [ ] Unused providers off.
- [ ] Pro plan (recommended before demo day): leaked-password protection, session inactivity timeouts, daily backups, point-in-time recovery, and no auto-pause. *The free plan pauses a project after a week of inactivity. Wake it before any demo.*
- [ ] Database: **enforce SSL**. Give `fp_app` LOGIN with a ≥ 32-character random password, set once by hand (§9.2). Connect through the Supavisor transaction pooler (port 6543, user `fp_app.<project-ref>`, `prepare: false`).
- [ ] Network restrictions: allowlist once you have static egress IPs. `shortcut: open to the internet behind SSL + password; restrict when Vercel static IPs or a self-hosted runner exists.`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **never** deployed to Vercel. Only the local seed/admin script uses it.
- [ ] After every migration, run the Supabase Security Advisor. The only expected findings are the INFO-level "RLS enabled, no policy" on `fp` tables.
- [ ] Data residency: Singapore is fine with fake data. Real CNICs and biometrics will likely need in-country hosting and SBP outsourcing approval (§14).

### 4.8 Secrets and environments

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + local | Auth only. The anon key cannot reach `fp` |
| `FP_DATABASE_URL` | Vercel (Sensitive) + local | `fp_app` via the pooler, `sslmode=verify-full` |
| `FP_KEYRING` | Vercel (Sensitive) + local | `{"active":1,"keys":{"1":"<base64 32 bytes>"}}` |
| `FP_LOOKUP_KEY` | Vercel (Sensitive) + local | base64, 32 bytes; long-lived |
| `FP_ENV` | all | `development` / `staging` / `production` |
| `FP_DEMO_MODE`, `FP_DEMO_KEY`, `FP_DEMO_OBSERVER_ID` | demo deployments only | Startup refuses demo mode when `FP_ENV=production` |
| `SUPABASE_SERVICE_ROLE_KEY` | local only | Seed and admin scripts. Never in Vercel |

Three separate Supabase projects or branches (dev, staging, prod), each with its own keys. Production data never goes into staging.

### 4.9 Fraud and risk controls (the Risk Engine)

| Control | Rule (default) | Where |
|---|---|---|
| Per-tap limit | Salary PKR 5,000 · Student PKR 2,000 | `fp.account_limits` |
| Daily caps | Salary PKR 15,000 / 20 taps · Student PKR 5,000 / 15 taps (Asia/Karachi day) | same |
| Duplicate tap | Same shopper + store + amount succeeded < 15 s ago → `DECLINED_DUPLICATE_TAP` | `api_thumb_pay` |
| Idempotent charge | Retrying a paid charge returns the original receipt | `api_thumb_pay` |
| Attempts per charge | 3, then the charge locks | `charge_sessions` |
| Terminal throttle | ≥ 10 unknown thumbs in 10 min → paused | `api_thumb_pay` |
| Thumb Lock | Shopper replies LOCK to any FingerPay SMS; only a branch can unlock | `api_sms_reply`, `api_set_thumb_lock` |
| Owner alerts | SMS on every payment, every matched decline, and any attempt on a locked thumb | `fp.sms_outbox` |
| Disputes | Reply DISPUTE; one ticket per payment; refunds need two people | `api_sms_reply`, `api_request_refund`, `api_decide_refund` |
| Duplicate enrollment | Same thumb, CNIC or account on a second customer → refused and audited | `api_enroll_customer` |

### 4.10 Known shortcuts (each has an upgrade trigger)

| Shortcut | Limit | Upgrade when |
|---|---|---|
| Keys in env vars | Anyone with Vercel admin access can read the env | Before any real customer data → cloud KMS (envelope encryption) |
| One global audit chain | Serializes audit writes (~hundreds/s) | Above pilot volume → one chain per day, chained daily |
| Audit chain not anchored externally | A superuser could rewrite the whole chain and its head consistently | Pilot → publish the daily head hash (e-mail to compliance, or a write-once bucket) |
| Thumb-only 1:N | False matches grow with users (§4.4) | Above ~1,000 users → 1:1 claim or two fingers |
| Simulated NADRA / bank / Raast / SMS | Not real verification or settlement | Partnership → real gateways behind the same server modules |
| Database open to the internet (SSL + password) | Brute force is still possible in theory | Static egress IPs → Supabase network restrictions |
| Concurrency tested by design, not load | PGlite is single-connection | M1 adds a parallel-payment test on real Postgres in CI |

---

## 5. Features (corrected list)

### View A — Merchant POS terminal (cashier or owner, signed terminal)
- Amount: `[0–9]` keypad, `[Clear / Backspace]`, presets `[PKR 80] [PKR 150] [PKR 180] [PKR 500]`.
- `[Charge / Await Thumb Tap]` → opens a server charge session (120 s expiry) → state `WAITING_FOR_THUMB`.
- Simulation triggers (demo mode):
  - `[Simulate Thumb Tap: Ayesha Khan (Valid Shopper)]` → PAYMENT SUCCESSFUL — PKR 180 RECEIVED, net PKR 179.19, PKR 50 first-tap cashback.
  - `[Simulate Thumb Tap: Bilal Hussain (Student Account)]` → success + 2% cashback.
  - `[Simulate Thumb Tap: Low Balance Decline]` → Bilal at PKR 500 → PAYMENT DECLINED: INSUFFICIENT BALANCE (PKR 0 FEE CHARGED).
  - `[Simulate Thumb Tap: Unregistered Thumb]` → THUMB NOT RECOGNIZED — ENROL AT ALLIED BANK BRANCH.
  - **New:** every shopper enrolled in View C appears in the "finger tray" at once.
- `[Toggle Internet Down / Offline Fallback]` → INTERNET DOWN — TAKE CASH IMMEDIATELY (SALE NOT CHARGED). Nothing is queued; an informational event uploads on reconnect.
- `[Cancel / New Sale]` → back to `IDLE`.
- Shows: store name (from the paired terminal, which replaces the PDF's merchant selector), Online/Offline indicator, result banner, measured processing time.
- **Banner copy** (the UI maps database outcome codes to text, so Urdu can be added later):

| Outcome | Banner |
|---|---|
| `SUCCESS` | PAYMENT SUCCESSFUL — PKR {amount} RECEIVED |
| `DECLINED_LOW_BALANCE` | PAYMENT DECLINED: INSUFFICIENT BALANCE (PKR 0 FEE CHARGED) |
| `DECLINED_UNREGISTERED_THUMB` | THUMB NOT RECOGNIZED — ENROL AT ALLIED BANK BRANCH |
| `DECLINED_DUPLICATE_TAP` | DUPLICATE TAP BLOCKED — THIS SALE WAS ALREADY PAID |
| `DECLINED_LIMIT` | PAYMENT DECLINED: ABOVE THUMB-PAY LIMIT (PKR 0 FEE CHARGED) |
| `DECLINED_THUMB_LOCKED` | PAYMENT DECLINED: THUMB PAYMENTS ARE LOCKED BY THE OWNER |
| `DECLINED_ACCOUNT_INACTIVE` | PAYMENT DECLINED: ACCOUNT NOT ACTIVE |
| `DECLINED_TERMINAL_THROTTLED` | TOO MANY UNKNOWN THUMBS — TERMINAL PAUSED FOR 10 MINUTES |
| `CHARGE_LOCKED` / `CHARGE_EXPIRED` / `CHARGE_CANCELLED` | START A NEW SALE |
| offline (client) | INTERNET DOWN — TAKE CASH IMMEDIATELY (SALE NOT CHARGED) |

### View B — Merchant daily ledger and settlement
- Table:
  - columns: time, shopper (first name + initial, settled rows only), gross, MDR fee, net to Allied Bank, Raast reference, status (`SETTLED`, `DECLINED`, `OFFLINE_CASH`, `REVERSED`)
  - today by default, using the Asia/Karachi day
- Counters: total gross sales, MDR fees saved vs a 2.5% card POS, Allied Bank balance, screenshots avoided (+1 per settled sale), this month's transaction count.
- Buttons: `[Refresh Ledger]`, `[Export Daily Settlement CSV]` (owner), **new** `[Void]` on a same-day sale (owner, reason required).

### View C — Allied Bank branch enrollment portal (branch officer, MFA)
- **Inputs:**
  - full name, 13-digit CNIC (`XXXXX-XXXXXXX-X`)
  - Allied Bank account number
  - account type (`SHOPPER_SALARY`, `STUDENT_NON_PTA`)
  - mobile number for SMS
  - opening balance (simulation)
  - optional student referral code
  - **new, required:** biometric consent checkbox (versioned)
- **Buttons:**
  1. `[Verify CNIC with NADRA Gateway]` → server NADRA simulator. It checks the format and returns `nadra_ref`; `00000-0000000-0` simulates "not found".
  2. `[Scan & Hash Thumbprint]` → demo token from the new customer id → HMAC lookup. No image anywhere.
  3. `[Link Allied Bank Account & Activate FingerPay]` → `fp.api_enroll_customer`. Duplicate thumb, CNIC or account is refused and audited. The shopper appears in the POS finger tray at once.
- **New:** customer lookup by CNIC, and Thumb Lock / Unlock.

### View D — Live SMS receipts and disputes
- Live feed of every SMS: receipts, decline notices, security alerts, enrollment, dispute and refund notices. Phone shown as last 4 digits only.
- Per receipt:
  - `[Reply DISPUTE]` (the PDF's "Flag Double Charge"): creates a ticket `ABL-DSP-YYYYMMDD-XXXXXXXXXXXX` and shows the tracking id.
  - **New:** `[Reply LOCK]`.
- **New (bank staff):** disputes queue → `[Request refund]` (maker) → `[Approve] / [Reject]` (a different checker).

### View E — Bank console (new; admin and auditor, MFA)
- Audit log tail (hash shown), `[Run integrity check]` (audit chain + ledger balances), revoke a terminal.

### View F — Public website
- "How it works" (4 steps), stats, pillars, personas, disclaimer (§10.6). Static content, no live database numbers on public pages.

---

## 6. Money rules

### 6.1 Fees, splits and rounding
```
fee  = 0.00                                   if gross ≤ 100.00
     = min(round_half_up(gross × 0.0045, 2), 25.00)   otherwise
fingerpay_share = round_half_up(fee × 0.70, 2)
bank_share      = fee − fingerpay_share       (remainder: the two always add up to the fee)
net_to_merchant = gross − fee
```
**Never use banker's rounding:** Python's `Decimal` defaults to half-even. Postgres `round(numeric)` is half away from zero, which equals half-up for these amounts. The database computes fees (`fp.mdr_breakdown`); the app only displays them.

Test vectors (asserted by `npm run test:db`):

| Gross | Fee | FingerPay 70% | Bank 30% | Net |
|---:|---:|---:|---:|---:|
| 50.00 | 0.00 | 0.00 | 0.00 | 50.00 |
| 100.00 | 0.00 | 0.00 | 0.00 | 100.00 |
| 100.01 | 0.45 | 0.32 | 0.13 | 99.56 |
| 130.00 | 0.59 *(0.585, half-up)* | 0.41 | 0.18 | 129.41 |
| 180.00 | 0.81 | 0.57 | 0.24 | 179.19 |
| 500.00 | 2.25 | 1.58 | 0.67 | 497.75 |
| 5,555.56 | 25.00 *(cap)* | 17.50 | 7.50 | 5,530.56 |
| 10,000.00 | 25.00 | 17.50 | 7.50 | 9,975.00 |

### 6.2 Cashback, bonuses, rebates
- **First-tap bonus:** PKR 50 if the shopper's *first* successful payment is ≥ PKR 150. Paid from the marketing pool.
- **Student cashback:** 2% (max PKR 20) for `STUDENT_NON_PTA` on payments that are not the first. **They never stack.**
- **Referral bonus:**
  - PKR 100 to the referring student, paid when the referee makes their first payment (not at enrollment, which blocks enrollment farming).
  - Clawed back if that payment is voided or refunded.
- **High-volume rebate:** PKR 500 once per store per month, when monthly settled transactions reach 500.
- **Marketing pool empty** → the payment still succeeds, without the bonus. A promotion never blocks a sale.
- **Terminal rent:** PKR 0 for the 90-day trial (`terminal_trial_ends_at`), then PKR 500/month. Displayed only; billing is out of prototype scope.

### 6.3 Payment pipeline (`POST /api/v1/pos/charges/{id}/thumb`)
1. *(Client)* If the terminal is offline: show TAKE CASH, store an offline event locally, send nothing.
2. Server: rate limit → verify terminal signature → verify cashier session.
3. Server: `thumb_lookup = HMAC(K_thumb, token)`. The token is never stored or logged.
4. Database `fp.api_thumb_pay`, **one transaction:**
   1. terminal guard (active terminal, active store, 60 s window, fresh nonce)
   2. lock the charge; replay the receipt if it is already paid; expire it if stale
   3. terminal throttle
   4. find and lock the shopper
   5. account status → Thumb Lock → duplicate tap → limits → balance
   6. fee and cashback
   7. post the journal (shopper −gross; merchant +net; FingerPay +70%; bank +30%; pool → shopper cashback)
   8. write the attempt row (measured `processing_ms`)
   9. first-payment flag → referral bonus → monthly stats and rebate
   10. SMS outbox → audit entry
5. The response carries the outcome code and receipt fields (no shopper balance). The UI shows the banner.

**Demo flow** (asserted by the test suite):

| Step | Ayesha | Bilal | Rasheed |
|---|---:|---:|---:|
| Seed | 15,000.00 | 450.00 (existing user, code `BILAL-FP100`) | 18,450.00 (142 tx this month) |
| Ayesha pays PKR 180 | 14,870.00 (−180 +50) | | 18,629.19 (+179.19), 143 tx |
| Bilal pays PKR 180 | | 273.60 (−180 +3.60) | 18,808.38 |
| Bilal tries PKR 500 | | 273.60 (declined, PKR 0 fee) | unchanged |

---

## 7. Data model

The migrations are the source of truth; this table is a map.

| Table | Purpose | Mutability |
|---|---|---|
| `merchants`, `staff` | Stores; staff linked to `auth.users` with role + store | mutable |
| `customers` | Shoppers: encrypted PII, HMAC lookups, Thumb Lock, consent, NADRA reference | mutable (status, lock) |
| `accounts` | Simulated CASA accounts + system accounts (fee income ×2, marketing pool, opening equity) | balance changes only via `post_journal` |
| `journals`, `journal_entries` | Double-entry ledger | **append-only** |
| `terminals`, `request_nonces` | Paired devices; replay protection | mutable |
| `charge_sessions` | One sale awaiting a thumb | mutable |
| `payment_attempts` | Every attempt, success or decline, plus offline events | **append-only** |
| `reversals` | Voids and refunds (maker-checker) | mutable status |
| `disputes` | Tickets from SMS replies or the branch | mutable status |
| `sms_outbox` | Every SMS (outbox pattern) | insert + `sent_at` |
| `account_limits` | Risk Engine limits per account type | admin |
| `merchant_monthly_stats` | Monthly count + rebate link | mutable |
| `audit_log`, `audit_chain_head` | Hash-chained audit | **append-only** |
| `rate_limits` | Fixed-window counters (unlogged) | mutable |

Money is `numeric(12,2)` everywhere, and exact decimals in the app. Times are `timestamptz` in UTC; "today" and "this month" use Asia/Karachi.

---

## 8. API (Next.js route handlers → database functions)

All routes live under `/api/v1`, take JSON bodies validated by zod, and map errors as in §4.6.

| Route | Who | Calls |
|---|---|---|
| `GET /system/health` | public (counts only for admin/auditor) | `api_health` |
| `GET /me` | staff | `api_staff_context` |
| `POST /terminals/pair` · `POST /terminals/{id}/revoke` | owner · owner/admin | `api_pair_terminal` · `api_revoke_terminal` |
| `POST /pos/charges` | terminal + cashier | `api_open_charge` |
| `POST /pos/charges/{id}/thumb` | terminal | `api_thumb_pay` |
| `POST /pos/charges/{id}/cancel` | terminal | `api_cancel_charge` |
| `POST /pos/offline-events` | terminal + cashier | `api_record_offline_fallback` |
| `GET /merchant/ledger?day=` · `GET /merchant/summary?day=` | owner/cashier | `api_merchant_ledger` · `api_merchant_summary` |
| `GET /merchant/ledger.csv?day=` | owner | `api_merchant_ledger` (escaped CSV) |
| `POST /merchant/sales/{id}/void` | owner | `api_void_payment` |
| `POST /branch/nadra/verify` | branch officer (AAL2) | server NADRA simulator |
| `POST /branch/enrollments` | branch officer (AAL2) | crypto → `api_enroll_customer` |
| `POST /branch/customers/lookup` · `POST /branch/customers/{id}/thumb-lock` | branch (AAL2) | `api_find_customer` · `api_set_thumb_lock` |
| `GET /bank/disputes` · `POST /bank/disputes/{id}/refund-request` · `POST /bank/refunds/{id}/decision` | branch/bank (AAL2) | `api_open_disputes` · `api_request_refund` · `api_decide_refund` |
| `GET /bank/audit` · `GET /bank/integrity` | admin/auditor (AAL2) | `api_audit_tail` · `api_verify_integrity` |
| `POST /sms/inbound` | SMS provider (HMAC-signed webhook) | `api_sms_reply` |
| `GET /demo/finger-tray` · `GET /demo/sms-feed` · `POST /demo/sms/{id}/reply` | demo mode + staff session | `api_demo_finger_tray` · `api_sms_feed` (as demo observer) · `api_sms_reply` |

**Rate limits** (via `fp.api_rate_limit`, plus Vercel Firewall):

| Action | Limit |
|---|---|
| Thumb submissions | 30/min per terminal |
| Open charge | 60/min per terminal |
| NADRA verify and enrollment | 30/hour per officer |
| CSV export | 10/min per user |
| Health check | 60/min per IP |
| Login | Supabase's own limits + Turnstile |

---

## 9. Setup

### 9.1 Supabase
1. Create project `fingerpay` in **ap-southeast-1** and apply the checklist in §4.7.
2. Apply migrations in order (`supabase db push`, or the Supabase MCP `apply_migration`): `20261118000100_fp_schema.sql`, `…0200_fp_ledger.sql`, `…0300_fp_api.sql`.
3. Run the Security Advisor and expect only the INFO findings noted above.

### 9.2 App role login (once, by hand, never committed)
```sql
ALTER ROLE fp_app WITH LOGIN PASSWORD '<32+ random characters from a password manager>';
```

### 9.3 Demo seed (`npm run seed:demo`, local only, uses the service-role key)
1. Create staff users through the Supabase Auth admin API (officer, manager, owner, cashier, admin, auditor, demo observer). Write their generated passwords to `.demo-credentials.local.md` (gitignored), never to chat or git.
2. Insert the Rasheed Kiryana Store merchant + MERCHANT_CASA (account `ABL-BIZ-001928374`, encrypted), and fund the marketing pool (PKR 100,000) and Rasheed's opening balance (PKR 18,450) through `fp.post_journal`. Seed `merchant_monthly_stats` = 142.
3. Enroll Ayesha (`35202-1122334-6`, `ABL-SAL-998877665`, PKR 15,000) and Bilal (`35202-7788990-1`, `ABL-STU-445566778`, PKR 450) **through `fp.api_enroll_customer`**, the real path. Then set Bilal's `referral_code = 'BILAL-FP100'` and mark him as an existing user.
4. Demo databases only: `GRANT EXECUTE ON FUNCTION fp.api_demo_finger_tray() TO fp_app;`

---

## 10. Web build plan (no visual design yet)

Each milestone has functional acceptance criteria **and** a security gate. Nothing moves on until both pass.

| Milestone | Build | Functional acceptance | Security gate |
|---|---|---|---|
| **M0 Foundation** | Next.js 16 app (PNLF structure); copy and harden `src/lib/supabase/*`; Supabase project; migrations; `fp_app` login; `.env.local`; seed script; health route; CI running `npm run test:db` | Health shows 1 merchant / 2 shoppers to an admin; seed is repeatable | `test:db` green; Security Advisor clean; no service key in Vercel; gitleaks clean |
| **M1 Money engine** | `lib/fp/crypto.ts` (keyring, AES-GCM, HMAC, HKDF); `lib/fp/db.ts` (postgres.js as `fp_app`, error mapping); terminal signing (WebCrypto client + server verify); charge, thumb, cancel and offline routes | Over HTTP: PKR 180 debits 180, credits 50 cashback, settles 179.19, logs the SMS | Tests: bad signature / stale / replayed nonce → 401/409; parallel-payment test on real Postgres never overdraws; log-redaction test; headers present |
| **M2 POS + ledger** | Wire all View A buttons and View B (functional UI on Astryx components, minimal styling) | Every simulation button shows the exact banner in < 3 s; ledger and counters update live | CSV-injection test; cashier cannot export or void (HTTP test); CSP has no violations in the browser console |
| **M3 Branch + SMS + bank** | Views C, D, E: enrollment with consent, lookup, Thumb Lock, SMS feed with DISPUTE/LOCK, refund maker-checker, audit + integrity | A newly enrolled shopper pays immediately and gets an SMS; dispute → refund needs two people | AAL2 enforced on bank routes (test); duplicate thumb refused and audited; demo routes 404 when `FP_DEMO_MODE` is off |
| **M4 Website** | "How it works", stats, pillars, personas, disclaimer (copy in §10.6) | All numbers render with zero placeholder text | No live DB data on public pages; Lighthouse accessibility ≥ 95 |
| **M5 Security review & freeze** | `/security-review`, `/ponytail-audit`, Supabase advisors, `npm audit`, OWASP ZAP baseline against staging; optionally PNLF's `strix` setup | Demo script rehearsed end to end | Every high finding fixed or written up as an accepted risk |

### 10.6 Website copy corrections
- Keep the PDF §3 stats and 4-step copy. Change "AI Core verifies" to "**Risk Engine verifies**".
- Disclaimer (footer + demo console): *"FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed."* No partner logos.
- "5x cheaper": fair against 2.0–2.5% card POS (4.4–5.6×). Don't compare against Raast QR, where SBP has subsidised merchant payments (§12).

---

## 11. Android merchant terminal (after the website)

- Kotlin app, or React Native with a native module; same API and signing protocol.
- Key in Android Keystore (StrongBox if present). A Play Integrity verdict is checked at pairing and daily.
- **Bench demo:** R307 over a USB-TTL adapter + `usb-serial-for-android`.
- **Production:** an L1-class secure scanner SDK with presentation-attack detection.
- The offline banner works with no network at all.
- Cashier signs in with Supabase Auth (PKCE). The phone's own fingerprint sensor only unlocks the app; it never takes payments.

---

## 12. Research findings

- **Cloned-fingerprint fraud is real and cheap.** India's AePS fraud chain lifts thumbprints from public property documents, clones them in silicone and drains accounts. The most effective single defence police recommend is a **biometric lock** the owner controls, which is why FingerPay has Thumb Lock built in. Liveness detection only helps if it is actually enabled. ([Deccan Herald](https://www.deccanherald.com/india/karnataka/bengaluru/lock-aadhaar-biometrics-to-prevent-fraud-experts-2798402), [Gujarat Cyber Crime](https://gujaratcybercrime.org/Aadhaar_AePS_Fraud_Awareness.pdf), [Scroll](https://scroll.in/article/1059347/stolen-fingerprints-empty-bank-accounts-how-customers-are-paying-for-gaps-in-Aadhaar%20Interpol))
- **Secure scanner reference model:** UIDAI's L1 registered devices sign and encrypt each capture inside a TEE or secure element, with liveness detection. L0 devices were phased out. ([UIDAI biometric devices](https://uidai.gov.in/ecosystem/authentication-devices-documents/biometric-devices.html), [UIDAI L0→L1 circular](https://uidai.gov.in/images/resource/Upgrade_of_existing_L0_fingerprint_Authentication_Registered_Device_to_L1_Compliant_Fingerprint_authentication_Registered_Devices_in_Aadhaar_Authentication_Ecosystem_31.05.22.pdf))
- **Biometric accuracy benchmark:** false-match rate of 1 in 10,000 or better, with presentation-attack testing to ISO/IEC 30107 / FIDO, per the NIST SP 800-63-4 drafts. The final wording should be checked on pages.nist.gov. ([NIST comment record](https://pages.nist.gov/800-63-Public-Comments/comments/spreadsheet/BIO-iTC-0307-sp800-63-4-ipd.pdf), [FIDO Biometrics Requirements](https://fidoalliance.org/specs/biometric/requirements/Biometrics-Requirements-v4.0.1-fd-20240522.pdf))
- **R307:** UART at TTL level, 57,600 baud default, a 1,000-template on-module library, 512-byte templates. ([GROW R307 manual](https://cdn.hackaday.io/files/1911088176364672/r307-fingerprint-module-user-manual.pdf))
- **Raast pricing context:** the government approved a Rs 3.5 bn subsidy for Raast person-to-merchant QR payments (Sep 2025 – Jun 2026), paying institutions 0.5% or Rs 100 per transaction, whichever is lower. Better Than Cash Alliance proposed a 0.35% MDR floor. I found no source on pricing after June 2026; check the latest SBP circulars. ([Business Recorder](https://www.brecorder.com/news/amp/40384460), [Profit](https://profit.pakistantoday.com.pk/2025/08/28/govt-sanctions-rs3-5-billion-annual-subsidy-to-expand-raast-qr-adoption-at-retail-outlets), [BTCA blueprint](https://www.betterthancash.org/alliance-reports/scaling-merchant-payments-on-raast-a-responsible-pricing-blueprint-for-pakistan))
- **NADRA biometrics in banking:** 450+ institutions use NADRA biometric verification. From 20 Jan 2026, facial recognition backs up failed fingerprint checks. I found no Pakistani bank offering thumb checkout at retail. The closest relatives are Ehsaas biometric retail payouts (≈2020) and agent banking, so FingerPay's checkout angle looks open. ([Dawn](https://www.dawn.com/news/1964412), [Biometric Update](https://www.biometricupdate.com/202505/pakistan-strengthens-digital-governance-with-nationwide-biometric-integration))
- **Global biometric checkout:** Amazon One palm payments are shutting down (June 2026, low growth). Tencent, Mastercard, JPMorgan and Verifone continue pilots. The lesson is that adoption, not technology, is the hard part. FingerPay's "no phone needed" segment is its edge. ([Pulse summary of Payments Dive / American Banker](https://www.pulse.bot/fintech/news/the-future-of-palm-payments-after-amazons-pullback-8d62bab0-42fc-4b40-a731-562bee87d4d6/), [Tencent Palm](https://palm.tencent.com/resources/pix-biometric-payment-brazil-future))
- **Data protection law:** Pakistan's Personal Data Protection Bill is still not enacted as of Sept 2026. Drafts treat biometrics as sensitive data. Build to that standard anyway. ([Chambers 2026](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/pakistan), [Tribune](https://tribune.com.pk/story/2625470/pakistan-can-no-longer-wait-for-personal-data-protection-law))
- **SBP Regulatory Sandbox, cohort 2:** applications close **30 Nov 2026**. Cohort 1 tested open banking, merchant remote onboarding and remittances; DigiKhata was in it. A sandbox slot is the realistic route to real partners. ([Profit](https://profit.pakistantoday.com.pk/2026/01/07/sbp-shortlists-firms-for-first-regulatory-sandbox-cohort/), [APP](https://app.com.pk/business/sbp-launches-second-cohort-of-regulatory-sandbox), [SBP press release](https://www.sbp.org.pk/assets/documents/press-release/PR-15-Sep-2026.pdf))

---

## 13. Unique features

FingerPay's core idea is already the differentiator, so the additions are few and chosen to deepen it.

| # | Feature | Why it's distinctive | Effort | Status |
|---|---|---|---|---|
| 1 | **Thumb Lock by SMS reply** | The AePS lesson turned into one word on any phone; only a branch can unlock | done | ✅ built (database) |
| 2 | **Reply-to-dispute SMS** | Disputes with no app, data or smartphone: true non-PTA inclusion | done | ✅ built |
| 3 | **Owner alerts on declines and locked-thumb attempts** | The real thumb owner learns about misuse in seconds | done | ✅ built |
| 4 | **Spoken Urdu confirmation on the merchant phone** ("ek sau assi rupay wusool") | Soundbox-style certainty for shopkeepers who don't read screens mid-rush | ~0.5 day | M4 optional |
| 5 | **Family / canteen thumbs**: a parent-funded child thumb with a daily cap and allowed stores | Kids pay at the school canteen with no cash or phone; the parent gets an SMS | ~3 days | later |
| 6 | **Two-finger step-up instead of a PIN** for larger amounts | Keeps checkout phone- and PIN-free while adding a factor | ~2 days + hardware | later (production) |
| 7 | **Duress finger**: a chosen finger pays but silently flags the bank | Coercion protection at the counter | design + ethics review | later |
| 8 | **Thumb khata**: the shop's credit tab tied to a thumb, settled monthly with one tap | Digitizes kiryana credit; DigiKhata does the ledger but not the identity | large; regulatory | later |
| 9 | **WhatsApp end-of-day settlement summary in Urdu** for merchants | Rasheed uses WhatsApp, not dashboards | ~1 day | later |

---

## 14. Open decisions for the team

1. **Partnerships:** are Allied Bank, NADRA or SBP actually engaged? This decides the website wording (§10.6).
2. **1:N vs 1:1 for production:** thumb-only, or "last 4 digits + thumb" (§4.4)?
3. **Supabase plan:** free (pauses after a week idle; no leaked-password protection) or Pro before demo day?
4. **SBP sandbox cohort 2:** apply by 30 Nov 2026?
5. **Data residency** for anything beyond fake data: in-country hosting and SBP outsourcing rules.
6. **Second demo store** (e.g. a campus canteen) to show the store selector and cross-store isolation live?
7. **Pricing story** against Raast QR after the subsidy period.

---

# Part 3: Design brief

Shared input for every design doc. Read with Part 1 (product truth) and Part 2 (source of truth). Where the design docs disagree, `DESIGN.md` (written after them) decides.

## D1. The design doc set

| File | Owner skill(s) | Covers |
|---|---|---|
| `brand/BRAND.md` + SVGs | brand extraction | logo vectors, exact brand colours, wordmark type, clear space |
| `docs/design/TYPE-AND-COLOR.md` | better-typography, better-colors | the type and colour systems (the only doc that picks fonts and colours) |
| `docs/design/WEBSITE.md` | awwwards, impeccable | concept, narrative, signature 3D moment, section plan, self-score |
| `docs/design/MOTION.md` | apple-design-motion, motion | motion tokens, springs, choreography, 3D interaction physics, reduced motion |
| `docs/design/APP.md` | interface-design, apple-design | the merchant terminal app and staff consoles: screens, states, layout |
| `docs/design/CONTENT.md` | better-writing, better-accessibility | voice, real copy per section, accessibility requirements |
| `DESIGN.md` (root) | impeccable (synthesis) | the final visual world, merged from the above |

## D2. Audience, goal and landing strategy

- **Audience (confirmed):** competition judges and investors come first.
- **Goal (confirmed):** they understand the idea and trust it. There's no sign-up or form.

**Landing strategy (recommended, pending confirmation): story first.** The site explains what FingerPay is and why it exists. The merchant app appears as proof, not as a download.
- The core promise is "no phone needed to pay". A "download our app" button would contradict it, because shoppers have no app.
- The only app is the merchant terminal (Android, §11, after the website). On the site it is the device where the 3-second sale happens: the hero proof and a "For shops" chapter.
- With judges and investors as the audience and understanding as the goal, the page is a narrative, not a funnel.

## D3. Brand asset

`brand/fingerpay-logo-source.png`, on white:
- **Mark:** a fingerprint of nested arches, open at the bottom, with flat stroke ends at staggered lengths.
- **Wordmark:** "FingerPay" in a bold, tight grotesk in the style of SF Pro Display.
- **Tagline:** "Making payments with one tap." in medium grey, semibold.
- Mark and wordmark are near-black. The brand is monochrome and Apple-restrained, with no accent colour given.
- Don't invent other logos or brand marks.

## D4. The user's taste and design playbook

**Wanted**
- Modern and expensive (a "$10,000 website"), unique ("a style no one has built"), sleek minimalism.
- Interactive 3D, and as much purposeful animation as possible. The reference vibe is the user's own portfolios: three.js, GSAP or Anime.js, and Lenis.
- Reference (an Instagram reel): a dark mobile wallet with glass surfaces, holographic stacked cards that fan out and flip, a big balance with smaller decimals, round glass action buttons, and spring motion everywhere.

**Rejected so far**
1. A cream "ledger paper" editorial page with a serif display.
2. A particle thumbprint with a cyan/violet aurora glow, Geist plus Instrument Serif, and a standard layout (headline left, object right, 3-up card grid). The user's words: "so basic", "fonts so generic".
3. Anything that reads as a template.

**The user's design playbook (binding):** `MASTER_INSTRUCTIONS_AND_DESIGN_SYSTEM.md` in the user's portfolio folder, sections 2–5.
- **Banned:** neon purple/violet and cyan glow gradients · coloured glow halos (shadows are occlusion, not emission) · pure `#000` or `#fff` · more than one accent colour, or an accent above 80% saturation · three equal cards in a row.
- **Required:** asymmetric bento or zig-zag layouts · the six "unthemed surfaces" (selection, caret, scrollbar, focus ring, link underline, tabular numbers) · every interaction state · `100dvh`, not `100vh` · headings bound to the content below them.

## D5. Hard design constraints and quality bar

- **Code rules (`.claude/CLAUDE.md`):** Astryx components and tokens (no raw `<div>`, hex or px), themes through the Astryx theme editor, and security first.
- **Truth:** the rules in P8 apply to every design.
- **Numbers that exist:** under 3 s from thumb to settled · fee 0.45% above PKR 100, capped at PKR 25 · PKR 0 on a decline · per-tap limits PKR 5,000 (salary) / PKR 2,000 (student) · demo sale PKR 180, net PKR 179.19, fee PKR 0.81.
- **Stack:** Next.js 16 App Router + Astryx are installed. `animejs` v4 and `motion` are installed; three.js and Lenis are expected; React Three Fiber is allowed. The CSP allows self-hosted assets only, so fonts must be self-hostable (Google Fonts, Fontshare or a licensed foundry, served with `next/font/local`).
- **Quality bar (Awwwards):** LCP under 1.5 s, CLS under 0.05, INP under 100 ms · 60 fps on a mid-range device · `prefers-reduced-motion` honoured everywhere · keyboard operable · mobile designed, not shrunk.

## D6. Accessibility and inclusion

- WCAG 2.2 AA. Lighthouse accessibility ≥ 95 on the website (§10, M4).
- Every animation has a `prefers-reduced-motion` equivalent.
- The merchant UI maps outcome codes to text, so Urdu can be added later (§5, View A).
- Shoppers may use non-PTA or feature phones, so SMS copy stays plain.

## D7. How each design doc is written

- Decisions with reasons, and concrete values: hex with contrast ratios, px/rem, ms, spring parameters, font names with licence.
- No vague adjectives.
- End with **Open questions for the user**: only the decisions that are really theirs.
- Docs only: no code in `src/`, don't edit files you don't own, and don't commit.

---

# Appendices

## A. Team

Team FingerPay: Ahsan Taqweem Imran (F2024376368), Saad Akhtar (F2024376257), Salman Azam (F2024376127), M Usman Khan (F2024376136), Saim Imran (F2024376375).

## B. What the v1 PDF specified that v2 replaced

These parts of the original report are kept here only as history. Don't build from them. §0 explains each change.

| v1 (PDF) | Replaced by |
|---|---|
| Python / FastAPI backend | Next.js 16 route handlers + Supabase Postgres (§2) |
| Four public gateway routes (`/api/v1/gateways/nadra/verify`, `/abl/authorize`, `/raast/settle`, `/sms/send`) | Internal server modules; money moves only inside `fp.api_thumb_pay` (§0 row 1, §8) |
| `POST /api/v1/payments/thumb-pay` | `POST /api/v1/pos/charges/{id}/thumb` with signed terminal requests (§4.5, §6.3) |
| Five tables (`users`, `merchants`, `transactions`, `sms_receipts`, `disputes`) with plain-text CNIC, phone and account numbers | Private schema `fp` with encrypted PII, HMAC lookups, a double-entry ledger and a hash-chained audit log (§4.2, §7) |
| `SHA-256(cnic + salt + token)` thumb hash | Server-side `HMAC(key, token)`; the key never enters the database (§4.3) |
| Thumb-only payments up to PKR 10,000 | PKR 5,000 salary / PKR 2,000 student per tap, plus daily caps (§4.9) |
| `seed.sql` with hashes in git | `npm run seed:demo`, which enrolls personas through the real API (§9.3) |
| 8-step payment pipeline | The 10-step, one-transaction pipeline in §6.3 |
| Milestones M0–M4 | M0–M5, each with a security gate (§10) |
| Master kickoff prompt for a coding agent | `.claude/CLAUDE.md` and this document |
