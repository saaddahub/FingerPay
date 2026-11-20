# FingerPay type and colour

Owner skills: `better-typography`, `better-colors`, `impeccable` (typeset, colorize). This is the **only** doc that picks fonts and colours. Every other doc refers to the token names defined here (`--fp-*` local tokens and Astryx `--color-*` / `--text-*` / `--font-*` tokens).

Inputs: `docs/design/BRIEF.md`, including the **Direction decision (2026-11-18): illustrated, not 3D**. Also `PRODUCT.md`, the logo `brand/fingerpay-logo-source.png`, and sections 2–5 of the user's playbook.

> **What changed with the direction:** the site is now a landing page with a hand-drawn vignette per section (12 fps frame sequences cut out onto the page). The illustration palette is **fixed in `docs/design/ART-PROMPTS.md`**. So this doc defines:
> 1. how that palette sits on the page, including the choice of page ground
> 2. **UI tokens harmonised with it**, for the site, the merchant terminal and the staff consoles.
>
> The glass and holographic material from the old reel reference is **dropped**. Only one material token survives: a text scrim over illustration, which has a reduced-transparency fallback.

## 0. Fixed inputs (measured, not chosen)

| Source | Value | How it was obtained |
|---|---|---|
| Logo mark and wordmark ink | `#1C1C1F` = `oklch(0.228 0.006 286)` | most common non-white pixel in the logo PNG (7,036 samples) |
| Tagline grey | `#86868B` = `oklch(0.622 0.007 286)` | second most common pixel (1,653 samples) |

Both are near-neutral with a faint cool cast at hue 286.
- **Dark-mode neutrals** (app and consoles only) are built on hue 286, the logo's own cast.
- **Light neutrals** are built on the paper hue (83), so the UI and the illustrations share one ground.
- The logo ink `#1C1C1F` is the **line-ink colour of every illustration** (ART-PROMPTS.md).
- It is also the **primary text colour on the paper ground**.

---

## 1. Type

### What the type has to do
1. Sit next to a bold, tight, SF Pro Display–style wordmark without looking like a near-miss copy of it. Two near-identical grotesks read as a mistake.
2. Hold its own beside **hand-drawn characters**: the display face needs drawn character, not a neutral system look.
3. Set **PKR amounts** big and glanceable on a counter terminal, with tabular figures, smaller decimals and an unambiguous 0/O and 1/l.
4. Stay self-hostable through `next/font/local` under the CSP (`font-src 'self'`), with a clear licence.
5. Leave room for **Urdu** later.

**Excluded:**
- Geist and Instrument Serif: rejected by the user as "so generic".
- Bricolage Grotesque, Instrument Serif and Cutive Mono: human-md.ai's fonts, so not reused.
- Serif displays: rejected twice already (the ledger page and Instrument Serif).

**One rule that removes a whole class of risk:** every amount that changes (terminal entry, ledger rows, fees, timers) is set in the **data face**, which is monospaced, so it is tabular by construction. This doesn't rely on a display or text face shipping a `tnum` feature. I couldn't confirm `tnum` for the Fontshare faces without downloading the files (see §5).

### Direction A: "Counter Grotesk" (recommended)

| Role | Face | Source and licence | Axes / weights used |
|---|---|---|---|
| Display | **Cabinet Grotesk** | Fontshare (Indian Type Foundry), ITF Free Font License: free for commercial use, $0 | 800 (ExtraBold) and 900 (Black) for display; 700 for H1–H2 |
| Text / UI | **Switzer** | Fontshare (ITF), ITF Free Font License, $0 | 400, 500, 600 (variable file) |
| Data / mono | **Martian Mono** | Evil Martians, on Google Fonts, SIL OFL 1.1, $0 | `wght` 400–700, `wdth` 87.5–100 (`font-stretch`) |
| Hand accent | **None as a font.** Hand lettering (the SMS scribble, shelf labels, Rasheed's "khata" note) is drawn by the illustrator into the frames. | n/a | n/a |

**Why it fits FingerPay:**
- **Cabinet Grotesk at 800–900** is a grotesk with drawn quirks: a compact, heavy texture, flat horizontal terminals, and idiosyncratic `a`, `g` and `y`. Its flat cut terminals echo the **flat, staggered stroke ends of the fingerprint mark**. Its slightly irregular, hand-cut rhythm sits naturally beside drawn line art, where a pristine neo-grotesk (Inter, Geist) would look like a UI kit pasted onto a cartoon.
- It is the **same structural family as the wordmark** (grotesk, horizontal terminals, tight fit) but clearly *not* SF. The heavier colour and quirkier details give contrast, so the logo still reads as the logo.
- **Switzer** is a quiet neo-grotesk close to SF in proportion. It's used for body and UI, where Apple restraint matters (the merchant terminal and staff consoles). Brand character stays in the display face, so the app stays an Operate-mode tool.
- **Martian Mono** has a technical, receipt-like voice that suits the scanner screen and the SMS receipt. Its `wdth` axis lets the terminal amount condense (`font-stretch: 87.5%`) to fit "5,000.00" on a 360 px phone at 80 px.
- **Hand lettering lives in the art.** A handwriting *font* repeats identical glyphs, which reads as fake beside real drawing. It also adds a fourth family and is weak for accessibility. Lettering that the story needs as *information* is duplicated in live text (see CONTENT.md).

#### Direction A scale: website (Persuade)
The ratio is **1.333 (perfect fourth)**, with a base of **16 px at 375 px** and **18 px at 1440 px**, fluid in between. On mobile, H1 and the display sizes are capped below the ratio so a two-word headline fits 343 px.

| Role | Size (375 → 1440 px) | CSS | Face / weight | Line-height | Tracking |
|---|---|---|---|---|---|
| `display-xl` (hero line) | 48 → 135 px | `clamp(3rem, 1.0887rem + 8.1547vw, 8.428rem)` | Cabinet 900 | 1.05 | -0.03em |
| `display-l` (chapter titles) | 44 → 101 px | `clamp(2.75rem, 1.4926rem + 5.3649vw, 6.321rem)` | Cabinet 800 | 1.05 | -0.025em |
| `display-m` (scene captions, big stats) | 40 → 76 px | `clamp(2.5rem, 1.71rem + 3.371vw, 4.7407rem)` | Cabinet 800 | 1.1 | -0.02em |
| `h1` | 32 → 57 px | `clamp(2rem, 1.4519rem + 2.338vw, 3.5556rem)` | Cabinet 700 | 1.1 | -0.015em |
| `h2` | 28 → 43 px | `clamp(1.75rem, 1.4266rem + 1.38vw, 2.6667rem)` | Cabinet 700 | 1.2 | -0.01em |
| `h3` | 22 → 32 px | `clamp(1.375rem, 1.155rem + 0.939vw, 2rem)` | Switzer 600 | 1.25 | -0.005em |
| `lead` | 21 → 24 px | `clamp(1.3333rem, 1.2746rem + 0.2504vw, 1.5rem)` | Switzer 400 | 1.45 | 0 |
| `body` | 16 → 18 px | `clamp(1rem, 0.956rem + 0.1878vw, 1.125rem)` | Switzer 400 | 1.6 | 0 |
| `caption` | 13 px | `0.8125rem` | Switzer 400 | 1.45 | +0.01em |
| `eyebrow` (uppercase via `text-transform`) | 13 px | `0.8125rem` | Switzer 600 | 1.3 | +0.08em |
| `data` (inline figures, IDs) | same as the role it sits in | `1em` | Martian Mono 500 | inherit | 0 |

- Body measure is capped at **65ch**. Headings get `text-wrap: balance`, paragraphs get `text-wrap: pretty`.
- Space above a heading is at least 2× the space below it (downward binding, playbook §5.1).
- The rule weight ≥ 400 below 18 px holds everywhere.
- On the paper ground, body text is the logo ink `#1C1C1F` (14.07:1). Inside the ink bands it is paper `#EFE9DE`. Line-height stays 1.6, the top of the band, which also suits light-on-dark.

#### Direction A scale: merchant app and consoles (Operate)
This uses the **Astryx geometric scale** at `text-size 16` and `type standard` (ratio 1.2): `round(16 × 1.2^step)`. A counter terminal needs a 16 px base, not Astryx's default of 14.

| Astryx token | px / rem | Used for | Face / weight | Line-height | Tracking |
|---|---|---|---|---|---|
| `--text-display-1-size` (`--font-size-5xl`) | 48 / 3rem | outcome word ("Paid", "Not paid") | Cabinet 800 | 1.1 | -0.02em |
| `--text-display-2-size` (`4xl`) | 40 / 2.5rem | screen titles on the terminal | Cabinet 800 | 1.15 | -0.02em |
| `--text-display-3-size` (`3xl`) | 33 / 2.0625rem | console page titles | Cabinet 700 | 1.2 | -0.015em |
| `--text-heading-1-size` (`2xl`) | 28 / 1.75rem | section heads | Switzer 600 | 1.25 | -0.01em |
| `--text-heading-2-size` (`xl`) | 23 / 1.4375rem | card heads | Switzer 600 | 1.3 | -0.005em |
| `--text-heading-3-size` (`lg`) | 19 / 1.1875rem | group heads | Switzer 600 | 1.35 | 0 |
| `--text-body-size` (`base`) | 16 / 1rem | body, inputs (also the iOS 16 px input floor) | Switzer 400 | 1.5 | 0 |
| `--text-label-size` (`base`) | 16 / 1rem | buttons, field labels | Switzer 500 | 1.25 | 0 |
| `--text-supporting-size` (`sm`) | 13 / 0.8125rem | helper text, timestamps | Switzer 400 | 1.45 | +0.01em |
| `--text-code-size` (`base`) | 16 / 1rem | IDs, CNIC/phone last-4, timers | Martian Mono 500 | 1.4 | 0 |

The Astryx heading tokens `--text-heading-4`, `-5` and `-6` are not used. Deeper levels reuse `heading-3` with weight 500.

#### How PKR amounts are set
One component, three sizes. Every part takes `font-variant-numeric: tabular-nums lining-nums`. Martian Mono is monospaced, so this is belt-and-braces.

| Part | Terminal hero (amount entry, outcome) | Website stat / phone mock | Ledger row |
|---|---|---|---|
| Currency label "PKR" | Switzer 600, 0.28em of the amount size, `ink-2`, uppercase, +0.08em, on its own line above the figure | Switzer 600, 0.3em, `ink-2`, +0.08em, before the figure on the baseline | Switzer 500, 13 px, `ink-3`, column header only (not repeated per row) |
| Integer part | Martian Mono 600, `font-stretch: 87.5%`, **`clamp(3.5rem, 2rem + 6.4vw, 6rem)`** (56–96 px), line-height 1.0, tracking -0.02em | Martian Mono 600, `display-m` size | Martian Mono 500, 16 px |
| Decimal part ".00" | **0.5em** of the integer size, weight 500, `ink-2`, **baseline-aligned** (not superscript, so "180.00" never reads as "180⁰⁰") | 0.5em, `ink-2` | same size as the integer, `ink-2` (alignment beats drama in a column) |
| Grouping | comma every 3 digits (`5,000`); the formatter owns the grouping and the type only guarantees fixed digit width | same | same; numeric columns right-aligned |

Rules for amounts:
- Decimals are always shown, because fees and nets have paisa (demo: net **179.19**, fee **0.81**).
- Amounts never use `slashed-zero`: "5,000" with slashed zeros reads as noise.
- Identifiers use `slashed-zero`. In Martian Mono that's `font-variant-numeric: slashed-zero`. Verify that the face maps it, or fall back to the font's default zero, which is already distinct from O.

Other data:
- **CNIC / phone last-4:** Martian Mono 500, `ink-2`, shown as "•••• 4821". The dots use U+2022 with a thin space U+2009 before the digits, and +0.04em tracking.
- **Timers** ("0:03"): Martian Mono 500, `tabular-nums`. The colon doesn't move.

#### Urdu readiness (A)
| Use | Face | Licence | Notes |
|---|---|---|---|
| Reading text and story captions | **Noto Nastaliq Urdu** | SIL OFL 1.1 (Google Fonts), variable `wght` 400–700 | Nastaliq is what Urdu readers expect for prose. Line-height **2.0–2.2**. Set it at **1.2×** the Latin size of the same role, because its optical size runs small. |
| Terminal and console UI labels | **Noto Sans Arabic** | SIL OFL 1.1, variable `wght` 100–900, `wdth` 62.5–100 | Monoline, so it matches Switzer's even stroke. It fits fixed-height buttons where Nastaliq's diagonal stacking would clip. Line-height 1.6. |
| Figures in Urdu UI | **Keep Western digits in Martian Mono** | n/a | Amounts don't change shape between languages, and Pakistani bank SMS and receipts use Western digits. Wrap them in `<bdi>`. |

Rules for Urdu:
- **Never letter-space Arabic script**, because tracking breaks the joins. Every tracking token above is reset to `0` under `:lang(ur)`.
- Set `dir="rtl"` on the element and `lang="ur"`.

### Direction B: "Painted Signboard"

Concept: hand-painted Pakistani shop boards (condensed, heavy, painted capitals), plus a written hand for annotations.

| Role | Face | Source and licence |
|---|---|---|
| Display | **Tanker** (single weight, heavy condensed) | Fontshare, ITF Free Font License, $0 |
| Text / UI | **General Sans** (200–700) | Fontshare, ITF Free Font License, $0 |
| Data / mono | **IBM Plex Mono** (400, 500, 600) | Google Fonts, SIL OFL 1.1, $0 |
| Hand accent (earns its place here) | **Kalam** (300, 400, 700) | Indian Type Foundry, Google Fonts, SIL OFL 1.1, $0. Live-text annotations pinned to scenes ("no phone", "PKR 0 on a decline"). |

Why it fits:
- It quotes the real signage of the kiryana street.
- Condensed display packs large type into narrow phone widths.
- Kalam is a South Asian–made hand that brings warmth to annotations.

Why it is not recommended:
- Tanker has **one weight**, so hierarchy has to come from size alone.
- Its poster loudness competes with the drawn characters, where display type should frame the art rather than shout over it.
- Condensed heavy capitals next to the tight SF-style wordmark make two heavy voices fight. This is the clash the brief warns about.
- A second casual voice (Kalam) next to hand-drawn art is one voice too many.

Scale B (website): ratio **1.414**, base 16 → 18 px.

| Role | Size | Face / weight | Line-height | Tracking |
|---|---|---|---|---|
| display-xl | 56 → 144 px | Tanker 400, uppercase | 0.95 | +0.01em |
| display-l | 44 → 102 px | Tanker 400 | 1.0 | +0.01em |
| h1 | 32 → 51 px | General Sans 600 | 1.15 | -0.01em |
| h2 | 24 → 36 px | General Sans 600 | 1.2 | -0.005em |
| body | 16 → 18 px | General Sans 400 | 1.6 | 0 |
| caption | 13 px | General Sans 400 | 1.45 | +0.01em |
| annotation | 20 → 26 px | Kalam 400 | 1.3 | 0 |
| amounts | as in A | IBM Plex Mono 600, decimals 0.5em, baseline-aligned | 1.0 | -0.01em |

The app scale is the same Astryx table as in A, with General Sans for text and IBM Plex Mono for code.

Urdu (B): **Gulzar** (SIL OFL 1.1, Google Fonts, Nastaliq, 400 only) for captions, and **Noto Sans Arabic** at `wdth` 75 for UI, to echo the condensed Latin.

### Recommendation: Direction A, "Counter Grotesk"

- It is the only direction whose display face **frames the drawings instead of competing with them**.
- It sits next to the wordmark as a relative, not a rival.
- It keeps the merchant app calm (Switzer).
- It costs **$0** with clear licences.

**Swap test: what changes with Inter in place of A's faces?**
- **Display:** Inter Display Black next to the SF-style wordmark is a near-miss. Both are neutral neo-grotesks, so the headline looks like the logo typed out and the logo stops being special. Inter's precise, industrial evenness also makes the hand-drawn scenes look pasted onto a SaaS template. This is the "fonts so generic" failure the user already named.
- **Text:** the merchant app would barely change. Switzer and Inter do the same job, which is the point: the text face is meant to be invisible.
- **Amounts:** nothing breaks, since Inter has `tnum`. But the receipt-and-scanner voice of Martian Mono is lost, and the amount stops looking like it came off the terminal.

So the swap would erase identity on the website and change nothing useful in the app. That shows the character is placed exactly where it belongs: in the display and data faces.

**Delivery budget (targets, not measured yet):**
- Subset everything to Latin Basic + Latin-1 + `₨`/`•`/`–`/`…`.
- Preload only **Cabinet Grotesk 900** (the hero) and **Switzer variable**.
- Martian Mono loads on first use (`display: swap` with a size-adjusted fallback).
- Critical font bytes ≤ **90 KB**.
- `font-display: swap` everywhere, with fallback metrics (`size-adjust`, `ascent-override`) tuned against `-apple-system, "Segoe UI", sans-serif` to keep CLS < 0.05.
- The current Figtree setup (`src/app/fonts.css`) is retired when the FingerPay theme lands.

---

## 2. Colour

### 2.1 Decision: the page ground is light, on the paper colour

**Ground: `#EFE9DE` (the illustration paper) for the landing page. Dark exists only as a mode for the app and consoles.**

Reasons, measured:
1. **The art's line ink disappears on dark.** Every vignette is outlined in `#1C1C1F`. Against a dark ground (`#0E0E11`), the outline measures **1.13:1**, so characters would lose their edges and need a paper plate or a glow (glow is banned).
   - On paper, the same line measures **14.07:1**.
2. **The art is made for paper.** ART-PROMPTS.md specifies flat cel fills plus a warm paper swatch. The frames are cut out of a plain background, so when the page *is* the paper, characters step straight out of the page with no frame or card around them. That frameless integration is what makes an illustrated landing page look crafted rather than templated.
3. **The fills hold against paper:**

   | Fill | vs paper |
   |---|---|
   | bottle green | 5.04:1 |
   | tarp blue | 3.64:1 |
   | chilli | 3.60:1 |
   | chai | 3.03:1 |

   Only turmeric (1.74) is low, and it is always outlined in ink.

**How this stays clear of the rejected "cream ledger page":**
- no serif and no ruled lines
- heavy Cabinet Grotesk in ink black
- full-bleed **ink bands** (`#1C1C1F` ground, paper text, 15.92:1) for the type-only beats with no illustration: the security promise, the disclaimer, the footer.

Those bands carry the user's dark-leaning taste in the page rhythm without putting line art on black.

### 2.2 The illustration palette (fixed in ART-PROMPTS.md; measured here)

| Swatch | Hex | OKLCH | HSL S | Ink line on it | vs paper ground |
|---|---|---|---|---|---|
| Ink (line) | `#1C1C1F` | 0.228 0.006 286 | 5% | n/a | 14.07 |
| Paper | `#EFE9DE` | 0.936 0.016 83 | 35% | 14.07 | n/a |
| Chai brown | `#B07A4A` | 0.624 0.093 61 | 41% | 4.64 | 3.03 |
| Turmeric | `#E2A93B` | 0.770 0.139 80 | 74% | 8.07 | 1.74 |
| Chilli red | `#C8553D` | 0.593 0.152 33 | 56% | 3.90 | 3.60 |
| Bottle green | `#3E6B57` | 0.489 0.060 164 | 27% | 2.79 | 5.04 |
| Tarp blue | `#4F7CA8` | 0.572 0.085 249 | 36% | 3.87 | 3.64 |

Local tokens: `--fp-ill-ink`, `--fp-ill-paper`, `--fp-ill-chai`, `--fp-ill-turmeric`, `--fp-ill-chilli`, `--fp-ill-bottle`, `--fp-ill-tarp`. Skin tones come from ART-PROMPTS.md and get no tokens.

**These swatches as UI colour blocks** (full-bleed section bands behind live text):

| Block | Text that passes | Ratio |
|---|---|---|
| Bottle green | paper text | **5.04** ✓ |
| Turmeric | ink text | **8.07** ✓ |
| Chai | ink text | **4.64** ✓ (tight; body text ≥ 18 px only) |
| Chilli | ink 3.90, paper 3.60 | ✗ for body text: **never a text background** (large headline ≥ 24 px only) |
| Tarp blue | ink 3.87, paper 3.64 | ✗ for body text: **never a text background** (large headline ≥ 24 px only) |

The thumb-press "glow" in the scenes is a **light change**: the WebGL layer lifts exposure and warms the white balance. It is never a coloured halo (banned). Shadows stay the one flat shadow tone per colour that ART-PROMPTS.md specifies.

### 2.3 The one UI accent: stamp blue (from tarp blue)

| Token | Light (site default) | Dark (app/console mode) | HSL S | Astryx |
|---|---|---|---|---|
| `--fp-accent` (fill, focus ring) | `#295E90` oklch(0.47 0.10 250) | `#77AADB` oklch(0.72 0.09 248) | 56% / 58% | `--color-accent`, `--focus-outline-color` |
| `--fp-accent-text` | `#265B8D` oklch(0.46 0.10 250) | `#88B6E2` oklch(0.76 0.08 248) | 58% / 61% | `--color-text-accent`, `--color-icon-accent` |
| `--fp-on-accent` | `#FAF7F3` | `#0E0E11` | n/a | `--color-on-accent` |
| `--fp-accent-muted` | `rgb(41 94 144 / 0.22)` | `rgb(119 170 219 / 0.32)` | n/a | `--color-accent-muted`, selection |

**Why stamp blue:**
- **It comes from the art.** It is tarp blue (hue 249) taken deeper so it works as text. UI and illustration share one blue, which is the harmony the palette asks for.
- **It is the colour of a thumb impression on paper.** In Pakistan, people who sign with a thumb press it into a blue stamp pad and onto a document. FingerPay replaces that inked thumb with a scanned one. A blue mark on paper is the most literal visual for "the thumb is the signature", and the accent marks exactly where the thumb and attention go: the scanner target, the primary action, focus, the caret, selection and link underlines.
- **It keeps status hues clean.** The OKLCH hue spacing is danger 22°, warning 70°, settled 155°, accent 250°, so no two roles are within 15°.
- **It isn't the banned colour.** Hue 250 is blue, well away from the banned violet (around 290) and cyan (around 200), and saturation is under 80%.

**Why not chilli:**
- Chilli is the art's hero warm and the obvious brand-ish pick, but at hue 33 it sits about 11° from danger red.
- A chilli "Pay" button would read as an error on a counter.
- Chilli stays in the illustrations, where it does the warm work.

On a vignette, stamp blue next to chilli measures 1.56:1, a hue contrast only. **UI accent elements never rely on touching chilli art to be seen.** They sit on paper (5.61:1) or on surfaces.

### 2.4 Neutral ramps

| Token | Light (paper, default) | Dark (app/console mode) | Astryx | Role |
|---|---|---|---|---|
| `--fp-ground` | `#EFE9DE` (= paper) | `#0E0E11` oklch(0.165 0.006 286) | `--color-background-body` | page |
| `--fp-surface-1` | `#F6F2EB` oklch(0.962 0.010 83) | `#17171A` | `--color-background-surface`, `--color-background-card` | panels, the terminal screen |
| `--fp-surface-2` | `#FAF7F3` oklch(0.978 0.006 83) | `#202023` | `--color-background-popover` | popovers, sheets |
| `--fp-surface-3` | `#E6DFD3` oklch(0.905 0.018 80) | `#2B2B2E` | `--color-background-gray`, the declined banner | pressed, selected, declined |
| `--fp-ink-band` | `#1C1C1F` | n/a | local | full-bleed ink bands on the site |
| `--fp-ink-1` | `#1C1C1F` (logo ink) | `#ECECEF` | `--color-text-primary`, `--color-icon-primary` | primary text |
| `--fp-ink-2` | `#4C4741` oklch(0.40 0.012 70) | `#BDBDC1` | `--color-text-secondary`, `--color-icon-secondary` | secondary text, decimals |
| `--fp-ink-3` | `#655F59` oklch(0.49 0.012 70) | `#9B9BA0` | local (Astryx has no tertiary token) | metadata, the tagline on paper |
| `--fp-ink-4` | `#9D9790` | `#68686D` | `--color-text-disabled`, `--color-icon-disabled` | disabled, placeholder (exempt) |
| `--fp-brand-grey` | `#86868B` | `#86868B` | local | logo lockup only, at ≥ 24 px, on `surface-2` (3.39). On paper it is **3.00**, too close to the threshold, so on paper the tagline uses `ink-3` (5.21). |

Neither ramp uses pure black or white. Dark is its own ramp, not an inversion of light.

**Borders (ink over the surface):**

| Token | Light | Dark | Astryx | Renders (over ground) | vs ground |
|---|---|---|---|---|---|
| `--fp-border-hairline` | `rgb(28 28 31 / 0.08)` | `rgb(236 236 239 / 0.08)` | `--color-border` | `#DED9CF` / `#202023` | 1.16 / 1.19 (decorative) |
| `--fp-border` | `rgb(28 28 31 / 0.14)` | `rgb(236 236 239 / 0.14)` | dividers | `#D1CCC3` / `#2D2D30` | 1.32 / 1.40 (decorative) |
| `--fp-border-strong` | `rgb(28 28 31 / 0.54)` | `rgb(236 236 239 / 0.40)` | `--color-border-emphasized`, inputs | `#7D7A77` / `#67676A` | **3.53 / 3.42** (input on surface-1: 3.62 / 3.42) |

### 2.5 Semantic colours

| State | Treatment | Light | Dark | Astryx |
|---|---|---|---|---|
| **Settled** ("Paid") | the only saturated outcome; green, check icon, the word "Paid" | fill and text `#1B683E` oklch(0.46 0.10 155), on-fill `#FAF7F3`, muted `rgb(27 104 62 / 0.12)` | fill `#55C483`, text `#72D699`, on-fill `#0E0E11`, muted `rgb(85 196 131 / 0.16)` | `--color-success`, `--color-text-success`, `--color-on-success`, `--color-success-muted`, `--color-on-success-muted` |
| **Declined** ("Not paid · PKR 0 charged") | **neutral, not red.** No money moved, so no hue. `surface-3` banner, `ink-1` title, `ink-2` body, an outlined icon. The signal is loud through the full-screen state change, the word, a two-tone sound and persistence (APP.md), not through alarm colour. No shopper name. | `#E6DFD3` / `#1C1C1F` / `#4C4741` | `#2B2B2E` / `#ECECEF` / `#BDBDC1` | local `--fp-declined-bg/-fg/-fg-2`. Astryx `--color-info*` points at the same neutrals, so no extra hue enters. |
| **Warning** (near the limit, session expiring, unverified terminal) | amber text, turmeric fill | text `#81561E` oklch(0.49 0.09 70), fill `#E2A93B` with ink `#1C1C1F` on it, muted `rgb(226 169 59 / 0.20)` | fill `#EBBD57`, text `#EAC578`, on-fill `#0E0E11`, muted `rgb(235 189 87 / 0.16)` | `--color-warning`, `--color-text-warning`, `--color-on-warning`, `--color-warning-muted`, `--color-on-warning-muted` |
| **Offline: "TAKE CASH"** | **inversion, not a new hue.** A full-width card in the opposite polarity reads like a printed instruction slip. It can't be confused with Paid (green) or Not paid (grey). Icon in the same colour as the text. | card `#1C1C1F`, text and icon `#FAF7F3` | card `#ECECEF`, text and icon `#1C1C1F` | `--color-background-inverted`; local `--fp-offline-bg/-fg` |
| **Danger** (consoles only: form errors, Thumb Lock, revoke) | red, never on the merchant outcome screen | text `#A82C34` oklch(0.49 0.16 22), fill `#AF2934`, on-fill `#FAF7F3`, muted `rgb(175 41 52 / 0.10)` | fill `#E8605D`, text `#F08E8B`, on-fill `#0E0E11`, muted `rgb(232 96 93 / 0.16)` | `--color-error`, `--color-text-error`, `--color-on-error`, `--color-error-muted`, `--color-on-error-muted` |

Colour never carries meaning alone: every state has a word and an icon. Settled green (hue 155) and the art's bottle green (hue 164) are different jobs. Bottle green never appears in UI state.

### 2.6 Material tokens

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--fp-scrim` | `rgb(239 233 222 / 0.86)` | `rgb(14 14 17 / 0.78)` | panel behind live text laid over a vignette |
| `--fp-scrim-blur` | `12px` | `12px` | `backdrop-filter: blur()` on that panel |
| `--fp-scrim-solid` (fallback) | `#F6F2EB` | `#17171A` | under `prefers-reduced-transparency: reduce`, `prefers-contrast: more`, and `@supports not (backdrop-filter: blur(1px))` |
| `--fp-shadow-occlusion` | `0 1px 2px rgb(28 28 31 / 0.10), 0 10px 28px rgb(76 71 65 / 0.12)` | `0 1px 2px rgb(8 8 12 / 0.5), 0 12px 32px rgb(8 8 12 / 0.35)` | `--shadow-med`; occlusion tinted toward the ground, never coloured light |

Worst-case scrim contrast, with the backdrop being the darkest or lightest art behind the panel:
- **Light:** ink on the scrim over solid ink art renders `#D1CCC3`, which measures **10.63:1**.
- **Dark:** ink-1 on the scrim over paper art renders `#3F3E3E`, which measures **9.04:1**.

Astryx adaptations cover `contrast` and `motion` but not reduced transparency. That swap needs one scoped media query in the theme's local layer (§2.8).

### 2.7 Contrast for every text/background pair (WCAG 2.x, computed)

Thresholds: text 4.5, large text 3, non-text 3. Muted fills were measured composited over `surface-1`.

| Pair | Light (paper) | Dark |
|---|---|---|
| ink-1 on ground / s1 / s2 / s3 | 14.07 / 15.23 / 15.92 / 12.84 | 16.35 / 15.17 / 13.78 / 11.97 |
| ink-2 on ground / s1 / s2 / s3 | 7.61 / 8.24 / 8.61 / 6.94 | 10.29 / 9.55 / 8.68 / 7.54 |
| ink-3 on ground / s1 / s2 / s3 | 5.21 / 5.64 / 5.90 / **4.76** | 6.97 / 6.47 / 5.87 / 5.10 |
| ink-4, exempt (ground / s1 / s2 / s3) | 2.39 / 2.59 / 2.71 / 2.18 | 3.48 / 3.23 / 2.93 / 2.55 |
| brand grey on ground / s2 (large only) | 3.00 / 3.39 | 5.32 (on ground) |
| paper text on ink band | 15.92 | n/a |
| accent text on ground / s1 / s2 | 5.86 / 6.35 / 6.64 | 9.03 / 8.38 / 7.61 |
| settled text on ground / s1 / s2 | 5.61 / 6.08 / 6.35 | 10.82 / 10.05 / 9.13 |
| warning text on ground / s1 / s2 | 5.29 / 5.72 / 5.98 | 11.69 / 10.87 / 9.85 |
| danger text on ground / s1 / s2 | 5.65 / 6.12 / 6.39 | 7.84 / 7.62 / 6.61 |
| on-accent on accent fill | 6.35 | 7.85 |
| on-settled on settled fill | 6.35 | 8.82 |
| on-warning on warning fill | 8.07 (ink on turmeric) | 10.97 |
| on-danger on danger fill | 6.16 | 5.75 |
| settled text on settled-muted | 5.10 (`#DCE1D6`) | 7.50 (`#21332B`) |
| warning text on warning-muted | 5.06 | 7.69 (`#393224`) |
| danger text on danger-muted | 5.24 (`#EFDED9`) | 5.95 (`#382325`) |
| declined title / body on surface-3 | 12.84 / 6.94 | 11.97 / 7.54 |
| offline text on inverted card | 15.92 | 14.42 |
| selected text on selection (over ground / over s2) | 10.24 / 11.44 | 8.99 / 7.46 |
| text on scrim, worst backdrop | 10.63 | 9.04 |
| **Non-text** focus ring on ground / s1 / s2 / s3 | 5.61 / 6.07 / 6.35 / 5.12 | 7.85 / 7.29 / 6.62 / 5.75 |
| border-strong vs ground; input border vs s1 | 3.53; 3.62 | 3.42; 3.42 |
| scrollbar thumb vs track | 3.53 | 3.17 |
| link underline vs ground | 5.61 | 6.93 |

Every required pair passes. The tightest are light ink-3 on surface-3 (**4.76**) and chai blocks with ink text (**4.64**). Neither may get lighter.

### 2.8 Astryx mapping and theme-editor commands

The base is `neutral`, with modes `both`. The site renders **light**. The terminal default is an open question (§4).

These commands were **not run** (instruction: change no files). Run them in `C:\dev\FingerPay`, then open the PNGs: a theme change isn't done until the pictures have been checked.

```powershell
# 1. Seeds (exact tokens below win over generated shades)
npx astryx experimental theme editor new fingerpay --like neutral --mode both --accent "#295E90" --neutral "#655F59" --success "#1B683E" --warning "#E2A93B" --danger "#AF2934" --info "#655F59" --vibrancy 40 --text-size 16 --type standard --headings tight

# 2. Fonts (loaded by the app with next/font/local; the editor only names the stacks)
npx astryx experimental theme editor set fingerpay font 'Switzer, -apple-system, "Segoe UI", Roboto, sans-serif' --on body
npx astryx experimental theme editor set fingerpay font '"Cabinet Grotesk", Switzer, -apple-system, sans-serif' --on heading
npx astryx experimental theme editor set fingerpay font '"Martian Mono", ui-monospace, "SF Mono", Consolas, monospace' --on code

# 3. Light (paper) neutrals
npx astryx experimental theme editor set fingerpay --color-background-body "#EFE9DE" --mode light
npx astryx experimental theme editor set fingerpay --color-background-surface "#F6F2EB" --mode light
npx astryx experimental theme editor set fingerpay --color-background-card "#F6F2EB" --mode light
npx astryx experimental theme editor set fingerpay --color-background-popover "#FAF7F3" --mode light
npx astryx experimental theme editor set fingerpay --color-text-primary "#1C1C1F" --mode light
npx astryx experimental theme editor set fingerpay --color-text-secondary "#4C4741" --mode light
npx astryx experimental theme editor set fingerpay --color-text-disabled "#9D9790" --mode light
npx astryx experimental theme editor set fingerpay --color-border "rgba(28, 28, 31, 0.08)" --mode light
npx astryx experimental theme editor set fingerpay --color-border-emphasized "rgba(28, 28, 31, 0.54)" --mode light
npx astryx experimental theme editor set fingerpay --color-background-inverted "#1C1C1F" --mode light

# 4. Dark neutrals (app/console mode)
npx astryx experimental theme editor set fingerpay --color-background-body "#0E0E11" --mode dark
npx astryx experimental theme editor set fingerpay --color-background-surface "#17171A" --mode dark
npx astryx experimental theme editor set fingerpay --color-background-card "#17171A" --mode dark
npx astryx experimental theme editor set fingerpay --color-background-popover "#202023" --mode dark
npx astryx experimental theme editor set fingerpay --color-text-primary "#ECECEF" --mode dark
npx astryx experimental theme editor set fingerpay --color-text-secondary "#BDBDC1" --mode dark
npx astryx experimental theme editor set fingerpay --color-text-disabled "#68686D" --mode dark
npx astryx experimental theme editor set fingerpay --color-border "rgba(236, 236, 239, 0.08)" --mode dark
npx astryx experimental theme editor set fingerpay --color-border-emphasized "rgba(236, 236, 239, 0.40)" --mode dark
npx astryx experimental theme editor set fingerpay --color-background-inverted "#ECECEF" --mode dark

# 5. Stamp-blue accent
npx astryx experimental theme editor set fingerpay --color-accent "#295E90" --mode light
npx astryx experimental theme editor set fingerpay --color-text-accent "#265B8D" --mode light
npx astryx experimental theme editor set fingerpay --color-on-accent "#FAF7F3" --mode light
npx astryx experimental theme editor set fingerpay --color-accent-muted "rgba(41, 94, 144, 0.22)" --mode light
npx astryx experimental theme editor set fingerpay --color-accent "#77AADB" --mode dark
npx astryx experimental theme editor set fingerpay --color-text-accent "#88B6E2" --mode dark
npx astryx experimental theme editor set fingerpay --color-on-accent "#0E0E11" --mode dark
npx astryx experimental theme editor set fingerpay --color-accent-muted "rgba(119, 170, 219, 0.32)" --mode dark

# 6. Status (light shown; dark values from §2.5 with --mode dark)
npx astryx experimental theme editor set fingerpay --color-success "#1B683E" --mode light
npx astryx experimental theme editor set fingerpay --color-text-success "#1B683E" --mode light
npx astryx experimental theme editor set fingerpay --color-on-success "#FAF7F3" --mode light
npx astryx experimental theme editor set fingerpay --color-warning "#E2A93B" --mode light
npx astryx experimental theme editor set fingerpay --color-text-warning "#81561E" --mode light
npx astryx experimental theme editor set fingerpay --color-on-warning "#1C1C1F" --mode light
npx astryx experimental theme editor set fingerpay --color-error "#AF2934" --mode light
npx astryx experimental theme editor set fingerpay --color-text-error "#A82C34" --mode light
npx astryx experimental theme editor set fingerpay --color-on-error "#FAF7F3" --mode light

# 7. Focus ring (its colour follows --color-accent)
npx astryx experimental theme editor set fingerpay --focus-outline-width 2px
npx astryx experimental theme editor set fingerpay --focus-outline-offset 3px

# 8. Wire it and look
npx astryx theme add fingerpay
npx astryx experimental theme editor show fingerpay --png
```

**What the editor can't set** goes in `themes/fingerpay/fingerpay.theme.ts` (yours to edit) as `defineTheme({ localTokens })`:
- `--fp-ink-3`, `--fp-ink-band`, `--fp-brand-grey`
- `--fp-declined-*`, `--fp-offline-*`
- `--fp-scrim*`, `--fp-shadow-occlusion`
- the illustration swatches `--fp-ill-*`
- the type tokens `--fp-display-*`, `--fp-amount-*`.

Add a `contrast: more` adaptation that sets `--fp-scrim` to `--fp-scrim-solid`. Reduced transparency is not an Astryx condition, so it needs one scoped `@media (prefers-reduced-transparency: reduce)` in the theme's local stylesheet, never a `:root` override in app code.

---

## 3. The six unthemed surfaces

| Surface | Light (site) | Dark (app mode) | Notes |
|---|---|---|---|
| **Selection** | `background: rgb(41 94 144 / 0.22); color: #1C1C1F` | `rgb(119 170 219 / 0.32)`; `color: #ECECEF` | measured 7.46–11.44 |
| **Caret** | `caret-color: #295E90` | `#77AADB` | the blue of the thumb impression |
| **Scrollbar** | `scrollbar-width: thin; scrollbar-color: rgb(28 28 31 / 0.54) transparent`; hover 0.68 | `rgb(236 236 239 / 0.38) transparent`; hover 0.52 | thumb vs track 3.53 / 3.17. The WebKit pseudo-elements mirror it: 8 px thumb, `--radius-full`. |
| **Focus ring** | `outline: 2px solid #295E90; outline-offset: 3px` | `2px solid #77AADB`, offset 3px | `--focus-outline-*`; keyboard only |
| **Link underline** | text `#1C1C1F`; `text-decoration: underline 0.08em rgb(41 94 144 / 0.6)`; `text-underline-offset: 0.24em`; hover: underline `#295E90` | same with `rgb(119 170 219 / 0.6)` → `#77AADB` | ink text with a blue underline; only its colour animates |
| **Tabular numbers** | amounts: Martian Mono + `tabular-nums lining-nums`; identifiers: + `slashed-zero` | same | numeric columns right-aligned |

---

## 4. Open questions for the user

1. **Free or paid fonts?** Direction A costs $0: Cabinet Grotesk and Switzer under the ITF Free Font License, Martian Mono under the OFL.
   - A paid foundry display face (Grilli Type, Pangram Pangram) would be exclusive.
   - I couldn't verify current prices in this session, so I'm quoting none.
   - Do you want one priced?
2. **Terminal default appearance.** The site is light (paper). For the merchant terminal I recommend **light by default** as well: shop tube-lights and daylight cause glare, and a light screen matches the site. Dark would be a setting. Your call.
3. **Urdu digits.** I recommend Western digits for amounts even in Urdu UI, to match Pakistani bank SMS and receipts. Do you want Extended Arabic-Indic digits instead?

## 5. Not verified in this session

- Font feature tables (`slashed-zero` in Martian Mono, Cabinet Grotesk's exact weights, Tanker's lowercase). Downloading font files needs your go-ahead. The §1 rule (all changing figures in the mono face) removes the need for `tnum` elsewhere.
- The ITF Free Font License on committing WOFF2 files to a **public** repo. Re-read it before pushing font files.
- Theme-editor commands were written from `--help`, not run.
- No HTML specimen was built.
- Contrast was computed on flat swatches. The colour inside the delivered WebP frames should be spot-checked once the art exists.
