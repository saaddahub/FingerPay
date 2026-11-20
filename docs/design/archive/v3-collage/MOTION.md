# FingerPay motion system

Owner skills: `apple-design-motion`, `motion`.

**Inputs:**
- `docs/design/BRIEF.md`: the 2026-11-18 *Direction decision: illustrated* and its *UPDATE: a landing page, not a scroll story*
- `docs/design/ART-PROMPTS.md`: the vignettes and the two interaction sheets
- `docs/design/MOTION-3D.md`: the light layer, which depends on §4.1 of this doc
- `PRODUCT.md`
- `docs/SPEC.md` §5 View A and §6.3
- the user's playbook §2

**Covers:**
- the **website**: a landing page where each section holds one short looping 12 fps illustrated vignette, plus two live interactions
- the **merchant terminal**: SPEC View A, on the web now and on Android later

Fonts and colours are `TYPE-AND-COLOR.md`'s. Which section shows which vignette is `WEBSITE.md`'s.

Every number was checked against the installed code:
- Motion 14.14.0 (`motion-dom` spring source)
- anime.js 4.5.0 (spring source)
- Astryx 0.7.16 (`npx astryx docs motion --full`, `core/dist/motion/uikit/*`)

---

## 1. Principles

1. **The counter can't wait.** Motion never sits on the critical path of a sale. The result is readable on the first frame after the server answers; animation runs *after* it is readable. There are no minimum display times and no `setTimeout` in the payment flow, and input is never locked during a transition.
2. **Money moments are physical.** A sale is one causal event and reads as one: the visual commit, the sound and (where a hand is on the device) the haptic fire on the same frame. The object that carries the money has weight. On the website, that weight is *drawn* into the frames (anticipation, overshoot, settle); in the app it is one spring (`--motion-land`).
3. **Numbers hold still.** Money never animates through values it isn't. That means:
   - no count-ups, no digit scrambles, no overshooting or fading-in amounts
   - an amount changes by replacement on one frame
   - this also covers the website's numbers (`< 3 s`, `0.45%`, `PKR 25`)
4. **Bounce is earned by a hand.** Overshoot only follows something a person did with momentum, such as a thumb press. Programmatic changes are critically damped. On the website, overshoot exists only inside drawings, never as a scale bounce on a character.
5. **Declines are calm.** A decline happens in front of a queue. It gets no shake, no red flash, no buzzer, no looping alarm and no shopper name: just the banner, a cross-fade and one soft tone. TAKE CASH is urgent, but it doesn't loop either.

---

## 2. Tokens

### 2.1 How tokens live in code
- **Where they live.** The project bans imported `.css` and `:root` overrides, so role tokens are **keys of one TS module** (`motion.settle`, `motion.frame` …). Their CSS values are Astryx token references such as `var(--duration-fast)`. This doc writes them as `--motion-<role>`.
- **Naming rule.** If a role is ever emitted as a CSS custom property, its name must not start with an Astryx motion table name: `navigation`, `paging`, `picker`, `progress`, `scroll`, `segmented`, `springs`, `switch-control`, `timing` or `zoom-media`. Astryx reserves `--motion-<table>-<role>` for its internal roles (for example `--motion-springs-settle`; see `core/dist/motion/roles.js`).
- **Theme.** Leave `defineTheme`'s `motion` unset, which keeps Astryx's defaults (`tempo` 1, `character: 'standard'`).
  - `expressive` (`cubic-bezier(0.3, 1.2, 0.5, 1)`) would overshoot every Astryx popover and menu, the terminal included, which breaks principle 4.
  - `crisp` (`cubic-bezier(0, 0, 0.2, 1)`) starts slower than `standard` (`cubic-bezier(0.24, 1, 0.4, 1)`), which costs the counter time.
  - The expressiveness lives in the drawings and in four springs instead.

### 2.2 Durations and easing (tweens)

| Token | Astryx token | Value at tempo 1 | Easing | Use |
|---|---|---|---|---|
| `--motion-instant` | none (no transition) | 0 ms | — | keypad digits, amounts, terminal screen swaps, focus ring, going offline |
| `--motion-tap` | `--duration-fast-min` | 130 ms | `--ease-standard` | press-down: scale 0.97 or the pressed overlay, on pointer-down |
| `--motion-hover` | `--duration-fast` | 175 ms | `--ease-standard` | hover colour; link underline draw (`scaleX`, origin left) |
| `--motion-fade` | `--duration-fast` | 175 ms | `--ease-standard` | icon swaps; **every reduced-motion cross-fade** (within Astryx's 200 ms cap; replaces MOTION-3D's provisional 150 ms) |
| `--motion-exit` | `--duration-exit` | 175 ms | `--ease-exit` | anything leaving |
| `--motion-enter` | `--duration-medium-min` | 310 ms | `--ease-entrance` | section entrances, popovers, nav on load |
| `--motion-surface` | `--duration-medium` | 410 ms | `--ease-move` | route cross-fade, panels, poster→canvas swap |
| `--motion-stage` | `--duration-medium-max` | 550 ms | `--ease-move` | heading line reveals |
| `--motion-ripple` | `--duration-slow-max` | 1300 ms | exponential envelope | thumb-press ripple, from start to fully faded (§4.5) |
| `--motion-ambient` | `--duration-slow-max` | 1300 ms per wave | linear | terminal "waiting for thumb" wave |

Never use `ease-in` on interactive UI (playbook §2.1). `--ease-exit` accelerates and is only for things leaving.

### 2.3 Frame and light tokens (website)

| Token | Value | Meaning |
|---|---|---|
| `--motion-frame` | 1/12 s = 83.33 ms | One drawing ("on twos" at 24 fps). Every drawn change snaps to this grid. |
| `--motion-hold-key` | ≥ 4 drawings (333 ms) | Shortest hold for a key pose. |
| `--motion-blink` | 3 drawings (250 ms): half-closed, closed, half-closed | One blink. The 3×4 eye sheet has one closed cell; the half-closed drawing is optional. Without it, a blink is 1 closed drawing (83 ms) bracketed by the current gaze. |
| `--motion-blink-gap` | random 3.5–7 s (uniform), 15% chance of a double blink | Time between blinks. |
| `--motion-vignette-loops` | 3 | Loops a vignette plays per visit before it holds on its key pose (§4.3). |
| `--motion-sway` | period **6 s** (confirmed), amplitude **1% of scene width** (down from MOTION-3D's provisional 1.5%) | Bulb pendulum on the light layer. 6 s is 0.17 Hz, close to the 0.2 Hz band where slow oscillation causes discomfort (Apple), so the amplitude stays small and it runs only while its section is in view. |
| `--motion-dim` | **0.15** (confirmed) | The room dims 15% during press-and-hold, with the counter left unmasked. In: `--motion-press` spring. Out: `--motion-settle` spring. |
| `--motion-ripple-lockout` | **1.5 s** (confirmed) | The ripple can't retrigger, which keeps it under 3 flashes per second (WCAG 2.3.1). |

**Light runs continuously, not on twos** (MOTION-3D's default, confirmed). The light belongs to the world, not the drawing, and stepping it at 12 fps would make the shadows strobe.

### 2.4 Springs (UI only: buttons, layout, the press dim, the settled seal)

The springs are defined in Apple's terms: damping ratio ζ and response R in seconds. The other columns are exact conversions:
- **Motion:** `bounce = 1 − ζ`, `visualDuration = R / 1.2`. Motion sets stiffness to `(2π / (visualDuration × 1.2))²`.
- **Physics:** stiffness = (2π/R)², damping = 4πζ/R, mass 1. These are also the Android Compose values: `spring(dampingRatio = ζ, stiffness = k)`.
- **anime.js:** `spring({ bounce: 1 − ζ, duration: R × 1000 })`. anime uses Apple's perceptual-duration formula.

| Token | Use | Apple ζ / R | Motion (use this) | Motion physics k / c | anime.js v4 | Astryx mapping | Reaches 90% / 99%, overshoot |
|---|---|---|---|---|---|---|---|
| `--motion-press` | Release after a press, button return, hold cancel, dim in | 1.0 / 0.25 | `{type:'spring', visualDuration:0.208, bounce:0}` | 631.7 / 50.27 | `spring({bounce:0, duration:250})` | None. Astryx's own press release is a fade on `--duration-exit`. | 155 / 265 ms, 0% |
| `--motion-settle` | Default state change, `layout`, amount moving to the header, dim out | 1.0 / 0.40 | `{type:'spring', visualDuration:0.333, bounce:0}` | 246.7 / 31.42 | `spring({bounce:0, duration:400})` | = `springs.sliderRelease` / `springs.subMenuBack` | 248 / 423 ms, 0% |
| `--motion-glide` | Large surfaces: panels, sheets, route-level layout | 1.0 / 0.55 | `{type:'spring', visualDuration:0.458, bounce:0}` | 130.5 / 22.85 | `spring({bounce:0, duration:550})` | = `springs.stateChange` (SwiftUI default) | 341 / 582 ms, 0% |
| `--motion-land` | The money moment: the success seal in the terminal | 0.7 / 0.50 | `{type:'spring', visualDuration:0.417, bounce:0.3}` | 157.9 / 17.59 | `spring({bounce:0.3, duration:500})` | = `springs.emphasis` (SwiftUI `.bouncy`) | 210 / 255 ms, 4.6% |

Two traps, both verified in the library source:
- **Motion's `{bounce, duration}` form drops velocity.** In `motion-dom` 14.14, a spring resolved from `duration` "starts from rest": `inheritVelocity` returns 0.
  - Always use `visualDuration`, or stiffness and damping, so an interrupted spring keeps its velocity.
  - For reference only, the duration forms are: press 0.367 s, settle 0.588 s, glide 0.808 s, land 0.783 s.
- **anime.js defaults `bounce` to 0.5** when only `duration` is given (`setValue(parameters.bounce, .5)`). Always pass `bounce`.

### 2.5 Gesture constants (not themeable, like Astryx's own)
- **Hold to commit:** 500 ms (Astryx `LONG_PRESS_DURATION_MS`). The hold cancels if the pointer moves more than 10 px (`LONG_PRESS_ALLOWABLE_MOVEMENT_PX`).
- **Haptic patterns:** reuse Astryx `HAPTIC_VIBRATION_PATTERNS`:
  - selection `[5]`, impactLight `[8]`, impactMedium `[12]`
  - notificationSuccess `[8, 60, 12]`, notificationWarning `[12, 80, 12]`

---

## 3. Library decision

**The website no longer needs a scroll-choreography library.** The page is now:
- landing sections that enter once
- vignettes that start and stop with visibility
- at most one pinned section
- two pointer interactions

Each of those has a smaller existing answer:

| Need | Tool | Why not more |
|---|---|---|
| Section entrances (triggered once) | Motion `whileInView` / `inView` (already installed) | — |
| Starting and stopping vignettes | `IntersectionObserver` + the shared ticker (§4.1) | — |
| The one pin | CSS `position: sticky` + Motion `useScroll` to pick the active step | a pin-spacer library is overkill for one sticky section |
| Wheel smoothing | Lenis `1.3.27` (pinned in MOTION-3D) | — |
| Every UI spring, `AnimatePresence`, `layout`, reduced motion | **Motion** (`motion/react` 14): *the primary UI library*, on the website and in the merchant app | — |
| Whatever an Astryx component already animates (Popover, Drawer, BottomSheet, Switch, Toast, `usePanGesture`, `useAnimator`) | the Astryx component | wrapping it in Motion means animating it twice |
| Lighting | three.js / WebGL2, per `MOTION-3D.md` | — |
| Hover colour, simple opacity | CSS transitions on Astryx tokens | — |

**GSAP vs anime.js v4: neither is needed now.**
- If `WEBSITE.md` later adds **two or more pinned sections, or a scrubbed timeline**, use **GSAP ScrollTrigger**, not anime.js.
  - ScrollTrigger has pin spacing, `anticipatePin`, and `refresh`/`invalidateOnRefresh` after fonts and images load.
  - It has `ignoreMobileResize` for `100dvh`, and labelled timelines with `labelsDirectional` snapping.
  - anime.js 4.5's `onScroll` scrubs but has no pin spacer.
  - GSAP is also the reference's stack, and its free licence now covers ScrollTrigger and SplitText.
  - Until that happens, adding GSAP is a fourth library with no job.
- **anime.js has no job either.** Motion covers UI, and plain CSS/JS covers line splitting for the few heading reveals (§4.4). I recommend removing it (§9).

**Why Motion stays primary:**
- Its springs carry velocity through an interruption (`visualDuration` and physics springs inherit velocity).
- It has React exits and layout (`AnimatePresence`, `layout`) and one reduced-motion switch.
- It runs transform and opacity on WAAPI, off the main thread.
- Its `frame` loop is the shared ticker (§4.1).
- The merchant app gets Motion + Astryx only: one physics vocabulary that ports to Compose with the same ζ and k.

---

## 4. Website

### 4.1 The shared ticker (MOTION-3D depends on this)

**There is one loop: Motion's `frame` scheduler.** It is already running for UI springs, so it adds no extra cost. There are no other `requestAnimationFrame` loops on the page. A single module, `ticker`, registers keep-alive callbacks in Motion's ordered phases, so reads come before writes:

| Motion phase | Work, in this order |
|---|---|
| `frame.read` | `lenis.raf(timestamp)`. Read the scroll position, cached section rects (re-measured only on resize) and the pointer values that handlers wrote to a plain store. |
| `frame.update` | For each *playing* frame player: `index = floor(elapsed × 12) mod frames`, flagged dirty only if it changed. Gaze cell and blink state. Light uniforms: sway phase, `--motion-dim` spring value, ripple age. Visibility comes from `IntersectionObserver` flags set outside the loop. |
| `frame.render` | One `drawImage` per *dirty* frame layer. The WebGL light layer draws if any uniform changed (MOTION-3D §4: render on demand). Motion's own DOM animations write in the same frame. |

Rules for the ticker:
- **Timestamps come from the ticker, never from `Date.now()` in callbacks.** Every vignette and the light read the same `timestamp`, so a frame index, a light value and a DOM text change always land in the same frame.
- **Lenis:** `new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false, anchors: true })`.
  - Lenis lerp 0.1 is frame-rate independent and reaches 90% of a wheel step in about 0.37 s.
  - Touch keeps native momentum.
  - Inner scrollers get `data-lenis-prevent`, and `lenis.stop()` runs while a dialog is open.
  - Lenis is **not created** in reduced motion, and the ticker then reads native `scrollY`.
- **When to sleep.** The ticker unsubscribes (zero work) when no vignette is playing, no spring is moving, no ripple is running, and sway is off or out of view. A `visibilitychange` to hidden stops everything.
- **Pointer handlers write numbers only.** `pointermove` writes into the store and never calls `setState`.

### 4.2 Load sequence (no preloader)

| When | What happens |
|---|---|
| First paint (SSR) | The hero vignette's **key pose shows as a plain `<img>`** (`fetchpriority="high"`, explicit size). It is the LCP candidate and causes no CLS. The headline and nav are also painted, all opaque: the page is complete without JS. |
| Hydration | The headline words settle with a transform only (`y: 0.25em → 0`, `--motion-settle`, 30 ms stagger, max 8 words). They stay opaque throughout, so LCP is never delayed. |
| Hero atlas decoded | The `<img>` is swapped for the frame canvas **on the identical drawing**, so nothing pops. The vignette and Rasheed's blinks start. The nav and sub-copy enter (`--motion-enter`, y 12 px, 60 ms stagger). |
| ≤ 1.2 s after hydration | The sequence is done. Any wheel, key or pointer-down during it jumps everything to the final state. |

Notes:
- It plays once per session (`sessionStorage`).
- There is no loading screen and no 0–100% counter.
- VIDEO.md's hero MP4 is the **no-JS and Save-Data fallback** and the social clip. On the page, the hero is the frame player, because it needs a transparent background and the live thumb.

### 4.3 The vignette frame player (12 fps rules)

**Source:** generated 24 fps loops, keeping every second frame (ART-PROMPTS), so playback is 12 fps with each drawing held for one `--motion-frame`.

**Timing rules:**
- Drawing index = `floor(elapsed × 12)`. Never interpolate, cross-fade, blend or motion-blur between drawings: ghosting kills the drawn look. The only exception is the reduced-motion key-pose cross-fade (§6).
- **Anticipation, overshoot and holds come from the drawings,** never from CSS or JS. There is no scale bounce, squash or tween on a character layer. The prompts ask for "holds on the key poses". If a generated loop has key-pose holds shorter than `--motion-hold-key`, fix it in the frame export by duplicating index entries in the sequence JSON (no new art, no extra bytes).
- **Seamless loops:** the last drawing must lead into drawing 0 (ART-PROMPTS asks for matching first and last frames). Drop a duplicated end frame at export so the seam has no double hold.
- **Mixing rates:** vignettes step at 12 fps. Everything else moves at display rate (60/120 Hz): section entrances, text, UI springs, the light layer. Nothing on a vignette layer moves smoothly. All vignettes use locked cameras, so there is nothing to mix inside a vignette.
- **A missing drawing holds the previous one.** Never show a blank, a spinner or a placeholder.

**Starting and stopping:**
- **Start** when the vignette is ≥ 25% visible (`IntersectionObserver`, `threshold: 0.25`) and its atlas is decoded. On first entry it starts at drawing 0. On later entries it resumes where it stopped (the loops are seamless, so either point is clean).
- **Stop** when it falls below 25% visible, when the tab is hidden, or after `--motion-vignette-loops` (3) loops. A loop always ends on drawing 0, its key pose, so it never freezes mid-action.
  - A stopped vignette restarts when it re-enters view or when the pointer moves over it.
  - This saves battery and keeps the page calm after a judge has seen each scene.
  - The visible **Pause motion** toggle covers WCAG 2.2.2 (§6).
- **At most 3 vignettes play at once.** In practice that's the Problem section's three side-by-side loops. Others hold their key pose until there is room.

### 4.4 Sections: entrances and the one pin

- **Section entrances (triggered once at 35% in view, never reversed on scroll up):**
  - The heading reveals by **lines** with a line mask, `y: 100% → 0`, `--motion-stage`, 60 ms per line. Split with a small line-measure helper after `document.fonts.ready`, and re-split on resize. The parent keeps the full accessible text and the pieces are `aria-hidden`.
  - Body text fades as one block with `y: 12px` on `--motion-enter`.
  - The vignette's container fades in on `--motion-enter`. The drawing itself doesn't scale.
  - Never split body text by word or character. Never split Urdu by character, because Nastaliq ligatures break. Line splits are fine in RTL.
  - Stagger is at most 6 items (`--motion-stagger`: 60 ms per line, 40 ms per object).
  - Numbers appear as static final values (principle 3).
- **Pin only where it earns it: "How it works" on fine pointers ≥ 1024 px wide.**
  - The section is `position: sticky` for 4 steps of 60 dvh scroll each.
  - Motion `useScroll` picks the active step (0–3). The active step's text enters (`--motion-enter`) and its vignette **cuts** to drawing 0 on the next `--motion-frame`. There is no cross-fade between vignettes, because a cut reads as editing and a fade reads as ghosting.
  - Scroll only chooses the step: the vignette itself keeps looping on time, not scrubbed.
  - On touch, narrow screens and in reduced motion, the four steps stack as plain sections with no pin.
  - No other section pins.
- **Banned:** scroll-jacking (wheel to slide), page-wide scroll snapping, skew on scroll velocity, custom cursors, device-orientation tilt (it triggers an iOS permission prompt).

### 4.5 Live interactions

**Rasheed's eyes (atlas: ART-PROMPTS §4, a 3×4 sheet)**
- **Cells:** centre, up, up-right, right, down-right, down, down-left, left, up-left, and closed (2 cells are empty). Packed as one atlas with offset metadata, with the eyes drawn on a layer over the head.
- **Choosing a cell.** Take the vector from the eye centre (cached on resize) to the pointer:
  - inside a dead zone of 8% of the viewport's short side → **centre**
  - otherwise one of 8 sectors of 45° by angle
  - **Hysteresis:** the angle must pass a sector border by 8° before the cell changes. This stops flicker on the borders.
- **No smoothing.** Real eyes jump (saccades), so the cell swaps instantly, but at most once per `--motion-frame`, which keeps it on the 12 fps grid.
- A jump to the opposite sector triggers a blink, which is natural and hides the jump.
- **Idle and touch:**
  - After 4 s without pointer movement, or on a touch device, the eyes go to a per-section look target (the scanner, the customer, the viewer).
  - On touch, a tap sets the look target for 2 s.
- **Blinks:** `--motion-blink` every `--motion-blink-gap`, independent of the gaze.

**Press-and-hold thumb (atlas: ART-PROMPTS §4, 6 stages: 1 hovering, 2 touching, 3 pressed flat, 4 sensor glowing, 5 glow fading, 6 lifted)**

The target is a real Astryx `<Button>` over the scanner, with a name such as "Hold thumb on scanner to pay PKR 180". The final copy is `CONTENT.md`'s.

| Time | Drawing | Light layer (MOTION-3D §3.2) | DOM |
|---|---|---|---|
| Rest | 1 | — | — |
| Pointer-down (frame 1) | 2 | `uHoldDim` → `--motion-dim` (0.15) on `--motion-press` | press feedback on `--motion-tap`; a hold ring fills linearly over 500 ms |
| +250 ms | 3 | dim holds | ring at 50% |
| **+500 ms commit** (same frame for all) | 4, held 4 drawings (333 ms) | dim holds, nothing pulses: the drawing carries the moment | `navigator.vibrate([12])` where supported (the visitor's finger is on the screen) |
| +833 ms **settled** | 5 for 2 drawings, then 6 held | ripple starts (`uPressT`), runs `--motion-ripple` (1.3 s). Envelope decay is 2.4/s, so it's under 5% by 1.3 s. MOTION-3D's provisional 2.2/s and 1.4 s are replaced. | the banner text "PAYMENT SUCCESSFUL — PKR 180 RECEIVED" (exact DOM numbers) appears on frame 1; a polite live region announces it |
| settled + 1.3 s | 6 | `uHoldDim` → 0 on `--motion-settle`; ripple gone | banner stays until the next press |
| settled + 2 s | back to 1 | — | — |

Notes on the table:
- The 333 ms "checking" beat is illustration timing, not a claim about speed. The "< 3 s" claim stays in text.
- The lockout (`--motion-ripple-lockout`, 1.5 s from settled) ignores new presses. The button is `aria-disabled` and its state is announced.

**Cancelling and other inputs:**
- **Cancel** (released before 500 ms, or moved more than 10 px): the drawings step back 3 → 2 → 1 at 12 fps, the ring returns on `--motion-press`, and the dim releases on `--motion-settle`.
- **Keyboard and assistive technology:**
  - Holding Space or Enter for 500 ms works the same way.
  - A `click` with `detail === 0` (keyboard or AT activation) commits immediately.
  - The focus ring stays visible throughout.
- **The website is silent:** no sound.

### 4.6 Hover and press feedback
- **Press:** pointer-down responds in one frame (`whileTap` scale 0.97 on `--motion-tap`). Release springs back on `--motion-press`, starting from the current value.
- **Hover:** only under `(hover: hover) and (pointer: fine)`, on `--motion-hover`. Hover-in and hover-out take the same path.
- **Link underline** draws left to right with `scaleX`.
- **Focus ring** appears instantly and is never animated.
- **Disabled controls** have no hover or press motion.
- **Astryx components** keep their own press model.

### 4.7 Page transitions
- **Same-document View Transitions** via React's `<ViewTransition>`. Next 16.4.6's bundled App Router React exports it (checked in `next/dist/compiled/react`).
  - root cross-fade on `--motion-fade`
  - the brand mark is the one shared element (`view-transition-name`)
  - where unsupported, the swap is instant
  - no config flag was found, so spike it first to confirm route changes trigger it
- Never use a View Transition for in-page state; use Motion `layout`.
- The terminal has no page transitions: screens swap instantly.

---

## 5. Merchant app motion (View A)

### 5.1 States

| State (SPEC) | Motion | Sound | Haptic |
|---|---|---|---|
| **IDLE / amount entry** | Digits, backspace, clear and presets use `--motion-instant`. Keys use Astryx's press highlight only. | none | none |
| **Charge → WAITING_FOR_THUMB** | The amount moves to the header with `layout` on `--motion-settle`. It doesn't block: a thumb result interrupts it. The waiting indicator lights the brand mark's arches from inner to outer as an opacity wave, one wave per `--motion-ambient` (1.3 s), **4 waves, then static** (WCAG 2.2.2; nothing loops at the counter). The text shows from the start. Expiry shows as text from 30 s left, with the digits changing in place. | none | `impactLight` on the Charge tap |
| **Thumb contact → checking** | On the frame the scanner reports contact, the arches fill solid (`--motion-tap`) and the label reads "Checking". An indeterminate trace runs along the arches at constant speed. There are **no fake steps, no %, and no minimum time**: a fast answer simply skips this state. | none | none (the hand is on the scanner, not on the phone) |
| **SUCCESS (settled)** | On the response frame, the panel and text are at full contrast **on frame 1**: "PAYMENT SUCCESSFUL — PKR 180 RECEIVED", the net amount and the measured `processing_ms`, all static. The seal lands with `--motion-land` (scale 0.6 → 1), the only bouncing element in the app. | success tone | `notificationSuccess`, only in demo mode (the cashier pressed a simulate button) |
| **DECLINED_LOW_BALANCE / LIMIT / THUMB_LOCKED / ACCOUNT_INACTIVE / UNREGISTERED_THUMB** | The panel and text appear on frame 1, and the icon cross-fades on `--motion-fade`. No scale, no shake, no colour flash, no shopper name. The entrance is the same for each; only the copy and icon differ. | decline tone | `notificationWarning` in demo mode |
| **DECLINED_DUPLICATE_TAP** | Neutral info treatment: no seal and no second celebration. | none | none |
| **DECLINED_TERMINAL_THROTTLED** | A persistent paused screen with a 10-minute countdown in text (tabular digits change in place). | decline tone, once | none |
| **CHARGE_LOCKED / EXPIRED / CANCELLED** | "START A NEW SALE", cross-faded on `--motion-fade`. | none | none |
| **Offline: TAKE CASH** | Client-side and instant (`--motion-instant`): the full-screen banner appears on the next frame and the Online indicator flips at once. No pulse, no loop. On reconnect the indicator cross-fades on `--motion-fade`, but the banner **stays** until the cashier dismisses it. | take-cash tone | `impactMedium` if the cashier's tap caused it (the demo toggle) |
| **Cancel / New Sale** | The banner leaves on `--motion-exit`, the amount clears instantly, and the keypad is live on the same frame. | none | `selection` |

### 5.2 Timing budget inside "under 3 s"

| Segment | Budget | Motion's share |
|---|---|---|
| Thumb contact → visual acknowledgement | 1 frame (≤ 16.7 ms), never more than 100 ms | press feedback only |
| Capture → token (scanner; 0 in demo) | ≤ 800 ms | the indeterminate trace, off the critical path |
| Sign + network + `fp.api_thumb_pay` (`processing_ms`) | ≤ 1,500 ms at p95 | none |
| Response → banner legible | ≤ 1 frame | **0 ms**: text never fades in |
| **Legible total, worst case** | **≤ 2.32 s, with 680 ms of headroom** | |
| Seal reaches 99% / settles | +255 ms / +700 ms | after the banner is legible, so it never counts |

### 5.3 Haptics and sound

- **Causality.**
  - Haptics fire only where a hand is on the device: Charge, Cancel, the simulate buttons, and the owner's hold-to-confirm Void.
  - Everyone at the counter hears the outcome, so outcomes get a sound.
  - Outcomes get a haptic only in demo mode, where the cashier's own tap caused them.
- **Harmony.** The banner state commit, `AudioBufferSourceNode.start()` and `navigator.vibrate()` run in the same ticker callback.
  - Sounds are pre-decoded `AudioBuffer`s in an `AudioContext` that is resumed on the cashier's first tap (browser autoplay policy). That keeps latency at 20 ms or less.
  - Never use `<audio>`: its latency is 100 ms or more.
  - The Android port uses `HapticFeedbackConstants.CONFIRM` and `REJECT` (API 30+).
- **Utility.** There are exactly three sounds:
  - **success:** short and rising, ≤ 300 ms
  - **decline:** one soft low note
  - **take-cash:** a distinct descending three-note figure, recognisable without looking
  - There are no key clicks and no sounds on neutral states. Sounds follow media volume, and terminal settings have a mute switch.
  - If SPEC §13 #4 (the spoken Urdu confirmation) is built, it replaces the success tone.

### 5.4 What never animates
- keypad entry, presets, backspace, clear
- amount changes
- going offline
- screen and tab switches
- focus ring, caret, selection
- inline field errors in the staff consoles
- the View B ledger: sort, refresh and hover are instant, and counters never count up. A newly arrived row gets one background tint that fades over `--duration-slow`, with no movement.
- the app has no Lenis and no smooth scroll

---

## 6. Reduced motion, reduced transparency, increased contrast

**The mode** is `prefers-reduced-motion: reduce` **or** the site's visible **Pause motion** toggle in the nav. The toggle also satisfies WCAG 2.2.2 for the looping vignettes and blinks.
- **Motion:** `MotionConfig reducedMotion="user"`, plus our own check for the toggle.
- **Lenis:** not created.
- **Astryx's rule applies:** with a mouse, changes are instant; with touch, they become an opacity cross-fade on `--motion-fade` (≤ 200 ms).

| Animation | Reduced motion | Reduced transparency | Increased contrast / forced colours |
|---|---|---|---|
| Vignettes | Each shows its **key pose** (drawing 0) as a still. If a vignette has a second key pose (for example "before / after the thumb"), it cross-fades between them on `--motion-fade` when the section enters, once. No loops. | — | — |
| Blinks | Off | — | — |
| Rasheed's gaze | Kept: it is user-driven, in place and small. Cells still swap instantly. | — | — |
| "How it works" pin | No pin: four stacked sections | — | — |
| Section entrances, headline settle, line reveals | None: the text is simply there | — | — |
| Lenis | Not created; native scroll | — | — |
| Light sway | Off: static light | Light layer off | Light layer off; canvas hidden under `forced-colors` |
| Press-and-hold thumb | Still a 500 ms hold. Two drawings (1 and 3) cross-fade on press. The ring fills as a linear stroke. At commit, a static dim + static rings frame cross-fades in on `--motion-fade` and out after 1 s (MOTION-3D §6). The banner appears instantly. | Dim off | The ring gets a solid contrasting stroke |
| Hover and press scale | Colour or overlay change only, no scale | — | The overlay becomes a border token |
| Glass surfaces (if TYPE-AND-COLOR uses them) | No blur or scale "materialise": fade only | Solid surface token, `backdrop-filter: none` | Solid surface + a defined border |
| View Transitions | Off (instant) on fine pointers; a root fade on touch | — | — |
| Terminal: arches wave, checking trace | Static lit arches + text; checking is a static label | — | Arches at full opacity |
| Terminal: seal `--motion-land` | Appears at once (a fade on touch), no scale | — | — |
| Terminal: banners, TAKE CASH | Unchanged (they already appear on frame 1) | Opaque panels | Panel border token; no state shown by tint alone |
| Sounds, haptics | Unchanged: they carry information, not motion | — | — |

---

## 7. Performance

**Properties**
- Animate on the compositor only: `transform` and `opacity` for entrances and UI.
- A frame change is one canvas `drawImage` of one atlas cell, at most 12 times a second per vignette, and only when the index changes.
- Never animate `width`, `height`, `top`, `left`, `margin`, `padding` or `box-shadow`, never animate `background-position` on large layers, and never animate `backdrop-filter` per frame.

**Frame budget**
- 16.7 ms per frame at 60 Hz, and 8.3 ms on 120 Hz phones (never assume 60).
- Our JS uses ≤ 4 ms per frame on a 4× throttled CPU.
- No long animation frame over 50 ms during scroll or an interaction.
- INP < 100 ms.

**will-change**
- Never in static CSS.
- Set `will-change: transform` only on the pinned section's moving parts while it is active.
- At most 6 promoted layers outside canvases.
- Never on text blocks: scaled text renders blurry.

**Frames: atlases or separate files?** Atlases, one per vignette. The two interaction sheets each get one too.

| | Atlas per vignette (chosen) | A file per drawing (the reference) |
|---|---|---|
| Requests | 1 per vignette, 24–36 drawings | 1 per drawing |
| Decode | 1 `createImageBitmap`, off the main thread | dozens of decodes, which can jank |
| Size | cells trimmed to the moving bounding box, with offsets in a JSON file | transparent padding in every file |
| Limit | each atlas ≤ 2048 × 2048: 16 MB decoded (w × h × 4) | — |

- **Static backgrounds.** Each vignette keeps a static plate (counter, shelves) drawn once, plus a trimmed moving layer. Only the pixels that change are stored per drawing.
- **Format.** Lossy WebP with alpha at quality about 80. Drawings are exported at display size × DPR, capped at 2 (1.5 on phones).
- **Over budget.** If a 6 s vignette (72 drawings) won't fit in one atlas or in the per-vignette budget below, split it into 2 atlases. If it still doesn't fit, ship that one vignette as alpha video at 12 fps: VP9 WebM, plus HEVC `.mov` for Safari. Decide per vignette at export, not up front.

**Budgets and preloading**
- **Transfer budgets:**
  - hero (poster + hero atlas + eye atlas + thumb atlas): ≤ 600 KB
  - each other vignette: ≤ 1 MB
  - the whole page: ≤ 8 MB, never loaded all at once
- **Decoded memory:** ≤ 128 MB resident on desktop, ≤ 64 MB on phones.
- **Loading window:** decode a vignette's atlas when its section is within 1 viewport of entering view. Fetch, but don't decode, when it is within 2 viewports. Evict (`bitmap.close()`) when it is more than 3 viewports away.
- **One decode per frame:** start at most one `createImageBitmap` per frame, and none during an active pin scroll.
- **Preload hints:** `<link rel="preload">` only for the hero poster and hero atlas.
- **Save-Data** (`navigator.connection.saveData`): key poses only, which is the reduced-motion art path, and no loop atlases.

**Light layer**
- Owned by `MOTION-3D.md` (0.5× resolution, render on demand).
- It must use the shared ticker and must sleep with it.

**Measurement plan (how to show 60 fps under throttling)**
1. **Chrome DevTools Performance**, 4× and 6× CPU slowdown, "Fast 4G":
   - Record: the load; a full scroll down and back up (vignettes starting and stopping, the pin); Rasheed's gaze; the hold → commit → ripple; each terminal state.
   - Pass: ≤ 5% dropped frames per recording and no task over 50 ms. Image Decode events must sit off the main thread.
2. **Rendering tab:**
   - Frame Rendering Stats, paint flashing and layer borders.
   - Emulate `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` and `forced-colors` to check every row of §6.
3. **Real devices** via `chrome://inspect`: a mid-range Android phone for the site (§9) and the actual terminal device for the app.
4. **Automated:** Playwright with CDP `Emulation.setCPUThrottlingRate(4)` runs the interactions while collecting `long-animation-frame` entries and frame deltas from the ticker. It fails if p95 frame time > 16.7 ms, any long animation frame > 50 ms, or INP (web-vitals) > 100 ms.
5. **Lighthouse CI**, mobile: LCP < 1.5 s and CLS < 0.05.
6. **Memory:** use DevTools Memory or `performance.measureUserAgentSpecificMemory()` at the bottom of the page and confirm decoded memory is within budget, so eviction works.
7. **Terminal:** `performance.mark` at response parse, then at the next ticker render after the banner commits. That gap must be ≤ 16.7 ms on "Slow 4G".
8. **MotionScore** (the `motion-reviewer` agent) for the app's Motion code. Its methodology needs the Motion+ MCP, which isn't authorised in this session.

---

## 8. Hand-off to other docs
- **WEBSITE.md:** for each section, name its vignette, loop length, key pose(s) for reduced motion, and look target for Rasheed's eyes. Pin "How it works" only, per §4.4.
- **Frame and asset list:** for each vignette, give the drawing count, its trimmed moving layer and static plate, the atlas split, and the key poses. Draw or approve the key poses first: reduced motion and Save-Data use only those.
- **MOTION-3D.md:** use §4.1 (the ticker) and §2.3. Sway amplitude becomes 1%, the ripple runs 1.3 s with a 2.4/s decay, and reduced-motion fades use `--motion-fade` (175 ms).
- **VIDEO.md:** the hero MP4 is the fallback, not the hero. Its film-only UI sounds (a keypad tick) don't apply to the terminal app, which has no key clicks.
- **TYPE-AND-COLOR.md:** the thumb moment is a dim plus white rings, never a coloured glow.
- **APP.md:** uses §5 as written.

## 9. Open questions for the user
1. **anime.js:** it now has no job. Remove the dependency, or keep it for something you have in mind?
2. **GSAP:** not needed for the landing page as specified. Add it only if `WEBSITE.md` grows more pinned or scrubbed sections. Agreed?
3. **Test devices:** which mid-range Android phone is the 60 fps reference for the site, and which phone will be the terminal?
4. **Terminal sound:** on by default with a mute switch? And should the prototype use custom-designed tones or plain synthesised ones?
5. **Vignettes stop after 3 loops** and hold their key pose until re-entered or hovered. Is that OK, or should they loop for as long as they're in view? The Pause motion toggle is still there either way.
