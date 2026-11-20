# FingerPay website: landing page plan

> **Status:** v3, 2026-11-18. Follows the **UPDATE** in `docs/design/BRIEF.md` ("Direction decision"). The site is a **landing page** of normal sections. Each section holds one short, looping, hand-drawn **12 fps vignette** from `docs/design/ART-PROMPTS.md`, with real copy beside it. There is no continuous story from one section to the next. This replaces v1 (3D) and v2 (scroll story).
> **Inputs:** `BRIEF.md` (binding), `ART-PROMPTS.md` (binding for cast, style and vignettes), `PRODUCT.md`, `docs/SPEC.md` §1, §4.3–4.4, §4.9, §5 (Views A, B, D, F), §6.1–6.3, §10.6, §12, §13, the SMS templates in `supabase/migrations/20261118000300_fp_api.sql`, `scripts/seed-demo.ts`, PDF §3.
> **Owns:** the page structure, the per-section layout and interaction, the signature interaction, the frame and asset list, the website tech plan, and the self-score.
> **Doesn't own:**
> - fonts and colours (`TYPE-AND-COLOR.md`; this doc names roles only)
> - springs, easing and frame-player timing tokens (`MOTION.md`; this doc gives choreography budgets in ms)
> - final copy (`CONTENT.md`; the lines here are working copy built only from SPEC facts)
> - app screens (`APP.md`)
> **Mode:** Persuade.

---

## 0. Strategy check

I agree with the brief: story-first, with the merchant app as proof and no "download our app" call to action, because shoppers have no app by design. Two refinements:

1. **The page still has a working action.** The hero's press-and-hold thumb runs the PKR 180 sale (§3). A judge *does* the product in the first viewport. That's the Persuade-mode action, not a decorative button.
2. **A convinced investor needs somewhere to go.** A plain contact line in the footer, with no form, is the user's call (§7, Q4).

---

## 1. Concept

> **A Lahore kiryana counter drawn by hand, where each section is one lit moment at the counter: a thumb settles the sale, the shopkeeper sees it on his own screen, a basic phone gets the receipt, and one word locks the thumb.**

**The page reads as a row of lit shop windows on a dark street at night.**
- The page ground is dark: an evening bazaar.
- Each vignette sits in its own **lit stage panel** in the illustration's paper tone, like a shopfront glowing in the dark.
- **Why this framing is necessary:** the art's ink linework (`#1C1C1F`, ART-PROMPTS §1) disappears on a dark ground. Lit panels keep the art legible and keep the page dark-leaning.
- **Why it's not the rejected cream editorial:** the page itself stays dark. Paper appears only inside the "windows", and the panels have cut, asymmetric shapes, not full-width paper sections.
- Panel colour and contrast come from `TYPE-AND-COLOR.md`. This is the main thing that doc must reconcile with ART-PROMPTS §5.

**Swap test (could this be another fintech's site?) No:**
- **The actor:** the hero sale needs a thumb on a scanner beside a cashier's phone. Wallet and QR sites need the shopper's phone; card sites have no shop.
- **The people:** a named kiryana owner, a shopper with empty hands, and a student whose old keypad phone gets a real SMS template.
- **The security beat:** typing LOCK to block thumb payments is FingerPay's own mechanism (SPEC §4.9, §13 #1). It isn't a generic padlock icon.

Remove the thumb and the SMS, and nothing is left.

**Still legible with all motion removed:** every vignette has a designed key frame (ART-PROMPTS §3). The static page reads as a picture book of the counter, and that's also the reduced-motion version (§5.4).

**What's left out on purpose:**
- the rejected looks: cream editorial page, particle thumbprint, cyan/violet glow, headline-left/object-right hero, 3-up card grids
- generic SaaS blocks: icon-feature grids, logo walls, testimonial carousels, pricing tables
- nothing copied from human-md.ai: only the technique (separate poses at 12 fps, frame index snapped to 1/12 s, flat layered art, one code-drawn eye interaction) and the level of craft transfer

---

## 2. Cast and art (fixed by `ART-PROMPTS.md`)

| Who | Look (ART-PROMPTS §2) | Appears in |
|---|---|---|
| **Rasheed** (shopkeeper) | mid-40s, trimmed black beard with a little grey, reading glasses on his head, olive-green shalwar kameez with rolled sleeves, a pen in the pocket | hero, problem 3a and 3b, step 1, step 4, for shops, footer, eye atlas |
| **Ayesha** (salary shopper) | late 20s, shoulder-length hair, tarp-blue kurta, chai-brown dupatta, canvas tote | hero, safety |
| **Bilal** (student) | around 20, messy hair, turmeric hoodie over a white kurta, backpack, old keypad phone | problem 3c, every phone |
| **Props** | scanner pad on a stand, phone on a counter stand (blank screen), counter with sweets jar and bread, milk and bread, grocery shelf, keypad phone | throughout |

**Style:** flat cel fills, even ink line, a limited kiryana palette (chai, turmeric, chilli, bottle green, tarp blue, paper, ink). There's no text in the art: every word, number and app screen is real DOM placed in code.

**Persona labelling:** all characters are **fictional demo personas**, labelled once, in the problem section.

**Art and PDF disagree on two personas:**
- The art redraws Ayesha as a late-20s office worker. PDF §4 has a 34-year-old schoolteacher.
- The art has Rasheed in his mid-40s. The PDF has him at 52.

The copy therefore never states their ages or jobs (§7, Q6).

---

## 3. Signature interaction: "Hold a thumb here" (hero)

**What a judge says afterwards:** "You hold your thumb on the drawn scanner, the shopkeeper nods, and the real app on his phone says PKR 180 received, in under three seconds."

**Trigger:**
- a real `<button>` over the scanner pad: "Hold to pay PKR 180"
- pointer or touch down, or Space/Enter keydown

**Art:** ART-PROMPTS §4 thumb press, 6 stages: hovering, touching, pressed, sensor glow, glow fading, lifted.

| t (ms) | What happens |
|---|---|
| 0 | The hero loop pauses on its "thumb near the pad" pose and swaps to the thumb-press close-up inset (it grows from the scanner, 240 ms). |
| 0–600 | Thumb stages 1→3 **scrub with hold progress**, snapped to 12 fps. A ring around the button fills. |
| 600 | Capture: stage 4 (sensor glow). The glow is drawn in the art, not a CSS halo. |
| 600–1500 | Six checks tick in pipeline order, 150 ms apart (DOM list, `aria-live="polite"`): terminal signature · fresh nonce · thumb lookup (HMAC) · Thumb Lock off · within PKR 5,000 limit · balance. |
| 1500–2000 | The **real app banner** (APP.md component, demo replay) slides up beside Rasheed's phone: `PAYMENT SUCCESSFUL — PKR 180 RECEIVED`, net `PKR 179.19`, fee `PKR 0.81`. The hero loop resumes on its "Rasheed nods" segment. |
| 2000–2600 | Thumb stages 5–6 (glow fading, lifted). The inset shrinks back. A caption reads: "Illustrated timing. The prototype measures real processing time." |

**Releasing early** (before 600 ms):
- stages play back in reverse
- caption: "Hold a little longer. Scanners need a steady thumb."
- nothing is shown as paid

**Repeatable:** "Pay again" cycles through real View A outcomes:
1. Bilal success with 2% cashback
2. Bilal PKR 500: `PAYMENT DECLINED: INSUFFICIENT BALANCE (PKR 0 FEE CHARGED)`, shown **with no name**
3. Unregistered thumb: `THUMB NOT RECOGNIZED — ENROL AT ALLIED BANK BRANCH`

**Discoverability (first 3 s):**
- a caption beside the scanner
- the cursor becomes a thumb-sized ellipse over the button
- a single sensor glow on the pad at 1.2 s after load (no pulsing loop)

**Mobile:**
- the button is at least 96 px, about thumb-sized
- `touch-action: none` and no long-press callout, on the target only

**Accessibility:**
- a visible "Pay without holding" text button runs the same sequence
- the outcome is announced through the live region

**Reduced motion:**
- holding still works
- the response is three key frames (pressed → glow → lifted), each a 200 ms cross-fade
- the check list appears complete at once and the banner fades in

**No JS:** the key frame plus the banner text, written as normal copy.

**Second live interaction: Rasheed's eyes.**
- **Art:** the ART-PROMPTS §4 3×4 sheet (9 gaze directions and a blink).
- **Where:** in the hero, the eye frame nearest the cursor's angle is composited over his head layer, and he blinks every 3.5–7 s.
- **Touch:** the gaze follows the last touch.
- **Reduced motion:** looks straight ahead and doesn't blink.
- **Elsewhere:** reused in the footer, where he looks toward the cursor as he waves.

---

## 4. Sections

Layout uses Astryx `Grid` on 12 columns (desktop ≥ 1024 px). Every section has its own composition, with no repeated "image left, text right" rhythm. Vignette sizes vary on purpose.

The **frames** figures below are unique drawn frames after holds are deduplicated (§5.2). Real copy is working copy from SPEC; `CONTENT.md` finalises it.

### 4.0 Nav
- **Left:** mark + wordmark (`brand/BRAND.md` vectors).
- **Centre:** anchors named for what they lead to: How it works · For shops · Safety · Every phone · Numbers.
- **Right:** a quiet tag "Student prototype · integrations simulated", linking to the footer disclaimer, plus a sound toggle (off by default, §5.5).
- **No CTA button.** The hero's hold *is* the action.
- **Behaviour:** sticky, 56 px; on scroll down it hides; on scroll up it returns.
- **Mobile:** mark + menu. A sheet holds the anchors as 44 px rows plus the tag.

### 4.1 Hero: "the one-tap moment"
**Vignette:** ART-PROMPTS "Hero", 16:9, a 6 s loop: Ayesha presses her thumb, the sensor glows, Rasheed checks his phone and nods, she picks up the bread and milk.
- **Frames:** 30 unique, plus the thumb-press interaction (6) and the eye atlas (10).

**Layout:**
- **Frame:** a `100dvh` first viewport.
- **Stage panel:** a large lit panel filling columns 2–12, bleeding off the right edge, with a cut top-left corner.
- **Headline:** set in the panel's empty upper area, which the key frame reserves for it (ART-PROMPTS: "generous empty white space above for a headline"). It's left-aligned at columns 3–8, so the headline sits **inside the scene**, not beside it.
- **Hold button:** on the scanner pad, mid-panel.
- **App banner:** appears at the right edge beside Rasheed's phone during the sale.
- **Disclaimer tag:** the nav's tag is visible in the first viewport.

**Copy:**
- **H1:** "Your thumb is the whole wallet." (PRODUCT positioning)
- **Sub:** "Pay at the counter in under 3 seconds. No phone, card, PIN or cash." (SPEC §1)
- **Caption by the scanner:** "Hold a thumb here to pay PKR 180."

**SPEC facts:**
- under 3 s from thumb to settled
- the PKR 180 demo sale, with net 179.19 and fee 0.81 (§5 View A, §6.1)

**Merchant app proof:** the live banner from the real app UI.

### 4.2 Problem: "what checkout looks like today"
**Vignettes:** ART-PROMPTS 3a cash with no change · 3b the transfer screenshot · 3c no phone, no card. Each is a 4 s loop.
- **Frames:** 12 + 12 + 12 = 36.

**Layout:** an asymmetric bento, not three equal cards.
- **3b (screenshot):** the biggest panel, columns 1–7, two rows tall. It's the most FingerPay-specific pain.
- **3a (cash):** columns 8–12, row 1.
- **3c (Bilal):** columns 9–12, row 2, offset one column inward so the right edges don't align into a grid.
- **Copy:** each panel's copy sits **under or beside its panel at a different alignment**: 3b's copy is a large statement beside it; 3a's and 3c's are short captions.
- **Mobile:** 3b first, then 3a and 3c stacked, with 3c inset.

**Copy (PDF §3–4):**
- **3b:** "Shopkeepers check 20+ transfer screenshots every evening." and "FingerPay: 0 screenshots checked. The shop's own screen says paid."
- **3a:** "No change for a PKR 1,000 note."
- **3c:** "No phone, no card, no PIN. Many students' non-PTA phones can't receive banking OTPs."
- **Persona label:** "Fictional demo personas."

**SPEC facts:**
- pillar 2, merchant screen certainty (§1)
- pillar 3, non-PTA inclusion (§1)
- micro-tickets PKR 150–180 (PDF §3)

### 4.3 How it works, in 4 steps
**Vignettes:** ART-PROMPTS steps 1–4, each 1:1 and a 4 s loop.
- **Frames:** 12 + 12 + 10 + 12 = 46.

**Layout:** a **descending staircase**, not a 4-up grid.
- **Shape:** each step is a square lit panel at a different size, stepping down and right across the section like goods on shop shelves.
- **Sizes:** step 2 (the thumb) is largest (5 columns). Steps 1, 3 and 4 use 3, 4 and 3 columns.
- **Copy:** each step's number and copy hang from a hairline to its panel's lower-left.
- **Timing:** one shared 0–3 s rule runs along the staircase's diagonal with the four steps marked on it.
- **Loop control:** loops play only while in view.
- **Mobile:** a vertical stack with alternating left and right insets, the rule running down the left edge.

**Copy (PDF §3 four steps, with the §10.6 correction):**
1. **The shopkeeper enters the amount.** The cashier types PKR 180 on the FingerPay terminal and presses Charge.
2. **The customer taps a thumb.** No smartphone, data, QR, card or PIN.
3. **The Risk Engine checks and settles.** Thumb lookup, Thumb Lock, limits and balance, then settlement over Raast (simulated). It's a rules engine, never called AI (§0 #21).
4. **Confirmed in under 3 seconds.** `PAYMENT SUCCESSFUL — PKR 180 RECEIVED` on the shop's own screen; an SMS receipt goes to the shopper.

**Live:** hovering or focusing a step plays its loop at full speed; the others idle on their key frame. On touch, the step nearest the viewport centre plays.

### 4.4 For shops: the real app on a blank phone
**Vignette:** ART-PROMPTS "For shops", 16:9, a 6 s loop: Rasheed at closing time on a stool, scrolling his phone, chai beside him. The phone screen is a **plain white rectangle**.
- **Frames:** 24.

**The proof:** the real merchant app UI is placed onto that blank screen in code.
- **Placement:** each frame's manifest stores the screen's four corner points (recorded during processing). The app view (an Astryx component from `APP.md`, rendered in a static demo-replay mode) is fitted with a CSS `matrix3d` homography per frame, so it rides the phone as he scrolls.
- **Content:** the screen shows **View B, the day's ledger**. Rows: time, shopper (first name and initial, settled rows only), gross, fee, net, Raast ref (simulated), status. Counters: total sales, screenshots avoided, and "this month: 143 transactions" (seed 142 + the demo sale).
- **Privacy:** no shopper balance appears anywhere on it (privacy rule).

**Layout:**
- **Panel:** the largest stage on the page, full-bleed left at columns 1–8.
- **Right column (9–12):** a short pitch and an **outcome rail**, a vertical list of the real View A banners. Selecting one shows it on Rasheed's phone (the homography view swaps from ledger to banner).
- **Fee keypad:** below the panel, offset right (a 4 × 2 block in columns 6–12). Tapping a test-vector amount (50 · 100 · 100.01 · 130 · 180 · 500 · 5,555.56 · 10,000) shows fee / FingerPay 70% / bank 30% / net **from the static §6.1 table**, captioned "the numbers the database test suite asserts". The site computes nothing.
- **"Internet down" toggle:** shows `INTERNET DOWN — TAKE CASH IMMEDIATELY (SALE NOT CHARGED)` on the phone, with the caption "Nothing is ever queued."

**Copy:**
- "The shop sees the payment on its own screen. No screenshots to check."
- "0.45% on sales above PKR 100, capped at PKR 25. A declined sale costs PKR 0."
- "4.4–5.6× cheaper than a 2.0–2.5% card machine" (framed against card POS only, never Raast QR; §10.6).
- "Terminal rent PKR 0 for the 90-day trial."

**SPEC facts:** §5 Views A and B, §6.1 vectors, §6.2 trial, §1 pillar 6.

**Merchant app proof:** this is the main "for shops" proof. There's no download CTA; the copy frames it as "the screen your cashier sees".

### 4.5 Safety: "lock your thumb with one word"
**Vignette:** ART-PROMPTS "Safety", 16:9, a 6 s loop: Ayesha at a bus stop types on her phone, then holds up her thumb with a confident smile.
- **Frames:** 24.

**Layout:**
- **Statement:** a narrow, tall copy column on the **left** (columns 1–4) with the section's big statement.
- **Panel:** the vignette panel to the right, columns 5–12, dropped 10% lower than the statement, with a cut bottom-right corner.
- **SMS thread:** set into the panel's lower-left corner, overlapping it.

**Live:** a DOM SMS thread shows the real receipt template, ending with "Not you? Reply DISPUTE. Reply LOCK to block thumb payments." The visitor taps **Reply LOCK**. Then:
1. The vignette jumps to its "thumb held up" segment.
2. A second message shows what happens next time: a blocked attempt, banner `PAYMENT DECLINED: THUMB PAYMENTS ARE LOCKED BY THE OWNER`.
3. Then the real security alert: "Someone tried to pay PKR 180.00 at Rasheed Kiryana Store with your thumb while thumb payments are locked. The payment was blocked."
4. An **Unlock** control appears disabled, with its reason: "Only a branch can unlock."
5. "Reset" restores the thread.

**Supporting copy (rows, not cards):**
- "No fingerprint image is ever stored. The database keeps only a keyed HMAC of the scan." (§4.3–4.4)
- "Per tap: PKR 5,000 salary, PKR 2,000 student, plus daily caps." (§4.9)
- "Duplicate taps blocked. Retries never charge twice." (§4.9)
- "Owners get an SMS on every payment and every matched decline." (§4.9)
- "Why: cloned-fingerprint fraud in India's AePS. Police recommend a lock the owner controls." (§12, sources linked)
- the honest note: "In the prototype a thumb is a simulated 32-byte token. Real scanners need certified hardware with liveness detection." (§4.4)

### 4.6 Every phone: Bilal and the SMS receipt
**Vignette:** ART-PROMPTS "Every phone", 16:9, a 6 s loop: Bilal walks out with bread, his keypad phone buzzes, he reads it and gives a thumbs-up.
- **Frames:** 24.

**Layout:**
- **Panel:** a wide, short panel spanning columns 3–12, offset right. It mirrors the safety section's left-heavy composition, so the page zig-zags.
- **Receipt:** the SMS is set as a large monospaced text block, **hung from a hairline pointer** that runs from his phone in the art to the text (columns 1–5) and overlaps the panel's left edge.
- **Mobile:** the panel comes first, and the SMS block sits under it with the pointer turned vertical.

**Copy:**
- "Receipts come by plain SMS. Any phone works, even a non-PTA keypad phone with no data."
- The SMS is the real template with demo values: "Allied Bank FingerPay: PKR 180.00 paid at Rasheed Kiryana Store via Raast Ref #… Cashback Earned: PKR 3.60. Available Balance: PKR 273.60. Not you? Reply DISPUTE. Reply LOCK to block thumb payments."
  - the Raast ref is shown as a labelled *simulated* placeholder
  - the balance is on **his** phone, never on the shop's screen
- "Reply DISPUTE opens one ticket per payment. Refunds need two people at the bank." (§4.9)

**SPEC facts:** §1 pillar 3; §5 View D; §6.2 2% student cashback (Bilal's demo-flow figures, §6.3).

### 4.7 Numbers
**Vignette:** none new. This section is typographic, the page's dense, quiet passage after six illustrated ones.
- **Art reuse:** the step-2 thumb loop (reused, small) beside the first figure.
- **Frames:** 0 new.

**Layout:** a ledger-style block of full-width rows separated by hairlines (Astryx `Table`/`Divider`), with no stat cards.
- **Row shape:** each row is a big figure (tabular numerals, smaller decimals like the user's wallet reference) with its context line right-aligned on the same baseline.
- **Row widths:** rows alternate between full width and indented by two columns, so the figures form a stagger.

**Rows (SPEC/PDF only):**

| Figure | Context |
|---|---|
| < 3 s | thumb to settled, on the shop's own screen |
| 0.45% | above PKR 100, capped at PKR 25; PKR 0 at or under PKR 100 |
| PKR 0 | fee on a declined sale |
| PKR 180.00 → 179.19 | the demo sale: fee PKR 0.81, split 0.57 FingerPay / 0.24 bank |
| PKR 5,000 · 2,000 | per-tap limit, salary · student |
| 0 | fingerprint images stored |
| 7 AM – 11 PM | the kiryana day it's built for (PDF §3) |

**Motion:** figures count up once on first view (tabular, so there's no layout shift), with depth-faded digits per `MOTION.md`. Under reduced motion they're static.

### 4.8 Footer: sign-off and disclaimer
**Vignette:** ART-PROMPTS "Footer", 16:9, a 6 s loop: Rasheed at dusk pulls the shutter halfway down and waves goodbye. His eyes follow the cursor during the wave hold (eye atlas reused).
- **Frames:** 24.

**Layout:**
- **Panel:** full-bleed at the bottom, the only panel with no cut corner, like the shop front itself.
- **Disclaimer:** set as real text **on the shutter area** of the panel, columns 2–8, max 60ch: *"FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed."*
- **Beneath:** mark, anchors, the credits line (§7, Q5), the optional contact line (§7, Q4) and "Back to the counter ↑".
- **No partner logos.**

**Disclaimer placement, in full:**
1. The full verbatim text in the footer (§10.6).
2. The nav tag on every viewport.
3. "Simulated" on every app view (hero banner, for-shops phone) and on every Raast reference.
4. "Fictional demo personas" in the problem section.
5. The short line on the OG image.

---

## 5. Craft pass and tech plan

### 5.1 Stack (Next.js 16 + Astryx)
- **Server components:** render all copy, so text is SSR'd and the page reads without JS.
- **Astryx handles all layout and text:** `AppShell` (content only), `Section`, `Grid` + `StackItem` spans, `VStack`/`HStack`, `Heading`, `Text`, `Divider`, `Table`, `Button`.
- **Escape hatches:** the vignette `<canvas>` and the app-screen homography wrapper are the only exceptions.
- **Tokens:** reach canvas code through `useTheme()`.
- **Client islands:**
  - `VignettePlayer` (one per section)
  - `HoldToPay`, `EyeGaze`, `ReplyLock`, `OutcomeRail`, `FeeKeypad`, `OfflineToggle`, `CountUp`, `SoundToggle`
- **Dependencies:**
  - add `gsap` (ScrollTrigger is free) and `lenis`
  - three.js isn't needed
  - `animejs` isn't used on the site
  - `motion` only for UI micro-springs if `MOTION.md` keeps it
- **Scroll:**
  - Lenis with `autoRaf: false`, driven by `gsap.ticker`, `syncTouch: false` (native touch), destroyed under reduced motion
  - ScrollTrigger does **only** start/pause loops at viewport entry, section reveals (grouped, once) and the count-up
  - no pinning and no scrubbing: it's a landing page
  - the frame players draw inside the same ticker
- **Security:**
  - the site calls **no API**; every number is a static SPEC value (View F)
  - the CSP is unchanged: everything is self-hosted, with no workers, WASM or external hosts
  - styles change only through the CSSOM
  - Lenis's CSS rules go in the existing global stylesheet (the `fonts.css` precedent)
- **Content check:** `src/content/site.ts` holds every figure and banner. A unit test asserts its fee vectors and demo-flow balances equal those in `supabase/tests/fp_db.test.mjs`.

### 5.2 Frame pipeline and player

**Pipeline** (from the user's Flow/Higgsfield output, per ART-PROMPTS "How to use"):
1. **Extract:** MP4 at 24 fps → take every 2nd frame (12 fps).
2. **Dedupe holds:** identical or near-identical frames (pixel difference under a threshold) collapse into one frame plus a **hold count**. Drawn timing holds on key poses, which is how a 6 s loop (72 ticks) becomes about 24–30 unique frames.
3. **Cut out:** remove the flat white background into alpha.
4. **Correct colour:** snap fills to the ART-PROMPTS palette (generators drift).
5. **Pack:** one **WebP atlas** per vignette, plus a manifest: frame rects, a timing track (frame id + hold ticks), the loop point, and for the for-shops vignette the per-frame screen corners.
6. **Reject:** any frame that fails ART-PROMPTS's reject list (garbled marks, extra fingers, off-model faces).

**Player:**
- **Decode:** atlases are decoded with `createImageBitmap` and drawn with `drawImage` onto the section's canvas, on top of its stage panel (a CSS shape, from tokens).
- **Clock:** one shared 12 fps clock, `tick = floor(t × 12)`, so every vignette steps on the same beat. The player walks the timing track.
- **Hold interaction:** the hero's hold scrubs the thumb sequence by progress, snapped to 12 fps.
- **Eye gaze:** the eye cell nearest the cursor angle is composited over the head layer. A cell is held for at least 2 ticks to stop jitter.
- **Offscreen:** a player outside the viewport stops. Beyond ±2 viewports, its bitmaps are `close()`d.

### 5.3 Sizes, loading and LCP
**Display sizes:**
- the hero panel is about 1100 × 620 CSS px
- atlases are drawn at 2× on desktop (16:9 frames at 1600 × 900, 1:1 at 900 × 900) and 1× on mobile (800 × 450 and 600 × 600)

| Asset | Desktop | Mobile |
|---|---:|---:|
| One 16:9 frame in an atlas (WebP, alpha, q≈80) | 35–60 KB | 12–20 KB |
| One 1:1 step frame | 20–30 KB | 8–12 KB |
| Key frame still per vignette (AVIF, also the reduced-motion and no-JS image) | ≤ 70 KB | ≤ 35 KB |
| **First view** (HTML, CSS, fonts ≤ 150 KB, hero key frame, hero atlas, JS ≤ 110 KB gz) | ≤ 1.4 MB | ≤ 650 KB |
| Whole page, loaded progressively | ≤ 6 MB | ≤ 2.5 MB |

**Loading order:**
1. **LCP:** the H1 (DOM text in the hero panel) or the hero key frame AVIF (`<img fetchpriority="high">` with fixed dimensions, so CLS is 0). It's never the canvas.
2. **After first paint:** the hero atlas loads. The key frame stays until the atlas decodes, then the loop starts on the same pose with no visible swap.
3. **Lower sections:** atlases load through a single-flight queue as each section comes within 1 viewport, nearest first.
4. **Slow connections** (`saveData`, 2g/3g): key frames only.

**Targets:**
- LCP < 1.5 s, CLS < 0.05
- INP < 100 ms: the hold responds in the same frame
- 60 fps on a mid-range Android (one `drawImage` per tick per visible vignette)

### 5.4 Reduced motion
- **Vignettes:** each shows its **key frame** only, with no loops.
- **Interactions** (hold, LOCK, outcome rail) swap between two or three key frames with 200 ms cross-fades.
- **Also off:** eye gaze, blink, count-up and Lenis.
- **Bytes:** key frames only, no atlases.

### 5.5 Rest of the craft pass
- **No preloader.** First paint is the hero key frame plus the H1.
- **Custom cursor** (fine pointers only): a small ring that becomes a thumb ellipse over hold targets and stays native over text.
- **States:**
  - links underline at 4 px offset and 1 px thickness, drawn in on hover (180 ms)
  - buttons get a tonal hover, `:active` scale 0.97, and the playbook focus ring
  - the disabled Unlock shows its reason
  - decline and offline states carry a hatch or icon, never colour alone
  - the six unthemed surfaces are themed from `TYPE-AND-COLOR.md`
- **Page transitions:**
  - one page plus an optional `/security` page (Q3) and the 404
  - a 400 ms cross-fade and the stage panel's cut corner wiping across; focus goes to the new H1
  - reduced motion: 150 ms fade
- **Sound** (optional, off by default, remembered in `localStorage` with try/catch):
  - a scanner tick and a soft confirm on the hero sale, a keypad click on Reply LOCK, a shutter rattle in the footer
  - under 60 KB total, fetched only when turned on
  - the spoken Urdu "ek sau assi rupay wusool" (SPEC §13 #4, planned) only if the user approves (Q2)
- **404:** the footer vignette's key frame with the shutter fully down, and copy along the lines of "This page isn't here. The counter's open at /". Rasheed's eyes follow the cursor. No new art.
- **OG image:** 1200 × 630, the hero key frame in its lit panel on the dark ground, with the H1 and the short disclaimer line. Exported as a static file.
- **Favicon:** the mark.

---

## 6. Frame and asset list (mapped to ART-PROMPTS)

These are unique frames after hold deduplication. The loop length in ticks is the playing time at 12 fps.

| Section | Vignette (ART-PROMPTS) | Ratio | Loop | Unique frames | Notes |
|---|---|---|---|---:|---|
| Hero | Hero, the one-tap moment | 16:9 | 6 s / 72 ticks | 30 | holds on the press, the nod and the smile |
| Hero (live) | §4 thumb press, 6 stages | 1:1 | hold-driven | 6 | scrubbed by the hold |
| Hero + footer (live) | §4 Rasheed's eyes | 1:1 | cursor-driven | 10 | 9 directions + blink; reused in the footer and 404 |
| Problem | 3a cash, no change | 16:9 | 4 s / 48 | 12 | |
| Problem | 3b transfer screenshot | 16:9 | 4 s / 48 | 12 | the screenshot's "screen" stays blank |
| Problem | 3c no phone, no card | 16:9 | 4 s / 48 | 12 | |
| How it works | Step 1: amount | 1:1 | 4 s / 48 | 12 | |
| How it works | Step 2: thumb | 1:1 | 4 s / 48 | 12 | reused small in Numbers |
| How it works | Step 3: check passes | 1:1 | 4 s / 48 | 10 | abstract pulse |
| How it works | Step 4: confirmed + buzz | 1:1 | 4 s / 48 | 12 | |
| For shops | Rasheed at closing, blank phone | 16:9 | 6 s / 72 | 24 | per-frame screen corners in the manifest |
| Safety | Ayesha locks her thumb | 16:9 | 6 s / 72 | 24 | a segment marker at "thumb held up" for the LOCK jump |
| Every phone | Bilal and the SMS | 16:9 | 6 s / 72 | 24 | |
| Numbers | none (step 2 reused) | | | 0 | |
| Footer | Rasheed pulls the shutter and waves | 16:9 | 6 s / 72 | 24 | eye atlas composited during the wave hold |
| 404 | footer key frame | | | 0 | |
| **Total** | | | | **224** | inside the 150–300 budget |

**Also:**
- **Character and prop sheets** (ART-PROMPTS §2): reference only, never shipped.
- **Key frame stills:** 12 (one per vignette, AVIF desktop + mobile). These are the reduced-motion, no-JS and loading images.
- **Stage panels:** CSS shapes from tokens (no raster).
- **OG image:** 1.
- **Sound:** 4 short files (optional).

**If the budget gets tight:**
- cut 3a and 3c to 8 frames each and step 3 to 6 (saves 12)
- if needed, drop the 3c loop to its key frame (saves 12)

The hero, for-shops and safety vignettes are never cut.

---

## 7. Awwwards self-score (pessimistic, assuming the art is processed to the reject list)

| Criterion | Weight | Score | Why |
|---|---:|---:|---|
| Design | 40% | 7.3 | One drawn world on a dark page of lit "windows", a consistent palette, hairline rows instead of cards, a different composition per section. Risk: generated art drifting off-model between vignettes, and the dark page vs. paper panel balance. |
| Usability | 30% | 7.4 | A normal landing page with native scroll and no pins, a light first view, a keyboard path for every interaction, real reduced-motion and no-JS states. |
| Creativity | 20% | 7.8 | The hold-to-pay hero that runs the real app banner, the real app tracked onto a hand-drawn phone, and live Reply LOCK. Lower than a continuous story would score, but much clearer for judges. |
| Content | 10% | 7.5 | Original illustration; every figure and SMS from SPEC and the migrations; an honest disclaimer and a "simulated" note. Risk: fictional personas, which must stay labelled. |

**Predicted: 0.4 × 7.3 + 0.3 × 7.4 + 0.2 × 7.8 + 0.1 × 7.5 = 7.45**, which is SOTD-contender territory. It falls to about 6.7 if the generated frames are inconsistent between scenes or the paper panels make the page read as cream.

**Anti-patterns avoided:**
- template hero (the headline lives inside the scene), 3-up grids (bento and staircase instead)
- logo walls, testimonials, invented stats or partner logos
- glow halos (the sensor glow is drawn art)
- preloader, scroll-jacking or pinning
- reveal-on-everything (grouped, once; the legal text is static)
- parallax on text
- essential content in a canvas (all text is DOM)
- two loops for scroll-linked work
- a homepage-only design (the 404 and OG use the same world)

---

## 8. Open questions for the user

1. **Page ground:** lit panels on a dark page (this doc) or a light page with one dark band? This doc and `TYPE-AND-COLOR.md` (website renders dark; paper `#F0EEE9` for light panels) choose the dark page. `DIRECTION.md` §2 recommends a cool, light neutral page with one dark band. Both keep cut-out art off dark ground. `DESIGN.md` merges them, but it's your call.
2. **Spoken Urdu confirmation** on a sound-on sale ("ek sau assi rupay wusool", SPEC §13 #4, planned): include and label it "planned", or leave it out?
3. **A `/security` page** for technical judges (threat model, crypto table, the 1:N false-match table), or keep the landing page alone?
4. **Investor contact:** a plain email line in the footer (no form), or nothing?
5. **Credits:** list the five team members by name, or "Team FingerPay" only?
6. **Personas:** the art makes Ayesha a late-20s office worker and Rasheed mid-40s, while PDF §4 says a 34-year-old schoolteacher and 52. Should the copy avoid ages and jobs (the current plan), or should the PDF personas be updated?
7. **Bilingual touches:** add Urdu on the page (for example the hero sub or the shop's name in Urdu, which adds RTL text and an Urdu face), or English only?
8. **Partnership wording:** "proposed partners" stays until SPEC §14.1 is answered. Is anything signed?
