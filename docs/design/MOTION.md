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

## 2. The Inside stage (the pay moment + the three words)

**The one signature moment.** One sticky stage: `section.stage` is `100svh + 300vh + 90svh` tall (the 300vh is 240vh on mobile and 200vh in phone landscape); its child frame is `position: sticky; top: 0; height: 100svh; overflow: hidden`. Motion's `scroll()` gives the stage's overall progress; the first 300vh of scroll becomes `p ∈ [0, 1]` (the pay moment and the words) and the last 90svh becomes `q` (the slit, §5.3), both in the same frame so the hairline never moves. Lenis smooths the scroll.

> **Changed 2026-11-24 (client):** the scroll-scrubbed dive into the coin (≈218vh of scrolling) felt slow, so it was replaced by the pay moment below: one short scroll triggers a ≈2 s timed sequence. The canvas camera and its maths (`camera.ts`, `endZoom`) are gone; the segment logic lives in `src/site/stage/segments.ts`.

### 2.1 Layers (bottom to top, all inside `stage__frame`)

| z | Layer | What it is | Animated by |
|---|---|---|---|
| 0 | `ground` | Full-bleed `--paper`; cross-fades to `--ink` (450 ms `--ease-out`) as the phone finishes lifting away | the pay moment |
| 1 | `plate` | The photoreal phone (`public/device/iphone.webp`) + the live screen DOM: store name, amount, the SVG coin, scan line, tick, prompt / "Paid" | the pay moment |
| 3 | `hairlines` | Crosshair + column guides (SVG, `--night-rule`) | time, with Instant |
| 4 | `hero-type` | "Pay with" / "nothing." / lead / scroll cue | the pay moment |
| 5 | `words` | The three `h3` words, paragraphs, index, and each word's visual | time, on thresholds |

### 2.2 Segment map

| `p` | Segment | Duration (desktop scroll) | Driven by |
|---|---|---|---|
| 0.000 – 0.030 | **Hero** | ≈ 9vh | — |
| crosses 0.030 | **The pay moment** (§2.3), then inside + **Instant.** | ≈ 2 s | time |
| 0.030 – 0.360 | **Instant.** | ≈ 99vh | time, on the trigger |
| 0.360 – 0.680 | **Private.** | ≈ 96vh (trigger at 0.36) | time |
| 0.680 – 0.940 | **Certain.** | ≈ 78vh (trigger at 0.68) | time |
| 0.940 – 1.000 | **Release**: everything but the horizontal hairline fades | ≈ 18vh | scrub |

Thresholds use ±0.008 hysteresis so a visitor hovering on a boundary doesn't make words flicker. Scroll that arrives while the pay moment (or its return) is playing waits for it to finish, then the page catches up to wherever `p` is.

### 2.3 The pay moment (`p` crosses 0.03 going down)

The visitor's scroll is the thumb: the phone on screen actually takes the payment, then gets out of the way. Times from the trigger:

| t | What happens | Curve |
|---|---|---|
| 0 | "Pay with" / "nothing." part by ∓6vw and fade; lead and cue fade and drop 12px | 500 ms / 400 ms `--ease-out` |
| 0 | **Press:** the coin scales 1 → 0.92 (120 ms `--ease-out`), back with the `release` spring | — |
| 200 ms | **Scan:** a short ink bar with a soft blue glow (`--scan-glow`) sweeps the coin top → bottom | 600 ms `--ease-in-out`, fades in/out over the first/last 15 % |
| 750 ms | Ridges and "Place thumb on the reader" fade out; the tick's ring fades in | 200 ms / 150 ms |
| 820 ms | **Tick** draws (`stroke-dashoffset` 1 → 0 on a `pathLength=1` path) | 380 ms `--ease-out` |
| 950 ms | "Paid · settled in 1.8 s" rises 6px into place (after the prompt has fully faded, so the two never overlap) | 400 ms `--ease-out` |
| 1350 ms | **Lift:** the phone leaves upward, `translateY(−115vh) rotate(−4deg)` | 650 ms `--ease-in` |
| 2000 ms | Ground cross-fades to ink; inside (§2.5) and Instant (§2.6) play | — |

**Scrolling back above the hero threshold** (below 0.022): the words leave as usual, the ground fades back to paper, the screen resets to its unpaid state while the phone is off-screen, and the phone drops back in with the `sheet` spring (550 ms visual duration) while the hero type returns (500 ms `--ease-out`, 150 ms in).

**Implementation rule:** every step is a WAAPI animation with explicit `from`/`to` keyframes and `fill: both`, collected in one list. Never animate to a bare end value and let the library read the start from the DOM: those steps desynced in testing (no tick, "Paid" drawn over the prompt). Going back rewinds the lift and the hero type (playback rate −1.5, delays dropped); cancelling the list is a complete reset.

Reduced motion (§9) never runs this: the stage renders as static panels.

### 2.5 Inside (with Instant, after the pay moment)

Time-based, plays once per entry, reverses when `p` goes back below 0.022:
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

### 2.8 Release (`p` 0.94 → 1)

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
