# FingerPay WebGL support layer (MOTION-3D)

The site is an **illustrated scroll story** (BRIEF, "Direction decision", 2026-11-18): hand-drawn frames at 12 fps over flat layered scenes. WebGL doesn't draw the story. It does four jobs on top of the art:

1. **Light and shadow** over the flat art: one moving light per scene, shadows cast by props
2. **The thumb-press ripple**: the moment the sale happens
3. **Scene transitions**
4. **Grain and paper texture**

This doc owns how that layer is built, what it costs, and how it degrades. `MOTION.md` owns the frame player, scroll choreography, timing tokens and the cursor and press interactions. `WEBSITE.md` owns which scene uses what. `TYPE-AND-COLOR.md` picks the colours, so this doc uses role names only (`ground`, `ink`, `accent`, `settled`).

---

## 1. Stack: plain WebGL2, no three.js

| Option | Verdict |
|---|---|
| three.js + R3F + drei + postprocessing | **No.** That's about 300 KB of JS for one fullscreen quad. It made sense for 3D meshes, and the meshes are gone. |
| **Plain WebGL2, one fragment shader** | **Yes.** About 250 lines of TS, no dependency, roughly 4 KB gzipped. |

Rules:
- **One `<canvas>`, one program, one fullscreen triangle.** Every effect lives in the same fragment shader and is switched by uniforms, so there's one draw call per frame.
- **Shaders are TS template strings** (`/* glsl */ \`...\``), so no Turbopack loader config is needed.
- **Next.js 16 App Router:**
  - The layer is a `"use client"` component.
  - It imports its WebGL module with `await import()` inside `useEffect`, after `requestIdleCallback` (with a 1,500 ms timeout and a `setTimeout` fallback for Safari), so nothing WebGL is in the initial bundle or in SSR.
- **No CSP change needed.** The CSP in `src/proxy.ts` is `script-src 'self' 'nonce' 'strict-dynamic'`, `img-src 'self' data: blob:`, `connect-src 'self'`. This layer uses:
  - no workers, WASM, blob scripts or remote fetches
  - textures from same-origin WebP, decoded with `createImageBitmap`
- **Dev tooling:** the dev-only HUD is `stats-gl@4.2.3`, behind `?perf=1`. It sets styles through the CSSOM, so the nonce CSP allows it. It must never ship in the production bundle.
- **Scroll:** the layer reads scroll progress from the **single shared ticker** that `MOTION.md` defines, which runs Lenis (`lenis@1.3.27`) and the frame player. It never starts its own `requestAnimationFrame` loop. That keeps the light, the frame index and the DOM text on the same frame.

---

## 2. How it sits over the art

```
DOM (Astryx components)            z-order, bottom to top
  scene art layers (WebP <img>)    wall, floor, shelves, counter, cast frames, art shadow layers
  WebGL canvas                     mix-blend-mode: multiply; pointer-events: none; aria-hidden
  story text, controls             always DOM and always readable
```

**Why multiply, and why only multiply:**
- Multiply can only darken. White leaves the art untouched; darker values shade it.
- So the art is painted **fully lit**, and the light layer takes light away: ambient dimming, shadows, falloff. The brightest the page can ever get is the artist's own drawing.
- This obeys the playbook: shadows are occlusion, never emission, and there are no coloured glow halos.
- The "glow" at the thumb press is the inverse: the counter dims a little and the ripple rings stay white (§3.2). It reads as light without emitting anything.
- One blend mode means one canvas. A second canvas in `screen` mode for true additive light is an open question (§7), not the default.

**Coordinate mapping:**
- Each scene's art box is a DOM element.
- Once per tick, the layer reads its rect (after Lenis scrolls, before any DOM writes) into `uSceneRect`, which maps screen pixels to scene UV.
- Light positions and height maps are authored in scene UV, so they stay locked to the art while it scrolls, pins (CSS `position: sticky`) or parallaxes.
- **Scope of the light:** it lights the room plane, meaning the wall, floor and fixed props. Foreground parallax layers and characters keep their shadows as hand-drawn art layers, as in the reference. The light layer doesn't try to shadow moving cast frames.

---

## 3. The effects (one shader, four terms)

### 3.1 Light and shadow pass

**Per-scene input:**
- One **height map**:
  - greyscale WebP at 512 × 288 for 16:9 scenes, ≤ 20 KB, painted by the artist over the room layer
  - 0 is the floor or wall, 1 is the tallest prop
- One **light**:
  - position `xy` in scene UV, height `z`, radius and intensity
  - for example, the bulb over Rasheed's counter or daylight from the shop door

**The shader:**
- It marches from each pixel towards the light across the height map. Props taller than the ray cast soft 2D shadows onto the floor and wall.
- Light is low-frequency, so this runs at **reduced resolution** (§5).

```glsl
// uHeight: per-scene height map. uLight: xy (scene UV), z (height 0..1).
const int STEPS = 20;                       // 12 on the low tier
float shadow(vec2 uv) {
  float h0 = texture(uHeight, uv).r;
  vec2  dir = uLight.xy - uv;
  float s = 1.0;
  for (int i = 1; i <= STEPS; i++) {
    float t   = float(i) / float(STEPS);
    float ray = mix(h0, uLight.z, t);       // the ray rises towards the light
    float hq  = texture(uHeight, uv + dir * t).r;
    s = min(s, smoothstep(-uPenumbra * t, uPenumbra * t, ray - hq)); // softer further from the occluder
  }
  return s;
}

vec3 lightTerm(vec2 uv) {
  vec2  d    = (uv - uLight.xy) * vec2(uAspect, 1.0);
  float fall = 1.0 / (1.0 + dot(d, d) * uFalloff);
  float lit  = clamp(uAmbient + uIntensity * fall * shadow(uv), 0.0, 1.0);
  return mix(uShadowTint, vec3(1.0), lit);  // uShadowTint = mix(white, ink, 0.35): shadows lean to ink, never pure black
}
```

**Motion:**
- **Bulb sway:** the light `xy` swings on a slow pendulum (MOTION token, provisional period 6 s, amplitude 1.5% of scene width).
- **Scroll:** the light can change across a scene's scroll progress, for example the afternoon light moving across the floor during the "Rasheed opens the shop" scene.
- **Frame rate:** light runs continuously, not on twos. It's the world, not the drawing, and stepping it at 12 fps would make the shadows strobe. MOTION.md can overrule this.

### 3.2 Thumb-press ripple (the sale moment)

The ripple is the brand mark radiating outward. The mark's own arches repeat as rings from the thumb point, like ripples in water. That's the one place the logo becomes motion.

**How it's built:**
- The mark is five strokes:
  - a crown arc
  - three inverted-U arches with legs of staggered lengths
  - a central core bar
- They're encoded as a few parameters and drawn as a signed distance field (`sdMark`), so they're crisp at any size with no texture.
- **Check:** a unit test rasterises `sdMark` and the brand SVG (when `brand/` delivers it) and requires IoU ≥ 0.98.

```glsl
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdArch(vec2 p, float r, float w, float legL, float legR) {       // half-ring on top, flat-ended legs
  if (p.y >= 0.0) return abs(length(p) - r) - 0.5 * w;
  float sx = p.x < 0.0 ? -1.0 : 1.0, L = sx < 0.0 ? legL : legR;
  return sdBox(p - vec2(sx * r, -0.5 * L), vec2(0.5 * w, 0.5 * L));
}
float sdCrown(vec2 p, float r, float w, float halfAngle) {             // ring sector with flat radial caps
  p.x = abs(p.x);
  return max(abs(length(p) - r) - 0.5 * w, dot(p, vec2(cos(halfAngle), -sin(halfAngle))));
}
// sdMark(p) = min(sdCrown(...), sdArch(...) x3, sdBox(core)); parameters come from the mark's JSON.

// Ripple: rings follow the mark's shape outward from the press point.
float ripple(vec2 uv) {
  vec2  p   = (uv - uPress.xy) * vec2(uAspect, 1.0) / uMarkScale;
  float d   = max(sdMark(p), 0.0);                       // distance from the mark outline
  float age = uTime - uPressT;                           // seconds since the sale settled
  float ph  = d / uPitch - age * uSpeed;                 // rings travel outward
  float ring = 1.0 - smoothstep(0.0, fwidth(ph) * 1.5, abs(fract(ph) - 0.5) - 0.12);
  float env  = smoothstep(0.0, 0.08, age) * exp(-age * 2.2) * exp(-d * uFade);  // one pulse, gone by ~1.4 s
  return ring * env;
}
```

**The sequence** (timings are MOTION tokens; the values here are provisional):

| Phase | What the layer does |
|---|---|
| Press and hold starts | `uHoldDim` springs from 0 to 0.15: the room dims 15%, and the counter and scanner stay at full brightness (a radial mask at `uPress`) |
| Risk Engine checking (cast frames play) | The dim holds; nothing pulses, because the drawing carries the moment |
| Settled | `uPressT = now`: ridge rings travel outward as white over the dimmed room; inside the scanner's footprint only, a faint wash multiplies white towards `settled` (strength ≤ 0.12, the one place a colour role appears in this layer) |
| +1.4 s | `uHoldDim` springs back to 0; the ripple has faded out |
| Declined | No ripple. The dim releases. The decline is told in DOM text, which shows no shopper name (privacy rules) |

**Combining the terms:**

```glsl
vec3 c = lightTerm(uv);
c *= 1.0 - uHoldDim * (1.0 - spotMask(uv));       // dim everything except the counter
c  = mix(c, vec3(1.0), ripple(uv));                // rings lift the shading back to the art's own white
```

**Flash safety (WCAG 2.3.1):**
- One pulse per sale, with a luminance swing under 20%.
- The ripple can't retrigger for 1.5 s, so it never reaches 3 flashes a second.

### 3.3 Scene transitions

WebGL can't read DOM pixels, so a transition is **lights down, swap, lights up**, done with a shaped mask in the multiply layer.

**The mask:**
- `uWipe` (0 to 1) drives an `ink`-coloured cover whose edge is the mark's arch rings growing from a chosen point (the same `sdMark` field).
- The edge is broken by paper-fibre noise, so it reads like ink soaking into paper, not a geometric iris.

**The swap:**
- At `uWipe = 1`, the screen is near-`ink` (multiply with `ink`), and the DOM swaps or scrolls to the next scene underneath.
- Then the wipe runs back to 0 from the new scene's origin.
- `uWipe` comes straight from scroll progress in the shared ticker, so it scrubs and reverses with the user.

```glsl
float wipe(vec2 uv) {
  vec2  p = (uv - uWipeOrigin) * vec2(uAspect, 1.0) / uMarkScale;
  float edge = sdMark(p) * 0.02 + fbm(uv * 9.0) * 0.04;     // shaped by the mark, roughened by paper fibre
  return 1.0 - smoothstep(uWipe - 0.02, uWipe + 0.02, edge); // 1 = covered
}
c = mix(c, uInk, wipe(uv));
```

**Budget:** use these at chapter boundaries only (3 or 4 on the page). Inside a chapter, scenes change by camera pan or parallax in the DOM.

### 3.4 Grain and paper

- **What:** procedural, in the same pass, at no extra texture cost.
  - **Grain:** monochrome hash noise at ±2% around white. That stays under the 3% "noticeable" ceiling.
  - **Paper fibre:** a 2-octave FBM at ±1.5%, fixed to scene UV, so the paper moves with the art and doesn't swim over it.
- **Re-seeding:** the grain re-seeds **at 12 fps, on twos** (`floor(uTime * 12.0)`), in step with the drawings. That gives the hand-made "boil".
- **Off states:** in reduced motion and the static fallback, grain is frozen or omitted. It's texture, not content.

---

## 4. Loading and LCP

1. **First paint is pure DOM:** the first scene's art (`<img>` with explicit `width` and `height`) and the headline.
   - The LCP element is the headline or the hero art, both server-rendered.
   - The art is painted fully lit, so the page is complete without WebGL.
2. **After first paint:**
   - after `load` plus idle, import the WebGL module
   - create the context with `{ alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }`
   - decode the current and next scenes' height maps
3. **Fade in:** when the first frame has rendered, fade the canvas from opacity 0 to 1 over 400 ms. Because it multiplies, it settles shadows onto art that was already there. Nothing pops, and CLS is 0 (the canvas is `position: fixed`, sized to `100lvh` so a mobile address-bar resize doesn't reallocate it).
4. **Later scenes:** height maps load one scene ahead, with at most 2 resident. The textures are tiny, so there's no pool.

**Assets:**
- per scene: one height map, ≤ 20 KB WebP
- nothing else: no meshes, no KTX2 or Draco, no HDR
- JS: about 4 KB gzipped, lazy-loaded

---

## 5. Performance plan

| Lever | Rule |
|---|---|
| Resolution | Render at **0.5× CSS pixels**, not device pixels, and let CSS upscale. Light is low-frequency, and `fwidth` keeps the ripple rings anti-aliased. The low tier uses 0.35×. |
| Tiers | Start `medium` (0.5×, 20 shadow steps). Drop to `low` (0.35×, 12 steps, no paper FBM) if the measured layer cost stays over budget for 2 s; step back up after 10 s of headroom. One switch rule, no GPU-detection library (`detect-gpu` fetches from a CDN that the CSP blocks). |
| Render on demand | Draw only when something changed: scroll progress, light sway, a running ripple or wipe, or a grain tick (12 fps). An idle, still scene costs 12 cheap frames a second, or **0** in reduced motion. |
| Pause | IntersectionObserver on the scene containers: no scene in view means no draws. Hidden documents (`visibilitychange`) mean no draws. Lenis keeps running. |
| Context loss | On `webglcontextlost`, hide the canvas (the art is complete without it) and try to restore once. On a second loss, stay off for the session. |
| Main thread | Pointer handlers only write numbers to a shared store; no React state per `pointermove`. Rect reads happen before DOM writes in the ticker. |

**Target and how to measure it:**
- **Target:** 60 fps on the reference mid-range devices with the layer running:
  - a Helio G99-class Android (the common Pakistani mid-range, Mali-G57)
  - a 2020 Intel iGPU laptop at 1080p
- **Script:** a Playwright scenario drives the page:
  - 3 s idle on the hero
  - press-and-hold, then the settled ripple
  - a scroll through every chapter at a fixed speed, including 2 wipes
- **What it records:** `requestAnimationFrame` deltas and Long Animation Frames (`PerformanceObserver({ type: 'long-animation-frame' })`).
- **Pass criteria:**
  - p95 frame time ≤ 16.7 ms
  - ≤ 5% of frames over 16.7 ms
  - no LoAF over 50 ms after the first interaction
  - layer GPU time ≤ 2 ms, from `EXT_disjoint_timer_query_webgl2` in the `?perf=1` HUD
- **Throttled run:** the same script on desktop Chrome with 4× CPU throttle and `?tier=low` forced. DevTools can't throttle the GPU, so the real Android device is run through `chrome://inspect`.
- **Page targets** (whole page, from the brief): LCP < 1.5 s, CLS < 0.05, INP < 100 ms in Lighthouse mobile. The layer must not move any of them, since it loads after LCP and owns no layout.

---

## 6. Accessibility

- **The canvas is decoration:** `aria-hidden="true"`, `pointer-events: none`, never focusable.
- **Every story beat lives in the DOM.** That covers the text, the sale amount and its outcome. The press interaction is a real Astryx button that works with Space or Enter held, has a visible focus ring and announces through a polite live region ("Payment settled, PKR 180"). The ripple only echoes it.
- **`prefers-reduced-motion: reduce`:**
  - the light is static (no sway, no scroll-driven light movement)
  - grain is frozen
  - the frame loop stops; the layer redraws only when the scene changes
  - the press shows a static dim and a static rings frame, cross-faded in 150 ms and out after 1 s
  - wipes become 150 ms opacity cross-fades between scenes (playbook rule 2.1.4: replace movement with quick fades, don't cut it off)
- **No WebGL2, software rendering (`failIfMajorPerformanceCaveat`), or context lost twice:** the canvas never appears.
  - The art is painted fully lit, and its hand-drawn shadow layers still show, so nothing is missing except the moving light.
  - The press moment falls back to the DOM: the button and the live region.
- **Windows High Contrast:** `@media (forced-colors: active)` hides the canvas.
- **Contrast:** text never sits under the canvas's darkest values. The canvas is below the text layer, and `uAmbient` keeps multiply ≥ 0.65 behind text areas. That threshold is checked with the role colours once `TYPE-AND-COLOR.md` picks them.

---

## 7. Open questions for the user

1. **Additive light, yes or no?** Multiply-only keeps shadows as occlusion and can't produce a glow halo. A second canvas in `screen` blend would allow real light spill (warm bulb light on the shelves), at about 1 ms more GPU time and some risk of the glow look you've banned. Default: multiply only.
2. **Which scenes get a live light?** Default: the light is on in the counter scenes and off in the SMS and phone scenes, so the art carries those alone.
3. **Should the ripple use the logo's shape** (arch rings) or plain circles? Default: the logo.
4. **Can the artist paint one height map per scene?** It's a quick greyscale pass, about 20 min per scene, but it adds to the art budget. Without it the layer does falloff and grain only, with no cast shadows.
