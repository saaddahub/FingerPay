# FingerPay website: visual system (v4)

> **Owns:** colour, type, grid, spacing, radii, the glass material, icons, imagery and the logo.
> **Doesn't own:** motion values (`MOTION.md`), page layout and copy (`PAGE.md`), code structure (`BUILD.md`).
> All values below become CSS custom properties in `src/site/tokens.css` (`BUILD.md` §2). Components use the tokens, never the raw values.

---

## 1. The palette: Paper & Ink

Two grounds, one state colour. No brand accent. Expensive comes from restraint: the only "colour" on the page is the chromatic edge of the glass orb and one green dot that means *settled*.

| Token | Value | Role |
|---|---|---|
| `--paper` | `#FFFFFF` | Page ground in acts 1, 4, 5, 6 |
| `--paper-2` | `#F5F5F7` | People's chat bubbles, ledger row hover, reduced-transparency glass |
| `--ink` | `#0A0A0B` | Text on paper, the logo, **and the night ground** (act 3). One value, so the dive into a ridge lands on exactly the night colour with no step |
| `--ink-2` | `#6E6E73` | Secondary text on paper (the grey half of two-tone paragraphs, captions) |
| `--ink-3` | `#A1A1A6` | Decorative only: ticks, disabled glyphs. **Never text** |
| `--rule` | `rgba(10,10,11,.10)` | 1 px hairlines on paper (ledger rules, column guides) |
| `--night-text` | `#F5F5F7` | Text on ink |
| `--night-2` | `#8E8E93` | Secondary text on ink |
| `--night-rule` | `rgba(245,245,247,.12)` | Crosshair and column hairlines on ink |
| `--settle` | `#0A7F4B` | "Settled" text, dot and tick on paper |
| `--settle-night` | `#3DDC97` | The same on ink |

**Declined is `--ink-2` grey, never red** (product rule). There is no error red on this page; nothing on it can fail.

### Contrast (computed, WCAG 2)

| Pair | Ratio | Use |
|---|---|---|
| `--ink` on `--paper` | 19.6 : 1 | all body and display text |
| `--ink-2` on `--paper` | 5.1 : 1 | secondary text, ≥ 12 px |
| `--ink-2` on `--paper-2` | 4.7 : 1 | secondary text inside people bubbles |
| `--settle` on `--paper` | 5.1 : 1 | "Settled", ≥ 12 px |
| `--night-text` on `--ink` | 18.1 : 1 | all text in act 3 |
| `--night-2` on `--ink` | 6.0 : 1 | secondary text in act 3 |
| `--settle-night` on `--ink` | 11.5 : 1 | "Settled" in act 3 |
| `--ink-3` on `--paper` | 2.6 : 1 | **fails text**; decorative only |

Text on light glass is measured against the worst case behind it (`--ink` display type passing under the nav): glass background alpha is set so `--ink` text on it stays ≥ 12 : 1 and `--ink-2` ≥ 4.5 : 1. Verify in the browser after build (`BUILD.md` §9).

---

## 2. Type

Two families, both SIL OFL, both variable, self-hosted with `@fontsource-variable`.

| Family | Package | Why this one |
|---|---|---|
| **Inter** (with the `opsz` axis) | `@fontsource-variable/inter` (opsz + wght files) | The closest open analogue to SF Pro Display: the Apple minimalism the client asked for. Its Display optical size (opsz 32) tightens spacing and sharpens joins at large sizes, which is where this page lives. |
| **Geist Mono** | `@fontsource-variable/geist-mono` | Money, timestamps, SMS and the ledger. Receipts and feature-phone SMS are monospaced in real life, so mono here is product truth, not decoration. |

Remove the v3 fonts from the landing page (Bricolage Grotesque, Instrument Sans, JetBrains Mono, Figtree, Space Grotesk). They may stay installed for other routes until those are redesigned.

**Weights:** Inter 400 and 500 only. Never 600+. Big type at regular weight is the "nonchalant" in the brief: the size does the shouting, the weight stays calm. Geist Mono 400 only.

### Scale

All sizes in `rem` so the page respects browser text-size settings. `clamp()` minimums are the 390 px phone values; maximums are reached at about 1600 px.

| Token | Size | Line height | Tracking | Weight · opsz | Used for |
|---|---|---|---|---|---|
| `--t-hero` | `clamp(3.25rem, 7.4vw, 8.5rem)` | 0.9 | −0.045em | 400 · 32 | "Pay with" / "nothing." (sized so both words fit beside the phone) |
| `--t-mega` | `clamp(4rem, 12.5vw, 12.5rem)` | 0.88 | −0.045em | 400 · 32 | The triad words, the closing line |
| `--t-display` | `clamp(2.5rem, 6vw, 6rem)` | 0.95 | −0.045em | 400 · 32 | Section titles ("A sale, start to finish.") |
| `--t-title` | `clamp(1.5rem, 2.6vw, 2.5rem)` | 1.08 | −0.03em | 400 · 32 | Ledger values in Inter, the Certain card amount |
| `--t-lead` | `clamp(1.125rem, 1.35vw, 1.375rem)` | 1.42 | −0.014em | 400 · auto | Two-tone paragraphs, triad paragraphs |
| `--t-body` | `1rem` | 1.5 | −0.011em | 400 · auto | Chat bubbles, ledger labels |
| `--t-caption` | `0.8125rem` | 1.35 | −0.006em | 500 · auto | Nav labels, captions, timestamps in Inter |
| `--t-mono` | `0.9375rem` | 1.45 | 0 | Geist Mono 400 | SMS bodies, amounts in bubbles, ledger values |
| `--t-mono-s` | `0.6875rem` | 1.3 | +0.06em, uppercase | Geist Mono 400 | Index labels ("01 / 03"), the time rail ticks, "SAMPLE" tags |

Rules:
- At most three sizes per component.
- Numbers in Inter always use `font-variant-numeric: tabular-nums`. Amounts are written `PKR 180.00` (the SMS format from `fp.fmt_pkr`), never `Rs`, never floats.
- `text-wrap: balance` on mega, display and title; `text-wrap: pretty` on lead and body.
- Measure: lead paragraphs 32–44 ch; chat bubbles max 34 ch; ledger labels one line on desktop.
- **Two-tone paragraph** (from adamperlis.com): the first sentence in `--ink`, the rest in `--ink-2`, same size and weight. On ink: `--night-text` then `--night-2`. Markup: `<p><strong class="lead-ink">First sentence.</strong> Rest.</p>` with `strong` set to weight 400 (the emphasis is colour, not weight).
- Hyphenation off. No all-caps except `--t-mono-s`.

---

## 3. Grid

- 12 columns. Page margin `--page-x: clamp(1rem, 4vw, 3rem)`. Gutter `--gutter: clamp(1rem, 1.6vw, 1.5rem)`. Content max width 1600 px; beyond that the margins grow.
- Mobile (< 768 px): 4 columns, same margin and gutter tokens.
- **Visible hairlines** (from santalarch, our ledger metaphor): only in act 3 (crosshair + column guides on ink) and in the ledger (row rules). Never as decoration elsewhere.
- No 6 + 6 text/image splits. Compositions are asymmetric: 5/7, 4/8, 7/5, or a full-bleed object with text in a corner.
- Vertical rhythm between acts: `--s-11` (192 px) desktop, `--s-9` (96 px) mobile. Pinned stages set their own height (`MOTION.md`).

## 4. Spacing

8 px base, in `rem`:

| Token | px | | Token | px |
|---|---|---|---|---|
| `--s-1` | 4 | | `--s-7` | 48 |
| `--s-2` | 8 | | `--s-8` | 64 |
| `--s-3` | 12 | | `--s-9` | 96 |
| `--s-4` | 16 | | `--s-10` | 128 |
| `--s-5` | 24 | | `--s-11` | 192 |
| `--s-6` | 32 | | | |

## 5. Radii

The page is straight-edged. Only objects you could pick up are round.

| Token | Value | Used for |
|---|---|---|
| (default) | `0` | Everything structural: sections, rules, the ledger |
| `--r-pill` | `999px` | Nav pill, CTA pills, the honesty pill, the typing shimmer |
| `--r-bubble` | `1.25rem` with the tail corner at `0.375rem` | Chat bubbles |
| `--r-card` | `1.5rem` | The one glass card (Certain) and the mobile menu sheet |
| `--r-orb` | superellipse, n = 5 (SVG/shader), CSS fallback `28%` | The glass orb |
| Phone | from the client's frame asset | The app frame (never redrawn by us) |

---

## 6. Glass

Glass is the page's only material. It appears **only where something passes underneath** (Apple's rule): the nav over scrolling type, the mobile menu sheet over the page, the Certain card over the crosshair and time rail. Never glass on plain empty paper with nothing behind it, and never glass on glass.

### 6.1 Light glass (on paper)

Adapted from the client's portfolio nav (`Nav.css`), inverted for a white page:

```css
.glass {
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.95),   /* top edge catches the light */
    inset 0 0 0 1px rgba(255, 255, 255, 0.40), /* inner rim */
    0 0 0 1px rgba(10, 10, 11, 0.06),          /* hairline outline on white */
    0 10px 30px rgba(10, 10, 11, 0.08),        /* the portfolio's 0 10 30 shadow, softened */
    0 1px 2px rgba(10, 10, 11, 0.06);          /* contact shadow */
}
```

Plus two pseudo-elements (both `pointer-events: none`, `border-radius: inherit`):
- `::before`, **specular highlight**: `radial-gradient(140px circle at var(--mx) var(--my), rgba(255,255,255,.75), transparent 60%)`, `opacity` 0 → 1 on hover/focus. `--mx/--my` come from the same spring as the magnetic pull (`MOTION.md` §3.2), so the light moves with the object, not ahead of it.
- `::after`, **rim gradient**: 1 px gradient border made with a mask: `linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,255,255,0) 38%, rgba(255,255,255,.35))`.

### 6.2 Dark glass (on ink)

The portfolio's values, unchanged except the tint:

```css
.glass-dark {
  background: rgba(22, 22, 24, 0.60);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 10px 30px rgba(0, 0, 0, 0.50);
}
```

The nav swaps between light and dark glass when it crosses into act 3 (`MOTION.md` §5.1).

### 6.3 The orb (the one WebGL object)

A small glass squircle (superellipse, n = 5) that refracts what's behind it with **chromatic dispersion at the edges** (the R, G and B channels refract by slightly different amounts, so its rim shows a thin spectrum; this is the only colour on the page besides the green dot). It has one role: the nav's home button. It always carries the coin mark, etched (`--ink` at 85 % on paper, `--night-text` on ink).

- Sizes: 40 px (nav), 28 px on mobile nav.
- Shader spec: `BUILD.md` §6. Static fallback: `public/site/orb@2x.webp` (rendered from the shader once, 320 px, ≤ 40 KB), used for reduced motion, no-WebGL, and before the shader is ready.

### 6.4 Reduced transparency and high contrast

```css
@media (prefers-reduced-transparency: reduce) {
  .glass      { background: var(--paper-2); backdrop-filter: none; box-shadow: 0 0 0 1px var(--rule); }
  .glass-dark { background: #161618;        backdrop-filter: none; box-shadow: 0 0 0 1px var(--night-rule); }
}
@media (prefers-contrast: more) {
  .glass      { background: var(--paper); box-shadow: 0 0 0 1.5px var(--ink); }
  .glass-dark { background: var(--ink);   box-shadow: 0 0 0 1.5px var(--night-text); }
}
```

---

## 7. The logo: the Ridge Coin

New, drawn 2026-11-20. Files in `brand/` (`brand/preview.html` shows all of them on paper and ink). The v1 traced logo is in `brand/archive/v1/`.

**The idea.** A coin struck with a fingerprint's ridges. Money and identity in one shape: your thumb is the coin. The ridges follow the *arch* pattern of a fingerprint (ridges that rise and fall across the finger without looping), drawn as six near-parallel lines inside a ring. The peak sits 1.2 units right of centre on purpose: real fingerprints are never symmetric, and the slight offset is what stops it reading as a wave or a mountain logo.

**Geometry** (in `fingerpay-mark.svg`, viewBox `-24 -24 48 48`):
- Ring: radius 22, stroke 2.2.
- Ridges: 6 lines, stroke 2.1, clipped to a circle of radius 18.3 (a 2.6 gap inside the ring's inner edge). Each ridge is `y = base − h · exp(−((x − 1.2) / σ)²)`, sampled at 49 points. Bases run evenly from y 14.5 (bottom) to y −10 (top); heights `h` 3.0 → 8.8; widths `σ` 12 → 9.6, so the upper ridges arch higher and tighter, like a real arch print.
- The generator is reproducible: re-run the script recorded in `BUILD.md` §8 to regenerate every file.

| File | Use | Minimum size |
|---|---|---|
| `fingerpay-mark.svg` | The mark, 6 ridges | 40 px |
| `fingerpay-mark-small.svg` | 5 heavier ridges for small sizes | 20–40 px |
| `favicon.svg` | Solid ink coin, 4 paper ridges, no ring | 16–20 px |
| `fingerpay-app-icon.svg` | Ink squircle tile, paper coin at 62 % | app stores, PWA, OG image |
| `fingerpay-wordmark.svg` | "FingerPay" in Inter Display Medium (opsz 32, wght 500), tracking −0.035em, as outlines | 14 px cap height |
| `fingerpay-lockup.svg` | Coin left of the wordmark. Coin diameter = 1.4 × cap height, centred on the cap height; gap = 0.5 × cap height | 120 px wide |
| `fingerpay-lockup-stacked.svg` | Coin above, diameter 2.6 × cap height, gap 0.8 × cap height | 100 px wide |

**Rules**
- Colour through `currentColor` only: `--ink` on paper, `--night-text` on ink. Never green, never a gradient, never glass-tinted. Inside the orb it is etched, not coloured.
- Clear space: ¼ of the coin's diameter on every side.
- The ridges are a symbol, not a scan. Never add whorls, ridge breaks, pores or a "scanning" sweep across them. That would contradict "we never store a fingerprint image".
- The coin may be animated (the dive flies into it; the sale's thumb bubble presses it). The wordmark is never animated letter by letter.
- On the website the wordmark may also be set as live text in Inter 500, tracking −0.035em, when it sits in running copy. The SVG is for the logo itself.

**Open:** the wordmark outlines have no kerning applied (Inter's own spacing plus tracking). It looks right at site sizes. Before any trademark filing, have it kerned and the coin redrawn by hand from the generator's output.

---

## 8. Icons

The page needs four: arrow right, arrow up, menu, close. Use **Lucide** (ISC licence) at `stroke-width: 1.5`, 20 px, `currentColor`. 1.5 px matches the visual weight of the coin's ridges at nav size. No other icon family, no emoji, no Unicode arrows in UI (the "→" in running copy is typographic and fine).

## 9. Imagery

There is no photography and no illustration. The page has exactly three kinds of picture:
1. **The app frame** (client-supplied): the merchant terminal app on a phone. The hero object and the start of the dive. Slot and format: `BUILD.md` §5.
2. **Vector:** the coin, the ridges in the dive, the time rail, hairlines. All drawn in code (SVG).
3. **The orb** (WebGL, §6.3).

Anything else needs a reason in `PAGE.md` first.
