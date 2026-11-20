# FingerPay spatial and typographic constraints

**Owner skill:** `design-constraints`.

**Inputs:**
- `docs/design/BRIEF.md` (binding), including the 2026-11-18 direction: an **illustrated landing page** with one looping 12 fps vignette per section.
- `docs/design/ART-PROMPTS.md`: the art pipeline (Google Flow or Higgsfield video, then 12 fps WebP).
- `docs/design/WEBSITE.md` §5.2–5.3 (frame player and sizes).
- `docs/design/TYPE-AND-COLOR.md` (faces and colours).
- `PRODUCT.md` and `docs/SPEC.md` §5.
- The user's playbook §3 and §5.
- `npx astryx docs tokens` and `npx astryx docs layout`.
- The installed `neutral` theme (`node_modules/@astryxdesign/theme-neutral`).

**Why this doc exists:** the user has called earlier output generic twice. Generic comes from the build model choosing spacing, radii and type sizes itself. This doc makes those choices ahead of time. Every value below is either legal or banned, and anything not listed as legal is banned. If you need a value that isn't here, add it to this doc with a reason first. Don't improvise it in code.

**Scope:**
- the website (a landing page of sections, each with one looping illustrated vignette)
- the merchant terminal (Android phone, portrait)
- the staff consoles (desktop web)

**What other docs own:**
- **Faces and colours** come from `TYPE-AND-COLOR.md`, referred to here by role:
  - Display (Cabinet Grotesk)
  - Text (Switzer)
  - Data (Martian Mono)
  - Ink, Accent
- **Timing** belongs to `MOTION.md`.
- **Section content and order** belong to `WEBSITE.md`.

**Where this doc wins:** on spacing, radius, type metrics and illustration geometry. Where it disagrees with a sibling doc, the disagreement is listed in §11 for `DESIGN.md` to settle.

---

## 0. What the installed theme does today (verified, not assumed)

I read these from `@astryxdesign/theme-neutral/dist/theme.css` and `src/neutralTheme.ts`. **The build must not trust these defaults.** Several sit off the 8 px grid.

| Token | Neutral resolves to | On 8 grid? | This doc sets |
|---|---|---|---|
| `--radius-inner` | 6 px (0.375rem) | no | **8 px** |
| `--radius-element` | 10 px (0.625rem) | no | **16 px** |
| `--radius-container` | 12 px (0.75rem) | no (nesting breaks) | **24 px** |
| `--radius-page` | 28 px | no | **32 px** |
| `--radius-chat` | 28 px | no | unused. Set to 24 px so a stray use can't break the chain. |
| `--size-element-sm/md/lg` | 28 / 32 / 36 px (core) | sm and lg no | **32 / 40 / 48** (fine pointer), **48 / 56 / 64** (coarse) |
| `--spacing-N` | N × 4 px, up to `--spacing-12` = 48 px | odd N no | odd steps restricted (§2) |
| Type scale | base 14, ratio 1.2. Coarse pointer below `lg`: base 16, ratio 1.1736 | line boxes yes (checked §3.4) | kept for app UI. Website gets its own display tokens (§3.3). |
| Fonts | Figtree, self-hosted (`src/app/fonts.css`) | n/a | replaced by `TYPE-AND-COLOR.md` faces |
| `--shadow-low/med/high` | pure black alpha, 2–24 px blur | partly | redefined (§5.3) |
| `--focus-outline-offset` | 3 px | no | **4 px** (half-step, allowed: §2.2 rule c) |

**How to apply all of these:** make the changes in one theme that extends `neutral`, built with the theme editor (`npx astryx experimental theme editor new fingerpay --like neutral`, then `editor set …`). Then wire it with `npx astryx theme add fingerpay`. Never set them as `:root` overrides. After every change, run `editor show fingerpay --png` and open the pictures. A token isn't done until a component visibly renders it (the "dead tokens" failure).

---

## 1. The grid

### 1.1 Website (landing page)

These breakpoints are Astryx's `widthBreakpoints` defaults, so theme adaptations and layout use the same thresholds.

| Range (CSS px) | Name | Columns | Gutter | Side margin | Content max | Tokens |
|---|---|---|---|---|---|---|
| < 360 | narrow phone (320 test) | 4 | 16 | 16 | fluid | gutter `--spacing-4`, margin `--spacing-4` |
| 360–639 | phone (base) | 4 | 16 | 24 | fluid | `--spacing-4` / `--spacing-6` |
| 640–767 | `sm` | 8 | 16 | 32 | fluid | `--spacing-4` / `--spacing-8` |
| 768–1023 | `md` | 8 | 24 | 40 | fluid | `--spacing-6` / `--spacing-10` |
| 1024–1279 | `lg` | 12 | 24 | 48 | fluid | `--spacing-6` / `--spacing-12` |
| 1280–1535 | `xl` | 12 | 32 | 64 | fluid | `--spacing-8` / **new** `--fp-space-16` |
| ≥ 1536 | `2xl` | 12 | 32 | ≥ 64, centred | **1408** | `--spacing-8` / `--fp-space-16`, **new** `--fp-content-max: 1408px` |

**Rules:**
- **Tracks are `fr`, never fixed px.** A fixed-px track plus an 8 px gutter is how the last column overflows. Use Astryx `Grid` with `columns={{minWidth, max}}` for anything that reflows. A numeric `columns` is allowed only for the 12/8/4 page grid itself, which is set per breakpoint.
- **Vignette stage panels sit on the grid and span whole columns.** They're never full-bleed except in the footer, and never sized in px.
- **Legal two-part splits on 12 columns:** 8+4, 7+5, 5+7, 4+8, 9+3, 3+9. **6+6 is banned** for a text and vignette pair. That layout is the rejected "headline left, object right" template. Three or four equal spans in a row (4+4+4, 3+3+3+3) are banned anywhere (playbook §5.2). That includes the four 1:1 "How it works" vignettes (recipe §7.3).
- **No repeated rhythm:** consecutive sections must not use the same split or put text on the same side (matches `WEBSITE.md` §4: "no repeated image left, text right rhythm").
- **Asymmetric bento:** where a section holds several vignettes (Problem 3a–3c, How it works 1–4), spans within a row must differ, for example 7+5 then 4+8. Never use the same span pair twice in a row.

### 1.2 Merchant terminal (Android phone, portrait, SPEC §5 View A and §11)

| Width | Columns | Gutter | Side margin | Notes |
|---|---|---|---|---|
| 360–430 dp | 4 | 8 (`--spacing-2`) | 16 (`--spacing-4`) | Density beats air at a rush-hour counter. The keypad needs the width (§7.5). |
| Landscape or tablet | not designed in v1 | | | Lock to portrait. A tablet shows the phone layout centred at 430 wide. |

### 1.3 Staff consoles (desktop web, Astryx `AppShell`)

| Region | Budget | Astryx |
|---|---|---|
| SideNav | 256 | `AppShell sideNav` |
| Content: tables, ledgers | fill | `LayoutContent` |
| Content: forms, enrolment | capped at 640 | `Layout contentWidth={640}` |
| Mixed content | capped at 960 | `Layout contentWidth={960}` |
| Detail panel | 384 | `LayoutPanel width={384} hasDivider`. It becomes a `Dialog` at ≤ 1024 (`useMediaQuery`). |
| Nav swap | `MobileNav` below `md` | `mobileNav={{breakpoint: 'md'}}` |

Structural widths (256, 384, 480, 640, 960, 1408) are the only raw px allowed in layout code, per Astryx `layout/scaffold`. All are multiples of 8.

---

## 2. The spacing scale

### 2.1 Legal values

| px | Token | Status | Typical use |
|---|---|---|---|
| 0 | `--spacing-0` | legal | flush |
| 4 | `--spacing-1` | **half-step, restricted** (§2.2) | icon to label inside one control, label to value inside one field |
| 8 | `--spacing-2` | legal | keypad gaps, chip gaps, glass inset around rounded children |
| 12 | `--spacing-3` | **half-step, restricted** | dense table cell vertical padding only |
| 16 | `--spacing-4` | legal | gutter (phone), eyebrow to headline, related-group gap |
| 24 | `--spacing-6` | legal | panel padding, headline to body, group to group |
| 32 | `--spacing-8` | legal | gutter (xl), heading to body on the site's display sizes |
| 40 | `--spacing-10` | legal | margin (md), body to vignette (phone) |
| 48 | `--spacing-12` | legal | margin (lg), body to vignette (desktop) |
| 64 | **new** `--fp-space-16` | legal | section rhythm (phone), margin (xl) |
| 96 | **new** `--fp-space-24` | legal | section rhythm (tablet), hero top band |
| 128 | **new** `--fp-space-32` | legal | section rhythm (desktop) |
| 160 | **new** `--fp-space-40` | legal | hero to first section (desktop) |

New tokens use Astryx's ×4 naming (`-16` = 64 px), so arithmetic stays obvious. They're `localTokens` in the FingerPay theme, prefixed `--fp-` so they can't collide with future core tokens.

**Banned:** `--spacing-0-5` (2), `--spacing-1-5` (6), `--spacing-5` (20), `--spacing-7` (28), `--spacing-9` (36), `--spacing-11` (44). These are off the grid. Astryx's own docs suggest `gap={3}`/`gap={5}` for cadence. **That's overridden here.** Get cadence from 8/16/24 instead.

### 2.2 Rules

1. **Everything is a multiple of 8:** margin, padding, gap, control height, icon box. Type sizes and fluid media dimensions are exempt, but line boxes are not (§3.4), and media keeps an exact aspect ratio (§8).
2. **The half-step (4 or 12) is legal only in these cases:**
   - (a) inside a single control or field (icon to label, label to helper);
   - (b) dense table cell vertical padding;
   - (c) the focus ring offset;
   - (d) where 8 overflows by measurement, recorded with a one-line comment saying why.
   It's never a general escape hatch.
3. **One inset owner.** A container whose only child is another padded container is a defect. Either the parent or the child carries the padding, never both. Text and Heading carry no inset, so the Section owns it. List, Table and nav items carry their own, so the Section uses `padding={0}`. (Astryx `layout-spacing/alignment`.)
4. **Tight binds, generous separates.** Inside a group use 4–8. Between groups in a component use 16–24. Between components use 32–48. Between sections use 64–160. With every border removed, you must still be able to name the groups.
5. **Headings bind downward** (playbook §5.1): the space above a heading must be ≥ 2 × the space below it.
6. **Section rhythm comes in three registers.** Never use the same register three sections in a row.

| Register | Phone | Tablet | Desktop | Use |
|---|---|---|---|---|
| Airy | 96 | 128 | 160 | hero exit, before the footer |
| Standard | 64 | 96 | 128 | most sections |
| Dense | 48 | 48 | 64 | Numbers strip, disclaimer |

7. **Full-height sections use `100dvh`** (`min-block-size: 100dvh`). Never `100vh`.

---

## 3. Typography

### 3.1 Families and weights

**Families: 3 build-wide**, as chosen in `TYPE-AND-COLOR.md`:
- **Display:** Cabinet Grotesk.
- **Text:** Switzer.
- **Data:** Martian Mono.

This is one more than the skill's limit of 2. I accept it because the mono is a **material** scoped to data, not a third voice. The limit then holds where it matters:

| Scope | Families allowed |
|---|---|
| Any one component | **≤ 2** |
| Website prose sections | Display + Text. Data only inside an amount, ID or timer component. |
| Merchant terminal and consoles | **Text + Data only. Display is banned in the app** (it's an Operate-mode tool). |

**Weights:**
- **≤ 3 per family as shipped, ≤ 2 per component.**
  - Display: 700 (H1–H2), 800 (hero and section display). The 900 is cut unless `TYPE-AND-COLOR.md` names a single use for it (§11).
  - Text: 400 body, 500 labels, 600 emphasis and the PKR label.
  - Data: 500 inline, 600 amount integers.
- Hierarchy comes from size and colour first, weight last.

**Sizes per component: ≤ 3.**

**Mono is a material:**
- It's legal on machine-read or column-aligned strings:
  - amounts (readouts and ledger columns)
  - Raast reference, terminal ID, audit hash
  - masked CNIC and phone last 4
  - timers, ledger timestamps
- It's illegal on buttons, banners, headings, tooltips, nav and body prose. A figure inside a sentence ("capped at PKR 25") stays in the Text face.

### 3.2 Metrics the faces must meet

Measure these from the shipped font files (`unitsPerEm`, OS/2 `sxHeight`, `sCapHeight`) and record them in `TYPE-AND-COLOR.md`. If a face fails, raise it there. Don't paper over it with size hacks.

| Metric | Text (Switzer) | Display (Cabinet Grotesk) | Data (Martian Mono, `wdth` 87.5–100) | Why |
|---|---|---|---|---|
| x-height / em | **0.50–0.55** | 0.48–0.55 | 0.52–0.60 | Above 0.55, 14 px UI text looks bloated beside 16 px body. A mono needs a larger x-height to hold up at data sizes. |
| Cap height / em | 0.68–0.73 | 0.68–0.74 | 0.68–0.75 | Keeps "PKR" (Text) level with figures (Data) when they sit on one baseline. |
| Cap-height match | n/a | n/a | Data caps within ±4% of Text caps at the same px | Otherwise mixed "PKR 180" lines look misregistered. Correct it with `size-adjust` on the Data `@font-face`, not per use. |
| Figures | `tnum` and `lnum` wanted (unverified for Fontshare, so amounts use Data) | lining | monospaced by construction | |
| Zero | plain | plain | plain on amounts, `slashed-zero` on identifiers (TYPE-AND-COLOR §3) | A slashed zero on a price reads as machine output. On an ID it prevents O/0 confusion. |
| 1 and 7 | distinct at 14 px | n/a | distinct at 14 px | Misreading 1 as 7 on PKR 1,750 is a money error. |
| Tight setting | n/a | no collisions at **−0.025 em** in "FingerPay", "Rasheed", "Ayesha", "PKR 180" | no collisions at −0.02 em, `wdth` 87.5 | |
| Licence | ITF FFL (self-hosted) | ITF FFL | SIL OFL | CSP `font-src 'self'`, via `next/font/local` |
| Urdu later | pairs with Noto Sans Arabic (line-height 1.6 for Urdu strings) | n/a | Western digits kept | TYPE-AND-COLOR §3 |

### 3.3 Type scale

**App UI (terminal and consoles):** use Astryx type-scale tokens as they are, with no new sizes except the four flagged below.

| Role | Token | Fine pointer (base 14) | Coarse below `lg` (base 16) |
|---|---|---|---|
| Body | `--text-body-*` | 14 / 20 | 16 / 24 |
| Label | `--text-label-*` (500) | 14 / 20 | 16 / 24 |
| Supporting | `--text-supporting-*` | 12 / 20 | 14 / 20 (approx.) |
| Heading 1–3 | `--text-heading-1..3-*` | 24/32, 20/28, 17/24 | scaled by theme |
| Display 1–3 | `--text-display-1..3-*` | 42/52, 35/44, 29/36 | scaled by theme |
| **Terminal amount** | **new** `--fp-text-amount` | n/a | TYPE-AND-COLOR clamp (56–96), **line box ≤ 64 at 360 × 640** (§7.5) |
| **Keypad digit** | **new** `--fp-text-key` | n/a | **28**, line box 32, Data 500 |
| **Result banner** | **new** `--fp-text-banner` | 24 / 32 | **24 / 32**, Text 600 uppercase |
| **Console stat** | **new** `--fp-text-stat` | 32 / 40 | n/a |

**Website:** Astryx tops out at 42 px, so the site needs fluid display tokens. All are new `--fp-` local tokens. Each uses `clamp(min, calc(a + b·vw), max)`, with the 360 px viewport giving the minimum and 1440 the maximum. Where `TYPE-AND-COLOR.md` gives a clamp for the same role, its clamp wins and the leading, tracking and measure here still apply.

| Role | Token | 360 → 1440 | Leading | Tracking | Face, weight | Measure |
|---|---|---|---|---|---|---|
| Hero line (one per page) | `--fp-text-hero` | 56 → 128 | 1.05 | −0.025 em | Display 800 | 8–14 ch per line, ≤ 3 lines desktop, ≤ 5 phone |
| Section headline | `--fp-text-display` | 40 → 80 | 1.08 | −0.025 em at ≥ 64 px, −0.02 em below | Display 800 | ≤ 20 ch, ≤ 3 lines |
| Sub-head, panel and step title | `--fp-text-title` | 24 → 36 | 1.2 | −0.01 em | Display 700 | ≤ 32 ch |
| Lead paragraph | `--fp-text-lead` | 18 → 22 | 1.5 | 0 | Text 400 | **34–48 ch** |
| Body | `--fp-text-body` | 16 → 18 | 1.6 | 0 | Text 400 | **45–65 ch** (`max-inline-size: 65ch`) |
| Caption, disclaimer | `--fp-text-caption` | 14 | 1.5 | +0.01 em | Text 400 | ≤ 72 ch |
| Eyebrow and index label (uppercase) | `--fp-text-eyebrow` | 12 → 13 | 1.33 | **+0.08 em** | Text 500 | one line |

The site never goes below 14 px (12–13 px is allowed only for uppercase eyebrows).

### 3.4 Leading and line-box rules

- **App line boxes are multiples of 4.** I checked the Astryx defaults: 14/20, 16/24, 12/20, 24/32, 20/28, 17/24, 42/52, 35/44 and 29/36 all land on 4. Any override must keep that.
- Website fluid sizes can't snap exactly. Use the unitless leadings above, and snap the **gaps around** the text block to 8.
- Leading falls as size rises: 1.6 (body), 1.5 (lead), 1.2 (title), 1.08 (display), 1.05 (hero). Uppercase banners use 1.33. Amounts use 1.0.

### 3.5 Optical tracking by size

| Size | Mixed case (Text, Display) | UPPERCASE | Data (mono) |
|---|---|---|---|
| ≤ 13 px | +0.01 em | +0.08 em | 0 |
| 14–18 px | 0 | +0.06 em | 0 |
| 19–39 px | −0.01 em | +0.04 em | 0 |
| 40–63 px | −0.02 em | +0.02 em | −0.02 em |
| ≥ 64 px | −0.025 em (floor; never tighter) | 0 | −0.02 em (floor) |

Tracking is in `em`, so it scales with fluid sizes. The wordmark is a logo asset from `brand/`, never typeset, so it's exempt.

### 3.6 Wrapping

- Headings use `text-wrap: balance` and body uses `text-wrap: pretty`.
- No single-word last line in any heading.
- "PKR" and its number are joined by U+00A0 (non-breaking space), so they never break apart. The same goes for "3 s", "0.45%" and "Thumb Lock".

### 3.7 Numerals: PKR amounts with smaller decimals

These are aligned with `TYPE-AND-COLOR.md` §3 (it owns the faces). This section adds the spatial rules.

**Amount anatomy** (one-amount displays: the terminal amount, the site's hero sale, the result sheet):

```
            PKR                     ← site hero only: label on its own line above,
                                       0.28em of S, Text 600, ink-2, uppercase, +0.08em, gap below 0.125em
PKR 180.00                          ← terminal / result: label before the figure,
 │   │  └── decimals ".00": 0.5em of S, Data 500, ink-2, SAME BASELINE
 │   └───── integer "180" (thousands commas): size S, Data 600, font-stretch 87.5%, ink-1, line-height 1.0, −0.02em
 └───────── "PKR": 0.3em of S (min 12 px), Text 600, ink-2, uppercase, +0.08em; gap to integer 0.125em of S
```

**Rules:**
1. **Exactly 3 sizes** (label, integer, decimals), **2 families** (Text and Data) and **2 weights** (600 and 500). Nothing else goes inside the amount component.
2. **Integer and decimals share one baseline.** No superscript, no top alignment, and no `vertical-align: super`.
3. **The decimal point belongs to the small group.** The thousands comma stays at integer size. Check the mono comma's hole at 87.5% width. If it reads as a gap, set the comma alone at `font-stretch: 75%`, or the lowest value the face's `wdth` axis allows.
4. **Reserve the width.** Reserve the inline width for the largest value shown (`5,000.00` at the per-tap limit), so CLS stays 0. Amounts never count up through values they aren't (`MOTION.md` rule 3).
5. **Small decimals are only for one-amount-per-view displays.** In ledger rows, lists and running text, amounts are one size with 2 decimals, right-aligned (§7.6).
6. **Formatting comes from the decimal string.** Split the API's exact-decimal string at "." and format the integer part with en-PK grouping (comma every 3, Western digits). Never `parseFloat` and never `Number()` (SPEC §4, CLAUDE.md money rule).
7. **Two decimals always** in amount components and tables (`PKR 0.81`, `PKR 179.19`, `PKR 0.00`). Banner copy and prose follow SPEC wording exactly (`PKR 180 RECEIVED`, `PKR 0 FEE CHARGED`, `capped at PKR 25`). Prose figures are in the Text face.
8. **Use a true minus sign, U+2212** (`− PKR 0.81`), never a hyphen. Fees shown as deductions are ink-2, never error red. A fee isn't an error.
9. **Percentages have no space** (`0.45%`). The `%` is at the number's size and in the number's face.
10. **Masked identifiers** are shown as `•••• 4821`: U+2022 ×4, thin space U+2009, last 4, in Data 500 at +0.04 em (TYPE-AND-COLOR §3). That's last 4 only, per PRODUCT privacy rules.

**Sizes per surface:**

| Surface | S (integer) | Decimals | "PKR" |
|---|---|---|---|
| Site hero sale | TYPE-AND-COLOR clamp 56 → 96 | 0.5em | 0.28em, own line above |
| Terminal amount entry | `--fp-text-amount`, ≤ 64 line box at 360 × 640 | 0.5em | 0.3em before, min 12 |
| Terminal result sheet | 48 | 24 | 14 |
| Console stat tile | `--fp-text-stat` 32 | 16 | 12 (the minimum applies) |
| Ledger cell | 16 (Data 500) | same size | column header only |

---

## 4. Alignment and optical rules

1. **One content line per region.** Draw a vertical line at the region's text edge. Every label touches it, and only hover and selected backgrounds cross it (Astryx `layout-spacing/alignment`).
2. **Display text hangs optically.** Cabinet Grotesk capitals and rounds carry a left side bearing, so at ≥ 40 px, shift the heading left by that bearing. Measure it from the font (typically −0.03 to −0.06 em) so the stem lines up with Switzer body text below. Record the value in `TYPE-AND-COLOR.md`. It's an `em` margin, not px.
3. **Adjacent columns align by first baseline** (`align-items: first baseline`), never by box top. This covers a label and value, an index label and headline, or a price and name.
4. **Numbers are right-aligned, text left-aligned, status centred** (playbook §4.2).
5. **Icons:** the icon box equals the adjacent text's line box (20 next to 14/20, 24 next to 16/24). Use one icon set at its own stroke (2 px on a 24 grid) and its own caps, consistent across the build. Centre the glyph on the text's **cap height**, not on the line box.
6. **Round controls get optical centring.** In a round button, a directional glyph (arrow, play) shifts 1/12 of the button diameter toward its point. Circles and the fingerprint mark overshoot a square neighbour by ~4% to look the same size.
7. **The fingerprint mark is top-heavy** (closed arches above, open below). Centre it on its **visual** centre, measured in Figma, not its bounding box. Clear space is owned by `brand/BRAND.md`.
8. **Vignette art aligns to text.** Where a vignette sits beside text, the floor or counter line of the art aligns with the last baseline of the text block or with the panel's bottom edge, never at an arbitrary height (§8.4).
9. **Hover and selection backgrounds bleed to the region edge.** The text doesn't move.

---

## 5. Radius and depth

### 5.1 The concentric chain

**Rule: inner radius = outer radius − inset.** With an 8 px inset at every level, the scale is one chain:

| Level | Radius | Token (overridden) | Holds | Inset to next level |
|---|---|---|---|---|
| Page and stage | **32** | `--radius-page` | the hero vignette stage, the result sheet, the drawn terminal frame | 8 → 24 |
| Container | **24** | `--radius-container` | section vignette stages, glass panels, Cards, dialogs | 8 → 16 |
| Element | **16** | `--radius-element` | buttons, inputs, keypad keys, media inside a panel | 8 → 8 |
| Inner | **8** | `--radius-inner` | chips inside controls, small thumbnails, tooltips | n/a |
| Pill and round | 9999 | `--radius-full` | preset chips, round action buttons, the hold button, StatusDot | n/a |
| None | 0 | `--radius-none` | footer full-bleed vignette, table rows, dividers | n/a |

**Rules:**
- **A panel holding rounded children uses an 8 px inset.** A panel holding only text uses a 24 px inset, and nested rounded children are then forbidden (24 − 24 = 0).
- A child with the same radius as its parent is a defect (it reads as a sticker). A larger one is worse.
- **A cut corner** (WEBSITE §4 Safety panel) is a 24 px chamfer on a container (32 on a page-level stage). It replaces the radius at that corner only, and the other three keep the radius.
- A control whose height ≤ 2 × radius becomes a pill, which is intentional: a 32 px button with a 16 px radius is a pill. Don't "fix" it by lowering the radius.
- **Don't use the theme's `radius.multiplier`.** Set the four tokens explicitly, so the chain can't drift.

### 5.2 Depth levels

| Level | What | Material | Shadow |
|---|---|---|---|
| 0 Ground | page body | `--color-background-body` | none |
| 1 Stage | vignette stage panel (a CSS shape from tokens, WEBSITE §5.2), ledger, console content | solid `--color-background-surface` or the stage colour from TYPE-AND-COLOR | none. The art's own contact shadow (§8.6) is the only shadow on a stage. |
| 2 Raised | glass panel, Card, round action button, the hold button | glass (§5.4) or solid card | `--shadow-med` |
| 3 Overlay | result sheet, dialog, menu, mobile nav sheet | solid `--color-background-popover` | `--shadow-high` |

**One raised level per view.** Never glass on glass, Card in Card, or a CSS shadow on drawn art.

### 5.3 Shadows (occlusion only)

Redefine the shadow tokens in the theme as two layers: a tight contact layer plus a wide diffuse layer. All offsets and blurs are on the 4/8 grid. The colour is Ink `#1C1C1F` at low alpha (playbook §3.1). **Coloured glows and emission halos are banned.** The only emitted light is the thumb-press sensor glow, which is drawn in the art or comes from the WebGL light layer owned by `MOTION.md`/`MOTION-3D.md`. It's never a CSS `box-shadow`.

| Token | Contact layer | Diffuse layer |
|---|---|---|
| `--shadow-low` | 0 1 2 (Ink at 12%) | 0 4 16 (Ink at 8%) |
| `--shadow-med` | 0 2 4 (Ink at 12%) | 0 8 24 (Ink at 10%) |
| `--shadow-high` | 0 4 8 (Ink at 14%) | 0 16 48 (Ink at 14%) |

Dark-mode alphas are set in `TYPE-AND-COLOR.md`. Expect roughly 2× those.

### 5.4 Glass

- **Blur:** **new** `--fp-glass-blur: 24px`. Saturation 1.2. One value, never per-panel.
- **Fill:** the Surface role at an alpha set in `TYPE-AND-COLOR.md`. Text on glass must reach 4.5:1 against the **worst pixel** behind it, measured on the key frame. If it can't, raise the fill alpha. Don't add a text shadow.
- **Edge:** a 1 px inner highlight on the top edge only (`inset 0 1px 0`, Surface at 8–12%). This is a material edge, not a border. No outline at rest.
- **Size gate:** glass applies only to faces whose shortest side is ≥ 96 px. Icons, keys, chips and anything smaller get a solid fill (the "effect swallows content" failure).
- **Never glass over a moving vignette.** A 12 fps image under a 24 px blur reads as flicker. Glass may sit over the page ground or a key-frame still only.
- **Mechanism:** a custom Card variant `variant:glass`, added through the FingerPay theme's `components.card` overrides (Astryx `custom-variants`), then `npx astryx theme build`. Never ad-hoc CSS classes.

---

## 6. Controls and states (spatial part)

| Property | Value |
|---|---|
| Control heights, fine pointer | `--size-element-sm/md/lg` = **32 / 40 / 48** (override) |
| Control heights, coarse pointer (terminal, phones) | **48 / 56 / 64** via theme adaptation `{pointer: 'coarse'}` |
| Minimum hit target | 48 × 48 on touch (stricter than the playbook's 44). 32 px fine-pointer controls get a hit area padded to 40. |
| One control size per row | always (Astryx `density`) |
| Focus ring | `--focus-outline-width` 2 px, `--focus-outline-offset` **4 px** (override from 3), colour = the Accent role, full outline. A partial or animated arc only rides on top of a complete ring. |
| Border at rest | none, unless the control is selected. A selected state uses `--shadow-inset-selected`, re-coloured to the Accent role. |
| Press | `scale(0.97)` or a 1 px translate. Timing is in `MOTION.md`. |
| Hover | tonal shift (`--color-overlay-hover`) that fills the whole target. Never `scale(1.05)`. |

---

## 7. Component spacing recipes

Every recipe names its Astryx container and steps.

### 7.1 Hero (website)

```
nav 56 (sticky, structural; WEBSITE §4.0)
   ↕ 32 (--spacing-8)
┌ hero stage panel: cols 1–12 at lg+, radius 32 (--radius-page), aspect 16:9 ──────┐
│ ┌ TEXT-SAFE BAND = top 28% of the frame (§8.5) ───────────────────────────────┐ │
│ │ 48 inset (--spacing-12) from the panel's left and top edges                  │ │
│ │ eyebrow --fp-text-eyebrow   ↕ 16   H1 --fp-text-hero, ≤ 2 lines in the band  │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│        [ACTION-SAFE: Ayesha, counter, scanner, Rasheed: 16:9 rules in §8.5]     │
└──────────────────────────────────────────────────────────────────────────────────┘
   ↕ 24 (--spacing-6)
lead --fp-text-lead (≤ 40 ch, cols 1–5)   +   hold button (round, 64, cols 9–12, first-baseline aligned)
   ↕ airy register (96 / 128 / 160) to the first section
```

- **Below `md`:** the H1 and eyebrow move out of the panel and stack above it (gaps 16, then 24 to the panel). Text never overlays a vignette on phones (§8.5). The panel spans all 4 columns with radius 24.
- If the H1 needs 3 lines at a given width, it leaves the band and stacks above the panel at that width too. **Never shrink the art to make room.**
- **No CTA button and no app download** (BRIEF). The hold button is the action, with a hit area ≥ 64.
- The LCP element is the H1 (DOM text) or the hero key-frame AVIF. It's never the canvas (WEBSITE §5.3).

### 7.2 Section (website)

```
lg+ (12 cols), text-left variant (mirror it for the next section):
cols 1–5   eyebrow --fp-text-eyebrow           ↕ 16
           headline --fp-text-display (≤ 3 lines)   ↕ 24
           body --fp-text-body (≤ 60 ch; ≤ 2 paragraphs, 24 between)
cols 6–12  vignette stage panel 16:9 (radius 24), top aligned to the eyebrow's cap height,
           OR dropped by 1 standard gap (WEBSITE Safety: "10% lower") — never a raw %
phone: eyebrow → 16 → headline → 24 → body → 40 → panel (4 cols, 16:9)
```

- The section top is a register from §2.2. It's ≥ 2 × the headline-to-body gap of 24.
- `Section` (no border) owns the padding. Headline and Text carry none. Never wrap a section in a Card.
- The text-column split follows §1.1 (5+7, 7+5, 4+8, 8+4…), never 6+6.

### 7.3 Step group ("How it works", four 1:1 vignettes)

- **Four equal tiles in a row are banned** (§1.1).
- **Legal at lg+:**
  - **(a)** step 2 (the thumb, the product's moment) at 6 columns, with steps 1, 3 and 4 at 3 columns each, in a 6 / 3+3 over 3 bento;
  - **(b)** a stepped diagonal: each tile 4 columns, each offset one row-gap lower than the last (gap 24).
- Each tile is a stage with radius 24, 1:1. The caption sits below it: step number (Data 500, `--text-code`) → 8 → title `--fp-text-title` → 8 → one sentence `--fp-text-body` ≤ 40 ch.
- **Phone:** a single column in step order, tiles 4 columns wide, 40 between steps.

### 7.4 Glass panel (website overlays on stills, app)

| Variant | Use | Radius | Padding | Children |
|---|---|---|---|---|
| **Text panel** | fee breakdown, SMS explainer, disclaimer callout | 24 (`--radius-container`) | 24 (`Card padding={6}`) | text only. No rounded children. |
| **Holder panel** | holds a rounded thing (a receipt, the app screen, an amount display) | 24 | **8** (`Card padding={2}`) | child radius **16** (`--radius-element`) |

- **Inside a text panel:** title (`--fp-text-title` or `--text-heading-3`) → 8 → body → 24 → next group. Measure ≤ 40 ch. Max inline size 480 (structural).
- At most 2 sizes and 2 weights inside (excluding an amount component, which brings its own 3 sizes).
- Shortest side ≥ 96 or no glass. One glass panel per viewport. Never over a playing vignette (§5.4).

### 7.5 POS keypad (terminal, portrait, coarse pointer)

Vertical budget at the worst-case 360 × 640 dp, which must fit without scrolling:

| Block | Height | Gap after | Astryx |
|---|---|---|---|
| Status bar (system) | 24 | 0 | n/a |
| Header: store name + Online/Offline StatusDot | 56 | 0 | `--size-element-md` (coarse) |
| Amount block, right-aligned on the content line | 96 | 24 | label + `--fp-text-amount` |
| Preset chips ×4: PKR 80, 150, 180, 500 | 48 | 16 | pills, `gap={2}` |
| Keypad 3 × 4: 1–9, then Clear · 0 · Backspace | 4 × 64 + 3 × 8 = **280** | 16 | Button `size="lg"`, `Grid columns={3} gap={2}` |
| Charge / Await Thumb Tap | 64 | 16 (bottom) | Button `size="lg"`, full width |
| **Total** | **640** | | |

- **Amount block (96):** 8 top + "Amount" label `--text-supporting` (20 box) + 4 (half-step, rule a: inside one field) + the amount line (≤ 64 box). The amount's clamp may grow on taller or wider screens. On 360 × 640 its line box is capped at 64. The amount is right-aligned so the newest digit stays in one place under the cashier's eye, like a till display.
- **Keys:**
  - width (360 − 2×16 − 2×8) / 3 = **104**, height **64**, radius **16**, flat fill (no glass, since a key is < 96 on its short side);
  - digit `--fp-text-key` 28, Data 500;
  - Clear and Backspace use 24 px icons with an accessible name.
- **Presets:** each chip is (328 − 3×8) / 4 = **76** wide by 48 tall, label Text 500 at 14. They must fit as 4 across. Horizontal scroll is banned.
- **Charge** is the **only Accent use on the screen**. Every other control is neutral.
- **If the available height is < 680** after the system gesture inset, keys drop to 56 (`--size-element-md`) and the keypad becomes 248. Nothing else shrinks.
- **The result banner replaces the keypad area:**
  - a sheet with the top corners at radius 32 (`--radius-page`), padding 24;
  - a 48 px outcome icon → 16 → banner `--fp-text-banner` 24/32 Text 600 UPPERCASE +0.04 em, ≤ 4 lines (SPEC copy is long);
  - → 24 → amount at the result-sheet size (§3.7) → 24 → "New sale" button, 64 tall;
  - no shopper name on declines, and no shopper balance ever.
- The keypad sits directly on the Surface. If it's ever placed in a panel, that panel is a holder panel (8 inset, radius 24) around the 16 px keys.

### 7.6 Ledger row (View B, merchant ledger; also the app view placed on the For-shops vignette)

| Property | Value |
|---|---|
| Container | `Section padding={0}` around an Astryx `Table`. The Table cells own the content line. |
| Density | `balanced`. Row height **48** (fine) and **56** (coarse). Header row 40. |
| Cell inset | 16 horizontal (Table default, verify). 12 vertical in compact mode only (half-step rule b). |
| Columns, in order | Time · Shopper · Gross · MDR fee · Net to Allied Bank · Raast ref · Status (SPEC §5 View B) |
| Time | `HH:MM`, 24 h, Asia/Karachi, Data 500 |
| Shopper | first name + initial ("Ayesha K."), Text 400, settled rows only. Declines show an em dash "—" in ink-2. |
| Gross, fee, net | right-aligned, Data 500 16, **one size**, 2 decimals, no "PKR" per cell (it goes in the column header: "Gross (PKR)"). The fee is `−0.81` with U+2212 in ink-2. |
| Raast ref | Data, `slashed-zero`, truncated in the middle to 4 + … + 4, full value in the accessible name and a tooltip |
| Status | `StatusDot` + label (`SETTLED`, `DECLINED`, `OFFLINE_CASH`, `REVERSED`), centred. Not Badge (Badge is for counts only). |
| Dividers | 1 px `--color-border` between rows. No zebra, no vertical rules, no outer box. |
| Hover | `--color-overlay-hover` bleeds across the full row |
| Header | sticky, `--text-supporting` Text 500 ink-2, sentence case |
| Below `md` | each row becomes a 2-line `List` item, 64 tall: line 1 is shopper (or —) left and net right; line 2 is time · status left and fee right, in `--text-supporting`. 16 inset, dividers between. |
| On the drawn phone (For shops) | at most **3 rows** visible. Rendered text must be ≥ 12 CSS px after the homography (WEBSITE §4 "For shops"). Below that, show only the amount column. |

---

## 8. Illustration constraints (vignette pipeline)

The pipeline is set by `ART-PROMPTS.md` and `WEBSITE.md` §5.2:
1. The user generates **MP4 loops** in Google Flow or Higgsfield, plus a key frame PNG.
2. We take every 2nd frame (24 → 12 fps).
3. We dedupe holds, cut out the flat white background, correct colour to the palette, and pack **one WebP atlas per vignette** with a manifest.

This section sets the sizes, scale, line and safe-area rules that pipeline must meet. It doesn't define style or content: `ART-PROMPTS.md` owns the style block, and `WEBSITE.md` owns the section plan.

### 8.1 Source formats (what the user delivers)

| Format | Delivered as | Duration | Use |
|---|---|---|---|
| **16:9** | MP4, **1920 × 1080**, 24 fps (25 or 30 tolerated, §8.7 step 1), H.264 or H.265 at high bitrate | 6 s (hero, sections, footer), 4 s (Problem 3a–3c) | section vignettes |
| **1:1** | MP4, **1080 × 1080**, 24 fps | 4 s | How it works steps 1–4 |
| Key frame | PNG, the same dimensions as its video | n/a | start frame for generation, and the reference for acceptance |
| Live sheets (eyes, thumb press) | PNG, 1:1, **1080 × 1080 per stage**. See below. | n/a | code-driven interactions |

**Rules:**
- **Locked camera, flat white background and a seamless loop**, as ART-PROMPTS requires. Reject anything else.
- **Resolution floor:**
  - a video delivered below 1920 × 1080 (or 1080 × 1080) is usable for the **mobile @1x export only**;
  - desktop @2x needs the full source;
  - **upscaling line art with a generic upscaler is banned**, because it smears the ink lines. Re-generate at full size instead.
- **Live sheets need full-size stages.**
  - ART-PROMPTS asks for the 6 thumb stages "in a single row" and the eyes as a 3×4 grid in one image. In one 1080 frame that's 180 px per thumb stage and 270 × 360 per head, which is too small for the hero's hold interaction.
  - **Each thumb stage must be generated as its own 1:1 image at 1080 × 1080**, or taken from a 1:1 press video.
  - The eye sheet may stay a 3×4 grid, but only if it's generated at ≥ 2160 px wide. Otherwise, generate each eye direction separately. (Flagged to the user, §Open questions.)

### 8.2 Export sizes (@1x / @2x)

Display sizes come from `WEBSITE.md` §5.3. **@2x is desktop (DPR ≥ 1.5). @1x is mobile and DPR 1.**

| Vignette | Max CSS display size | @2x (desktop) | @1x (mobile) | Downscale from source |
|---|---|---|---|---|
| Hero (16:9) | 1104 × 621 (stage cols 1–12 at `xl`) | **1920 × 1080** (native; never larger) | **960 × 540** | 1.0 / 0.5 |
| Section 16:9 (Problem, For shops, Safety, Every phone, Footer) | ≤ 800 × 450 | **1600 × 900** | **800 × 450** | 0.833 / 0.417 |
| Step 1:1 | ≤ 450 × 450 | **900 × 900** | **600 × 600** | 0.833 / 0.556 |
| Thumb-press stages (1:1) | ≤ 320 × 320 | **640 × 640** | **400 × 400** | from 1080 |
| Eye cells | head ≤ 240 CSS wide | per cell: 2 × CSS size | 1 × | from the sheet |

**Rules:**
- **A stage never displays wider than its @2x export ÷ 2.** The hero is the one exception: at 1104 CSS on a DPR-2 screen, it upscales the 1920 frame by 1.15×, which is accepted because 1920 is the source ceiling.
  - Any other stage that would exceed its cap uses the next-larger export, never a CSS upscale past 1.15×.
- **Exact aspect, integer dimensions:**
  - 16:9 widths are multiples of 16 (so heights are integers), and 1:1 widths are multiples of 4;
  - the stage uses CSS `aspect-ratio: 16 / 9` or `1`, so the reserved box is exact and CLS is 0.
- **Only downscale.** Resample with Lanczos-3 on linear light, then sharpen at 0.3 px radius to keep ink edges crisp at 0.417×.

### 8.3 Character scale (in the frame and against type)

Generators set scale per prompt, so these are **acceptance rules on the key frame**. Every frame of the loop must also pass them.

| Shot (per ART-PROMPTS) | Standing adult height | Head height (crown to chin) | Where |
|---|---|---|---|
| Medium shot (Hero, For shops, Safety, Every phone) | 62–75% of frame height | **9–11% of frame height** | 16:9 |
| Wide shot (Footer) | 40–55% | 6–8% | 16:9 |
| Close-up (steps 1–4, thumb stages) | n/a | the hand or thumb fills 35–60% of the frame width | 1:1 |
| Problem loops 3a–3c | 55–75% | 8–11% | 16:9 |

**Consistency:**
- In any medium shot, the same character's head height varies by **≤ ±15%** between sections, so the cast doesn't change size from section to section.
- Bilal reads as younger by proportion (he's thin, with a larger head ratio), not by being drawn smaller.

**Against type** (rendered CSS px, measured at 1440 and 390 viewports):
- **Faces must read.**
  - Rendered head height must be **≥ 40 CSS px on desktop and ≥ 28 on phone**.
  - A 16:9 medium shot at 390 wide (≈ 342 CSS stage) gives a head of ≈ 19 px, which fails.
  - So **on phones, medium-shot vignettes render at ≥ 4 columns and full width.** If the head is still < 28, the section shows a **phone crop**: a 4:5 window centred on the action-safe area, cut from the @2x frame by the player's source rect. It costs no extra art.
- **Type doesn't dwarf the cast.**
  - The hero H1's cap height must be ≤ 1.5 × the rendered head height of the hero characters.
  - At 1440 that's a head of ≈ 64 px and a cap of ≤ 96 px, so `--fp-text-hero` maxes at 128 px with a 0.72 cap ratio, which is why it's 128, not 144.
  - Section headline caps are 0.75–1.25 × the adjacent vignette's rendered head height.
- Step captions next to 1:1 close-ups use `--fp-text-title`, never display sizes.

### 8.4 Line weight

The art is "clean confident ink linework of even weight in near-black `#1C1C1F`, slightly rounded line ends" (ART-PROMPTS style block, which owns the style). These rules make "even weight" measurable and tie it to the UI:

- **Rendered contour: 1.5–3 CSS px at every display size** in the table in §8.2. The hero (1920 shown at ~1104 CSS) and close-ups (1:1, thumb) may reach 4. That sits beside UI icon strokes (2 px) and the logo mark as one family of line.
- **Phone check:** an uncropped 16:9 frame at a 342 CSS stage renders source lines at only 0.7–1.25 px, which fails. The 4:5 phone crop (§8.3) renders them at 1.6–2.8 px. This is a second reason medium shots use the phone crop below `md`.
- **Source check:**
  - at 1920-wide source, a medium shot's main contour should measure **4–7 px**. After downscaling, that gives 1.7–2.9 px at 800 CSS (the 1600 @2x frame shown at 2×);
  - a source contour outside 3–9 px means the frame is out of family. Reject it.
- **Even weight:** within one figure, the thickest and thinnest outer contour differ by ≤ 2×. A sketchy, tapered or doubled line is an ART-PROMPTS reject.
- **Line colour:** after the colour correction step, every line pixel snaps to Ink `#1C1C1F` (ΔE00 ≤ 3 before snapping, else reject). Never `#000`.
- **Line ends:** slightly rounded, per the style block. UI icons keep their own set's caps (§4.5). Don't redraw either to match the other.
- **Fills:** flat, one shadow tone per colour, and only the ART-PROMPTS palette (`TYPE-AND-COLOR.md` illustration palette). No gradients, glow, blur or bloom survive processing.

### 8.5 Safe areas for text over vignettes

**Default: text sits beside or above a vignette, not on it.** Text overlays a vignette only in the hero's top band, which ART-PROMPTS designs for: "generous empty white space above for a headline".

**16:9 frame zones** (percent of the frame, so they hold at every export size):

| Zone | x | y | Contents |
|---|---|---|---|
| **Text-safe band** (hero only) | 4–96% | **0–28%** | no character, prop or motion pixel in **any** frame of the loop, including a raised thumb, a lifted loaf or the sensor glow |
| **Action-safe** | 10–90% | 30–96% | every face, hand, the scanner, every screen and the thumb |
| **Phone crop window** (4:5) | centred on the action-safe area's centroid | full height | must contain all action-safe content of the loop. Otherwise the vignette isn't phone-croppable and renders full width instead. |
| **Bleed** | outside action-safe | | may be clipped by the stage's radius or cut corner. **Only below the counter or floor line** may the stage edge crop a figure. Heads and hands are never cropped. |

**1:1 frame zones:** **no text overlay ever.** Action-safe is the central 84%, which the stage's 24 radius and the 8-inset rule never touch.

**The text-safe band carries real contrast:**
- It's the stage colour (from `TYPE-AND-COLOR.md`) after background removal.
- H1 and eyebrow contrast is measured against it: ≥ 4.5:1 for the eyebrow, ≥ 3:1 for the ≥ 24 px H1. Aim for 4.5:1 regardless.

**Blank screens filled by code** (the For-shops phone, the Problem 3b screenshot, Bilal's SMS screen):
- The screen quad must be ≥ 120 CSS px tall when rendered, or the code-placed content shows a single glyph (the amount or a tick), not text.
- Corners come from the manifest (WEBSITE §5.2).

**Never** put text, captions or the disclaimer over a playing vignette at < `md`. The phone layout stacks: text, then stage.

### 8.6 Layer and file naming

A generated vignette is **one flattened character layer per frame**, plus a few separable layers.

| Layer | What | Made by | Blend |
|---|---|---|---|
| `stage` | the panel shape and colour | CSS from tokens (no file) | n/a |
| `shadow` | the contact shadow under feet and props, **extracted before the white is removed** (the grey that background removal would delete) | processing | multiply, static per vignette unless the loop visibly detaches it |
| `frames` | cut-out character and prop frames, packed into the atlas | processing | normal |
| `ui` | code-placed screen content (homography from the manifest corners) | code | normal |
| `light` | sensor glow and scene light | WebGL (`MOTION-3D.md`) or the drawn glow kept in the frames | screen |
| `key` | the poster and reduced-motion still | processing (§8.7 step 8) | n/a |

**Vignette IDs** (kebab-case, section first): `hero-tap`, `problem-cash`, `problem-screenshot`, `problem-nophone`, `step-1-amount`, `step-2-thumb`, `step-3-check`, `step-4-confirm`, `shops-closing`, `safety-lock`, `phone-sms`, `footer-shutter`, `live-thumb`, `live-eyes-rasheed`.

**Source files** (kept out of `public/`, in a git-ignored `art-source/`, since MP4s don't belong in the repo):

```
art-source/{id}/{id}_src.mp4          the delivered video
art-source/{id}/{id}_key-ref.png      the delivered key frame (reference only, never shipped)
```

**Shipped files:**

```
public/art/{id}/{id}@2x.webp          desktop atlas page (or {id}-p1@2x.webp, -p2… if > 1 page)
public/art/{id}/{id}@1x.webp          mobile atlas page(s)
public/art/{id}/{id}-shadow@2x.webp   contact shadow (and @1x)
public/art/{id}/{id}-key@2x.avif      key still, desktop (and -key@1x.avif)
public/art/{id}/{id}-key@2x.webp      key still fallback (and @1x)
public/art/{id}/{id}.json             manifest
```

**Manifest fields:**
- the source rect per frame `f001…`;
- the trim offset of each frame against the full frame;
- the timing track (frame id + hold ticks at 12 fps);
- the loop point;
- the base frame id;
- `screenQuad` per frame where needed;
- the phone crop rect;
- the text-safe band (as fractions);
- the measured head height (as a fraction).

Positions in code come from the manifest only. Nothing is hand-tuned in components.

### 8.7 Processing and export specs

**Steps:**
1. **Extract at 12 fps.**
   - From 24 fps, take frames 0, 2, 4…
   - From 25 or 30 fps, pick the frame nearest each 1/12 s timestamp. Don't take every 2nd frame, which would drift off the `--motion-frame` grid.
2. **Close the loop.** The seamless last frame duplicates frame 0. Drop it, so the seam doesn't double-hold.
3. **Dedupe holds.** Frames whose pixel difference is under the threshold (WEBSITE §5.2) collapse into one frame plus a hold count.
4. **Base plus delta.**
   - Store one **base frame** (the full cut-out at frame 0).
   - Store every other frame as a **delta cell**: only the union bounding box of what changes across the loop, rounded out to multiples of 16 px, at a fixed offset.
   - All deltas of a vignette share **one canvas size and one offset**. Never trim per frame, because per-frame trims make characters jitter.
   - This is what keeps decoded memory inside budget (below).
5. **Cut out:**
   - remove the white to alpha with a **1 px defringe** (no white halo on a dark stage);
   - pull the grey contact shadow into the `shadow` layer first;
   - check edges against the darkest stage colour in `TYPE-AND-COLOR.md`.
6. **Correct colour.** Snap fills and lines to the ART-PROMPTS palette (ΔE00 ≤ 6 snaps; larger drift is a reject). Output is sRGB, 8 bit, metadata stripped.
7. **Pack the atlas:**
   - **pages ≤ 4096 × 2048** (≤ 32 MB decoded, safe for `createImageBitmap` on mid-range Android);
   - cells on a 16 px grid with 16 px padding (no bleed between cells under filtering);
   - **≤ 2 pages per vignette at @2x and 1 at @1x.**
8. **Key still** = the **processed frame 0** (base frame composited with its shadow on the stage colour, or with alpha if the stage is CSS), not the delivered PNG. The poster-to-canvas swap must land on the identical drawing (MOTION §4.2). The delivered PNG is only a generation reference.

**Formats and budgets** (per-frame weights match WEBSITE §5.3):

| Asset | Format | @2x | @1x |
|---|---|---|---|
| Atlas pages | **WebP**, alpha, q 80 (lossless only if lossy q 90 still bands) | hero ≤ 1.1 MB total; 16:9 section ≤ 900 KB; 1:1 step ≤ 450 KB | ≈ 35–40% of @2x |
| Contact shadow | WebP, alpha, single colour | ≤ 20 KB | ≤ 10 KB |
| Key still | **AVIF** q 60 + WebP q 80 fallback, in `<picture>`, with explicit `width`/`height` | ≤ 70 KB | ≤ 35 KB |
| Thumb stages ×6 | WebP, alpha, one atlas | ≤ 180 KB | ≤ 70 KB |
| Eye cells ×10 | WebP, alpha, one atlas | ≤ 60 KB | ≤ 25 KB |

**Decoded memory** (RGBA = w × h × 4):
- **≤ 48 MB per vignette at @2x and ≤ 16 MB at @1x.**
- **≤ 128 MB total live** (WEBSITE closes bitmaps beyond ±2 viewports).
- Check: hero base 1920 × 1080 (8.3 MB) + 29 deltas of a 640 × 640 change box (1.6 MB each, 47.5 MB) ≈ 56 MB. That's over the cap, so the hero's change box must be ≤ 576 × 576, or the hero splits into two loops. The processing script reports this number per vignette and fails the build above the cap.

**Delivery:**
- **Self-hosted only** (CSP `img-src 'self' data: blob:`). No image CDN, and no `next/image` optimiser rewriting atlases (it would re-encode the alpha and change dimensions).
- The key still may use `next/image` with `unoptimized`, or a plain `<picture>`. Check `npx astryx search image` first, and record the reason for any raw media element in a comment.
- **Reduced motion, `saveData` and no JS:** key stills only (WEBSITE §5.3–5.4). The layout is identical either way, since the stage box is fixed by `aspect-ratio`.

---

## 9. New tokens to add (FingerPay theme, `localTokens` or overrides)

| Token | Value | Kind | Section |
|---|---|---|---|
| `--radius-inner` / `-element` / `-container` / `-page` / `-chat` | 8 / 16 / 24 / 32 / 24 px | override | §5.1 |
| `--size-element-sm/md/lg` | 32 / 40 / 48. Coarse: 48 / 56 / 64. | override + adaptation | §6 |
| `--focus-outline-offset` | 4 px | override | §6 |
| `--shadow-low/med/high` | two-layer Ink values in §5.3 | override | §5.3 |
| `--fp-space-16/24/32/40` | 64 / 96 / 128 / 160 px | new local | §2.1 |
| `--fp-content-max` | 1408 px | new local | §1.1 |
| `--fp-text-hero/display/title/lead/body/caption/eyebrow` | fluid clamps in §3.3, each with paired `-leading` and `-tracking` | new local | §3.3 |
| `--fp-text-amount` / `-key` / `-banner` / `-stat` | clamp (≤ 64 box at 360 × 640) / 28 / 24 / 32, with leadings | new local | §3.3 |
| `--fp-glass-blur` | 24 px | new local | §5.4 |
| `Card variant:glass` | custom variant (fill, blur, top highlight, `--shadow-med`) | new component variant | §5.4 |
| `--font-family-code` | Martian Mono stack (via `typography.code`) | theme typography | §3.1 |
| `--font-family-body` / `-heading` | Switzer / Cabinet Grotesk (heading used on the website only) | theme typography | §3.1 |

Everything else maps to existing Astryx tokens, as named inline above.

---

## 10. Defect checklist (review every component and every vignette against this)

**Spacing and grid**
- [ ] Every margin, padding, gap and size is a legal value from §2.1. Grep for `spacing-0-5|spacing-1-5|spacing-5|spacing-7|spacing-9|spacing-11|gap={3}|gap={5}`.
- [ ] Any half-step (4 or 12) matches rule §2.2 a–d, and a (d) case has its comment.
- [ ] No container whose only child is another padded container (nested padding).
- [ ] Section rhythm uses registers, with no register three times in a row. Headings have ≥ 2× space above versus below.
- [ ] No 6+6 text and vignette split. No 3- or 4-up equal tiles (the steps included). No two consecutive sections with the same split or side.
- [ ] `100dvh`, never `100vh`. No horizontal overflow at 320, 375, 768, 1024 or 1440.
- [ ] Raw px appear only as structural widths (256, 384, 480, 640, 960, 1408) or inside theme token values.

**Type**
- [ ] ≤ 2 families per component and per surface (no Cabinet Grotesk in the app). ≤ 2 weights and ≤ 3 sizes per component.
- [ ] Mono only on amounts, IDs, timers and timestamps. Never on buttons, banners, headings or prose figures.
- [ ] Tracking matches §3.5 for its size, case and face. Nothing tighter than −0.025 em (−0.02 for Data).
- [ ] Body measure 45–65 ch, lead 34–48 ch, panel ≤ 40 ch. Headings balanced, with no single-word last line.
- [ ] "PKR" joined to its number with U+00A0. Minus is U+2212. Masked IDs are `•••• 1234` with a thin space.
- [ ] Amounts: from the decimal string (no `parseFloat`/`Number`), 2 decimals in components and tables, small decimals only in one-amount views, shared baseline, reserved width.
- [ ] The faces' measured metrics are recorded and inside §3.2, and Data caps are within ±4% of Text caps (`size-adjust`).

**Alignment**
- [ ] One content line per region. Only hover and selected backgrounds cross it.
- [ ] Display headings optically hung by the measured side bearing.
- [ ] Adjacent columns align by first baseline. Numbers right, text left, status centred.
- [ ] Icon box = adjacent line box, centred on cap height.
- [ ] Vignette floor or counter line aligns with the text block's last baseline or the stage's bottom edge.

**Radius, depth, material**
- [ ] Every nested corner satisfies inner = outer − inset (32 → 24 → 16 → 8 with 8 insets). No child radius ≥ its parent's. Cut corners are 24 or 32 chamfers.
- [ ] Text panels (24 inset) contain no rounded children.
- [ ] One raised level per view: no glass on glass, no Card in Card, no CSS shadow on art, no glass over a playing vignette.
- [ ] Glass only on faces ≥ 96 px. Text on glass is ≥ 4.5:1 against the worst pixel behind it.
- [ ] Shadows are two-layer Ink occlusion. No coloured glow anywhere in the UI.
- [ ] No border at rest unless selected. Focus ring complete, 2 px, offset 4, Accent.
- [ ] One Accent use per view (the terminal: Charge only).

**Vignettes**
- [ ] The source is 1920 × 1080 or 1080 × 1080, a locked camera, a flat white background and a seamless loop. Nothing is upscaled.
- [ ] Live sheets: each thumb stage is a full 1080 × 1080 (or a ≥ 2160 eye sheet).
- [ ] Exports match §8.2 (@2x/@1x sizes, exact aspect). No stage displays past 1.15× its export.
- [ ] Head height is within §8.3 for the shot, ±15% across sections. Rendered head ≥ 40 px desktop, ≥ 28 phone (or the phone crop is used).
- [ ] Hero H1 cap ≤ 1.5 × the rendered head height.
- [ ] Rendered contour is 1.5–3 CSS px (hero and close-ups ≤ 4; phone medium shots via the 4:5 crop), even weight ≤ 2× variation, lines snapped to `#1C1C1F`.
- [ ] Nothing enters the hero text-safe band (top 28%) in any frame. All story content is in action-safe. Only below-floor content is cropped.
- [ ] No text over a vignette below `md`. Code-filled screens are ≥ 120 CSS px tall or show one glyph.
- [ ] 12 fps sampling is on the 1/12 s grid. The loop's duplicate last frame is dropped. Holds are deduped.
- [ ] Base plus delta packing: deltas share one canvas and offset (no jitter when stepping).
- [ ] Atlas pages ≤ 4096 × 2048, ≤ 2 per vignette. Decoded ≤ 48 MB per vignette (@2x), ≤ 128 MB live.
- [ ] File names and manifest follow §8.6. Positions come from the manifest.
- [ ] The key still is the processed frame 0 (an identical drawing on swap), AVIF + WebP, with explicit dimensions.
- [ ] Weights are inside §8.7 budgets. The first view meets WEBSITE §5.3.

**Tokens and themes**
- [ ] Every token used is verified to render, either in `editor show --png` or computed style. None are merely defined.
- [ ] Theme values are defined for both light and dark (no token living only in one mode branch). No `:root` overrides.
- [ ] The six unthemed surfaces are set: selection, caret, scrollbar, focus ring, link underline (offset 4, thickness 1) and tabular numbers.

**Privacy (spatial consequences)**
- [ ] Declines show "—" in the shopper slot, never a name. No balance field exists in any merchant layout. Phone and CNIC are last 4 only.

---

## 11. Disagreements with sibling docs (for `DESIGN.md`)

| Topic | This doc | Other doc | Suggested resolution |
|---|---|---|---|
| Family count | skill limit 2. Accepted 3 with per-surface ≤ 2 (§3.1). | TYPE-AND-COLOR: 3 families | accept 3 under the §3.1 scoping |
| Cabinet Grotesk weights | 700 + 800 only | TYPE-AND-COLOR: 700, 800, 900 | cut 900 unless one named use |
| Hero size max | 128 px (character-scale rule, §8.3) | WEBSITE/TYPE-AND-COLOR may imply larger | 128 |
| Minimum touch row | 48 | WEBSITE §4.0 mobile nav rows 44 | 48 |
| Hero frame size | 1920 × 1080 @2x (source native) | WEBSITE §5.3: all 16:9 at 1600 × 900 | the hero panel is ~1100 CSS wide, so 1600 would upscale 1.38×. Use 1920 for the hero only. |
| Atlas shape | ≤ 4096 × 2048 pages, base + delta, ≤ 48 MB decoded | WEBSITE §5.2: "one WebP atlas per vignette" | add base + delta and the page limit. Full frames would decode to ~140–250 MB per 16:9 vignette. |
| Live sheet sizes | each thumb stage 1080², eye sheet ≥ 2160 wide | ART-PROMPTS §4: one row / one 3×4 image | update the prompt instructions |

---

## Open questions for the user

1. **Thumb-press and eye art:** can you generate the six thumb stages as six separate 1:1 images (or one 1:1 press video), and Rasheed's eyes either separately or as a sheet at ≥ 2160 px wide? One 1080 image holding all six stages leaves each at 180 px, which is too small for the hero's press-and-hold.
2. **Phone side margin:** 24 px (airier, the recommendation) or 16 px (more room for vignettes) on the website between 360 and 639 px?
3. **Terminal amount alignment:** right-aligned like a till display (recommended, since the newest digit stays put) or centred like a wallet balance (closer to your reference reel)?
4. **Phone crops:** OK for medium-shot vignettes to show a tighter 4:5 crop around the action on phones, so faces stay readable? This costs no extra art.
