# FingerPay content: voice, copy and accessibility

> **Owner skills:** `better-writing`, `better-accessibility`. **Inputs:** `docs/design/BRIEF.md` (binding), the user's correction of 2026-11-19 (a **landing page** with illustrated looping vignettes, not a scroll story), `docs/design/ART-PROMPTS.md` (the vignette list), `PRODUCT.md`, `docs/SPEC.md`, `supabase/migrations/20261118000300_fp_api.sql`, PDF §3 (kept by SPEC §10.6).
> **Scope:** voice, final copy for the website and the merchant terminal app, SMS copy review, and testable accessibility requirements.
> **Not in scope:** fonts, colours and layout (`TYPE-AND-COLOR.md`, `WEBSITE.md`, `APP.md`), motion values (`MOTION.md`), the vignettes themselves (`ART-PROMPTS.md`). Where this doc gives a number in px or ms, it's an accessibility threshold, not a design value. `APP.md` and `MOTION.md` map it to Astryx tokens.

**Status tags used below**
- **[SPEC]**: verbatim from SPEC or PRODUCT. Don't edit it here.
- **[NEW]**: copy proposed by this doc. Ready to use unless an open question (§7) blocks it.
- **[MIGRATION]**: SMS wording that lives in the database. It's a proposal only (§5).

---

## 1. Vocabulary (one name per thing)

New copy uses these terms. A synonym is a defect only where the same thing gets two names for the same reader.

| Thing | Use | Don't use | Notes |
|---|---|---|---|
| The person paying | **shopper** | customer, user, payer | The database says `customer`. People never see that word. |
| The place | **shop** | store, merchant, outlet | Proper names keep "Store" ("Rasheed Kiryana Store"). The SMS "FingerPay store" changes to "shop" (§5). |
| The person at the till | **cashier**, **owner** (role names); **shopkeeper** in website prose | merchant (in human copy) | Use "merchant" only in fee economics, and only if a judge needs the term. |
| The device and app | **terminal** ("the FingerPay terminal") | POS, merchant app, device | It's the only FingerPay app, and it's for the shop. |
| The act of paying | **tap your thumb**, **thumb tap** | scan, swipe, biometric auth | Matches the brand tagline "Making payments with one tap." |
| What isn't stored | **fingerprint image** | biometric data (too vague) | "No fingerprint image is stored, sent or logged." |
| What is stored | **a keyed code** (HMAC, for technical readers) | hash, encrypted fingerprint | SPEC §0 rows 3–4: the PDF's "SHA-256 hash" wording is wrong. |
| The checker | **Risk Engine** | AI, AI Core, smart, intelligent | Always capitalised. Say what it checks. |
| The lock | **Thumb Lock** (feature); "reply LOCK" (action) | freeze, block card | Write the SMS commands in capitals: **LOCK**, **DISPUTE**. |
| Cashier's transaction | **sale** | charge, order | `charge` is internal. The banners already say "SALE NOT CHARGED", "START A NEW SALE". |
| Money moving | **payment**; **settled**; **declined** | completed, processed, failed, rejected | |
| Owner's same-day reversal | **void** (staff copy); **cancelled** (shopper SMS) | delete, undo | Two audiences, one meaning, recorded here on purpose. |
| Bank reversal after a dispute | **refund** | chargeback | Needs two bank staff (maker-checker). |
| Limits | **thumb-pay limit** (umbrella term, as in the banner); "per tap", "per day" to qualify | spending cap | |
| Partners | **proposed partners**; **simulated** | partners, powered by, in partnership with | SPEC §0 row 22. |
| Money | `PKR 180` in website prose; `PKR 179.19` when paisa matter; `PKR 180.00` in the terminal and SMS (`fp.fmt_pkr`) | Rs, ₨, rupees (except when quoting a source) | Thousands get a comma: `PKR 5,000`. |
| Speed | **under 3 seconds** | instant, real-time, 3s, <3s | |

**Spelling:** Oxford British (‑ize, *enrol*, *enrolment*, *cancelled*). It already matches the banners ("RECOGNIZED", "ENROL", "CANCELLED") and Pakistani usage.
**Case:** sentence case for headings, buttons and labels. Capitals only for the SPEC banners, the SMS commands and ledger status codes.

---

## 2. Voice

FingerPay sounds like a careful engineer explaining a payment to a shopkeeper: plain, confident and specific. Trust comes from showing the mechanism and naming what's simulated, never from adjectives.

### Rule 1. Show the mechanism, not an adjective
| Do | Don't |
|---|---|
| "No fingerprint image is stored. The database keeps only a keyed code made from the scan." (PRODUCT.md) | "Bank-grade biometric security." |
| "Retrying a paid sale replays the original receipt. It never charges twice." (SPEC §4.9) | "Seamless, worry-free payments." |

### Rule 2. Name the simulation in the same breath as the claim
| Do | Don't |
|---|---|
| "The payment settles over Raast (simulated)." | "Moves funds instantly via SBP Raast." (PDF step 3) |
| "Allied Bank, NADRA and SBP Raast are proposed partners." | "In partnership with Allied Bank, NADRA, and SBP Raast." (PDF cover) |

### Rule 3. It's a rules engine, so call it the Risk Engine and say what it checks
| Do | Don't |
|---|---|
| "The Risk Engine checks Thumb Lock, the thumb-pay limit and the balance." | "AI Core verifies & settles." (PDF step 3) |
| "3 tries per sale. 10 unknown thumbs in 10 minutes pauses the terminal." | "Smart fraud detection that learns." |

### Rule 4. Use exact numbers from SPEC, with their conditions
| Do | Don't |
|---|---|
| "0.45% on sales above PKR 100, capped at PKR 25." | "0.45% Flat MDR." (PDF §3: it isn't flat) |
| "4.4–5.6× cheaper than a 2.0–2.5% card machine." (SPEC §10.6) | "5x cheaper" with no comparison, or any comparison with Raast QR |
| "Under 3 seconds from thumb to confirmation." | "Instant." Never a made-up measured number. |

### Rule 5. Counter copy is short, says what to do next, and protects the shopper
| Do | Don't |
|---|---|
| "INTERNET DOWN — TAKE CASH IMMEDIATELY (SALE NOT CHARGED)" [SPEC] | "Network error. Please try again later." |
| A decline says **why**, never **who**: "PAYMENT DECLINED: INSUFFICIENT BALANCE (PKR 0 FEE CHARGED)" | "Bilal H. has insufficient funds." |

### Tone by stakes
| Context | Tone |
|---|---|
| Hero, vignette lines, sign-off, empty states | Warm, light, a little wry. Humour comes from the situation, never from a pun that won't translate. |
| Fees, ledger, routine actions | Neutral, minimal. |
| Declines, errors | Calm and plain. No blame, no "oops", no exclamation marks. |
| Thumb Lock, alerts, voids, disputes | Serious and explicit. Say what happened, what didn't, and the next step. |

### Testable voice checks (run on `src/` user-facing strings before each release)
- `grep -rniE "\bAI\b|artificial intelligence|machine learning"` finds nothing in copy.
- `grep -rniE "in partnership|partnered with|powered by (allied|nadra|raast)"` finds nothing.
- `grep -rniE "oops|something went wrong|successfully|\bplease\b|are you sure"` finds nothing in copy.
- Every number on public pages appears in the "Numbers used" rows of §3. M4 says "zero placeholder text".

---

## 3. Website copy (landing page with illustrated vignettes)

The site is a landing page, not a story. Each section has copy beside one short looping hand-drawn vignette (6–8 s, 12 fps), listed in `docs/design/ART-PROMPTS.md` §3. Each section's copy stands alone.

**Rules for copy and vignettes**
- The art never contains text. Whatever a phone screen shows (an amount, the banner, an SMS) is **live HTML text placed in code** over the blank screen. The overlay strings are given per section below.
- Every vignette gets alt text (written below) and has one key frame, which is the still shown when animation is paused or reduced (§6, W-5).
- The cast is fictional. To stay consistent with ART-PROMPTS, copy names people but never gives an age or job (see Q10).

Suggested anchors: `#hero`, `#problem`, `#how`, `#shops`, `#safety`, `#phones`, `#numbers`.

### Page-level strings [NEW]
| String | Copy |
|---|---|
| `<title>` | FingerPay: pay with your thumb |
| Meta description (≤ 160 characters) | FingerPay is a student prototype of thumb payments for Pakistani kiryana stores. No phone, card or cash at the counter. All integrations are simulated. |
| Skip link (first focusable) | Skip to content |
| Pause control (global, always reachable) | Pause animations / Play animations |
| Logo link | FingerPay, back to top |
| Persistent honesty tag (in the nav on every viewport) | Student prototype · integrations simulated |

---

### Section 1: Hero (`#hero`). Vignette: "the one-tap moment"

**Eyebrow:** Thumb payments for kiryana stores

**Headline** (pick one):
1. **Your thumb is the whole wallet.** ← recommended. It's FingerPay's own positioning (PRODUCT.md) and SPEC pillar 1.
2. Pay with a thumb. Nothing else at the counter.
3. No phone, card or cash. Just a thumb.

**Body:** At a kiryana counter, a shopper pays with one thumb tap: no phone, card, PIN or cash. The shop's own screen confirms the sale in under 3 seconds, and the shopper gets an SMS receipt.

**Links** (anchors, not buttons): `See how it works` → `#how` · `See how it stays safe` → `#safety`
**Honesty line** (under the body): Student prototype. Bank, identity and payment integrations are simulated.

**Overlay on Rasheed's phone screen** (live text, appears after the sensor glow): PAYMENT SUCCESSFUL — PKR 180 RECEIVED

**Live interaction (press-and-hold thumb, ART-PROMPTS §4), if placed here:**
| State | Copy |
|---|---|
| Hint beside the scanner | Hold a thumb here |
| Button accessible name | Pay PKR 180 with a thumb tap |
| Holding | Checking… |
| Result (also announced in `role="status"`) | PAYMENT SUCCESSFUL — PKR 180 RECEIVED. Under 3 seconds, no phone. |
| Reset link | Pay again |

**Numbers used:** under 3 seconds (SPEC §1); PKR 180 (SPEC demo sale).

**Vignette alt:** "At a kiryana counter, Ayesha presses her thumb on a scanner to pay for bread and milk. She holds no wallet, phone or cash. Rasheed checks his phone and nods."

---

### Section 2: The problem (`#problem`). Vignettes 3a, 3b, 3c

**Eyebrow:** Checkout today

**Headline:**
1. **Every way to pay asks for something the shopper doesn't have.** ← recommended
2. No change, fake screenshots, no phone.
3. Paying for bread shouldn't need a phone.

**Three items, one beside each vignette** (PDF §1–2, restated):
| Vignette | Item title | Item copy |
|---|---|---|
| 3a Cash and no change | **No change** | A PKR 1,000 note empties the drawer, and cash at the till invites theft. |
| 3b The transfer screenshot | **Can't trust the screenshot** | A transfer screenshot proves nothing: it can be edited. The shopkeeper checks them all again at night. *(Optional, only if Q1 confirms a source: "…checks 20 or more every night.")* |
| 3c No phone, no card | **No smartphone, no card** | QR and wallet apps need a smartphone, mobile data and a PIN. A keypad phone or a non-PTA phone (one not registered with Pakistan's telecom regulator, so it can't use a local SIM for bank codes) is left out. |

**Closing line (no vignette):** Card machines need a card, and charge the shop 2.0–2.5% a sale.

**Numbers used:** 2.0–2.5% card fee (PDF §2, SPEC §10.6). PKR 1,000 is a banknote, not a statistic. "20+" is held back (Q1).

**Vignette alt**
- 3a: "Rasheed searches an empty cash drawer and shakes his head. One crumpled note lies on the counter."
- 3b: "A customer holds out a phone showing a transfer screenshot. Rasheed squints at it, unsure if it's real."
- 3c: "Bilal pats his pockets and finds only an old keypad phone. He smiles awkwardly."

---

### Section 3: How it works (`#how`). Vignettes: four steps

**Eyebrow:** How it works

**Headline:**
1. **One sale, under 3 seconds.** ← recommended
2. PKR 180, paid with a thumb.
3. Four steps. One thumb.

**Steps** (PDF §3 copy, corrected by SPEC §10.6). Each step sits beside its 1:1 vignette.
| # | Step title | Step copy | Overlay on the phone screen (live text) |
|---|---|---|---|
| 1 | **The cashier enters the amount** | Rasheed types PKR 180 on the FingerPay terminal and taps Charge. | PKR 180 |
| 2 | **The shopper taps a thumb** | No smartphone, mobile data, QR code, card or PIN. Just a thumb on the scanner. | — |
| 3 | **The Risk Engine checks and settles** | The scan becomes a keyed code that finds the shopper's account. The Risk Engine checks Thumb Lock, the thumb-pay limit and the balance, then the payment settles over Raast (simulated). | — |
| 4 | **Both sides know at once** | The shop's screen says PAYMENT SUCCESSFUL — PKR 180 RECEIVED. PKR 179.19 reaches the shop after a PKR 0.81 fee, and the shopper's receipt arrives by SMS. | PAYMENT SUCCESSFUL — PKR 180 RECEIVED |

**Simulated here** (small print under the steps): The prototype simulates the thumb scan with a one-time token. Real scanners need template matching and liveness detection.

**Numbers used:** PKR 180, PKR 179.19, PKR 0.81 (SPEC §6.1); under 3 seconds (SPEC §1).

**Vignette alt**
1. "Close-up of Rasheed's hand typing an amount on his phone terminal."
2. "Close-up of a thumb pressing the scanner. The sensor glows once."
3. "A soft pulse travels from the scanner to the phone as the payment is checked."
4. "Rasheed smiles at his phone. In the corner, a hand holding a keypad phone feels it buzz with a receipt."

---

### Section 4: For shops (`#shops`). Vignette: Rasheed at closing time, real app UI on the screen

**Eyebrow:** For shopkeepers

**Headline:**
1. **The proof is on the shop's own screen.** ← recommended
2. No screenshots to check.
3. Certainty, in the shopkeeper's hand.

**Lead:** The FingerPay terminal is the only FingerPay app, and it belongs to the shop. Shoppers never install anything. It runs in a browser today; an Android app comes next.

**Points**
- **One line, no doubt.** Each result is one plain line, such as PAYMENT SUCCESSFUL — PKR 180 RECEIVED. There's no screenshot to inspect.
- **Today's ledger.** Every sale with its time, amount, fee, net and Raast reference (simulated). Shoppers appear as a first name and initial, and only on settled sales.
- **Fix a mistake the same day.** Typed PKR 1,800 instead of 180? The owner voids the sale with a reason. The shopper gets the money back and an SMS.
- **Export the day.** The owner downloads the day's settlement as a CSV for the accountant.
- **Private by design.** The shop never sees a shopper's balance, CNIC or phone number. On a decline, the screen says why and never who.
- **Offline is clear.** If the internet drops, the screen says TAKE CASH. Nothing is queued, so nothing gets charged later by surprise.

**Screen content placed on the phone** (the real terminal ledger, demo data): Ayesha K., PKR 180.00, Settled · Bilal H., PKR 180.00, Settled · — (not shown for privacy), PKR 500.00, Declined.

**Numbers used:** PKR 1,800 / 180 example (SPEC §0 row 19); demo ledger rows (SPEC §6.3 demo flow).

**Vignette alt:** "At closing time, Rasheed sits behind his counter with a cup of chai, scrolling today's sales on his phone. The ledger on screen shows two settled sales and one decline with no name."
If the ledger is a real, readable DOM component over the art, the alt drops its last sentence, and the ledger itself is the accessible content (§6, W-7).

---

### Section 5: Safety (`#safety`). Vignette: "lock your thumb with one word"

**Eyebrow:** Security

**Headline:**
1. **Lock your thumb with one word.** ← recommended. It matches the vignette and names the unique feature (SPEC §13 #1).
2. Built for the day someone copies a thumb.
3. Safe when things go wrong, not only when they go right.

**Lead:** A thumb can't be changed like a PIN. So FingerPay assumes one will be copied someday, and limits what a copy can do.

**Overlay on Ayesha's phone screen** (live text, an SMS thread): her message "LOCK", then the reply "Thumb payments are now LOCKED. Visit any Allied Bank branch with your CNIC to unlock." (Label the overlay "Simulated SMS", Q3.)

**Five protections**
1. **No fingerprint images.** No fingerprint image is stored, sent or logged. The database keeps only a keyed code (an HMAC), made with a key that never enters the database. A copy of the database alone holds no usable thumbs and no readable CNICs.
2. **Thumb Lock by SMS.** Reply LOCK to any FingerPay SMS and thumb payments stop. Only a bank branch can unlock them, with the shopper's CNIC. *Why:* in India, fraudsters have lifted thumbprints from public property records, cast them in silicone and emptied bank accounts. The defence police there recommend most is a biometric lock the owner controls. (Source: Deccan Herald; Gujarat Cyber Crime; Scroll)
3. **An alert on every attempt.** The shopper gets an SMS for every payment, every declined attempt with their thumb, and any try on a locked thumb. Misuse shows up on their phone the same day, not on next month's statement.
4. **Retries never charge twice.** Each sale is one charge on the server. If the network stutters and the terminal asks again, the server replays the first receipt instead of charging again. Paying the same shop the same amount again within 15 seconds is blocked.
5. **Limits.** A thumb pays at most PKR 5,000 a tap on a salary account and PKR 2,000 on a student account, with daily caps of PKR 15,000 and PKR 5,000. Each sale allows 3 tries, and 10 unknown thumbs in 10 minutes pauses the terminal.

**Also:** A declined sale costs PKR 0. Every refund needs two different bank staff. Every change is written to a tamper-evident audit log.

**What a real launch still needs** (recommended; see Q7):
- A certified scanner with liveness detection, tested to ISO/IEC 30107-3, with a false-match rate of 1 in 10,000 or better.
- Above about 1,000 shoppers, matching by thumb alone gets less reliable. Production adds a second check that stays phone-free: the last 4 digits of a CNIC or phone typed at the till, or a second finger (SPEC §4.4, §4.10).

**Numbers used:** PKR 5,000 / 2,000 per tap; PKR 15,000 / 5,000 per day; 15 s; 3 tries; 10 in 10 minutes; PKR 0 (SPEC §4.9); 1 in 10,000 and about 1,000 shoppers (SPEC §4.4, §4.10).

**Vignette alt:** "At a bus stop, Ayesha texts LOCK from her phone, then holds up her thumb with a confident smile. Thumb payments are now locked."

---

### Section 6: Every phone (`#phones`). Vignette: Bilal and the SMS receipt

**Eyebrow:** Inclusion

**Headline:**
1. **No app, no data plan, no smartphone.** ← recommended
2. If it can't work by SMS, it isn't a shopper feature. (PRODUCT.md principle 3)
3. Works for the shopper with the most basic phone.

**Body:** Paying needs no phone at all, so a missing or non-PTA phone is no barrier at the counter. Everything after the sale comes by plain SMS to the shopper's registered number, on any phone that gets texts, including a keypad phone: the receipt, decline alerts, Thumb Lock and disputes. To lock thumb payments, reply LOCK. To question a payment, reply DISPUTE to its receipt.

**Overlay on Bilal's keypad phone** (live text; it's the real template output, so update it if §5 P1 ships):
Current template: "Allied Bank FingerPay: PKR 180.00 paid at Rasheed Kiryana Store via Raast Ref #RAAST-PK-…. Cashback Earned: PKR 3.60. Available Balance: PKR 273.60. Not you? Reply DISPUTE. Reply LOCK to block thumb payments." On a small screen, show the first two sentences and "…". Label it "Simulated SMS".

> Don't write "SMS works on non-PTA phones." A phone that isn't PTA-registered is normally blocked from Pakistani mobile networks, so it may not receive SMS at all (Q2).

**Numbers used:** PKR 180.00, PKR 3.60, PKR 273.60 (SPEC §6.3 demo flow, Bilal's student cashback).

**Vignette alt:** "Bilal walks out of the shop with a loaf of bread. His old keypad phone buzzes with an SMS receipt, and he gives himself a small thumbs-up."

---

### Section 7: Numbers (`#numbers`). No vignette

Every figure is a SPEC number with its condition attached. The tiles are designed with the `dataviz` skill (stat tile rules); this doc fixes only the words.

**Eyebrow:** In numbers

**Headline:**
1. **The numbers behind one thumb tap.** ← recommended
2. Small numbers, on purpose.

| Value | Label | Context line | Source |
|---|---|---|---|
| Under 3 s | Thumb to confirmation | The shop's screen confirms before the shopper turns to leave. | SPEC §1 |
| 0 | Fingerprint images stored | Only a keyed code is kept, with a key the database never holds. | SPEC §4.4 |
| 0.45% | Fee on sales above PKR 100 | Capped at PKR 25. Sales of PKR 100 or less are free. | SPEC §6.1 |
| 4.4–5.6× | Cheaper than a card machine | Compared with a 2.0–2.5% card fee. | SPEC §10.6 |
| PKR 0 | Charged on a decline | No fee, ever, when a payment doesn't go through. | SPEC §4.2, §5 |
| PKR 5,000 / 2,000 | Most a thumb pays per tap | Salary / student accounts, with daily caps too. | SPEC §4.9 |
| PKR 179.19 | What the shop gets from PKR 180 | The fee is PKR 0.81. | SPEC §6.1 |

Counters that animate (count-up) show the final value as their text from the start (§6, W-15).
Don't add any statistic that isn't in this table: no customer counts, no transaction volume, no market size.

**Optional "Why now" row** (only if the section list allows it, Q11). Each fact is from SPEC §12 with its source named and linked. FingerPay's own argument is a separate sentence, so the source line attaches only to the fact. Re-check each fact on the day it's published.
| Fact | Source line |
|---|---|
| More than 450 institutions in Pakistan verify customers with NADRA biometrics. | Dawn; Biometric Update |
| In our research we found no Pakistani bank offering thumb checkout in shops. | FingerPay team research (SPEC §12) |
| Pakistan's government approved a PKR 3.5 billion subsidy to bring shops onto Raast QR payments, for September 2025 to June 2026. *(FingerPay's point, separate sentence: QR still needs the shopper's smartphone and data.)* | Business Recorder; Profit |
| Pakistan's Personal Data Protection Bill was still not law in September 2026; its drafts treat biometric data as sensitive. | Chambers Practice Guides 2026; The Express Tribune |

Never compare fees with Raast QR (SPEC §10.6). Link text names the outlet and topic, for example "Dawn: NADRA biometric verification".

---

### Section 8: Footer. Vignette: sign-off, shutter at dusk

**Sign-off line** [NEW] (beside the vignette): Shutter down. Nothing left to check.

- **Disclaimer [SPEC], verbatim:** FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.
- **Cast:** Rasheed Ahmed, Ayesha Khan and Bilal Hussain are fictional demo personas.
- **What's real in this prototype:** The double-entry ledger, the Risk Engine's rules, encryption, request signing and the tamper-evident audit log, checked by 97 automated database tests. **Simulated:** the thumb scanner, NADRA, Allied Bank accounts, Raast settlement and SMS delivery. *(Update the test count from `npm run test:db` on the day it's published.)*
- **Lockup:** FingerPay. Making payments with one tap.
- **Credit:** © 2026 Team FingerPay. Individual names are Q6. Never show student IDs.
- No partner logos and no social proof.

**Vignette alt:** "At dusk, Rasheed pulls his shop shutter halfway down and waves goodbye."

---

### Live interaction: Rasheed's eyes (ART-PROMPTS §4)
His eyes follow the cursor and blink. It's decorative, so it has no copy and no accessible name (§6, W-11).

---

## 4. Merchant terminal microcopy

All strings are keyed by outcome code (SPEC §5), so Urdu can be added later. Messages use ICU MessageFormat with placeholders, never string concatenation. Amounts arrive from the API as decimal strings and are only formatted for display.

### 4.1 Result banners [SPEC] + helper lines [NEW]

The banner text is verbatim. The helper is one line under the banner, telling the cashier what to do next. Helpers never name the shopper, never blame, and never suggest working around a control. For example, a helper never says "split the bill" for a limit decline.

| Outcome | Banner [SPEC] | Helper [NEW] | Result class (§6, A-1) |
|---|---|---|---|
| `SUCCESS` | PAYMENT SUCCESSFUL — PKR {amount} RECEIVED | Paid by {displayName}. PKR {net} to your account after a PKR {fee} fee. | Success |
| `SUCCESS` with `replayed: true` | PAYMENT SUCCESSFUL — PKR {amount} RECEIVED | Same receipt as before. Nothing was charged twice. | Success |
| `DECLINED_LOW_BALANCE` | PAYMENT DECLINED: INSUFFICIENT BALANCE (PKR 0 FEE CHARGED) | Ask for cash or another way to pay. | Declined |
| `DECLINED_UNREGISTERED_THUMB` | THUMB NOT RECOGNIZED — ENROL AT ALLIED BANK BRANCH | Ask them to place the thumb again, or to pay another way. Each sale allows 3 tries. | Declined |
| `DECLINED_DUPLICATE_TAP` | DUPLICATE TAP BLOCKED — THIS SALE WAS ALREADY PAID | The earlier payment went through, and nothing more was charged. Check it in today's ledger. | Stop |
| `DECLINED_LIMIT` | PAYMENT DECLINED: ABOVE THUMB-PAY LIMIT (PKR 0 FEE CHARGED) | Ask for another way to pay. Thumb payments have a limit per tap and per day. | Declined |
| `DECLINED_THUMB_LOCKED` | PAYMENT DECLINED: THUMB PAYMENTS ARE LOCKED BY THE OWNER | The shopper has locked thumb payments by SMS. Ask for another way to pay. | Stop |
| `DECLINED_ACCOUNT_INACTIVE` | PAYMENT DECLINED: ACCOUNT NOT ACTIVE | Ask for another way to pay. The shopper's bank branch can explain. | Declined |
| `DECLINED_TERMINAL_THROTTLED` | TOO MANY UNKNOWN THUMBS — TERMINAL PAUSED FOR 10 MINUTES | This stops thumb guessing. Take cash until {resumeTime}. | Stop |
| `CHARGE_LOCKED` | START A NEW SALE | This sale closed after 3 tries that didn't match. | Declined |
| `CHARGE_EXPIRED` | START A NEW SALE | No thumb within 2 minutes, so this sale closed. Nothing was charged. | Declined |
| `CHARGE_CANCELLED` | START A NEW SALE | Sale cancelled. Nothing was charged. | Declined |
| offline (client) | INTERNET DOWN — TAKE CASH IMMEDIATELY (SALE NOT CHARGED) | Nothing was sent or queued, so nothing will be charged later. | Offline |

Notes:
- **"BY THE OWNER" is ambiguous.** On a shop terminal, "owner" reads as the shop owner, which is a role in this app. The helper resolves it, and Q5 proposes a banner fix.
- If `{resumeTime}` isn't available, the throttled helper says "Take cash for the next 10 minutes."
- **Processing time** [NEW]: "Processed in {seconds} s", with one decimal. It measures server time only (SPEC §0 row 14), so never present it as the end-to-end time.

### 4.2 A missing state: outcome unknown [NEW, needs approval, Q4]

If the thumb request was sent but no answer came back (a timeout mid-flight), the payment may have settled. Showing TAKE CASH here could charge the shopper twice: once by thumb, once in cash. Retrying the same charge is safe, because the server replays the receipt (SPEC §4.9).

| Element | Copy |
|---|---|
| Banner | PAYMENT NOT CONFIRMED — CHECK AGAIN BEFORE TAKING CASH |
| Helper | No answer from the server. Checking again never charges twice. |
| Button | Check again |
| After 3 failed checks | Still no answer. Open today's ledger when you're back online. If this sale isn't there, it wasn't charged. |

### 4.3 Sale flow strings [NEW]
| Key | Copy |
|---|---|
| Amount label | Amount (PKR) |
| Presets [SPEC values] | PKR 80 · PKR 150 · PKR 180 · PKR 500 |
| Keypad: backspace (accessible name) | Delete last digit |
| Keypad: clear | Clear amount |
| Charge button | Charge PKR {amount} |
| Charge with no amount (inline error) | Enter an amount first. |
| Amount out of range (inline error, DB FP400) | Enter an amount from PKR 0.01 to PKR 100,000. |
| Amount above PKR 5,000 (helper, before charging) | Thumb payments stop at PKR 5,000 a tap. Take another way to pay. |
| Waiting title | Waiting for thumb |
| Waiting helper | Ask the shopper to place their thumb on the scanner. |
| Waiting timer | Closes in {seconds} s |
| Cancel button | Cancel sale |
| Next button (after any result) | New sale |
| Connection status | Online / Offline: take cash |
| Back online (announcement) | Back online. Thumb payments are working. |
| Demo tray heading (demo mode only) | Demo: simulate a thumb tap |
| Demo tray buttons | Simulate thumb: {displayName} ({accountType}) · Simulate thumb: low balance · Simulate thumb: unregistered. Use the display name ("Ayesha K."), not the full name in SPEC's button label. |
| Demo tray empty | No enrolled shoppers yet. Enrol one in the branch portal and they appear here at once. |

### 4.4 Ledger [NEW]
| Element | Copy |
|---|---|
| Table caption | Sales on {date} |
| Columns | Time · Shopper · Amount · Fee · Net · Raast ref (simulated) · Status |
| Shopper cell on a decline | Visible "—". Accessible text: "Not shown for privacy". |
| Status labels | `SETTLED` Settled · `DECLINED` Declined · `OFFLINE_CASH` Cash (offline) · `REVERSED` Reversed, with detail "Voided by owner" or "Refunded after dispute" |
| Counters | Gross sales today · Fees saved vs a 2.5% card machine · Allied Bank balance (simulated) · Screenshots avoided · Sales this month |
| Refresh | Refresh ledger |
| Export (owner) | Export today's settlement (CSV) |
| Export done | Settlement CSV downloaded |
| Empty, today | **No sales yet today.** Sales appear here as soon as they settle. [Start a sale] |
| Empty, past day | No sales on {date}. |
| Load failed | Couldn't load the ledger. Check the connection, then tap Refresh ledger. |

### 4.5 Void (owner only, same day) [NEW]

A void can't be undone (SPEC: one live reversal per sale), so it's confirmed in a dialog. Undo isn't offered.

| Element | Copy |
|---|---|
| Row action (accessible name) | Void PKR {amount} sale at {time} (visible label: "Void") |
| Dialog title | Void the PKR {amount} sale at {time}? |
| Dialog body | The shopper gets PKR {amount} back and an SMS. PKR {net} comes out of your account, and the PKR {fee} fee is cancelled. {cashback, select, none {} other {The shopper's PKR {cashback} cashback from this sale is also reversed.}} A void can't be undone. |
| Reason label | Reason for voiding |
| Reason helper | Kept in the audit log. 3 to 500 characters. |
| Reason placeholder (an example, not an instruction) | Typed 1,800 instead of 180 |
| Quick reasons (fill the field) | Wrong amount entered · Shopper changed their mind · Goods returned · Charged the wrong shopper |
| Buttons | **Void sale** · **Keep sale** ("Cancel" next to "Void" could read as "cancel the sale") |
| Done (status toast) | Sale voided. PKR {amount} is back with the shopper. |

**Void errors** (what happened, then how to fix it)
| DB message → | App copy |
|---|---|
| FP400 `give a reason (3 to 500 characters)` | Enter a reason of 3 to 500 characters. (shown next to the field) |
| FP409 `only today's sales can be voided…` | Only today's sales can be voided. For an older sale, the shopper can reply DISPUTE to their SMS receipt. |
| FP409 `only settled sales can be voided` | This sale was declined, so nothing was charged and there's nothing to void. |
| FP409 `already reversed or has a refund pending` | This sale is already voided or has a refund in progress. |
| FP403 role | Only the shop owner can void sales. Ask the owner to sign in. |
| FP404 `sale not found` | This sale isn't in today's ledger any more. Refresh the ledger. |

### 4.6 General errors [NEW]
| Case | Copy |
|---|---|
| 401 (bad signature, stale timestamp, inactive terminal) | This terminal couldn't be verified. Set the phone's date and time to automatic, then sign in again. If it happens again, ask the owner to pair this phone again. |
| 423 (store or terminal not active) | Thumb payments are off for this terminal. Take cash, and ask the owner to check the terminal. |
| Rate limited | Too many requests from this terminal. Wait a minute, then try again. |
| 500 on a charge | Use §4.2 (outcome unknown). Never say "nothing was charged" on a 500 during a payment. |
| 500 elsewhere | Couldn't complete that. Try again. If it repeats, give this code to support: {correlationId} |
| Session ended | Your session ended. Sign in again to keep taking payments. |
| Sign-in failed | Email or password is incorrect. |
| CSV export failed | The export didn't start. Try again in a minute. |

### 4.7 Terminal pairing and revoking (owner) [NEW]
| Element | Copy |
|---|---|
| Pair button | Pair this phone |
| Paired | This phone is now a FingerPay terminal for {storeName}. |
| Revoke dialog title | Revoke "{terminalLabel}"? |
| Revoke body | This phone stops taking payments within 30 seconds. To use it again, pair it again. |
| Buttons | **Revoke terminal** · **Keep terminal** |

### 4.8 Urdu localisation notes
- **Keys, not sentences.** Every string above is one ICU message keyed by code (`pos.banner.DECLINED_LIMIT`, `pos.helper.DECLINED_LIMIT`). No concatenation around amounts, names or times.
- **Length.** Budget +40% width and allow 2–3 lines for every banner. Nastaliq script also needs much more line height than Latin, which `TYPE-AND-COLOR.md` sets. Banners wrap; they're never truncated or ellipsised. Test with pseudo-localised strings at +40%.
- **Case.** Urdu has no capitals, so the all-caps banner style doesn't carry over. Emphasis has to come from weight and size.
- **Numerals.** Use Western digits (0–9) for amounts, refs, times and the last 4 digits, in both languages. That's how Pakistani bank receipts print them, and it keeps them identical to the SMS. Set `numberingSystem: "latn"` explicitly in `Intl.NumberFormat` and `Intl.DateTimeFormat`. Test: render PKR 179.19 in `ur-PK` and assert only the characters 0–9, `.` and `,` appear.
- **RTL.** Set `lang="ur" dir="rtl"` on the root when Urdu is active. Wrap amounts, `RAAST-PK-…` refs, dispute refs and last-4 digits in a left-to-right isolate (`<bdi>` or `dir="ltr"`), so "PKR 180.00" never reorders. **Don't mirror the numeric keypad** or the amount field; phone keypads stay 1-2-3 left to right. The layout mirrors around them (`better-layout`, `APP.md`).
- **Currency label.** "PKR" in both languages for parity with SMS and receipts, unless Q8 decides on روپے.
- **Plurals.** Urdu uses CLDR `one` and `other`. Still use ICU plurals everywhere.
- **SMS commands stay Latin** (LOCK, DISPUTE), even in Urdu copy. The parser matches them in Latin letters.
- **Data isn't translated:** store names, display names, refs.
- **Spoken Urdu confirmation** (SPEC §13 #4, "ek sau assi rupay wusool"): amount only, never a name or balance (§6, A-7).

---

## 5. SMS copy review [MIGRATION]

**This section is a proposal only.** The SMS bodies live in `fp.*` functions in an applied migration, and applied migrations are immutable. Any change needs:
1. a new timestamped migration that runs `CREATE OR REPLACE` on the affected functions (`fp.api_thumb_pay`, `fp.api_void_payment`, `fp.api_enroll_customer`, `fp.api_set_thumb_lock`, `fp.api_sms_reply`, `fp.api_decide_refund`), keeping `SECURITY DEFINER`, `SET search_path = ''`, fully qualified names and the `GRANT EXECUTE … TO fp_app`;
2. updated assertions in `supabase/tests/fp_db.test.mjs`. Line 131 asserts `'Cashback Earned: PKR 50.00'` and `'Available Balance: PKR 14,870.00'`; line 147 asserts `'declined (insufficient balance)'`. Both break under the proposals below and must change in the same commit;
3. `npm run test:db` green.

Lengths below use the demo values (store "Rasheed Kiryana Store", 21 characters) and real ref formats (`RAAST-PK-YYYYMMDD-XXXXXXXXXXXX`, 30 characters; `ABL-DSP-YYYYMMDD-XXXXXXXXXXXX`, 29 characters). A single GSM-7 SMS holds 160 characters; longer messages split into 153-character segments.

### 5.1 Current templates (verbatim)
| Kind | Sent by | Current text | Length |
|---|---|---|---|
| `PAYMENT_RECEIPT` | `api_thumb_pay` | Allied Bank FingerPay: {amount} paid at {store} via Raast Ref #{raastRef}.[ Cashback Earned: {cashback}.] Available Balance: {balance}. Not you? Reply DISPUTE. Reply LOCK to block thumb payments. | 232 (2 segments) |
| `REFERRAL_BONUS` | `api_thumb_pay` | Allied Bank FingerPay: A friend you referred made their first thumb payment. Referral Bonus: PKR 100.00 credited. | 113 |
| `DECLINE_NOTICE` | `api_thumb_pay` | Allied Bank FingerPay: A payment of {amount} at {store} was declined (insufficient balance \| above your thumb-pay limit). No fee was charged. Not you? Reply LOCK. | 149 |
| `SECURITY_ALERT` | `api_thumb_pay` | Allied Bank FingerPay: Someone tried to pay {amount} at {store} with your thumb while thumb payments are locked. The payment was blocked. | 153 |
| `VOID` | `api_void_payment` | Allied Bank FingerPay: {store} cancelled your {amount} payment (Ref #{raastRef}). The amount is back in your account. | 153 |
| `ENROLLMENT` | `api_enroll_customer` | Allied Bank FingerPay: Your thumb is now linked to account ending {last4}. Pay at any FingerPay store with one tap. Reply LOCK anytime to block thumb payments. | 156 |
| `THUMB_LOCK` (locked) | `api_set_thumb_lock`, `api_sms_reply` | Allied Bank FingerPay: Thumb payments are now LOCKED. Visit any Allied Bank branch with your CNIC to unlock. | 108 |
| `THUMB_LOCK` (unlocked) | `api_set_thumb_lock` | Allied Bank FingerPay: Thumb payments are now UNLOCKED at your branch. | 70 |
| `DISPUTE_RAISED` | `api_sms_reply` | Allied Bank FingerPay: Dispute #{disputeRef} opened for {amount} (Ref #{raastRef}). Allied Bank will contact you within 3 working days. | 174 (2 segments) |
| `REFUND` (approved) | `api_decide_refund` | Allied Bank FingerPay: Dispute #{disputeRef} resolved. {amount} has been refunded to your account. | 117 |
| `REFUND` (rejected) | `api_decide_refund` | Allied Bank FingerPay: Dispute #{disputeRef} was reviewed and closed without a refund. Visit your branch for details. | 134 |

### 5.2 Findings
| Sev | Template | Problem | Fix |
|---|---|---|---|
| HIGH | `VOID`, `REFUND` (approved) | "The amount is back" / "{amount} has been refunded" overstates what the shopper gets. `fp.reverse_payment` also takes back cashback (Ayesha: +180 −50 = +130). | Name the reversed cashback when there was any (P5, P11). |
| HIGH | `THUMB_LOCK` (unlocked) | A security change with no way out if the shopper didn't ask for it. "UNLOCKED at your branch" is also ambiguous. | P7: offer "Not you? Reply LOCK now." |
| HIGH | `SECURITY_ALERT` | No next step after a likely fraud attempt, and it doesn't say nothing was charged. | P4. |
| HIGH | `api_sms_reply` behaviour | A reply that doesn't exactly match LOCK or DISPUTE after `upper(btrim())` (for example "Lock." or "lock karo") raises FP400 and **sends nothing**. A frightened shopper thinks they locked their thumb, but they didn't. | Accept the first word with punctuation stripped, and always answer: P13 (help), P8 (already locked). |
| MEDIUM | Repeat LOCK / repeat DISPUTE / DISPUTE on a non-receipt | No reply SMS, so the shopper hears silence. | P8, P10, P14. |
| MEDIUM | `DISPUTE_RAISED` | "within 3 working days" is a service promise SPEC never defines, made in a proposed partner's name. It's also 2 segments. | P9. |
| MEDIUM | `PAYMENT_RECEIPT` | 232 characters means 2 segments per sale (double cost), and some feature phones show the parts out of order. `store_name` allows up to 120 characters. | P1: drop the Raast ref from the receipt (it stays in the ledger and in disputes). That gives 160 without cashback; with cashback it's still 2 segments. |
| MEDIUM | `DECLINE_NOTICE` | "Reply LOCK." doesn't say what LOCK does. For some shoppers this is the first SMS they act on. | P3. |
| MEDIUM | Referral clawback | `reverse_payment` takes back the referrer's PKR 100, but the referrer gets no SMS. | P16 (new template). |
| MEDIUM | All (sender prefix) | "Allied Bank FingerPay:" presents Allied Bank as the issuer. Any SMS shown on the website reads as a partnership claim. | Q3. Label every SMS image on the site "Simulated SMS". |
| MEDIUM | All (encoding) | One non-GSM character (an Urdu store name, "…", "—", curly quotes) switches the whole SMS to UCS-2, which holds 70 characters per message, so a receipt becomes 4 segments. | Propose an ASCII `sms_name` of 24 characters or fewer per shop (schema change). |
| LOW | Receipt, referral | Title Case mid-sentence ("Cashback Earned", "Available Balance", "Referral Bonus"). | Sentence case. |
| LOW | All refs | "Ref #" and "Dispute #": the "#" adds nothing. | Drop "#". |
| LOW | `ENROLLMENT` | "FingerPay store" vs the "shop" vocabulary. | "FingerPay shop". |
| Note | Receipt, decline | In real SMS, replies aren't threaded to one message. A production DISPUTE needs a short key ("DISPUTE 2E40"). The demo feed is fine as is. | Decide at gateway integration. |

### 5.3 Proposed templates (prefix kept pending Q3; dropping "Allied Bank " saves 12 characters)
| # | Kind | Proposed text | Length |
|---|---|---|---|
| P1 | `PAYMENT_RECEIPT` | Allied Bank FingerPay: {amount} paid at {store}.[ Cashback {cashback}.] Balance {balance}. Not you or wrong amount? Reply DISPUTE. Reply LOCK to block thumb payments. | 160 without cashback / 179 with (2 seg) |
| P2 | `REFERRAL_BONUS` | Allied Bank FingerPay: A friend you referred made their first thumb payment. PKR 100.00 referral bonus added to your account. | 125 |
| P3 | `DECLINE_NOTICE` | Allied Bank FingerPay: {amount} at {store} declined: insufficient balance \| above your thumb-pay limit. No fee charged. Not you? Reply LOCK to block thumb payments. | 151 / 157 |
| P4 | `SECURITY_ALERT` | Allied Bank FingerPay: Your thumb is locked, so a {amount} payment at {store} was blocked. Nothing charged. Not you? Report it at any branch. | 157 |
| P5 | `VOID` | Allied Bank FingerPay: {store} cancelled your {amount} payment. {amount} is back in your account[; the {cashback} cashback from it was reversed]. | 115 / 160 |
| P6 | `ENROLLMENT` | Allied Bank FingerPay: Your thumb is now linked to account ending {last4}. Pay at any FingerPay shop with one tap. Reply LOCK anytime to block thumb payments. | 155 |
| — | `THUMB_LOCK` (locked) | No change. | 108 |
| P7 | `THUMB_LOCK` (unlocked) | Allied Bank FingerPay: Your branch unlocked thumb payments. Not you? Reply LOCK now and visit any Allied Bank branch. | 117 |
| P8 | `THUMB_LOCK` (already locked, new) | Allied Bank FingerPay: Thumb payments are already LOCKED. Visit any Allied Bank branch with your CNIC to unlock. | 112 |
| P9 | `DISPUTE_RAISED` | Allied Bank FingerPay: Dispute {disputeRef} opened for {amount} at {store}. Allied Bank will review it and SMS you the result. | 159 |
| P10 | `DISPUTE_RAISED` (repeat, new) | Allied Bank FingerPay: Dispute {disputeRef} is already open for this payment. Allied Bank will SMS you the result. | 131 |
| P11 | `REFUND` (approved) | Allied Bank FingerPay: Dispute {disputeRef} resolved. {amount} refunded to your account[; the {cashback} cashback from it was reversed]. | 152 with cashback |
| P12 | `REFUND` (rejected) | Allied Bank FingerPay: Dispute {disputeRef} was reviewed and closed without a refund. Visit your branch for details. | 133 |
| P13 | `HELP` (unrecognised reply, new) | Allied Bank FingerPay: Reply not recognized. Reply LOCK to block thumb payments, or reply DISPUTE to a payment receipt. | 119 |
| P14 | `HELP` (DISPUTE on a non-receipt, new) | Allied Bank FingerPay: Only payment receipts can be disputed. Reply DISPUTE to the receipt for that payment. | 108 |
| P16 | `REFERRAL_CLAWBACK` (new; send only when the clawback posts) | Allied Bank FingerPay: The payment that earned your PKR 100.00 referral bonus was cancelled, so the bonus was taken back. | 121 |

New kinds (P8, P10, P13, P14, P16) need the `sms_outbox.kind` values to be allowed, plus a test each: "repeat LOCK sends 'already LOCKED'", "'Lock.' locks the thumb", "unknown reply sends HELP", "void with cashback names the reversed cashback".

---

## 6. Accessibility requirements (WCAG 2.2 AA)

Each requirement has a pass condition. "Project rule" marks items that go beyond AA but are binding through BRIEF or PRODUCT (honour reduced motion everywhere; Lighthouse accessibility ≥ 95, SPEC M4).

**Test rig:** keyboard only (Chrome, Firefox); NVDA + Firefox; VoiceOver + Safari (macOS, iOS); TalkBack + Chrome (Android); Chrome DevTools rendering emulation (reduced motion, vision deficiencies, forced colours); axe DevTools; viewport 320 px wide; browser text at 200%.

### 6.1 Website: landing page with looping vignettes

| ID | Requirement | WCAG | Test (pass when) |
|---|---|---|---|
| W-1 | **Skip link.** "Skip to content" is the first focusable element, visible on focus, and lands on `<main>`. | 2.4.1 | Tab once from the address bar: the link shows. Enter: the next Tab reaches the first control inside `<main>`. |
| W-2 | **One label per vignette, not per frame.** Each vignette is one image node: an `<img>` key frame with the §3 alt, or a container with `role="img"` and `aria-label`. Individual frames (`<img>` swaps, canvas draws or a `<video>`) are `aria-hidden="true"` / `alt=""`. The label never changes while the loop plays. | 1.1.1, 4.1.2 | The accessibility tree shows exactly one image node per vignette, named with its §3 alt text, and no name-change events during playback. |
| W-3 | **WebGL is decoration.** Any lighting or glow canvas is `aria-hidden="true"`, never focusable, and has `pointer-events: none`. | 1.1.1, 2.1.1 | Tab never lands on a canvas. axe reports none in the tab order. |
| W-4 | **No flashing.** No frame sequence, sensor glow, phone buzz or lighting pulse flashes more than 3 times in any 1 second. At 12 fps, consecutive frames must not alternate a large bright area with a dark one (for example a phone screen lighting up and going dark on alternate frames). | 2.3.1 | Record each vignette loop and run it through a flash analyser (PEAT or equivalent): zero failures. Manual: no large-area light change faster than 3 per second. |
| W-5 | **Reduced motion = key frame.** Under `prefers-reduced-motion: reduce`, each vignette shows only its chosen key frame (the PNG from ART-PROMPTS). No frame playback, loops or `<video>` autoplay. No scroll-linked motion, parallax or pinning. Lenis is off (native scroll). The eyes hold the front-facing neutral pose without blinking. The thumb interaction jumps straight to its result. Section reveals are instant or an opacity cross-fade of 200 ms or less. | Project rule (2.3.3 is AAA); 2.2.2 | Emulate reduce and scroll top to bottom: nothing moves except native scrolling, every vignette shows a complete drawing, and all copy is visible without scroll interaction. |
| W-6 | **Pause control for looping vignettes.** Every vignette loops forever (6–8 s) and the eyes blink every 3.5–7 s, so one visible, keyboard-reachable control, "Pause animations" / "Play animations" (`aria-pressed`), stops them all. It's reachable from every scroll position and remembers its state for the session. Paused means key frames, as in W-5. (Pausing loops when they're off-screen is a performance choice, not a substitute.) | 2.2.2 | Press the control: within 1 frame every loop and blink stops on its key frame. The control is reachable by Tab from anywhere, and its state is announced. |
| W-7 | **No images of text.** The art contains no text. Every word or number on a drawn screen (amounts, the banner, the SMS, the ledger) is live HTML text placed in code. Overlays have the same contrast rules as body text. | 1.4.5, 1.4.3 | Disable images: every overlay string remains. Select the text on the phone screens: it selects. |
| W-8 | **Focus order.** DOM order equals visual order in every section, including the steps and problem items. If any section pins or reveals on scroll, a focused element scrolls fully into view and isn't covered by the sticky nav or the pause control. | 2.4.3, 2.4.7, 2.4.11 | Tab and Shift+Tab through the page with motion on: every stop is fully visible, with its focus ring showing. |
| W-9 | **No keyboard traps; scrolling keys work.** Space, Page Up/Down, arrows, Home and End scroll with Lenis on. Nothing captures keys. | 2.1.1, 2.1.2 | Keyboard alone goes from the top to the footer and back. Every key listed scrolls. |
| W-10 | **Press-and-hold thumb is a real button that doesn't need a hold.** A single click, tap, Enter or Space completes it. Holding is an optional flourish for pointer users and is never required. Its accessible name is "Pay PKR 180 with a thumb tap", it has a visible focus ring and a hit area of at least 44×44 CSS px, and the result is announced through an always-present `role="status"` region. Nothing on the page depends on using it. | 2.1.1, 2.5.1, 2.5.8, 4.1.2, 4.1.3 | Tab to it, press Enter: the result line appears and is read once. A quick mouse click also completes it. |
| W-11 | **Cursor-following eyes are decorative.** They carry no information, need no keyboard equivalent, are `aria-hidden`, and stop under reduced motion and when paused. | 1.3.3 | With the pointer idle or absent, no information is missing. |
| W-12 | **Contrast.** Text ≥ 4.5:1; large text (≥ 24 px, or ≥ 18.67 px bold) ≥ 3:1; focus ring, control boundaries and meaningful art strokes ≥ 3:1. Text on or beside a vignette is measured against the **worst frame** behind it, including the sensor-glow frame. | 1.4.3, 1.4.11 | Sample the brightest and darkest frame of each loop behind each overlay: the lowest ratio meets the target. Forced-colours mode keeps text and focus visible. |
| W-13 | **Focus indicator** on every interactive element: visible `:focus-visible`, 3:1 against adjacent colours, never hidden under the sticky nav. | 2.4.7, 2.4.11, 1.4.11 | Every Tab stop shows a ring that meets 3:1 in both themes. |
| W-14 | **Sound.** Nothing plays sound automatically. Vignette videos carry no audio track. Any sound (scanner beep, SMS buzz) is off until a visible "Sound on" toggle is used, and every sound cue has a visual equivalent. | 1.4.2 | Load the page: silence. Inspect the media files: no audio tracks. |
| W-15 | **Numbers are real, final text.** Stat values are HTML text. A count-up animation renders the final value in the DOM from the start and animates only the visual. Reduced motion shows the final value with no count. | 1.3.1, 4.1.2 | A screen reader reads each stat's final value even mid-animation. |
| W-16 | **Structure.** One `<main>`, `<header>`, `<footer>`. The hero headline is `<h1>`; Problem, How it works, For shops, Safety, Every phone and Numbers headlines are `<h2>`. Eyebrows are `<p>` before their heading. The four steps are an ordered list. | 1.3.1, 2.4.6 | The headings list shows 1 h1 and 6 h2s in page order. The steps are announced as "list, 4 items". |
| W-17 | **Reflow and text size.** At 320 px width and at 200% text: no horizontal scroll and no clipped text. Vignettes scale down or stack above their copy, and art never covers text. | 1.4.4, 1.4.10, 1.4.12 | Check every section at 320 × 640 and at 200% text. |
| W-18 | **Language.** `<html lang="en">`. Any Urdu phrase has `lang="ur"`; Roman Urdu has `lang="ur-Latn"`. | 3.1.1, 3.1.2 | Inspect: every Urdu phrase carries its `lang`. |
| W-19 | **Links say where they go.** Anchors and source links name their destination ("Dawn: NADRA biometric verification"). There's no "here" or "source". | 2.4.4 | The screen-reader links list makes sense out of context. |
| W-20 | **Loading.** The key-frame PNG shows first, and the loop streams in after. Copy is readable before any art loads. A preloader, if any, is a `role="status"` "Loading" and never hides `<main>`. | 4.1.3 | Throttle to Slow 3G: all copy is readable while the art loads. |
| W-21 | **Automated gates.** Lighthouse accessibility ≥ 95 (SPEC M4); axe: 0 serious or critical issues. | Project rule | Run before demo day and in CI. |

### 6.2 Merchant terminal app

| ID | Requirement | WCAG | Test (pass when) |
|---|---|---|---|
| A-1 | **Never colour-only.** Every result shows (a) the banner text, (b) an icon whose **shape** differs by class: Success = check, Declined = cross, Stop (duplicate, locked, throttled) = octagon/hand, Offline = crossed-out signal, and (c) the helper line. The classes are mapped in §4.1. | 1.4.1 | In DevTools greyscale emulation, every outcome is distinguishable by text and icon alone. |
| A-2 | **Counter-sized targets.** Keypad keys, presets, Charge, New sale and Cancel sale are at least 56×56 CSS px with gaps of 8 px or more. Every other target is at least 44×44, and nothing goes below the 24×24 AA floor. Charge and Cancel sale are never adjacent. | 2.5.8 (AA floor); 56/44 are project rules for busy counters | Measure at a 360 × 800 viewport. |
| A-3 | **Results are announced.** Pressing Charge moves focus to the "Waiting for thumb" heading. A result moves focus to the banner (heading with `tabindex="-1"`), so the banner and helper are read once. There's no separate live region for the same text, to avoid a double read. | 4.1.3, 2.4.3 | TalkBack, VoiceOver and NVDA each read the banner and helper once, within 1 s, with no user action, for all 13 outcomes. |
| A-4 | **Unprompted changes use live regions.** Going offline uses `role="alert"` ("Offline: take cash"); back online uses `role="status"`. Both regions exist, empty, from app start. The amount display is `aria-live="polite"` so typing announces "PKR 180". The charge timer announces only at 30 s left and at expiry, never every second. | 4.1.3 | Toggle offline mid-sale: announced immediately. Type 1-8-0: hear the amount. |
| A-5 | **Large text survives.** At 200% browser text and at Android's largest font and display size: banners wrap and are never truncated, the amount stays fully visible, and nothing scrolls horizontally. The keypad may scroll, but keys keep the A-2 sizes. | 1.4.4, 1.4.10 | Check every banner from §4.1 at maximum scale, in portrait and landscape. |
| A-6 | **Haptics and sound pair with the screen.** Each result class has a distinct haptic pattern that differs in pulse **count** (Success 1, Declined 2, Stop 3, Offline 1 long), so intensity doesn't matter. Each class has a distinct sound under 3 s. Haptics and sound always come with the visual banner and never carry information alone. Both have in-app toggles; sound follows system silent mode. (Vibration is Android-only on the web; iOS relies on sound and screen.) | 1.3.3, 1.4.1, 1.4.2 | With sound and haptics off, every outcome is still fully clear. With them on, a tester with eyes closed can name the class from the haptic count. |
| A-7 | **Spoken output is public.** Spoken confirmations, sounds and screen-reader text heard at the counter never include a shopper name on a decline or anyone's balance. | Privacy rule (SPEC §0 row 18) | grep the announcement and speech strings: no `{displayName}` in any decline string, and no balance placeholder anywhere. |
| A-8 | **Keypad semantics.** Keys are real `<button>`s named "1"–"9", "0", "Delete last digit" and "Clear amount". A hardware keyboard works: digits, Backspace, Enter = Charge. The visible label is contained in each accessible name. | 2.1.1, 2.5.3, 4.1.2 | Complete a demo sale with a keyboard only. |
| A-9 | **Ledger is a real table.** `<table>` with `<caption>` and `<th scope="col">`. Status is text. The decline shopper cell reads "Not shown for privacy". The Void button's name starts with its visible label: "Void PKR 180.00 sale at 10:42". | 1.3.1, 2.4.6, 2.5.3 | The screen reader announces column headers when reading cells. |
| A-10 | **Void dialog.** Native `<dialog>` opened with `showModal()`. Focus starts on the reason field, Escape closes, and focus returns to that row's Void button. The visible label is bound to the field, and errors connect through `aria-describedby` with `aria-invalid`. Validation runs on submit (Void sale is never disabled). | 2.4.3, 3.3.1, 3.3.2, 4.1.2 | Open, submit empty: the error is announced with the field. Escape: focus is back on the same Void button. |
| A-11 | **Sign-in.** Visible labels, `autocomplete="username"` / `"current-password"`, paste allowed, and no cognitive puzzle (Turnstile in non-interactive mode). | 3.3.8, 1.3.5 | Paste a password: it works. A password manager fills both fields. |
| A-12 | **Orientation.** Works in portrait and landscape; a counter phone may be mounted either way. | 1.3.4 | Rotate on every screen: no lock, no lost content. |
| A-13 | **Timed sale.** The 120 s charge expiry is a security limit (2.2.1 "essential" exception). The remaining time shows as text, and starting a new sale takes one tap. Toasts with an action or error stay until dismissed; plain confirmations stay at least 5 s and pause on focus. | 2.2.1, 2.2.2 | The timer is visible as text. The "Sale voided" toast stays ≥ 5 s and stays while focused. |
| A-14 | **Motion.** Result animations (springs, scale) have a reduced-motion equivalent: opacity only, no shake. | Project rule | Emulate reduce: results appear without movement. |
| A-15 | **Contrast.** Banner text and helper text ≥ 4.5:1 in both themes, focus ring ≥ 3:1. Recommended: 7:1 for banners because counters face glare. | 1.4.3, 1.4.11 | Measure every result class in light and dark. |
| A-16 | **Language and Urdu.** `lang="en"` now. When Urdu ships: `lang="ur" dir="rtl"`, with LTR-isolated amounts and refs (§4.8). | 3.1.1, 3.1.2 | Inspect the root and the amount spans. |

---

## 7. Open questions for the user

1. **"20+ transfer screenshots every evening"** (PDF §3) has no named source. Keep it with a source, or drop the number? Default: drop it (§3, Problem).
2. **Non-PTA and SMS.** PRODUCT.md says SMS features include non-PTA phones, but a phone that isn't PTA-registered is normally blocked from local networks, and Bilal has "no local SIM". Which number does a shopper like Bilal register for SMS? Default copy: "paying needs no phone; SMS goes to any registered number, including a basic phone."
3. **SMS sender prefix.** Keep "Allied Bank FingerPay:" (it shows the intended product) or switch to "FingerPay:" while the partnership is unconfirmed (SPEC §14.1)? The switch also saves 12 characters per SMS.
4. **Outcome-unknown state.** Approve the new banner "PAYMENT NOT CONFIRMED — CHECK AGAIN BEFORE TAKING CASH" for timeouts (§4.2)? It's outside SPEC §5's table, but without it TAKE CASH can double-charge a shopper.
5. **"LOCKED BY THE OWNER"** reads as the shop owner on a shop terminal. Change the SPEC banner to "PAYMENT DECLINED: THE SHOPPER HAS LOCKED THUMB PAYMENTS"? Until you decide, the banner stays verbatim and the helper line explains it.
6. **Team names in the footer?** Default: "Team FingerPay" only. Student IDs are never shown.
7. **Publish the honest limits** ("What a real launch still needs", including the about-1,000-shoppers 1:N limit) on the site? Technical judges will ask; investors may read it as a weakness. Default: show it.
8. **Urdu.** Will shopper SMS be English, Roman Urdu (stays 160 characters) or Urdu script (70 characters per SMS, so a receipt becomes 4 segments)? In the Urdu terminal UI, "PKR" or "روپے"?
9. **SMS migration.** Approve the §5 proposals for a new migration and tests now, or after the website (M4)?
10. **Which cast is canonical?** ART-PROMPTS.md draws Rasheed in his mid-40s and Ayesha as an office worker in her late 20s. SPEC, the PDF and WEBSITE.md say 52 and 34, a schoolteacher. The copy avoids ages and jobs until you choose. WEBSITE.md still describes the earlier scroll story and needs updating to the landing page.
11. **"Why now".** It's not in your section list (hero, problem, how it works, for shops, safety, every phone, numbers, footer). Keep the four sourced facts as an optional row under Numbers (§3, Section 7), or drop them?
