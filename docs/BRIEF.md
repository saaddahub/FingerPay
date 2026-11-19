# FingerPay design brief (shared input for every design doc)

Read this first, then `PRODUCT.md` (product truth) and `docs/SPEC.md` (source of truth). Every doc in `docs/design/` builds on this brief. Where they disagree, `DESIGN.md` (written after them) decides.

## The doc set

| File | Owner skill(s) | Covers |
|---|---|---|
| `brand/BRAND.md` + SVGs | brand extraction | logo vectors, exact brand colours, wordmark type, clear space |
| `docs/design/TYPE-AND-COLOR.md` | better-typography, better-colors | the type system and colour system (the only doc that picks fonts and colours) |
| `docs/design/WEBSITE.md` | awwwards, impeccable | concept, narrative, signature 3D moment, section plan, self-score |
| `docs/design/MOTION.md` | apple-design-motion, motion | motion tokens, springs, choreography, 3D interaction physics, reduced motion |
| `docs/design/APP.md` | interface-design, apple-design | the merchant terminal app and staff consoles: screens, states, layout |
| `docs/design/CONTENT.md` | better-writing, better-accessibility | voice, real copy per section, accessibility requirements |
| `DESIGN.md` (root) | impeccable (synthesis) | the final visual world, merged from the above |

## Audience and goal (confirmed by the user)

- The website's first audience is **competition judges and investors**.
- Its job is that they **understand the idea and trust it**. There's no sign-up or form.

## Landing strategy (recommended, pending the user's confirmation)

**Story-first: what FingerPay is and why it exists. The merchant app is shown as proof, not sold as a download.**
- The core promise is "no phone needed to pay." A "download our app" call to action would contradict it: shoppers have no app, by design.
- The only app is the merchant terminal (Android, SPEC §11, after the website). On the site it's the device where the 3-second sale happens: the hero proof and a "For shops" chapter.
- With a judges-and-investors audience and "understand it" as the goal, the page is a narrative, not a funnel.

## Brand asset (from the user)

`brand/fingerpay-logo-source.png`, on white:
- **Mark:** a fingerprint of nested arches, open at the bottom, with flat stroke ends at staggered lengths.
- **Wordmark:** "FingerPay" in a bold, tight, SF Pro Display–style grotesk.
- **Tagline:** "Making payments with one tap." in a medium grey, semibold.
- Mark and wordmark are near-black. The brand is monochrome and Apple-restrained. No accent colour is given.

## The user's taste

- **They want:** modern and expensive (a "$10,000 website"), unique ("a style no one has built"), sleek modern minimalism, **interactive 3D**, and **as much purposeful animation as possible**. The vibe of their own portfolios is expensive, built with three.js, GSAP or Anime.js, and Lenis.
- **Their reference** (an Instagram reel): a dark mobile wallet with glass surfaces, holographic stacked cards that fan out and flip, a big balance with smaller decimals, round glass action buttons, and spring motion everywhere.
- **Rejected so far:**
  1. A cream "ledger paper" editorial page with a serif display.
  2. A particle thumbprint with a cyan/violet aurora glow, Geist plus Instrument Serif type, and a standard layout (headline left, object right, a 3-up card grid). Their words: "so basic", "fonts so generic".
  3. Anything that reads as a template.

## The user's own design playbook (binding)

`C:\Users\saads\OneDrive\Desktop\DESKTOP F\portfolio\MASTER_INSTRUCTIONS_AND_DESIGN_SYSTEM.md`, read sections 2–5.
- **Banned:**
  - neon purple/violet and cyan glow gradients
  - coloured glow halos (shadows are occlusion, not emission)
  - pure `#000` or `#fff`
  - more than one accent colour, or an accent above 80% saturation
  - three equal cards in a row
- **Required:**
  - asymmetric bento or zig-zag layouts
  - the six "unthemed surfaces": selection, caret, scrollbar, focus ring, link underline, tabular numbers
  - every interaction state
  - `100dvh`, not `100vh`
  - headings bound to the content below them

## Hard constraints

- **Project rules (`.claude/CLAUDE.md`):** Astryx components and tokens in code (no raw `<div>`, hex or px), themes through the Astryx theme editor, and security first.
- **Truth:**
  - Use the disclaimer text in `PRODUCT.md`.
  - No partner logos.
  - No invented testimonials, customers, press, stats or prices.
  - Call it the "Risk Engine", never "AI".
- **Numbers that exist (SPEC):**
  - under 3 s from thumb to settled
  - fee 0.45% above PKR 100, capped at PKR 25
  - PKR 0 on a decline
  - per-tap limits PKR 5,000 (salary) / PKR 2,000 (student)
  - demo sale: PKR 180, net PKR 179.19, fee PKR 0.81
- **Privacy on every screen:**
  - no shopper names on declines
  - no shopper balance on merchant screens
  - first name and initial only
  - last 4 digits for phone and CNIC
- **Stack:**
  - Next.js 16 App Router + Astryx are installed.
  - `animejs` v4 and `motion` are installed; three.js and Lenis are expected; React Three Fiber is allowed.
  - The CSP allows self-hosted assets only, so fonts must be self-hostable (Google Fonts, Fontshare or a licensed foundry, served via `next/font/local`).
- **Quality bar (awwwards):**
  - LCP under 1.5 s, CLS under 0.05, INP under 100 ms
  - 60 fps on a mid-range device
  - `prefers-reduced-motion` honoured everywhere
  - keyboard operable
  - mobile designed, not shrunk

## How each doc is written

- Decisions with reasons, and concrete values: hex values with contrast ratios, px/rem, ms, spring parameters, font names with licence.
- No vague adjectives.
- End with **Open questions for the user**: only decisions that are really theirs.
- Doc only: no code in `src/`. Don't edit files you don't own, and don't commit.
