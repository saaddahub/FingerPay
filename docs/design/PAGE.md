# FingerPay website: the page (v4)

> **Owns:** section order, layout per section (desktop and mobile), every line of copy, and states.
> **Doesn't own:** tokens (`SYSTEM.md`), timing and choreography (`MOTION.md`, referenced as **M§**), code (`BUILD.md`).
> Copy here is final. Change it only with a reason that cites `PRODUCT.md` or `docs/SPEC.md`.
> Reference viewport: 1440 × 900 desktop, 390 × 844 phone. Column numbers refer to the 12-column grid (4 on mobile).

---

## 0. Page map

| # | Section | Ground | Height (desktop) | Signature? |
|---|---|---|---|---|
| — | Nav (fixed) | Glass | — | — |
| 1 | Hero: "Pay with nothing." | Paper | 100svh, then becomes the stage | — |
| 2–4 | **The Inside stage**: the dive, then Instant / Private / Certain, then the slit | Paper → Ink → Paper | one sticky stage, 100svh + 520vh + 90svh | **Yes. The one signature moment.** |
| 5 | The sale (dialog) | Paper | ~220vh | — |
| 6 | The fine print (ledger) | Paper | auto | — |
| 7 | Close + footer | Paper | 100svh + footer | — |

Hero and the Inside stage are one continuous sticky stage in code (`BUILD.md` §4). They are described separately here for clarity.

Landmarks: `<header>` (nav), `<main>` (sections 1–7), `<footer>`. A "Skip to content" link is the first focusable element and jumps past the stage to section 5's heading for keyboard users who don't want the scroll film; a second hidden link inside the stage, "Skip the animation", jumps to the same place.

---

## 1. No intro

The page opens straight on the hero. No preloader, intro animation or splash screen. The client cut it on 2026-11-20: "this is a landing page, it's strictly professional." It also keeps LCP on the hero image.

## 2. Nav (fixed, top centre)

A centred cluster, like adamperlis.com's, built in light glass (dark glass inside act 3):

```
            ( orb )  ( How it works · Security · Numbers )  ( Contact )
```

- **Orb button** 40 px: the glass orb with the coin. Scrolls to top. `aria-label="FingerPay, back to top"`.
- **Link pill** (height 40 px, padding 0 `--s-5`, gap `--s-5`, `--t-caption`): "How it works" → `#sale`, "Security" → the Private step of the stage (scrolls to the stage offset where `p` = 0.70, BUILD §4.2), "Numbers" → `#fine-print`. Active link: `--ink`; others `--ink-2`.
- **Contact pill** (height 40 px): "Contact" in `--ink`, opens `mailto:` (address: **TBD by the client**; until then the button scrolls to the close section).
- Top offset `--s-5`. Gap between the three pieces `--s-2`. Each piece has the magnetic pull (M§3.2) on pointer devices.
- **Mobile:** the orb (28 px) at left and a 40 px round glass "menu" button at right, both at top `--s-4`, `--page-x` from the edges. Menu opens a glass sheet from the top (radius `--r-card` on the bottom corners) with the three links at `--t-title` size and the Contact pill. Sheet is a modal dialog (`role="dialog"`, `aria-modal="true"`, focus trapped, `Esc` and a close button dismiss it, focus returns to the menu button).

**Honesty pill** (fixed, bottom-left `--s-5`, visible in acts 1, 5, 6, 7; hidden during the stage so the film is clean): small light glass pill, `--t-caption`, `--ink-2`: "Student prototype · integrations simulated" linking to `#disclaimer`. On mobile it sits bottom-centre and hides once the visitor has scrolled past the hero, then reappears in the footer area.

---

## 3. Hero: "Pay with nothing."

**Job:** the whole idea in one look. The product (the terminal app) is literally in the middle of the sentence.

### Desktop composition (1440 × 900)

```
┌───────────────────────────────────────────────────────────────────┐
│                 ( orb ) ( How it works · Security · Numbers ) (Contact)
│                                                                   │
│                              ┌─────┐                              │
│                              │     │                              │
│   Pay with                   │ app │                  nothing.    │
│                              │frame│                              │
│                              │     │                              │
│                              └─────┘                              │
│                                                                   │
│  One thumb at the counter. No phone,                              │
│  no card, no cash. Settled in under          Scroll ─────         │
│  three seconds.                                                   │
│ (Student prototype · integrations simulated)                      │
└───────────────────────────────────────────────────────────────────┘
```

- **App frame:** centred horizontally; height `min(64svh, 600px)`; its vertical centre at 50 % of the viewport. Straight, no tilt, no shadow other than the asset's own. Above everything except the nav.
- **"Pay with"** (`--t-mega`, `--ink`): right-aligned so its right edge sits `--s-7` left of the frame's left edge; baseline on the frame's vertical centre line.
- **"nothing."** (`--t-mega`, `--ink`): left edge `--s-7` right of the frame; same baseline. The sentence reads across the phone. The frame is the gap between "with" and "nothing", which is the joke and the product: the thing you pay with isn't a thing.
- **Lead** (two-tone, `--t-lead`), columns 1–4, bottom `--s-8`:
  **"One thumb at the counter."** No phone, no card, no cash. Settled in under three seconds.
- **Scroll cue**, columns 9–12, bottom `--s-8`, right-aligned: "Scroll" (`--t-caption`, `--ink-2`) followed by a 48 px hairline that extends to 96 px and retracts on a 2.4 s loop (M§4.3). Not dots, not a mouse icon.
- **The screen inside the frame** shows the terminal's waiting state:
  - Store name "Rasheed Kiryana Store" (`--t-caption`)
  - Amount "PKR 180.00" (large, the app's own type)
  - The coin mark, ~64 px on a 600 px tall frame, centred in the lower third: this is the **dive target**
  - "Place thumb on the reader" under the coin
  The exact screen comes from the client's frame (`BUILD.md` §5). If their screen has no coin, we draw ours over their thumb prompt at the same position.

### Mobile composition (390 × 844)

- "Pay with" top-left at `--s-10` from the top, `--t-mega` (64 px).
- Frame centred, height `min(52svh, 440px)`.
- "nothing." bottom-right, just below the frame, `--t-mega`.
- Lead below "nothing." in columns 1–4 (full width), `--t-lead`, then the scroll cue.

### States
- Fonts not loaded: system-ui fallback with `size-adjust` metrics so nothing reflows (`BUILD.md` §7).
- Frame image not loaded: a `--paper-2` phone-shaped placeholder with the screen DOM still visible (the screen is live DOM, the frame is the image).

---

## 4. The Inside stage (the signature moment)

One sticky stage, `100svh + 520vh + 90svh` tall on desktop (the 520vh is 400vh on mobile). The visitor scrolls; the camera moves. Full choreography in **M§2**. What the visitor sees, in order:

1. **Settle** (first ~5 % of the stage): "Pay with" drifts left, "nothing." drifts right, both fade. The lead and scroll cue leave. The coin on the screen presses once (a small scale dip, like a thumb pushing it).
2. **Approach:** the camera moves toward the coin. The phone grows past the edges of the viewport. The rest of the screen (store name, amount, prompt) fades so only the coin stays sharp.
3. **Through the ridges:** the coin fills the screen; its ridges become wide parallel bands sweeping outward past the camera; we fly into the peak of **the second ridge from the top** (the top one is cut by the ring). Its ink fills the viewport. The page is now black.
4. **Inside:** two hairlines draw from the centre (a horizontal one at 50 % and a vertical one at the column-8 line); faint column guides appear. The nav turns to dark glass.
5. **"Instant."** lands.
6. **"Private."** replaces it.
7. **"Certain."** replaces it.
8. The stage ends and section 4 (the slit) takes over.

### 4.1 The three words (act 3 layout)

```
┌───────────────────────────────────────────────────────────────────┐
│ 01 / 03                                │                          │
│                                        │                          │
│                                        │  The cashier types the   │
│                                        │  amount. The shopper     │
├────────────────────────────────────────┼──────────────────────────┤ ← crosshair (50 %)
│  Instant.                              │  rests a thumb...        │
│                                        │                          │
│  [ visual for this word, behind ]      │                          │
│                                        │                          │
└───────────────────────────────────────────────────────────────────┘
                                         ↑ vertical hairline (column 8 / 9 edge)
```

- **Word** (`--t-mega`, `--night-text`), columns 1–7, **below** the horizontal hairline (top at 50 % + `--s-5`). Santalarch sets its word on the left with the paragraph across from it; we keep that relationship because it's what makes a single word look *placed* rather than *centred*.
- **Paragraph** (two-tone on ink, `--t-lead`), columns 9–12, **above** the hairline (bottom at 50 % − `--s-6`). Word bottom-left, paragraph top-right: the crosshair splits them diagonally.
- **Index** (`--t-mono-s`, `--night-2`): "01 / 03", top-left, `--s-10` from the top, under the nav.
- **Visual** for each word sits behind the word and paragraph, low contrast, never competing with the type.

| # | Word | Paragraph (first sentence `--night-text`, rest `--night-2`) | Visual |
|---|---|---|---|
| 01 | **Instant.** | **The cashier types the amount and the shopper rests a thumb.** The Risk Engine checks it and the money settles in under three seconds, before the change drawer would have opened. | **The time rail.** A full-width hairline at 86 % height (below the word) with ticks at 0, 1, 2 and 3 s (`--t-mono-s` labels under each tick, `--night-2`). A marker travels from 0 and stops short of 3 with a soft settle; a label above it reads "< 3 s". Bottom-right of the rail, `--t-mono-s`: "TARGET · PROTOTYPE TIMING VARIES". |
| 02 | **Private.** | **The reader sends a token, never an image.** We keep only a keyed hash of that token, so there is no picture of your thumb anywhere to steal. | **Ridges to a line.** The coin's six ridges (the ones we just flew through) reappear large and faint across the lower half, then flatten one by one into straight lines that merge into a single hairline, which resolves into a mono string: `hmac-sha256 · 7c1e 04b9 … a90f` (`--t-mono`, `--night-2`), with `ILLUSTRATIVE` in `--t-mono-s` after it. |
| 03 | **Certain.** | **The shop sees "Settled" on its own screen.** No transfer screenshots, no "it's on its way". If the network drops, the terminal says Take cash and never queues a sale. | **The settle card.** One dark-glass card (`--r-card`, 360 × 168 px), columns 9–12 below the paragraph: a green dot (8 px, `--settle-night`) + "Settled" (`--t-caption`, `--settle-night`); "PKR 180.00" (`--t-title`, tabular); "Rasheed Kiryana Store · 4:12 pm" (`--t-caption`, `--night-2`). The crosshair lines pass behind it, so the glass has something to blur. |

### 4.2 Mobile

- The dive runs the same way; the frame starts at 52svh so the approach is shorter.
- Act 3 stacks: index at top; word at 34 % height, left; the horizontal hairline under the word; paragraph below the hairline; visual in the bottom third. No vertical hairline.
- Stage height 500vh.

### 4.3 Accessibility of the stage
- The stage is a `<section aria-labelledby>` with a visually hidden `<h2>` "How FingerPay works, in three words". The three words are real `<h3>`s; paragraphs are real `<p>`s, all present in the DOM from the start (hidden ones use `opacity`/`visibility`, not removal), so screen readers and Ctrl+F find them in order.
- Decorative layers (frame clone, ridges, hairlines, rail) are `aria-hidden="true"`.
- Keyboard: Tab order passes the stage as normal content; "Skip the animation" is the first focusable element inside it.

---

## 5. The slit (ink → paper, the end of the stage)

- The horizontal crosshair hairline of act 3 stays put while everything else fades. It thickens into a white band that opens vertically, symmetric about 50 %, until the viewport is paper (M§5.3). It is the reverse of santalarch's black band, and it closes the "line" motif: we left the paper through a ridge (a line) and come back through a line.
- No text in this section. 90vh of scroll.

---

## 6. The sale (the dialog)

`id="sale"`. **Job:** show the whole loop as a conversation, so the product explains itself with no diagram. This is the "dialog" the client asked for, and it uses FingerPay's real SMS wording.

### Desktop layout
- Left, columns 1–4, **sticky** at top `--s-10` while the thread scrolls:
  - Title (`--t-display`): **A sale, start to finish.**
  - Lead (two-tone, `--t-lead`): **"Five messages. Nobody opens an app."** The shopper's phone can be the oldest one in the drawer: receipts and controls arrive by plain SMS.
- Right, columns 6–11: the thread, max width 560 px. Messages are revealed one by one as the visitor scrolls (M§6). Each message's slot is reserved from the start (no layout shift).
- Below the thread, `--t-caption`, `--ink-2`: "Sample sale. Rasheed and Ayesha are demo personas; all bank and payment steps are simulated."

### The thread

Three voices, three bubble styles:

| Voice | Side | Bubble |
|---|---|---|
| People (cashier, shopper) | Left | `--paper-2`, `--ink` text, `--r-bubble` (tail corner bottom-left). 28 px initials avatar (`--paper-2` circle, `--t-caption`), name + role above the first bubble (`--t-caption`, `--ink-2`) |
| The terminal | Right | `--ink` bubble, `--night-text` text, tail corner bottom-right (the "sent" side). Label "FingerPay terminal" above (`--t-caption`, `--ink-2`). Not glass: nothing passes behind it, so glass would be decoration (SYSTEM §6) |
| SMS to the shopper's phone | Left, indented 40 px | `--paper` with a 1 px `--rule` outline, `--t-mono` text, sender line `FINGERPAY · SMS` in `--t-mono-s`. Looks like a receipt slip, not a chat bubble |

Each message has a timestamp in `--t-mono-s`, `--ink-2` (not `--ink-3`, which fails contrast for text).

| # | Time | Voice | Content |
|---|---|---|---|
| 1 | 4:12:03 PM | Rasheed A. · cashier | "180." |
| 2 | 4:12:03 PM | Terminal | "PKR 180.00 · waiting for a thumb" |
| 3 | 4:12:04 PM | Ayesha K. · shopper | *(no words)* A bubble containing only the coin mark (24 px), which presses once when it appears (M§6.4). `aria-label="Ayesha places her thumb on the reader"` |
| 4 | 4:12:05 PM | Terminal | Line 1: green dot + "Settled" (`--settle-night`, since the bubble is ink). Line 2: "Risk Engine: clear · shop fee PKR 0.81" (`--t-mono`, `--night-2`) |
| 5 | 4:12:05 PM | SMS | `Allied Bank FingerPay: PKR 180.00 paid at Rasheed Kiryana Store via Raast Ref #4F2K91. Available Balance: PKR 12,420.00. Not you? Reply DISPUTE. Reply LOCK to block thumb payments.` |
| 6 | 9:40:12 PM | Ayesha K. · shopper | "LOCK" |
| 7 | 9:40:13 PM | SMS | `Allied Bank FingerPay: Thumb payments are now LOCKED. Visit any Allied Bank branch with your CNIC to unlock.` |

Facts behind the copy:
- Message 4's fee: 0.45 % × PKR 180.00 = PKR 0.81 (sale above PKR 100, under the PKR 25 cap). Display only; the real fee is computed in the database.
- Messages 5 and 7 are the exact templates in `supabase/migrations/20261118000300_fp_api.sql` (lines 395–398 and 632–633), filled with sample values. The ref number and balance are sample data.
- Between messages 5 and 6 there's a time gap (the evening). Show it as a centred `--t-mono-s` divider: "LATER THAT EVENING". The point: LOCK works hours later, from a basic phone.

### Mobile
- Title and lead stop being sticky; they sit above the thread.
- Thread full width (4 columns); bubbles max 85 % width.

---

## 7. The fine print (ledger)

`id="fine-print"`. **Job:** the numbers a judge would ask for, honestly, in big type. Apple's spec sheet meets Adam's stats rows.

- Title (`--t-display`), columns 1–7: **The fine print, in large print.**
- Lead (two-tone), columns 1–5: **"Everything a shop or a judge would ask, on one page."** These are the prototype's rules, from the project spec.
- Rows, columns 1–12, each row a 1 px `--rule` line on top, padding `--s-5` 0. Label (`--t-body`, `--ink-2`) in columns 1–5; value in columns 6–12, right-aligned, `--t-title` in Inter (tabular) with a short qualifier after it in `--t-caption` `--ink-2`.

| Label | Value | Qualifier |
|---|---|---|
| Time at the counter | under 3 s | target |
| Fee for the shop | 0.45 % | sales above PKR 100, capped at PKR 25 |
| A declined sale costs | PKR 0 | for shop and shopper |
| Per-tap limit | PKR 5,000 | salary accounts · PKR 2,000 for students |
| Fingerprint images stored | 0 | only a keyed hash of a one-time token |
| What the shopper needs | a thumb | and any phone with SMS, for receipts |
| If the internet drops | Take cash | the terminal never queues a sale |
| Lost or copied thumb? | Reply LOCK | from any phone, any time |

- Mobile: label above value; value left-aligned; qualifier under value.
- The numbers count in when their row enters (M§7). Text values ("a thumb", "Take cash") fade in instead.

---

## 8. Close and footer

### Close (100svh, paper)
- **Mega**, columns 1–11, vertically centred, two lines: **Leave everything** / **at home.**
- Below, columns 1–5, two-tone lead: **"FingerPay is a student prototype."** We're looking for a bank partner and a pilot shop. If that's you, or you know who it is, write to us.
- Two pills below the lead: **Contact the team** (light glass, `--ink` text, arrow-right icon) and **Back to top** (text button with arrow-up icon, `--ink-2`).

### Footer (paper, `--s-9` padding)
- Top: a full-width `--rule`.
- Left: `fingerpay-lockup.svg`, 160 px wide (minimum 120 px, `SYSTEM.md` §7), `--ink`.
- `id="disclaimer"`, columns 1–8, `--t-body` (16 px, not small print; this is designed content, BRIEF §5), `--ink-2`:
  > FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.
- Right, columns 10–12: "Contact" link, "Top" link, "© 2026 FingerPay".
- Nothing else. No social icons, no newsletter, no sitemap.

---

## 9. No narrator

The v4 draft had the orb commenting on the page in short chat bubbles. The client cut it on 2026-11-20: "this is a landing page, it's strictly professional." Don't add any voice that comments on the page: the copy speaks for itself, and the only messages on the page are the sale's thread.

---

## 10. Mobile rules (summary)

- Every section is recomposed above; nothing is just scaled down.
- No hover-only behaviour: magnetic pull and specular highlight are pointer-only (`@media (hover: hover) and (pointer: fine)`); touch gets the press feedback (scale 0.97) only.
- Pinned stages use `svh` units so the iOS URL bar doesn't make them jump.
- Tap targets ≥ 44 × 44 px (nav orb gets an invisible 44 px hit area).
- Test at 360, 390, 430 px wide and in landscape (in landscape the stage shortens to 400vh and act 3 uses the desktop layout).

## 11. Not on the page (deliberately)

Pricing table, team section, FAQ, partner logos, testimonials, app-store badges, a demo video embed, a newsletter. Each was considered and cut because it either doesn't exist yet (logos, testimonials), isn't for this audience (app stores), or repeats what the page already proves.
