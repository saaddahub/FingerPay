# FingerPay website: motion (v4)

> **Owns:** every animation on the page: the dive, the three words, the glass physics, the dialog, the ledger, and their reduced-motion versions. Timings, curves, springs, triggers, formulas.
> **Doesn't own:** what's on screen (`PAGE.md`, referenced as **P§**), tokens other than motion (`SYSTEM.md`), file layout (`BUILD.md`).
> Libraries: **Motion** (`motion` v14, already installed) and **Lenis** (already installed). No GSAP, no three.js. One hand-written WebGL shader (the orb) and one Canvas 2D layer (the ridge camera).

---

## 1. The motion language

Five rules. Every animation below follows them; anything that breaks one is wrong.

1. **Scroll is the camera; time is the voice.** Scroll drives *where we are* (the dive, the slit). Time drives *what is said* (words and messages land with their own timing once a threshold is crossed). A word never scrubs in letter by letter under the wheel. This is the santalarch feel: the camera stops, then the word arrives.
2. **Constant-rate zoom.** All zooms interpolate scale in **log space** (`scale = a · (b/a)^t`). Linear scale interpolation makes a zoom start slow and end violently; log space makes it feel like a camera moving at steady speed. This one formula is most of what makes the dive feel expensive.
3. **No seams.** Every hand-off between layers happens at matched size and position. If a viewer can see where one layer becomes another, it's a bug.
4. **Money never bounces.** Anything showing an amount, a fee, a time or a status uses zero-bounce springs or ease-out tweens. Only physical objects (glass, the thumb press, people's chat bubbles) may overshoot, and only a little.
5. **Every motion has a still version** (§9), and nothing important exists only in motion.

### 1.1 Curves, durations, springs (tokens)

These become `src/site/motion.ts` constants and CSS custom properties.

| Token | Value | Source / use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | portfolio `--ease-standard`. Default for entrances |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | portfolio `--ease-snappy`. Scrubbed transitions |
| `--ease-expo-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | portfolio music card. Word and line reveals |
| `--ease-in` | `cubic-bezier(0.55, 0, 1, 0.45)` | exits (things leave faster than they arrive) |
| `--d-press` | `100ms` | Apple: feedback on press, instantly |
| `--d-fast` | `200ms` | small fades |
| `--d-base` | `450ms` | glass materialise, nav theme |
| `--d-slow` | `800ms` | hairline draws |
| `--d-reveal` | `900ms` | mega word reveal |
| `--d-exit` | `420ms` | mega word exit |

| Spring | Motion config | Apple equivalent | Use |
|---|---|---|---|
| `ui` | `{ type: "spring", bounce: 0, visualDuration: 0.4 }` | damping 1.0, response 0.4 | default for anything that moves and shows information |
| `sheet` | `{ type: "spring", bounce: 0.15, visualDuration: 0.35 }` | damping ≈ 0.85, response 0.35 | mobile menu sheet, people's chat bubbles |
| `release` | `{ type: "spring", bounce: 0.2, visualDuration: 0.3 }` | damping 0.8, response 0.3 | glass returning after a press |
| `magnetic` | `{ stiffness: 150, damping: 15, mass: 0.1 }` | — | **portfolio `SocialMenu.jsx`, unchanged** |
| `tilt` | `{ stiffness: 300, damping: 30 }` | — | **portfolio `TiltCard.jsx`, unchanged** |

Staggers: letters in 30 ms, letters out 15 ms, words 60 ms, paragraph lines 70 ms, ledger rows 70 ms.

---

## 2. The Inside stage (the dive + the three words)

**The one signature moment.** One sticky stage: `section.stage` is `100svh + 520vh + 90svh` tall (the 520vh is 400vh on mobile and 300vh in phone landscape); its child frame is `position: sticky; top: 0; height: 100svh; overflow: hidden`. Motion's `scroll()` gives the stage's overall progress; the first 520vh of scroll becomes `p ∈ [0, 1]` (the dive and the words) and the last 90svh becomes `q` (the slit, §5.3), both in the same frame so the hairline never moves. Lenis smooths the scroll.

### 2.1 Layers (bottom to top, all inside `stage__frame`)

| z | Layer | What it is | Animated by |
|---|---|---|---|
| 0 | `ground` | Full-bleed `--paper`; switches to `--ink` at `p = 0.46` (invisible switch: the viewport is already ink) | `p` threshold |
| 1 | `plate` | The app frame image + the live screen DOM (store name, amount, prompt). The screen's own coin is `visibility: hidden`: layer 2 draws it | CSS transform from the camera |
| 2 | `ridges` | **Canvas 2D**, full viewport, DPR capped at 2. Draws the coin (ring + 6 ridges) every frame from the generator's geometry with the camera transform. Vector-crisp at any zoom | the camera |
| 3 | `hairlines` | Crosshair + column guides (SVG, `--night-rule`) | time, after `p = 0.46` |
| 4 | `hero-type` | "Pay with" / "nothing." / lead / scroll cue | `p` (settle) |
| 5 | `words` | The three `h3` words, paragraphs, index, and each word's visual | time, on thresholds |

The coin is **always** the canvas, even when the page is sitting still in the hero. That removes the most dangerous seam (raster coin → vector coin) entirely. The canvas positions the coin over the screen's hidden coin placeholder, measured with `getBoundingClientRect()` on load and on resize (never per frame).

### 2.2 Segment map

| `p` | Segment | Duration (desktop scroll) | Driven by |
|---|---|---|---|
| 0.000 – 0.040 | **Settle** | ≈ 21vh | scrub |
| 0.040 – 0.460 | **Dive** (one continuous camera move) | ≈ 218vh | scrub |
| 0.460 – 0.500 | **Inside**: hairlines draw | ≈ 21vh (trigger at 0.46) | time |
| 0.500 – 0.660 | **Instant.** | ≈ 83vh (trigger at 0.50) | time |
| 0.660 – 0.830 | **Private.** | ≈ 88vh (trigger at 0.66) | time |
| 0.830 – 0.970 | **Certain.** | ≈ 73vh (trigger at 0.83) | time |
| 0.970 – 1.000 | **Release**: everything but the horizontal hairline fades | ≈ 16vh | scrub |

Thresholds use ±0.008 hysteresis so a visitor hovering on a boundary doesn't make words flicker.

### 2.3 Settle (`p` 0 → 0.04)

Let `s = p / 0.04`, eased with `--ease-in-out`.
- "Pay with": `translateX(−6vw · s)`, `opacity: 1 − s`.
- "nothing.": `translateX(+6vw · s)`, `opacity: 1 − s`. The sentence parts as if making way for the camera.
- Lead and scroll cue: `opacity: 1 − s`, `translateY(12px · s)`.
- **The press:** when `p` first crosses 0.02 going down, the coin presses once: scale 1 → 0.94 → 1 about its centre over 360 ms (down 120 ms `--ease-out`, up with `release` spring), drawn by the canvas as an extra scale factor. The visitor's scroll is the thumb. Doesn't fire going up.

### 2.4 The dive (`p` 0.04 → 0.46)

**The camera** is a 2D similarity transform: zoom `k` (pixels per coin unit) about an aim point.

**The aim point** is a point in the coin's own coordinates (viewBox units, origin at the coin centre, `SYSTEM.md` §7):
- **Default (ink coin on a light screen): the peak of ridge 5** (second from the top). Base y = −5.1, height 8.0, so the peak is at **(1.2, −13.1)**. Ridge 6's peak is clipped by the ring, which is why we use ridge 5. We fly into its ink, so the viewport ends black.
- **If the client's screen is dark** (a light coin on a dark screen): aim at **the gap between ridges 4 and 5 at x = 1.2, point (1.2, −10.15)** (ridge 4 peaks at y −7.2, ridge 5 at −13.1, so the gap is 3.8 units of dark). We fly into the dark gap, so the viewport still ends black. `BUILD.md` §5 makes this a config value.

**Formulas.** Let `u = clamp((p − 0.04) / 0.42, 0, 1)`.

```
e   = 0.5 − 0.5·cos(π·u)                  // ease-in-out-sine: soft start, soft landing,
                                          // near-constant rate in the middle
k0  = coinDiameterPx / 48                 // px per unit when sitting in the hero
kEnd= endZoom(bandUnits, curvature, w, h)  // bandUnits = 2.1 (ridge stroke) or 3.8 (gap); see below
k   = k0 · (kEnd / k0) ^ e                // LOG-SPACE zoom (rule 2)

Q0  = aim point's screen position at p = 0 (from the measured coin rect)
V   = viewport centre
et  = easeInOutSine(clamp(u / 0.35, 0, 1))// centre the aim point in the first 35 % …
Q   = Q0 + (V − Q0) · et                  // … then dive straight in

canvas: ctx.setTransform(dpr·k, 0, 0, dpr·k, dpr·(Q.x − k·aim.x), dpr·(Q.y − k·aim.y))
plate:  transform-origin = Q0 (in the plate's own box);
        transform = translate(Q − Q0) scale(k / k0)
```

`kEnd` is the smallest zoom at which the band covers the viewport edge to edge even though the ridge curves away at the sides. The ridge's sag a distance `d` from the peak is at most `c·d²` with `c = h/σ² ≈ 0.0816` (ridge 5), so solve `(band/2)·k − c·(w/2k)²·k ≥ h/2` for `k` and add 10 %:

```
kEnd = 1.1 · (h/2 + √(h²/4 + band·c·w²/2)) / band
```

The flat estimate (`1.15 · h / band`) leaves the top corners uncovered on wide screens; the unit tests caught it (`camera.test.ts` checks 1440×900, 390×844, 844×390, 2560×1440 and 3440×1440 for both aim modes).

Typical numbers at 1440 × 900 with a 64 px coin: `k0 = 1.33`, `kEnd ≈ 559`, a total zoom of about **420×**, which is why it must be canvas, not a scaled DOM node.

**What the visitor sees, as `z = k / k0` grows:**

| `z` | Event | Rule |
|---|---|---|
| 1 → 1.6 | The phone grows; the camera starts sliding the aim point to centre | — |
| 1.6 → 2.6 | The screen's other UI (store, amount, prompt) fades: `opacity = 1 − smoothstep(1.6, 2.6, z)` | isolation: only the coin stays sharp |
| 2.2 → 3.2 | The frame image fades: `opacity = 1 − smoothstep(2.2, 3.2, z)` (it is mostly off-screen by now; fading it means its raster never visibly softens) | no visible raster blur, ever |
| 3 → 12 | The ring sweeps out past the edges | — |
| 12 → 120 | Ridges become wide bands sweeping outward: lower ones down and off, upper ones up and off. Paper shows only in the gaps | the "flying between ridges" moment |
| 120 → 370 | Ridge 5's ink fills the viewport from the centre outward; the last paper gaps thin to slivers at the top and bottom edges and vanish | paper → ink, physically motivated |

At `u = 1` the canvas stops drawing (it would draw a solid rectangle) and `ground` is already `--ink`.

**Scrolling back up** replays the dive in reverse exactly (it's a pure function of `p`). Nothing is time-based in this segment.

**Optional craft detail, only if it holds 60 fps:** a specular band across the phone glass (a 30° `linear-gradient` of `rgba(255,255,255,.18)`, 40 % of the frame wide) translating from −40 % to +40 % across the frame as `u` goes 0 → 0.25. It reads as light moving across the glass as the camera approaches. Drop it first if the dive drops frames.

### 2.5 Inside (`p` crosses 0.46)

Time-based, plays once per entry, reverses when `p` goes back below 0.452:
- **Horizontal hairline** at 50 % height: `scaleX 0 → 1` from the centre, 800 ms `--ease-out`.
- **Vertical hairline** at the column-8/9 edge: `scaleY 0 → 1` from the crossing point, 800 ms `--ease-out`, 120 ms after the horizontal.
- **Column guides** (the other 12-column edges): `opacity 0 → 1` (they are `--night-rule` at 50 % alpha, so 6 % white), 600 ms, starting 300 ms in.
- **Nav** switches to dark glass (§5.1).

### 2.6 The three words

Each word is split into letters at build time (grapheme-safe, `Intl.Segmenter`, so Urdu can come later). Each letter sits in a mask: `display: inline-block; overflow: clip; padding-block: 0.12em; margin-block: -0.12em` (so descenders and the period aren't cut). The `h3` keeps `aria-label` with the whole word; the letter spans are `aria-hidden`.

**Word in** (on its threshold):
- Letters: `translateY(110%) → 0`, 900 ms `--ease-expo-out`, stagger 30 ms. Opacity 0 → 1 over the first 40 % of each letter's move.
- Index ("01 / 03"): the number rolls: old digit up and out, new digit up from below, 500 ms `--ease-expo-out`.
- Paragraph: two spans (the ink sentence, the grey rest). Each: `translateY(12px) → 0`, `opacity 0 → 1`, `filter: blur(6px) → blur(0)`, 700 ms `--ease-out`, the second 70 ms after the first, both starting 250 ms after the word starts.
- Then the word's visual (§2.7), starting 400 ms after the word starts.

**Word out** (when the next word's threshold is crossed):
- Letters: `translateY(0) → −40%`, `opacity → 0`, `filter: blur(0) → blur(8px)`, 420 ms `--ease-in`, stagger 15 ms.
- Paragraph: `opacity → 0`, `translateY(−8px)`, 300 ms `--ease-in`.
- Visual: fades out 300 ms.
- The incoming word starts **180 ms after** the outgoing one starts. The overlap is what makes it feel like one continuous breath instead of a slideshow.

**Direction-aware:** scrolling back up across a threshold plays the mirror image: the current word exits *downward* (`translateY → +40%`) and the previous word enters *from above* (`translateY(−110%) → 0`). Spatially consistent with the scroll direction (Apple rule: leave the way you came).

**Interruptible:** if a new threshold is crossed mid-animation, animate from the current on-screen values (Motion does this when you start a new `animate()` on the same element; never reset to a start value).

### 2.7 The three visuals

**Instant: the time rail**
1. Rail: a full-width hairline at 72 % height, `scaleX 0 → 1` from the left, 800 ms `--ease-out`.
2. Ticks at 0, 1, 2, 3 s with `--t-mono-s` labels: fade in left to right, stagger 60 ms, starting at 300 ms.
3. Marker (a 1 px vertical line, 16 px tall, `--night-text`, with a 6 px dot on top) travels from 0 to the 2.6 s position (i.e. 2.6 / 3 of the rail): `ui` spring with `visualDuration: 1.2`, zero bounce. It's a time, so it doesn't overshoot.
4. When it settles, "< 3 s" fades in above it (200 ms) and the rail segment it covered brightens from `--night-rule` to `--night-2` (400 ms).
Plays once per entry. No loop.

**Private: ridges to a line**
1. Six ridge paths (the coin's ridge shapes, stretched to 70vw wide, centred in the lower half), `opacity 0 → 0.28`, 500 ms.
2. Flatten: each ridge's height `h` animates to 0 (regenerate the path's `d` from the formula each frame, 49 points, cheap), bottom ridge first, stagger 90 ms, 900 ms `--ease-in-out`.
3. Converge: their base lines move to one y (the rail height, 72 %), 500 ms `--ease-in-out`. Six lines become one.
4. Resolve: the line shortens from 70vw to the width of the hash string (`--ease-in-out`, 500 ms) while the string `hmac-sha256 · 7c1e 04b9 … a90f` is revealed left to right with `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)`, 600 ms `--ease-out`. Then `ILLUSTRATIVE` fades in.
No scrambling characters (banned, BRIEF §6). The idea is literal: the ridges become a line of text that cannot be turned back into ridges.

**Certain: the settle card**
1. Card materialises (§3.5): `scale 0.96 → 1`, `opacity 0 → 1`, `backdrop-filter: blur(0) → blur(16px)`, 450 ms `--ease-out`.
2. 150 ms later the green dot: `scale 0 → 1`, 300 ms `--ease-out`, then one ring pulse (a 1 px `--settle-night` ring around the dot, `scale 1 → 2.6`, `opacity 0.5 → 0`, 900 ms `--ease-out`). Once. Then "Settled" fades in, 200 ms.
3. "PKR 180.00" and the store line fade in together, 300 ms, no counting (this is one sale's receipt; it should look already true).

### 2.8 Release (`p` 0.97 → 1)

Scrubbed. Word, paragraph, visual, index, vertical hairline and column guides: `opacity → 0`. The horizontal hairline stays. It becomes the slit.

---

## 3. Glass physics

Taken from the client's portfolio and Apple's fluid-interface rules. Applies to: nav orb, link pill, Contact pill, mobile menu button, CTA pills, the close-section orb. Pointer effects only under `@media (hover: hover) and (pointer: fine)`.

### 3.1 Press (all devices)
- `pointerdown`: `scale 0.97`, `--d-press` `--ease-out`. On press, not on release (Apple: respond on touch-down).
- `pointerup` / `pointercancel`: back to 1 with the `release` spring (a press is a physical gesture, so it may overshoot slightly).
- Keyboard: `:focus-visible` shows a 2 px `--ink` (or `--night-text`) outline offset 3 px, following the element's radius. `Enter`/`Space` play the same press.

### 3.2 Magnetic pull (pointer only)
From `SocialMenu.jsx`: on `pointermove` inside the element's box + 24 px margin:
```
offset = (pointer − elementCentre) × 0.3          // the portfolio's factor
offset = clamp(offset, ±maxPull)                  // 6 px pills, 10 px nav orb, 16 px close orb
x, y   = useSpring(offset, { stiffness: 150, damping: 15, mass: 0.1 })
```
On `pointerleave`, target 0 with the same spring. **Inner parallax:** the label or icon inside moves a further 0.4 × the offset, so the content slides slightly inside the glass. That relative motion is what makes it read as a thick material rather than a flat sticker.

### 3.3 Specular highlight (pointer only)
The `::before` highlight (`SYSTEM.md` §6.1) is positioned with `--mx`/`--my` set from the **same** spring values as the magnetic pull (converted to the element's local coordinates), so light and object move together. Highlight `opacity 0 → 1` on enter, 200 ms; `1 → 0` on leave, 450 ms.

### 3.4 Tilt (the orb only)
From `TiltCard.jsx`: `rotateX/rotateY` from the pointer's position over the orb, range ±6°, spring `{ stiffness: 300, damping: 30 }`, `perspective: 600px`. The etched coin sits on a layer at `translateZ(12px)` (the portfolio used 30 px for cards; 12 px suits a 40 px object). Cards, bubbles, the phone and the settle card **never** tilt: documents stay straight, only the object tilts.
The orb has **no idle loop** beyond its shader (§4.4): slow looping motion (around 0.2 Hz) is a vestibular trigger, and stillness reads as more expensive anyway.

### 3.5 Materialise (glass entering and leaving)
Glass never just fades. Enter: `scale 0.96 → 1`, `opacity 0 → 1`, and the backdrop blur radius `0 → 20px` (16 px for dark glass), 450 ms `--ease-out`, `transform-origin` at whatever spawned it (Apple: anchor to the source). Exit: the mirror, 300 ms `--ease-in`.
Animating `backdrop-filter` is only allowed on elements smaller than 400 × 400 px. Larger glass (the mobile menu sheet) animates opacity and transform only.

---

## 4. Hero and idle details

### 4.1 No intro

There is no intro or preloader (P§1). The page opens on the hero, which plays its entrance (§4.2) on first paint.

### 4.2 Hero entrance
- "Pay with" and "nothing.": letters rise in masks (as §2.6 word-in), stagger 30 ms, 900 ms `--ease-expo-out`, both words together.
- App frame: `translateY(24px) → 0`, `opacity 0 → 1`, 900 ms `--ease-out`, starting with the words.
- Lead: fades in 300 ms after; scroll cue 500 ms after.
- The frame image is the LCP element: it is in the DOM at full opacity from the first paint underneath its entrance transform, so LCP isn't delayed by the animation.

### 4.3 Scroll cue
The hairline after "Scroll" extends 48 → 96 px and back on a 2.4 s `--ease-in-out` loop, **only until the first scroll**, then stops for good. No infinite motion once the visitor has engaged.

### 4.4 Orb idle shader
The orb's refraction shifts very slightly with time (a low-amplitude surface wobble, period ≥ 12 s, amplitude ≤ 2 % of its size) so the chromatic edge feels alive. It pauses when the orb is off-screen, when the tab is hidden, and under reduced motion.

---

## 5. Theme switches and the slit

### 5.1 Nav light ↔ dark glass
When `p` crosses 0.46 (into ink) the nav crossfades from light glass to dark glass: background, shadow and text colours transition over `--d-base` `--ease-out` (CSS transitions on custom properties registered with `@property`). Reverse when going back. During the slit (§5.3) it switches back when the paper band passes 50 % of the viewport height.

### 5.2 Honesty pill
Fades out (300 ms) when the stage reaches `p = 0.01`; fades back in when the slit is complete.

### 5.3 The slit (ink → paper, P§5)
The last 90svh of the stage's scroll, in the same sticky frame (so the hairline doesn't move). Progress `q` is that part of the stage's progress.
1. `q` 0 → 0.15: the horizontal hairline brightens from `--night-rule` to solid `--paper` (opacity scrub). It's now a bright 1 px line on ink.
2. `q` 0.15 → 1: a paper layer opens symmetrically about 50 %: `clip-path: inset(calc(50% − 0.5px) 0)` → `inset(0)`, with `--ease-in-out` applied to `(q − 0.15) / 0.85`.
3. The next section (the sale) begins directly below on paper, so the end of the slit and the start of the sale are the same colour with no edge.

---

## 6. The dialog (the sale, P§6)

### 6.1 Trigger
Each message slot is observed with `IntersectionObserver` (`rootMargin: "0px 0px -22% 0px"`). When a slot's top crosses 78 % of the viewport height, its message plays. **Messages stay once shown** (a chat doesn't un-send). If several slots cross at once (fast scroll), they queue with at least 120 ms between starts.

Slots reserve their final height from the start (rendered invisible), so revealing never shifts layout.

### 6.2 Bubble entrance by voice
| Voice | Enter | Spring |
|---|---|---|
| People | `scale 0.92 → 1` from the tail corner, `translateY(8px) → 0`, `opacity 0 → 1` | `sheet` (bounce 0.15: people are lively) |
| Terminal | same transform, from the tail corner (right) | `ui` (bounce 0: it carries amounts) |
| SMS | sender line `FINGERPAY · SMS` fades in first, then the body `translateX(−16px) → 0` + `opacity`, 120 ms later | `ui` |

The avatar and name line (first message of each person) fade in 100 ms before the bubble.

### 6.3 The typing shimmer (terminal messages only)
Before each terminal message, its slot first shows a small `--ink` pill (56 × 28 px, `--r-pill`) for 500 ms: inside it a 1 px horizontal hairline at `--night-2`, with a highlight (a 24 px `linear-gradient` of `--night-text`) sweeping across it every 900 ms. Then the pill morphs into the bubble: width/height animate to the bubble's size with the `ui` spring while the text fades in (start at 60 % of the morph). **Not three dots** (BRIEF §6).

### 6.4 Special messages
- **Message 3 (the thumb):** the bubble enters, then the coin inside presses: `scale 1 → 0.86` over 120 ms `--ease-out`, then back with `{ bounce: 0.3, visualDuration: 0.35 }`. A thumb is physical, so this is the one place a coin bounces. At the bottom of the press, the ridges darken from `--ink-2` to `--ink` (100 ms) and stay dark.
- **Message 4 (settled):** dot `scale 0 → 1` (300 ms `--ease-out`), "Settled" fades in 200 ms later, then the fee line 150 ms after. No bounce anywhere in this bubble.
- **"LATER THAT EVENING" divider:** the two side hairlines draw outward from the text (`scaleX 0 → 1`, 600 ms `--ease-out`).

---

## 7. The fine print (ledger, P§7)

Rows observed at 85 % viewport height. When a row enters (rows entering together stagger 70 ms):
1. Top rule: `scaleX 0 → 1` from the left, 800 ms `--ease-out`.
2. Label: `opacity 0 → 1`, 400 ms, 100 ms after the rule starts.
3. Value:
   - **Numeric values count up** from 0 to the final value over 900 ms `--ease-out`, no overshoot (rule 4). Tween an **integer** (hundredths for "0.45", units for "3" and "5,000") and format each frame (`Intl.NumberFormat("en-PK")` with the final string's decimals), so the display never shows float artefacts like `0.4500001`. Tabular numerals keep the width still while counting.
   - Values that are already 0 ("PKR 0", "0" images) and text values ("a thumb", "Take cash", "Reply LOCK") fade in instead (`opacity`, `translateY(6px) → 0`, 500 ms `--ease-out`).
   - The qualifier fades in after the value settles (200 ms).
Plays once per page load.

---

## 8. The close (P§8)

- "Leave everything" / "at home.": words rise in masks (as §2.6, but **per word**, stagger 60 ms, 900 ms `--ease-expo-out`) when the block is 60 % visible.
- Lead and CTA pills fade up (`translateY(12px) → 0`, 600 ms `--ease-out`, stagger 70 ms).
- Footer: no animation. The disclaimer is never animated in (it must be readable the moment it's on screen).

---

## 9. Reduced motion, reduced transparency

`prefers-reduced-motion: reduce` changes the page, not just the timings:

| Thing | Reduced-motion version |
|---|---|
| Lenis | Off. Native scrolling |
| Hero entrance | Final state at once |
| The stage | **Unpinned.** It becomes four normal sections: (1) the hero, static; (2) a 100svh ink section with the coin drawn huge and cropped so one ridge crosses the screen as a wide band, a still of "inside the ridge"; (3–5) Instant, Private, Certain as three ink sections of 100svh each, every element in its final state, the section's content fading in (`opacity`, 200 ms) when it enters |
| Word, paragraph, visuals | Final states (the time rail shows the marker at 2.6 s; Private shows the hash line; Certain shows the card) |
| The slit | A straight paper edge between the last ink section and the sale |
| Dialog | All messages visible from the start |
| Ledger | Final values, no counting |
| Glass | Press feedback changes the background tint instead of scaling; no magnetic, tilt or specular |
| Orb | The static image (`public/site/orb@2x.webp`) |
| Scroll cue | Static hairline |

`prefers-reduced-transparency: reduce`: glass becomes solid (`SYSTEM.md` §6.4). The orb shows its static PNG on a solid disc.

Both are read with `matchMedia` and **re-evaluated live** (a change event switches modes without a reload).

---

## 10. Performance rules

- **One clock.** Lenis is driven by Motion's frame loop: `frame.update(({ timestamp }) => lenis.raf(timestamp), true)`, so scroll smoothing, scroll-linked values, the canvas and springs all tick in the same `requestAnimationFrame`. No other rAF loops (the orb shader renders inside the same callback).
- **Lenis:** `lerp: 0.085`, `wheelMultiplier: 1`, `syncTouch: false` (native touch scrolling on phones; sticky still works). `autoRaf: false`.
- **Compositor-only** properties for everything except: the canvas, small text blurs (≤ 12 letters at a time), and backdrop blur during glass materialise (elements < 400 px).
- **No layout reads per frame.** Measure coin rect, viewport, hairline positions with `ResizeObserver` and on font load; cache.
- **Canvas:** draw only when `p` changes and the stage is on screen; build the ring and ridge `Path2D` objects once (in coin units) and reuse them under each new transform; DPR capped at 2.
- `will-change: transform` on stage layers **only while the stage is on screen** (toggle with an IntersectionObserver).
- The orb shader renders at ≤ 2× its CSS size, pauses off-screen and on `visibilitychange`.
- **Budget:** the dive must hold 60 fps with 6× CPU throttling in Chrome DevTools on the reference laptop, and on a mid-range Android (Moto G-class). Measure with a Performance trace over a full slow scroll of the stage; no long tasks > 50 ms during the stage.
- **Fallback order if frames drop:** remove the specular band (§2.4) → lower canvas DPR to 1.5 → drop the letter blur on word exits (keep the slide) → render the orb at 1×.
