# FingerPay website: brief (v4, "Paper & Ink")

> **Status:** v4, 2026-11-20. Replaces the v3 paper-collage direction, which the client rejected. v3 lives in `docs/design/archive/v3-collage/` as history only. Do not take anything visual from it.
> **Read order:** this file → `SYSTEM.md` → `PAGE.md` → `MOTION.md` → `BUILD.md`. `DESIGN.md` at the repo root is the one-screen summary and wins any conflict.
> **Mode:** Persuade (impeccable). Archetype: fintech, "aspirational trust" (frontend-design-director), with one experimental signature moment.

---

## 1. What the client asked for (2026-11-20, in their words, condensed)

- Minimalist, on a **white or black** ground. It must look **expensive** and **nonchalant**. "No slop."
- It must read as **fintech**, for a company called FingerPay, and it must still **explain the idea** on the landing page.
- Minimalism taken from **Apple's product pages**; components taken from **adamperlis.com** (glass controls, two-tone copy, stats rows).
- The **santalarch.com zoom**: the camera dives into one object until its surface fills the screen, then a single bold word lands ("Bold", "Confident", "Quiet"). We do the same, zooming **into our app frame**.
- **Dialog** must be on the page.
- **Glassmorphism** with the "physics" from the client's portfolio (`C:\Users\saads\personal-portfolio`).
- **No dotted components** (no dot-matrix text that scatters under the cursor, no particle fields).
- **Really expensive animations.**
- A new logo is allowed. One has been drawn: `brand/` (see `SYSTEM.md` §7).

## 2. Concept

> **FingerPay should feel like a private bank you carry in your thumb: a white, silent page where one touch opens into the whole system, because judges and investors need to believe that a payment this simple is also this controlled.**

**Governing idea: "the press".** A thumb touches glass and leaves a mark. The whole page is one camera move into that mark and back out.

| Act | Ground | What the visitor learns |
|---|---|---|
| 1. The counter | Paper (white) | The product in one line: pay with nothing but a thumb. The app frame sits in the middle of the page. |
| 2. The dive | Paper → ink | Scrolling *is* the touch. The camera flies into the coin mark on the app screen, between its ridges, into the ink of one ridge. The page turns black because we are inside the ink. |
| 3. Inside | Ink (black) | Three words, one at a time: **Instant. Private. Certain.** Each with one sentence of proof. |
| 4. The sale | Paper | A real conversation: cashier, terminal, shopper, SMS, LOCK. The dialog the client asked for. |
| 5. The fine print | Paper | Every number that matters, in large type. Honest limits. |
| 6. Close | Paper | "Leave everything at home." Contact. The disclaimer, designed, not hidden. |

**Why the colour change is earned, not decorative:** the mark is drawn in ink. Zoom far enough into a ridge and the viewport is ink. The black chapter is literally the inside of the mark, and we leave it the same way we came in: through a line (the crosshair hairline opens into white).

**Swap test.** Could this be another fintech's site? No:
- The dive targets a fingerprint ridge on a merchant terminal. Card and wallet companies have no thumb and no counter.
- The dialog is FingerPay's real flow, using the real SMS templates from `supabase/migrations/20261118000300_fp_api.sql`.
- The LOCK reply is FingerPay's own security mechanism.

## 3. What we take from each reference (and what we don't)

Inspected live on 2026-11-20 in the built-in browser. Tiers: **measured** = read from the page; **inferred** = judgement.

### Apple product pages: the restraint
- Huge statements in a neutral grotesk, regular weight, tight tracking; one idea per viewport; long stretches of empty paper.
- Secondary text in a cool grey (`#6E6E73` family), product on a quiet ground, no decoration that isn't the product.
- Translucent chrome (nav) with content scrolling underneath.
- **We don't take:** product photography (we have none), the "Learn more ›" link spam, the tile grids.

### santalarch.com: the dive (Nuxt + Lenis, three.js scene, measured)
- Page `#F0F0F0`/`#0F0F0F`, Helvetica 400 at ~6.8vw with tracking −0.05em (measured: 69.7 px, −3.48 px at a 1024 px viewport). Small 500-weight sentence-case captions. Hairline column guides that run through the nav.
- Sequence (observed by scrolling): hero words → a black band opens around one word → a wireframe 3D field of words with the camera turning through it → the camera flies into one cell → a top-down render of an interior → keeps zooming into one surface until its texture fills the screen → **"Bold"** lands on the left at display size, a short paragraph sits on the right, thin crosshair lines divide the screen → the next cell → "Confident" → "Quiet".
- The section is one sticky stage inside a ~15,900 px tall wrapper (measured: `section.cubes-wrap` 15,898 px, `div.content-wrap` `position: sticky`).
- **What makes it feel expensive (inferred):** the zoom never changes speed (it reads as exponential, constant-rate), it never cuts (each layer hands off at matching scale), and the word lands after the motion stops, as a time-based reveal, not scrubbed.
- **We take:** one pinned stage, constant-rate zoom, matched-scale hand-offs, the word-plus-paragraph composition, the crosshair hairlines, the black band opening on a line.
- **We don't take:** the 3D word field (it would be a gimmick for a payments company), the interior renders, the macro dot texture (dots are banned), Helvetica, their copy.

### adamperlis.com: the components (Inter + Geist Mono, WebGL, measured)
- Pure white page. Body 15 px / 22.5 px, tracking −0.014em; secondary text `#8A8A85`. Two-tone paragraphs: the first sentence in ink, the rest in grey.
- An intro: a liquid-chrome glass squircle with chromatic edge dispersion, a terminal line inside, a "Sound On/Off" pill, a "Skip intro" link. The squircle then shrinks into a drop and becomes the **narrator's avatar**.
- **The narrator:** small chat bubbles from a glass avatar that comment on the page in a dry voice ("He built me with Claude Code…").
- A centred cluster of round glass buttons as the nav.
- A stats ledger: label left, number right, numbers tick up.
- Round arrow buttons for carousels, a soft tinted pill for awards.
- **We take:** the centred glass nav cluster, two-tone paragraphs, the ledger rows, the glass orb (as the nav's home button only).
- **We don't take:** the narrator and the intro (cut by the client on 2026-11-20: "this is a landing page, it's strictly professional"), the sound toggle, the app carousel, the lavender pill colour, his avatar or mascot, his copy. The "dialog" the client asked for is the sale's message thread (PAGE §6).

### The client's portfolio: the glass physics (measured from source)
- `src/components/Nav.css`: scrolled nav becomes a floating pill: `rgba(10,10,10,.6)`, `backdrop-filter: blur(16px)`, `1px solid rgba(255,255,255,.08)`, `border-radius: 999px`, `box-shadow: 0 10px 30px rgba(0,0,0,.5)`.
- `src/components/SocialMenu.jsx`: magnetic pull, `useSpring({ stiffness: 150, damping: 15, mass: 0.1 })`, offset = pointer distance × 0.3.
- `src/components/TiltCard.jsx`: tilt `useSpring({ stiffness: 300, damping: 30 })`, ±6°, content lifted with `translateZ(30px)`.
- `src/index.css`: `--ease-standard: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-snappy: cubic-bezier(0.65, 0, 0.35, 1)`, 200 / 450 / 800 ms.
- **We take** all of these values (adapted for a white page in `SYSTEM.md` §6 and `MOTION.md` §3).
- **We don't take:** `DottedText.jsx` (that is exactly the "dotted component" the client banned), the custom cursor trail, the coloured hover fills.

## 4. Audience and the one job

- **First audience:** competition judges and investors (PRODUCT.md). They open a link, often on a laptop during a pitch, sometimes on a phone afterwards.
- **The one job:** leave understanding the loop (amount → thumb → Risk Engine → settled → SMS) and believing it is safe (no fingerprint image, LOCK by SMS, certainty for the shop).
- **The one action:** contact the team. No sign-up, no form, no app download (shoppers have no app by design).

## 5. Non-negotiables

Product truth (from `PRODUCT.md`, unchanged):
- Say **"Risk Engine"**, never "AI". Fee: 0.45% on sales above PKR 100, capped at PKR 25. Declines cost PKR 0. Per-tap limits: PKR 5,000 salary, PKR 2,000 student.
- Never claim partnerships, customers, press, or results. No partner logos. Demo personas are labelled as demo personas.
- The disclaimer appears verbatim (PAGE.md §8).
- Declines are neutral grey, never red. Money never bounces in motion.
- "Works on any basic phone with SMS: no smartphone, no data plan." Never claim non-PTA support.

Craft (Awwwards non-negotiables, adapted):
- 60 fps on a mid-range laptop and a mid-range Android; LCP < 1.5 s; CLS < 0.05; INP < 100 ms.
- First view ≤ 900 KB on desktop, ≤ 500 KB on mobile (fonts, frame image, JS).
- Every animation has a reduced-motion equivalent (`MOTION.md` §9). Glass has a reduced-transparency equivalent.
- Keyboard-operable, visible focus, skip link, WCAG 2.2 AA contrast for all text.
- Mobile is recomposed, not shrunk (`PAGE.md` §10).

## 6. Banned (the "no slop" list)

The client said "no slop". These are the specific things that make a page look generated. Any of them fails review.

- Dot-matrix or particle text, dot grids, halftone textures, cursor trails, custom cursors, "magnetic" text that scatters.
- Three equal feature cards. Icon-in-a-circle feature rows. Logo strips. Testimonials (we have none).
- Purple or blue glow blobs, mesh gradients, aurora backgrounds, noise-grain overlays.
- Rounded-rectangle "cards" wrapping every section. Section backgrounds in alternating greys.
- Typewriter text, text scramble/decode effects, glitch effects.
- Emoji or Unicode symbols used as icons.
- Bounce or overshoot on anything that shows money.
- Rotated or tilted UI screenshots (the phone is always straight; only the glass orb tilts, because it is an object, not a document).
- Generic stock copy: "Revolutionize", "Seamless", "Unlock", "Next-gen", "Empower", "The future of payments".
- Loading spinners. Typing indicators made of three dots (ours is a hairline shimmer, `MOTION.md` §6.3).
- Sound. (Adam's site has it; the client didn't ask. Add later only if asked.)
- A narrator, mascot or any voice commenting on the page; intro, preloader or splash screens. The client cut it on 2026-11-20: "this is a landing page, it's strictly professional."

## 7. Done means

1. A judge who scrolls once, top to bottom, can say back: "You pay with your thumb, it settles in under three seconds, they never store your fingerprint, and you can lock it by SMS."
2. The dive runs at 60 fps with no visible seam at either hand-off, forwards and backwards.
3. Nothing on the page is in the banned list.
4. `BUILD.md` §9 acceptance checks all pass, with screenshots saved.
5. Self-score against the Awwwards rubric ≥ 7.0 (Design 40 / Usability 30 / Creativity 20 / Content 10), scored in `BUILD.md` §10 after the build.
