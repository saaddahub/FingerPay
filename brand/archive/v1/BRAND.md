# FingerPay brand

Extracted from `brand/fingerpay-logo-source.png` (1115 × 516 px, on white). Every number here was measured from that file's pixels. "px" means source pixels unless it says otherwise. Final type and colour choices for the product belong to `docs/design/TYPE-AND-COLOR.md`. This file only records what the logo is.

## Files

| File | What it is | viewBox |
|---|---|---|
| `fingerpay-mark.svg` | Fingerprint mark, rebuilt from geometry: 5 stroked paths, `stroke="currentColor"`, butt caps | `-214.13 -252.5 428.26 404.5` |
| `fingerpay-wordmark.svg` | "FingerPay" as outlines, `fill="currentColor"` | `0 0 561.75 126.14` |
| `fingerpay-lockup.svg` | Mark centred above the wordmark | `0 0 561.75 358.56` |
| `fingerpay-lockup-tagline.svg` | Lockup plus the tagline as outlines (`class="fp-tagline"`, `fill="#86868B"`) | `0 0 666.69 435.58` |

All four files are valid XML with no embedded raster, and none has padding. Clear space (below) is the consumer's job. The mark and the wordmark take their colour from CSS `color`. The tagline is a fixed grey, so it can be overridden with `.fp-tagline { fill: … }` when the SVG is inlined.

### Mark geometry (in `fingerpay-mark.svg`)

The mark's units are 4 per source px, with the origin at the shared arc centre. The source was clearly drawn on a ¼ px grid, because every edge measured landed on a multiple of 0.25 px.

- **Stroke:** 33 u (8.25 px). It is 8.16 % of the mark's height.
- **Rings:** concentric, with centreline radii of 59, 118, 177 and 236 u, so the pitch is 59 u and the gap between strokes is 26 u. Stroke to gap is 1.27 : 1.
- **Rings 1 to 3:** each is a semicircle above the centre with straight vertical legs below it.
  - Ring 1: left leg 125 u, right leg 73 u.
  - Ring 2: left leg 86 u, right leg 152 u.
  - Ring 3: left leg 47 u, right leg 99 u.
- **Ring 4 (outer):** an open arc from 148° to 32°, with ends cut radially. It has no legs.
- **Centre bar:** from y −7 to y 139 on the vertical axis.
- **Leg pattern:** reading each side from the outer ring inward, the left legs run short, mid, long and the right legs run mid, longest, short. That is the "staggered flat stroke ends" in the source. Keep the pattern exactly.

## Colours (sampled)

Pixel counts in the source: ink 27,683 px, grey 6,736 px. Both are solid fills with anti-aliasing only at the edges.

| Role | Hex | OKLCH | Source |
|---|---|---|---|
| Ink (mark and wordmark) | `#1C1C1F` | `oklch(22.8% 0.0057 286)` | sampled |
| Tagline grey | `#86868B` | `oklch(62.2% 0.0074 286)` | sampled |
| Ink on dark (proposed) | `#F5F5F7` | `oklch(97.1% 0.0027 286)` | not in source |
| Tagline on dark (proposed) | `#A1A1A6` | `oklch(71.1% 0.0072 286)` | not in source |

Both sampled colours are cool neutrals at hue 286 with almost no chroma. They are Apple's own UI greys: `#86868B` is exactly apple.com's secondary text grey, and `#1C1C1F` is one step from apple.com's `#1D1D1F`. The proposed dark-ground values keep the same hue.

### Contrast (computed, WCAG 2 and APCA Lc)

| Foreground on ground | WCAG 2 | APCA Lc |
|---|---|---|
| `#1C1C1F` on `#FFFFFF` | 17.00 : 1 | 103.9 |
| `#1C1C1F` on `#F5F5F7` | 15.61 : 1 | 98.0 |
| `#86868B` on `#FFFFFF` | 3.62 : 1 | 63.8 |
| `#86868B` on `#F5F5F7` | 3.33 : 1 | 58.0 |
| `#F5F5F7` on `#111113` (near-black) | 17.32 : 1 | −100.9 |
| `#F5F5F7` on `#1C1C1F` | 15.61 : 1 | −99.8 |
| `#86868B` on `#111113` | 5.21 : 1 | −37.3 |
| `#A1A1A6` on `#111113` | 7.33 : 1 | −51.1 |
| `#A1A1A6` on `#1C1C1F` | 6.61 : 1 | −50.0 |

Logos are exempt from WCAG contrast. Two pairs matter once the tagline is set as live text:

- **`#86868B` on white is 3.62 : 1.** That fails AA for normal text (4.5 : 1) and passes only the large-text threshold of 3 : 1 (24 px or more, or 18.67 px bold or more).
- **On dark grounds, `#86868B` is too dim** (Lc −37). Use `#A1A1A6` there.

## Typeface

**Wordmark: closest match is SF Pro Display Bold (700), with tight tracking.** I couldn't confirm this against the font file, because SF Pro isn't installed here and isn't licensed for this use. The evidence:

- **x-height to cap height is 0.708.** The cap height is 97.5 px (F top 295.5 → baseline 393.0), and the x-height is 69.0 px (n/i/r stem tops at 324.0).
- **Stem to cap height is 0.179** (F stem 17.5 px), which puts it in the Bold range. F's horizontal arms are 15.25 px, thinner than the 17.5 px stem. That stroke modulation is typical of SF.
- **Shapes:** single-storey `g` with an open tail, straight-tailed `y`, double-storey `a` without a spur, and a short `r` terminal.
- **Spacing is tight.** The F→i gap is 3.6 px (0.037 × cap height).
- **The palette is Apple's** (see Colours).
- **It isn't Inter Display Bold**, the nearest open design. At its best-fitting size (134 px) and tracking (−6.6 px), Inter Display still mismatches 20.4 % of dark pixels. Its stems are heavier, its glyphs wider, its `a` has a different shape, and the P–a fit is different.

**Licensing:** SF Pro is licensed only for Apple-platform UI and mock-ups. It can't be self-hosted on the website or embedded in the Android terminal. **The wordmark therefore ships only as the SVG outlines here, never as live text.** These outlines are a trace, not Apple's font data. Even so, if the logo is going to be registered or sold as merchandise, have it redrawn (see Open questions).

**Tagline:** the same SF-style family at Semibold (600). It has a 34.25 px cap height and a 5.25 px stem, so stem to cap height is 0.153, lighter than the wordmark's 0.179. Self-hostable web fonts with the closest feel, all SIL OFL:

1. **Inter, SemiBold 600.** Use the Inter Display optical size at 20 px and above. It has the closest proportions; its x-height to cap height is 0.750 for text and 0.709 for Display.
2. **Inter Tight, SemiBold 600.** Use it where the tagline needs the source's tight set.
3. **Geist, SemiBold 600.** Similar neutral grotesk. The user called Geist "generic" in an earlier direction, so treat it as a fallback only.

## Proportions (from the source)

| Relationship | Value |
|---|---|
| Mark height ÷ wordmark cap height | 101.125 ÷ 97.5 = **1.037** (the mark is about one cap tall) |
| Mark width ÷ wordmark width | 107.07 ÷ 561.75 = **0.191** |
| Gap from mark bottom to F cap top | 131.75 px = **1.351 × cap height** |
| Gap from wordmark baseline to tagline cap top | 60.75 px = **0.623 × cap height** |
| Tagline cap height ÷ wordmark cap height | 34.25 ÷ 97.5 = **0.351** |
| Tagline width ÷ wordmark width | 666.69 ÷ 561.75 = **1.187** |
| Mark stroke ÷ wordmark stem | 8.25 ÷ 17.5 = **0.471** |

**Centring:** in the source, the mark sits 5.24 px left of the wordmark's ink centre and the tagline 4.72 px left. Both are centred on about x = 550, which looks like text-box centring. The lockup SVGs centre all three on the wordmark's ink box, as the brief asked. That moves the mark and tagline by 0.9 % of the wordmark's width.

## Clear space and minimum sizes

- **Unit P:** the ring pitch of the mark. In the source P = 14.75 px, so the cap height is 6.6 P and the mark is 6.9 P tall.
- **Lockups:** keep 3 P clear on every side (≈ 0.45 × wordmark cap height).
- **Mark alone:** keep 2 P clear (≈ 0.29 × mark height).

| Asset | Minimum on screen | Why |
|---|---|---|
| Mark | **20 px tall** | Stroke is 1.6 px and gap is 1.3 px. At 16 px the gap drops to 1.0 px and the rings merge. |
| Lockup (no tagline) | **120 px wide** | Keeps the mark at 20 px or more (wordmark cap height about 20.8 px). |
| Lockup with tagline | **180 px wide** | The tagline cap height reaches about 9 px. |
| Print | Mark 6 mm, lockup 25 mm wide | |

Below 20 px (favicon, status bar), the four rings fill in. Use a simplified favicon instead (see Open questions).

## On dark backgrounds

- **Mark and wordmark:** `#F5F5F7`. **Never pure `#FFFFFF`**, which the project playbook bans and which glares against near-black.
- **Tagline:** `#A1A1A6`.
- **Ground:** near-black such as `#111113` or `#1C1C1F`. Never pure `#000`.
- **Single-colour rule:** mark and wordmark are always the same ink. There's no accent colour in the logo.
- **Glass or photo grounds:** the logo needs an opaque ground of at least `#1C1C1F` behind it. Don't let it float over moving content.

## Next to hand-drawn illustration

The site is illustrated: hand-drawn characters on 12 fps scroll scenes (BRIEF, "Direction decision").

- **Two jobs, two drawings.** The brand logo is always these geometric SVGs. That covers the header, footer, lockups, the terminal UI and anywhere it signs off. Never boil it, wobble it or give it texture or the 12 fps line jitter. The precision is the point: in a hand-drawn world, the one perfectly drawn object reads as the trustworthy one.
- **Stroke relationship.** The mark's stroke is 8.16 % of its height. Next to a scene, size the mark so its stroke is at least the illustration's main contour weight at that zoom, so the logo never looks thinner than the drawing beside it. For example, a 3 px contour means a mark at least 37 px tall. The wordmark stem is 0.179 × cap height, so the same rule gives a cap height of at least 17 px for a 3 px line.
- **Ink.** If the illustrations use a near-black line, make it the same `#1C1C1F` token so the art and the logo read as one family. On dark scenes, use `#F5F5F7` for both.
- **The mark as a prop, "in hand": yes, inside scenes only.** It can appear on the scanner's sensor plate, a "Pay with FingerPay" counter sticker on Rasheed's shop, or the SMS sender icon. There the illustrator may draw it freehand, in perspective, with the scene's line quality and boil. The prop version must keep:
  - 4 rings, with the outer one open
  - 3 U-shapes plus the centre bar
  - the exact leg-length order
  - flat (butt) ends

  Never use a hand-drawn version as the logo, or set it beside the wordmark.
- **Privacy note.** The mark is a stylised symbol, not a fingerprint. Don't draw it with ridge detail, whorls or a "scan" texture. That would contradict the "no fingerprint image is ever stored" story.

## Do and don't

**Do**
- Use the SVGs as supplied, recoloured only through `color` / `currentColor`.
- Keep the mark-above-wordmark lockup and its 1.351 × cap-height gap.
- Use `#F5F5F7` and `#A1A1A6` on dark grounds.
- Give the logo its 3 P of clear space.

**Don't**
- Set "FingerPay" in live SF Pro, Inter or any other font as the logo.
- Stretch, outline, add shadows or glows, add gradients, or rotate.
- Change the ring count, the leg lengths or their order, or round the stroke ends.
- Put the tagline next to the mark without the wordmark.
- Use pure `#FFFFFF` or `#000000`, or any accent colour, in the logo.
- Use the mark below 20 px; use the favicon variant instead.

## Verification

Method: each SVG was rasterised with resvg at source scale and position (anti-aliased) and diffed against the same region of the PNG. Coverage was normalised by the ink colour (grey for the tagline).

- **XOR:** dark pixels (coverage over 0.5) that disagree, divided by the source's dark pixels.
- **Soft:** Σ|difference| ÷ Σ source coverage.

| Check | Source dark px | XOR | Soft | Target |
|---|---|---|---|---|
| `fingerpay-mark.svg` | 4,851 | **2.02 %** | 2.09 % | < 3 % ✔ |
| `fingerpay-wordmark.svg` | 25,115 | **0.98 %** | 0.47 % | < 5 % ✔ |
| Lockup: wordmark region | 25,115 | 1.00 % | 0.48 % | |
| Lockup: mark region, centring shift undone | 4,851 | 2.00 % | 2.08 % | |
| Lockup with tagline: tagline region, shift undone | 8,787 | 1.88 % | 2.11 % | |

- **Mark residual:** the leftover is sub-pixel anti-aliasing along the edges. A free fit of every parameter only got down to 1.75 %, so the rounded grid values were kept. The source's right legs sit 0.125 px further right than the geometry; that was ignored.
- **Wordmark trace:** the bicubic upsample was 8×, with a Gaussian of σ 0.65 px before potrace. The source's coarse anti-aliasing leaves outer corners softened by about 0.5 px. That's invisible at site sizes but visible above about 3× source size.
- **Tagline trace:** σ was 0.45 px from a 34 px cap height, so its corners and the M apex are slightly soft. Fine at logo sizes; for large display, set the tagline as live text (see Typeface).
- **Typeface check:** at best fit, Inter Display Bold mismatches the wordmark by 20.4 % XOR.
- **Not verified:** a match against the SF Pro font file, and rendering in browsers other than resvg.

## Open questions for the user

1. **Original vector:** do you have the original file (Figma, AI) the PNG came from? If so, it should replace the traced wordmark. If not, should the wordmark get a professional redraw before any trademark filing?
2. **Centring:** keep the lockup centred on the ink (as supplied), or match the source's text-box centring (mark 5 px left)?
3. **Favicon:** a simplified mark for 16–20 px, for example rings 1–3 only with a heavier stroke. Want one drawn?
4. **Tagline:** is it part of the logo (outlines only), or brand copy set in live text with Inter SemiBold?
