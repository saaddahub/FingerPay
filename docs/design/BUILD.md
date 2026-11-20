# FingerPay website: build guide (v4)

> **For:** the agent that builds the page (Opus 5.5, high effort). Read `BRIEF.md`, `SYSTEM.md`, `PAGE.md`, `MOTION.md` first; this file says *how* to turn them into code and how to prove it works.
> **Scope:** the marketing page at `/` only. Product UI routes (`/mobile`, future merchant and admin consoles) are untouched.
> **Skills to load before writing code** (project `CLAUDE.md`): `impeccable`, `awwwards`, `apple-design`, `apple-design-motion`, `build-design`, `motion`. Then `better-interface` for the polish pass and `interface-review` before handing over.

---

## 0. The one decision that differs from `CLAUDE.md`

The project `CLAUDE.md` says every page uses Astryx components and "no `<div>`". The client's instruction for this redesign (2026-11-20) was **"No bullshit React components"**: the marketing page must not look like a component library.

**So for `/` only:** hand-written semantic HTML + CSS Modules + the CSS custom properties in `src/site/tokens.css`. No Astryx components, no Tailwind, no StyleX on this route. Astryx stays the rule for product UI.

Everything else in `CLAUDE.md` still applies: tokens instead of raw hex/px inside components (the raw values live only in `tokens.css`), semantic elements over `div` wherever a semantic element exists (`header`, `nav`, `main`, `section`, `article`, `ol`, `li`, `figure`, `p`, `h1–h3`, `button`, `a`), and the security rules (no secrets, no PII; the page has no forms and calls no API).

> Confirmed by the client on 2026-11-20 and recorded in `.claude/CLAUDE.md` ("Marketing page exception").

---

## 1. Stack

| Need | Use | Status |
|---|---|---|
| Framework | Next.js 16 App Router, React 19 | installed |
| Animation | `motion` v14 (`motion/react`: `useScroll`, `useTransform`, `useSpring`, `useMotionValue`, `animate`, `frame`) | installed |
| Smooth scroll | `lenis` | installed |
| Fonts | `@fontsource-variable/inter` (opsz + wght axes), `@fontsource-variable/geist-mono` | **add** |
| Icons | Lucide paths inlined as SVG (4 icons, ISC licence); no package for four icons | — |
| WebGL | none (hand-written WebGL2, ~150 lines) | — |
| Canvas | Canvas 2D (built in) | — |

Do not add GSAP, three.js, React Three Fiber, Framer Motion (the old package name), or any UI kit.

## 2. Files

```
src/app/page.tsx                    server component: composes the sections, exports metadata
src/app/layout.tsx                  (existing) add font imports, favicon, theme-color
src/site/
  tokens.css                        every token from SYSTEM.md §1–6 and MOTION.md §1.1
  base.css                          reset additions, type classes (.t-mega …), focus ring, skip link
  motion.ts                         springs, easings, durations, staggers (MOTION.md §1.1)
  scroll/
    smooth-scroll.tsx               client: Lenis driven by Motion's frame loop; off under reduced motion
    use-reduced.ts                  live matchMedia for reduced motion + reduced transparency
  glass/
    glass.module.css                .glass, .glassDark, ::before specular, ::after rim, media fallbacks
    use-magnetic.ts                 magnetic pull + specular vars (MOTION.md §3.2–3.3)
    use-press.ts                    press feedback (§3.1)
    orb.tsx                         the orb: canvas + static fallback + tilt (§3.4)
    orb-shader.ts                   WebGL2 program (§6 below)
  nav/nav.tsx, nav.module.css       centred cluster + mobile sheet (P§2)
  stage/
    stage.tsx                       the hero + dive + three words, one sticky stage (P§3–4, M§2)
    stage.module.css
    camera.ts                       pure functions: k(u), Q(u), segment mapping (unit-tested)
    camera.test.ts                  node:test, see §8
    ridges.ts                       coin geometry: ring + ridge Path2D in coin units, from SYSTEM.md §7
    ridge-canvas.tsx                the Canvas 2D layer
    words.tsx                       the three words + paragraphs + index
    visual-instant.tsx, visual-private.tsx, visual-certain.tsx
    letters.tsx                     grapheme-safe letter/word split with masks
  slit/slit.tsx                     M§5.3
  sale/sale.tsx, messages.ts, bubble.tsx, typing.tsx      P§6, M§6
  ledger/ledger.tsx, count.ts       P§7, M§7
  close/close.tsx, footer.tsx       P§8
public/
  app/frame.avif, frame.webp        the client's app frame (§5)
  app/frame.json                    frame geometry + dive config (§5)
  site/orb@2x.webp                  static orb fallback, rendered from the shader once
  favicon.svg, icon.svg             from brand/ (favicon.svg, fingerpay-app-icon.svg)
brand/                              logo sources (SYSTEM.md §7); copy what the page needs into public/
```

Retire the v3 landing files once the new page works (`src/app/art.tsx`, `hold-to-pay.tsx`, `how-film.tsx`, `landing-motion.tsx`, `landing.module.css`, `scanner-art.tsx`, `public/art/`). Move them to `docs/design/archive/v3-collage/code/` rather than deleting, in one commit of their own.

## 3. Tokens

`src/site/tokens.css` defines everything once on `:root`, in the order of `SYSTEM.md`. Night-section colours are set by `[data-ground="ink"]` on the stage frame and the slit, switching `--fg`, `--fg-2`, `--rule-current` so components don't need to know which ground they're on:

```css
:root            { --fg: var(--ink);        --fg-2: var(--ink-2);   --rule-current: var(--rule); }
[data-ground=ink]{ --fg: var(--night-text); --fg-2: var(--night-2); --rule-current: var(--night-rule); }
```

Register the colour properties the nav transitions with `@property` (`syntax: "<color>"`) so they interpolate (M§5.1).

## 4. The stage: how to build the signature moment

This is the part that decides whether the page feels expensive. Build it first, alone, before any other section, and don't move on until §9's stage checks pass.

### 4.1 Structure

```tsx
<section className={s.stage} aria-labelledby="stage-title" ref={stageRef}>   {/* 100svh + 520vh + 90svh */}
  <h2 id="stage-title" className="visually-hidden">How FingerPay works, in three words</h2>
  <a href="#sale" className="skip-inline">Skip the animation</a>
  <div className={s.frame} data-ground={ground}>                              {/* sticky, 100svh */}
    <div className={s.groundLayer} aria-hidden />
    <figure className={s.plate} aria-hidden> frame image + live screen DOM </figure>
    <RidgeCanvas progress={p} coinRect={coinRect} aim={aim} />               {/* aria-hidden */}
    <Hairlines state={...} />                                                {/* aria-hidden */}
    <HeroType progress={p} />        {/* the h1 "Pay with nothing." lives here */}
    <Words active={activeWord} direction={dir} />                            {/* h3 × 3 */}
  </div>
</section>
```

The `h1` is the hero sentence, split into "Pay with" and "nothing." spans on either side of the frame but one `h1` element in the DOM (`<h1><span>Pay with</span> <span>nothing.</span></h1>` positioned with the grid), so it reads as one sentence.

### 4.2 Progress → everything

```ts
const { scrollYProgress: p } = useScroll({ target: stageRef, offset: ["start start", "end end"] });
```

- **Scrubbed values** (settle, dive, release) are `useTransform(p, fn)` or a `p.on("change")` subscription that writes styles / draws the canvas. Keep them pure functions in `camera.ts`.
- **Anchor links into the stage** (the nav's "Security" goes to Private): scroll with Lenis to `stageTop + 0.70 × (stageHeight − viewportHeight)`. Under reduced motion the stage is unpinned (M§9), so link to the Private section's own `id` instead.
- **Time-based values** (inside, words, visuals) come from a small state machine: `p.on("change")` computes which segment we're in (with the ±0.008 hysteresis from M§2.2) and, when it changes, calls `animate()` for the exits and entrances with the direction (`p` rising or falling). Never derive word animations directly from `p`.

### 4.3 The camera (`camera.ts`)

Implement exactly M§2.4. Signature:

```ts
export function camera(p: number, m: {
  coinCentre: Vec;        // screen px at p = 0 (measured)
  coinDiameter: number;   // screen px at p = 0
  aim: Vec;               // coin units: (1.2, −13.1) or (1.2, −10.15)
  bandUnits: number;      // 2.1 or 3.8
  curvature: number;      // h/σ² of ridge 5 ≈ 0.0816
  viewport: { w: number; h: number };
}): { k: number; z: number; Q: Vec; Q0: Vec; done: boolean }
```

- `k0 = coinDiameter / 48`; `kEnd = endZoom(…)` (curvature-aware, MOTION.md §2.4); `k = k0 · (kEnd/k0) ** e` with `e = 0.5 − 0.5·cos(π·u)`.
- `Q0 = coinCentre + aim · k0`; `Q = Q0 + (V − Q0) · easeInOutSine(min(u / 0.35, 1))`.
- Return `z = k / k0` for the plate fades and `done = u >= 1`.

The plate uses `transform-origin: Q0` (converted to the plate's local box once on measure) and `transform: translate(Q − Q0) scale(z)`. The canvas uses `setTransform(dpr·k, 0, 0, dpr·k, dpr·(Q.x − k·aim.x), dpr·(Q.y − k·aim.y))`, then fills the ring and strokes the ridges from `ridges.ts`.

### 4.4 The coin on canvas (`ridges.ts`)

Generate the geometry from the same formula as the logo (SYSTEM.md §7), so the canvas coin is the logo:

```ts
// coin units: viewBox −24…24, origin at the centre
export const RING = { r: 22, width: 2.2 };
export const CLIP_R = 22 - 1.1 - 2.6;                     // 18.3
export const RIDGES = { width: 2.1, n: 6, yBottom: 14.5, yTop: -10,
  h: [3.0, 4.4, 5.8, 7.0, 8.0, 8.8], sigma: [12, 11.4, 10.8, 10.3, 9.9, 9.6], peakX: 1.2 };
// ridge i: y(x) = base_i − h_i · exp(−((x − peakX) / sigma_i)²), x ∈ [−24, 24], 49 samples
```

Build two `Path2D`s once (the ring as a circle; the six ridges as polylines) and, per frame: `save → setTransform → stroke ring → clip(circle CLIP_R) → stroke ridges → restore`. `lineWidth` is in coin units, so it scales with the transform. Colour: `--ink` read once from CSS. For the press (M§2.3) multiply `k` by the press factor around the coin centre.

### 4.5 Pitfalls that make a zoom look cheap (avoid all)

1. Scaling a DOM node or raster past ~2×: blurry. That's why the coin is canvas and the plate fades out by `z = 3.2`.
2. Linear scale interpolation: the zoom crawls then lurches. Use log space.
3. `transform-origin` changing over time: the target drifts. Fix the origin at `Q0`, move with translate.
4. Measuring rects during scroll: jank. Measure on resize and font load only.
5. Easing the scroll itself twice (Lenis + a spring on `p`): mushy. Lenis is the only smoothing; don't wrap `p` in `useSpring`.
6. Hand-off at a different size: a visible jump. There is no hand-off for the coin (it's canvas from the start); the only cross-layer moment is the paper → ink ground switch, which happens when the viewport is already fully ink.

## 5. The app frame (the client is sending it)

The client will supply the frame of the merchant terminal app. Until it arrives, build with a placeholder made to the same contract.

**Contract**
- `public/app/frame.avif` + `frame.webp`: the **phone bezel/body only**, with a transparent screen area, at 3× (e.g. 1290 × 2796 for a 430 pt wide phone). Target ≤ 180 KB AVIF. This is the LCP element: `<img fetchpriority="high">` with explicit width/height, and a `<link rel="preload">` for the AVIF.
- The **screen is live DOM**, laid out in the screen rect, rebuilt from the client's screen design (store name, amount, coin, prompt). Live DOM stays crisp up to the moment it fades, and it lets the coin placeholder be measured exactly.
- `public/app/frame.json`:

```json
{
  "width": 1290, "height": 2796,
  "screen": { "x": 63, "y": 60, "w": 1164, "h": 2676, "radius": 165 },
  "screenTheme": "light",
  "coin": { "cx": 645, "cy": 1910, "d": 290 },
  "aim": "ridge"
}
```

  `screenTheme: "dark"` switches `aim` to `"gap"` (M§2.4). `coin` is where the coin sits on the screen in frame pixels; the screen DOM puts a hidden placeholder there for measuring.
- **If the client's screen design has no coin** (e.g. it shows a fingerprint icon or "Waiting for thumb" text), replace their thumb glyph with our coin at the same position and size. Tell the client.
- **Placeholder until then:** a neutral phone body drawn in CSS (radius 15 % of width, `--ink` 1.5 px outline, `--paper` screen) with the screen DOM from P§3. The dive must already work on the placeholder.

## 6. The orb shader (`orb-shader.ts`)

One WebGL2 canvas, for the nav orb. Fragment shader only, on a full quad:

1. **Shape:** superellipse SDF, `|x|^5 + |y|^5 = 1`, anti-aliased with `fwidth`.
2. **Surface normal** from the SDF's gradient near the rim, flattening to face the viewer at the centre (a thick lens with a flat face).
3. **Refraction:** sample a background texture (a 256 px grey gradient environment rendered at init, plus the page ground colour) at `uv + normal.xy · strength`, **three times** with strengths `0.060`, `0.066`, `0.072` for R, G, B. The difference is the chromatic edge.
4. **Fresnel rim:** brighten toward the edge (`pow(1 − dot(n, v), 3)`), white at 35 % on paper, 20 % on ink.
5. **Specular:** a soft highlight whose position follows the pointer (the same spring values as the tilt).
6. **Idle wobble:** add `0.02 · sin(t / 12 + angle · 3)` to the SDF radius (M§4.4).
7. **The coin:** composited on top as an SVG layer (`fingerpay-mark.svg`), not in the shader, so it stays sharp and accessible.

Render inside Motion's frame loop; pause off-screen and on `visibilitychange`. If `getContext("webgl2")` fails, or under reduced motion/transparency, show `orb@2x.webp`. Render that file once from the shader at 320 px and commit it.

## 7. Fonts and LCP

- Import Inter (`opsz` + `wght` file, latin subset) and Geist Mono (`wght`, latin) via `@fontsource-variable`. Preload the Inter latin woff2.
- `font-display: swap` with metric-matched fallbacks (`size-adjust`, `ascent-override`, `descent-override`) for `Arial`, so the swap causes no layout shift. Generate the numbers with `next/font`'s fallback computation or by hand.
- LCP element: the app frame image. Budget: LCP < 1.5 s on "Fast 4G, mid-tier mobile" in Lighthouse.
- `<meta name="theme-color">`: `#FFFFFF`.
- Open Graph image: 1200 × 630, paper, the hero sentence with the coin where the phone is. Make it as a static file, no generator.

## 8. Tests

- **`camera.test.ts`** (node:test, runs in CI with the existing tests):
  - `k(0) = k0`, `k(1) = kEnd`, monotonic increasing.
  - `ln k` is exactly linear in the eased value `e` (log-space zoom), and the zoom rate `d(ln k)/du` varies by less than 12 % across `u ∈ [0.35, 0.65]` (near-constant rate through the middle of the dive).
  - `Q(u ≥ 0.35) = V` (aim point centred).
  - At `u = 1`, the ridge band covers the viewport: for x across `[−w/2, w/2]` px, the ridge's top and bottom edges (in px, from the formula and stroke width) lie outside `[−h/2, h/2]`.
  - Segment mapping with hysteresis: crossing 0.50 up then hovering at 0.495 keeps "Instant"; dropping below 0.492 reverts.
- **`count.test.ts`:** formatting never shows more decimals than the final value; `0.45` counts through hundredths only.
- **Logo regeneration** (one-off, not CI): the script that produced `brand/` is recorded in the commit that added it. Keep the parameters in `ridges.ts` and the logo in sync; if one changes, regenerate the other.

## 9. Acceptance checks (all must pass, with evidence saved)

Save screenshots to `docs/design/evidence/v4/` (desktop 1440 × 900 and phone 390 × 844).

**The stage (do these before building the rest)**
- [ ] Screenshots at `p` = 0, 0.02, 0.15, 0.30, 0.40, 0.45, 0.47, 0.55, 0.72, 0.90 on desktop and phone.
- [ ] Performance trace of a slow full scroll through the stage with 6× CPU throttling: no dropped-frame runs longer than 3 frames, no long tasks > 50 ms.
- [ ] Scroll down through the stage, then back up: identical frames in reverse, words exit in the correct direction.
- [ ] No visible seam at any point (step through `p` in 0.005 increments around 0.04, 0.30–0.46 and 0.46).
- [ ] Resize the window mid-stage: the camera re-measures and nothing jumps more than one frame.
- [ ] With the placeholder frame *and* with the client's frame (when it arrives).

**The page**
- [ ] Nothing from BRIEF §6 (banned list) appears anywhere. Search the code for: `dots`, `particle`, `typewriter`, `scramble`, `cursor`, emoji in JSX.
- [ ] Copy matches PAGE.md exactly, including the disclaimer.
- [ ] Contrast: every text/ground pair from SYSTEM.md §1 measured in the browser (including text under glass).
- [ ] Keyboard: Tab through the whole page; skip links work; the menu sheet traps focus and returns it; focus is always visible.
- [ ] Screen reader (NVDA or VoiceOver): the h1, the three h3 words, the dialog and the ledger read in order and make sense with no visuals.
- [ ] Reduced motion (emulate in DevTools): the page matches M§9 table, no pinning, no Lenis.
- [ ] Reduced transparency and high contrast: glass becomes solid.
- [ ] Lighthouse (mobile, simulated throttling): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95. LCP < 1.5 s on desktop, < 2.5 s on mobile. CLS < 0.05.
- [ ] First-view transfer ≤ 900 KB desktop, ≤ 500 KB mobile (DevTools network, cache disabled).
- [ ] Phones at 360, 390, 430 wide and landscape; iOS Safari URL-bar collapse doesn't make the stage jump (`svh`).
- [ ] `npm run build` passes, `npm run lint` passes, `npm test` passes.

## 10. Self-score (fill in after the build)

| Criterion | Weight | Score /10 | Evidence |
|---|---|---|---|
| Design | 40 % | | |
| Usability | 30 % | | |
| Creativity | 20 % | | |
| Content | 10 % | | |
| **Weighted** | | **target ≥ 7.0** | |

Then run `interface-review` on the diff and `claude-mem:design-is` on the finished page, and fix what they find before handing over.

## 11. Build order

1. Tokens, fonts, base styles, smooth scroll, reduced-motion hooks.
2. **The stage** with the placeholder frame: camera + canvas + plate + settle. Pass §9 stage checks.
3. Hairlines, the three words, their visuals. Re-run stage checks.
4. Glass system + nav + orb (static fallback first, shader second).
5. Slit, sale, ledger, close, footer.
6. Reduced-motion and reduced-transparency versions of everything.
7. Full §9 checks, self-score, review skills, fixes.
