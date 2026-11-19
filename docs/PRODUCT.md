# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Website (first audience): competition judges and investors.** They watch a pitch or open the link, and must leave understanding the idea and believing it is real and safe. No sign-up or form is needed on the site.
- **Merchant staff:** kiryana, bakery and campus-canteen owners and cashiers in Pakistan, taking payments at a busy counter. Owners also read the day's ledger and settlement.
- **Shoppers:** salary-account holders and students, many on non-PTA phones with no data plan. They pay with a thumb only and get receipts by SMS. Shoppers have no app, by design.
- **Bank staff:** Allied Bank (proposed partner) branch officers and managers who enroll shoppers, plus bank admins and auditors. They use web consoles with MFA.

## Product Purpose

A phone-free, card-free, cash-free checkout in under 3 seconds. The cashier enters an amount, the shopper taps a thumb, the Risk Engine checks and settles, the shop screen confirms, and the shopper gets an SMS receipt. Success for the website: a judge or investor understands the loop and trusts the security story.

## Positioning

- The thumb is the whole wallet: no phone, card, PIN or cash at the counter.
- Every shopper feature works over plain SMS: receipts, Reply DISPUTE, Reply LOCK. This includes non-PTA phones.
- No fingerprint image is ever stored. The database holds only a keyed HMAC of the scan token.
- Thumb Lock by SMS, inspired by real AePS cloned-fingerprint fraud.
- The merchant gets certainty on their own screen: no transfer screenshots to check.

## Operating Context

- Counters in kiryana stores, bakeries and campus canteens during rush hour.
- Shopkeepers who use WhatsApp, not dashboards.
- Unreliable internet: the terminal says TAKE CASH and never queues a sale.
- Branch enrollment needs a NADRA CNIC check (simulated) and biometric consent.

## Capabilities and Constraints

- Source of truth: `docs/SPEC.md`. Security is the top priority, even for the prototype.
- **All bank, identity (NADRA) and payment (SBP Raast) integrations are simulated.** The required disclaimer: "FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed." No partner logos.
- **Terminology:**
  - Call it the "Risk Engine", never "AI".
  - Fee: 0.45% on sales above PKR 100, capped at PKR 25.
  - Declines charge PKR 0.
  - Per-tap limits: PKR 5,000 for salary accounts, PKR 2,000 for students.
- **Privacy rules for every screen:**
  - No shopper names on declines.
  - No shopper balance on any merchant screen.
  - Shoppers shown as first name and initial.
  - Phone and CNIC shown as last 4 digits only.
- Money is exact decimal and computed in the database. The UI only displays it.
- Undecided: 1:N vs 1:1 matching for production, the Supabase plan, the SBP sandbox application, and data residency (SPEC §14).

## Brand Commitments

- Name: FingerPay.
- The user has brand assets (logo or brand material) to share. They aren't received yet; don't invent a logo or brand marks before they arrive.

## Evidence on Hand

- `docs/SPEC.md`: fee test vectors, the demo flow and the risk controls.
- `FingerPay Project Report and Developer Specification.pdf`: stats and the 4-step "How it works" copy (PDF §3).
- Demo personas are fictional: Rasheed Ahmed (merchant), Ayesha Khan (salary shopper), Bilal Hussain (student, non-PTA phone).
- There are no real customers, testimonials, partner agreements, press or photography. Don't fabricate any.

## Product Principles

1. Trust is the product: show the security mechanisms honestly, never claim partnerships or results that don't exist.
2. The counter moment rules: anything on the merchant side must work in under 3 seconds, mid-rush, at a glance.
3. Inclusion over features: if it can't work over SMS on a basic phone, it isn't a shopper feature.
4. Privacy by default: the merchant learns only what a sale needs.

## Accessibility & Inclusion

- WCAG 2.2 AA.
- Every animation has a `prefers-reduced-motion` equivalent.
- The merchant UI maps outcome codes to text, so Urdu can be added later.
- Shoppers may be non-PTA or feature-phone users, so the SMS copy stays plain.
