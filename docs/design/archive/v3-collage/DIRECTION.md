# FingerPay website: design director's call

Written by: the `frontend-design-director` skill, as an independent second opinion. It was written without reading `WEBSITE.md`; a later merge reconciles the two.
Inputs: `docs/design/BRIEF.md`, including the **Direction decision** (illustrated, not 3D) and its **UPDATE** (a landing page with one illustrated vignette per section, not a scroll story); `docs/design/ART-PROMPTS.md` (the cast, the palette and the vignette prompts); `PRODUCT.md`; `docs/SPEC.md`; `brand/fingerpay-logo-source.png`; and sections 2–5 of the user's playbook.
Scope: the marketing website only.
- `ART-PROMPTS.md` owns the illustration style. This doc directs how that art is used on the page.
- `TYPE-AND-COLOR.md` picks the fonts and hexes, `MOTION.md` sets the timing tokens, and `APP.md` owns the terminal screens.

> **Supersedes** two earlier drafts of this call: a 3D frosted-glass mark, then a one-evening scroll story. Two ideas carry over because they still fit a landing page: one PKR 180 sale used as the running example everywhere, and a "try to break it" outcome selector.

---

## 0. Intake gate (existing UI or from scratch)

- **Website:** start from scratch (`src/app` has no pages yet).
- **Brand:** keep it. Use the mark and wordmark exactly as drawn in `brand/` SVGs. Never regenerate the mark, and never typeset "FingerPay" in the site font.
- **Merchant terminal screens:** they come from `APP.md`, are rendered as real DOM on drawn devices, and are labelled **"Prototype screens"**. There's no shipped app to capture.
- Recorded as the assumed answer; confirm in Open questions, item 1.

---

## 1. Archetype

**Primary: fintech trust, in the "aspirational trust" mode (about 70%). Secondary: a character-led brand landing page, using the skill's mixed case "consumer fintech": fintech credibility with consumer clarity and emotional benefit.**

- **Why fintech is primary:** judges and investors aren't buying or signing up. They're deciding whether a thumb alone is believable and safe. So the fintech rules govern the page:
  - put the trust proof next to each risky claim
  - treat disclosures as designed content
  - no invented proof
  - visual calm
- **Why the secondary influence:** the illustrated cast supplies the emotional benefit, the memorability, and the specific place (a Lahore kiryana). It makes a regulated idea feel human without hiding its mechanics.
- **Not a scroll story** (user correction). Sections stand alone. A judge can land on any section from the nav and understand it without the one above.
- **Not product-led SaaS:** there's no trial, and the only app is the merchant's. No "download" call to action, because shoppers need no phone.

**The tension, resolved:** the user wants "as much purposeful animation as possible", but fintech trust wants calm. The answer: **the cast moves; the money doesn't.** Vignettes loop warmly at 12 fps. Amounts, banners and SMS text are crisp type that changes state cleanly with critically damped motion. Nothing about money bounces, loops or plays backwards.

---

## 2. Concept

> **This page should feel like a well-run corner shop: warm people, a counter where everything is exact, because judges need to believe a thumb is enough to pay and that it's safe.**

**The governing rule: people are drawn; money is typed.**
- **Drawn:** everything human or physical is illustrated (the vignettes from `ART-PROMPTS.md`). The art contains no text, by design.
- **Typed:** everything FingerPay says or does is real DOM text set on or beside the art: the terminal screen, banners, amounts, SMS, the Risk Engine checks, fees and the disclaimer.
- This split matches what the art pipeline already requires (generators garble letters). It keeps every claim legible, selectable, translatable and checkable, and it *is* the product story: a human counter with a precise machine underneath.

**One running example:** wherever the page shows a sale, it's the same **PKR 180 sale** (fee PKR 0.81, net PKR 179.19). Each section stands alone, but the numbers never change, so the page feels like one honest system rather than a set of mock-ups. This is the Linear lesson (one work object, many evidence views), without a narrative.

**One recurring device: the counter line.** Every vignette stands on the same drawn wooden counter edge, which runs full-bleed as the page's horizon.
- It ties together standalone sections with different layouts.
- It gives a different section structure a shared visual floor (Stripe lesson: a stable frame while the artifact changes).
- Vignettes with no counter (bus stop, walking) stand on the same line as a plain ground line.

---

## 3. Compositions considered (hero)

**A: "Over the counter". Selected.**
- Full-bleed, 100dvh. The H1 spans the empty space above the cast (the hero prompt reserves it).
- The vignette sits on the counter line at the lower 60%.
- The phone-on-stand in the art carries the live DOM terminal screen.
- The scanner in the art is a real button.
- Composition is centred on the *act* (thumb meets scanner), not on a product shot. This is neither headline-left/object-right nor a centred headline over a card row.

**B: "Split counter". Rejected.**
- The headline on the left half, the vignette on the right half. This is the rejected layout with a drawing swapped in.

**C: "Character parade". Rejected.**
- All three characters lined up under the headline as a cast intro. Pretty, but it explains nothing about payment, and it drifts toward a mascot strip.

---

## 4. Page structure (evidence-backed)

This is the user's section list, kept in order. Each section has **one job, one proof artifact, and its own geometry**, and no two adjacent sections share a layout.
- The proof mode alternates: demonstration → contrast → mechanism → product proof → controls → inclusion → numbers → disclosure.
- Working titles only; `CONTENT.md` owns the copy.

| # | Section | Job (what the judge must believe) | Vignette (from `ART-PROMPTS.md`) | Proof artifact (DOM) | Live interaction | Layout (desktop / mobile) |
|---|---|---|---|---|---|---|
| 1 | **Hero** | "A thumb pays, in under 3 s, with no phone, card or cash" | "One-tap moment" loop; press strip (§4 of the art file); Rasheed's eye atlas | Terminal screen on the drawn phone-on-stand: `PKR 180.00 — WAITING FOR THUMB` → checks → `PAYMENT SUCCESSFUL — PKR 180 RECEIVED`, net 179.19 · fee 0.81 | **Press the scanner** (runs the sale); **Rasheed's gaze** | 100dvh, H1 above the cast, counter line at about 62% height / H1 on top, the cast cropped to the counter, terminal banner docked as a bottom sheet |
| 2 | **Problem** | "Today's checkout fails both sides" | 3b screenshot squint (large), 3a no change, 3c no phone (small) | One factual caption per vignette | none | **Asymmetric 7/5:** the screenshot vignette spans 7 columns; the other two stack in 5. Never three equal tiles / large vignette first, then the two small ones side by side |
| 3 | **How it works** | "Four steps, in this exact order" | The four 1:1 step loops | Step text (PDF §3, with "Risk Engine verifies") + the terminal state for each step | **Step rail** (tabs 1–4): one stage swaps the vignette and terminal state; auto-advances once per loop while in view; pausable | **One stage + rail, not a 4-up grid:** the stage is 7 columns, the rail is a vertical list in 5 / the rail becomes a horizontal segmented control above the stage |
| 4 | **For shops** (the app as proof) | "The shopkeeper gets certainty on his own screen, every outcome, no screenshots" | Rasheed at closing time with chai | **Outcome selector ("try to break it"):** success, low balance, unregistered thumb, duplicate tap, above limit, locked thumb. Each shows the exact SPEC banner, PKR 0 fee on declines, no names on declines. Plus a ledger crop (first name + initial, settled rows only) and the offline `TAKE CASH` state | **Outcome selector** (radio group) and an **internet toggle** | **Bento 5/7 then 7/5:** the vignette with its live phone; the selector + banner; the ledger crop; a fixed fee table / vignette → selector → ledger, one per row |
| 5 | **Safety** | "No fingerprint image is ever stored, the owner can lock it, and limits cap the damage" | Ayesha at the bus stop, locking her thumb | (a) A mechanism strip: scan stays in the scanner → token → keyed HMAC → match, labelled "simulated in the prototype". (b) SMS "Reply LOCK" with the lock confirmation. (c) Per-tap limits PKR 5,000 / 2,000 and PKR 0 declines. (d) **"What isn't solved yet"**: the 1:N table and the production path (SPEC §4.4) | **Reply LOCK** demo (sets a locked state that the For-shops selector respects) | **Zig-zag:** vignette in 5 columns with the mechanism strip in 7; then lock and limits as a 7/5 row; then the limits table full-width / vignette, strip, lock, then the table, which scrolls horizontally *inside* its own frame |
| 6 | **Every phone** | "Every shopper feature works over plain SMS, on the most basic phone" | Bilal walking out, phone buzzes | A large **static** keypad-phone prop (art prop sheet, item 6) with the real SMS receipt as DOM text; phone number shown as the last 4 digits only; Reply DISPUTE / LOCK listed | none (a static proof) | The vignette spans the left 8 columns on the counter line; the phone stands at the right, larger than life, overlapping the line / phone first, then the vignette |
| 7 | **Numbers** | "Every number here is real" | none: a deliberate pause from the art | **The numbers set as a receipt:** one column, tabular figures, ruled rows. Gross PKR 180.00 · fee PKR 0.81 (0.45% above PKR 100, cap PKR 25) · net PKR 179.19 · thumb to settled: under 3 s · decline fee PKR 0.00 · per-tap limit PKR 5,000 / 2,000 | none | A narrow receipt column (about 420 px) centred on the counter line, with wide margins on both sides / full-width with 16 px gutters |
| 8 | **Footer** | "This is an honest student prototype" | Shutter half down, Rasheed waving | The exact disclaimer from `PRODUCT.md` in body-size text (never tiny grey); team credit; fictional-persona note; "Press again ↑" back to the hero | none | The vignette on the counter line with the disclaimer column beside it, aligned to the shutter / vignette above the disclaimer |

**Rules that come with this structure:**
- **No grid of equal tiles anywhere.**
  - The art file's problem trio and the four 1:1 steps are the two places a 3-up or 4-up grid would creep in.
  - Problem uses a 7/5 hierarchy (the screenshot scene is the strongest merchant pain).
  - How it works uses one stage with a rail (ElevenLabs lesson: a stable selector shell with changing content).
- **DOM screens go only on props that don't move.**
  - A screen that moves frame to frame can't carry crisp text without per-frame tracking.
  - The hero phone-on-stand and the For-shops phone have locked camera framing, so each stays registered: verify the screen corners across all frames of the loop.
  - Bilal's moving keypad phone stays a blank lit rectangle; his SMS goes on the separate static prop.
- **Fee figures are fixed values, never computed in the browser.**
  - The For-shops table shows the terminal presets with SPEC's rule (0% at or below PKR 100; 0.45% above; half-up):

    | Sale | Fee | Net |
    |---|---|---|
    | PKR 80 | PKR 0.00 | PKR 80.00 |
    | PKR 150 | PKR 0.68 | PKR 149.32 |
    | PKR 180 | PKR 0.81 | PKR 179.19 |
    | PKR 500 | PKR 2.25 | PKR 497.75 |

  - Verify each value against the database fee function (the `npm run test:db` vectors) before shipping.
  - **The cap never bites in the prototype:** the PKR 25 cap is reached only at about PKR 5,556, which is above the PKR 5,000 per-tap limit. State the cap, but never show a demo hitting it.
- **Shared demo state:**
  - Reply LOCK in Safety sets `bilal.locked`. In For shops, "Bilal pays PKR 180" then returns `PAYMENT DECLINED: THUMB PAYMENTS ARE LOCKED BY THE OWNER`.
  - One **Reset demo** control clears it.
  - The state is in-memory only, never sent or stored, and is fictional sample data.

---

## 5. Using the art (style direction on top of `ART-PROMPTS.md`)

`ART-PROMPTS.md` already fixes:
- the line: even weight in ink `#1C1C1F`
- the fill: flat cel colour, one shadow tone per colour
- the palette: chai, turmeric, chilli, bottle green, tarp blue, warm paper, ink
- the cast sheets

This section only directs how the art lives on the page and how it stays unique.

### 5.1 Page ground versus art

- **The page ground must not become cream editorial** (rejected design 1). The art's warm paper `#EFE9DE` is a *clothing and prop colour*, not the page colour.
- **Ground recommendation:** a light, low-chroma neutral that is clearly cooler and lighter than `#EFE9DE`, so the art's warm tones read as warmth inside a modern frame, not as old paper. Add **one dark ink band** for rhythm (the Numbers receipt, or For shops).
  - On dark, cut-out art loses its ink outline, so a vignette never sits directly on the dark band.
  - `TYPE-AND-COLOR.md` sets the values and confirms the contrast.
- **The UI accent is separate from the art palette.** The art legitimately uses several colours (it's illustration). **The UI uses one accent, meaning "settled"**: the PAID banner, the received amount, the SMS receipt tick, and the focus ring.
  - It must harmonise with the art palette. A good candidate is the art's own bottle green or turmeric, desaturated for UI contrast, so the accent feels native to the art. That's `TYPE-AND-COLOR.md`'s call.
  - Declines carry no colour: ink and text only, calm and private.
  - Chilli red is never used for declines in the UI (no alarm styling, no "this person is broke" signal).
- **Glow:** the art's "sensor glows softly" is a drawn, flat light shape, which is fine. Any code-drawn press effect is neutral light spill on the drawn surfaces only. No bloom, no coloured halo (playbook).

### 5.2 Making the generated art feel hand-made and ours

- **Re-time every loop.** Generated video is smooth 24 fps motion, which reads as AI tweening.
  - Keep 12 fps "on twos", then **collapse near-duplicate frames into held key poses**, like a hand-drawn animator would.
  - Target **16–36 unique drawings per loop**, not 48–96.
  - That's both the craft signature and the weight budget (§6).
- **Clean every kept frame:**
  - registration (no drift of the counter, the stand or the screen)
  - matte edges after background removal (no white fringe on the page ground)
  - colour corrected to the palette
  - on-model against the chosen sheet
  - Reject frames with warped hands, melting faces or morphing props, even in a single frame. One bad frame in a loop ruins the craft illusion.
- **Make it unique to FingerPay and the kiryana world, without cliché:**
  - **Use the specifics the art file already chose:** the shalwar kameez, the dupatta and tote, the keypad phone, bread and milk, the jar of sweets, the chai, and the half-down shutter.
  - **Add only observed details** if more are needed: hanging sachet strips, egg trays, a steel cash drawer, a weighing scale.
  - **Never add:** truck-art borders, flags, crescents, "Pakistan green" floods, calligraphy as texture, real brands, recognisable currency, or poverty or sepia nostalgia.
  - **Signature motif from the brand:** the mark's flat-ended nested arcs appear in code only. They form the press ripple on the scanner (three concentric flat-ended arcs drawn in ink, expanding once) and the section dividers. The generated art stays clean; the brand geometry belongs to the system layer, consistent with "people are drawn; money is typed".
- **Originality test:** cover the wordmark. The page should still read as *this* product in *this* place, through the counter line, the scanner at the centre of every sale, and the cast.
- **Never copy rule:** human-md.ai gives the technique (frame poses at 12 fps, layered art, a code-drawn gaze) and the level of craft. Never its characters, layouts, palette or fonts (Bricolage Grotesque, Instrument Serif and Cutive Mono are all excluded).

### 5.3 Conflicts to settle before generating (raised for the user, not edited)

- **Personas drift from SPEC/PDF.**
  - The art file makes Rasheed mid-40s; the PDF has him at 52.
  - The art file makes Ayesha a late-20s office worker; the PDF has her as a 34-year-old schoolteacher.
  - Pick one version so the site, the demo seed and the pitch agree (Open questions, item 3).
- **The For-shops phone is "at a slight angle".** DOM UI on an angled screen needs a CSS perspective transform, which blurs text and breaks the straight-UI rule. Ask for the screen **facing the viewer head-on** in that prompt.
- **Bilal "holding an old keypad phone"** matches the SMS story. Keep it: a non-PTA smartphone would contradict "SMS on any phone", because a blocked phone can't receive local SMS.

### 5.4 Type character (the money's voice)

Constraints for `TYPE-AND-COLOR.md`:
- **The character:** an Apple-restrained, tight grotesk that sits beside the SF-style wordmark.
  - **Tabular lining figures,** so an amount like PKR 179.19 can show its decimals smaller.
  - At least three weights.
  - It contrasts with the soft drawn world: precision against warmth.
- **Budget:** two families at most. An optional mono is for raw machine truth only (HMAC hex, outcome codes).
- **No serif and no hand-lettered face:** the art already supplies the hand.
- **Excluded families:** Geist, Instrument Serif, Bricolage Grotesque, Cutive Mono, Inter, Manrope, Satoshi, General Sans, Cabinet Grotesk, Clash.
- **Candidates:**
  - **Mona Sans** (OFL; variable weight and width)
  - **Host Grotesk** (OFL)
  - licensed **Neue Montreal** or **Aeonik**, if there's budget
  - mono: **Martian Mono** or **JetBrains Mono**

### 5.5 Geometry

- **Desktop (1440 × 900):** 12 columns, 64 px margins, 24 px gutters, 8 px base unit.
  - **Hero H1:** 56–64 px, line-height 1.05, tracking −0.025em, at most 2 lines, set above the cast.
  - **Section heads:** 40–48 px.
  - **Body:** 18 px, 65ch or less.
- **Mobile (390):** 16 px gutters.
  - H1 36–40 px; section heads 28–32 px.
  - Every vignette gets its own crop. A 16:9 loop is reframed to the characters' bounds, never shrunk to a strip.
- **Section rhythm:** vary it on purpose. Airy hero (100dvh) → compact problem (about 96 px vertical padding) → tall interactive stages (How it works, For shops) → a quiet narrow Numbers receipt.
- **Headings:** bound to their content (space above at least 2× the space below).
- **Bento cells:** 24 px outer radius and 24 px safe inset; nested radii derive from the outer radius. Vignettes are never boxed inside cards: they stand on the counter line in open space.
- **Device screens** (DOM on drawn props) stay straight. No skew or rotation.
- **Px values here are design intent.** The build maps them to the nearest Astryx spacing and radius tokens, using components rather than raw `<div>`s.

---

## 6. Interaction model

**The vignette player** (one tiny shared component):
- **Format:** each loop ships as **one sprite atlas per vignette** (AVIF with alpha, WebP fallback) plus a JSON manifest of frame rects and hold durations.
- **Playback:** at 12 fps, with each frame index snapped to 1/12 s and holds expanded from the manifest. No tweening between drawings, ever.
- **When it plays:** only while at least 50% of the vignette is in view. It pauses offscreen and on hidden tabs, and it decodes before it enters the viewport (`img.decode()` / `createImageBitmap`, preloaded at 1.5 viewports away).
- **A visible "Pause animations" toggle** in the nav covers WCAG 2.2.2, because the loops run longer than 5 s. The preference is remembered (with a try/catch around storage).
- **Reduced motion, or paused:** each vignette shows its **key frame** (the chosen PNG from the art pipeline). Every live interaction still works.
- **No JS:** the key frame image and all copy are visible.

**Five live interactions, each proving a different claim:**

1. **Press the scanner (hero).**
   - The drawn scanner is a native `<button>`. One click, tap, Enter or Space runs it; **holding is never required** (WCAG 2.5.1).
   - It plays the 6-stage press strip, and the code-drawn arc ripple expands once (about 400 ms).
   - The terminal DOM then ticks the five checks (account active · thumb not locked · not a duplicate · within limit · balance OK). About 2.0 s later the banner switches to PAID in the accent colour: net and fee, then "SMS receipt sent to ••••", with the last 4 digits from fictional sample data.
   - Rasheed's nod frames play *after* the banner. The animation never shows success ahead of the state.
   - A caption under the scanner reads: **"Sample only. Your screen doesn't read fingerprints, and nothing is captured."**
   - These timings are illustrative choreography inside SPEC's "under 3 s". They're never printed as measured per-stage numbers.
2. **Rasheed's gaze (hero).**
   - The eye atlas from the art file (9 directions + blink) follows the cursor within about 400 px of the counter. The shopkeeper notices his next customer: the visitor.
   - Blinks every 3.5–7 s, at random.
   - Touch: the eyes follow the last tap.
   - Reduced motion: a fixed glance, still blinking.
3. **Step rail (How it works).**
   - Tabs with arrow keys. Selecting a step swaps the vignette and the terminal state together.
   - It auto-advances once per loop while in view, and stops for good on the first manual selection.
4. **Outcome selector + internet toggle (For shops).**
   - A radio group; every outcome changes the banner (exact SPEC copy), the fee line, Rasheed's expression, and the owner-alert SMS where SPEC sends one.
   - The internet toggle shows `INTERNET DOWN — TAKE CASH IMMEDIATELY (SALE NOT CHARGED)`.
   - Banner changes are announced with `aria-live="polite"`.
5. **Reply LOCK (Safety).**
   - A DOM button on the SMS shows SPEC's lock confirmation and sets the shared locked state that interaction 4 respects.
   - The Reset demo control sits beside it.

**Motion around the art:**
- **Section entrances:** at most a 16 px rise plus opacity, with a critically damped spring. Content is visible by default in the HTML, never hidden waiting for a scroll observer.
- **Lenis smooth scroll** is on by default and off under reduced motion. There's no pinning or scroll-jacking: a landing page scrolls normally.
- **Tools:** `animejs` v4 and `motion` (both installed) handle UI choreography. Three.js isn't needed at all on this page. GSAP isn't needed. Don't add a dependency for what the frame player and CSS can do.
- **Hover:** decorative hover effects only on fine pointers. Every control has visible focus and touch targets of at least 44 px.

---

## 7. The hero moment

1. **The idle frame (what a judge sees with no interaction):**
   - The H1 above the cast.
   - Ayesha and Rasheed at the counter, idling in their loop.
   - The live terminal on the phone-on-stand reads `PKR 180.00 — WAITING FOR THUMB`, decimals smaller.
   - A "student prototype" chip near the H1, linking to the disclaimer.
   - The prompt "Press the scanner".
   - The static frame alone states the product. There's no autoplay of the sale.
2. **Gaze:** the cursor nears the counter, and Rasheed's eyes find it.
3. **The press:** the strip plays, the ink arcs ripple once from the scanner, the five checks tick, the banner switches to PAID (accent), net PKR 179.19 · fee PKR 0.81 appear, the SMS line follows, and Rasheed nods.
4. **The settle:** the caption confirms that **no fingerprint image was stored, only a keyed code**. A "Press again" control resets it.

**Performance:**
- **LCP element:** the H1 text.
- **First paint:** the hero key frame (AVIF, 120 KB or less) is preloaded.
- **Atlases load after first paint:** the hero loop is 350 KB or less; the press strip and eye atlas are 150 KB or less, loaded on first pointer movement or at idle.

---

## 8. Quality bar and review checklist

A build is **not reviewed** until each line has evidence: screenshots at the stated viewports, recorded interaction states, and measured numbers. A static capture doesn't prove motion, and a compile check doesn't prove quality.

**Truth**
- [ ] The disclaimer from `PRODUCT.md` appears word for word in the footer at body size, linked from the hero chip.
- [ ] It's the "Risk Engine", never "AI".
- [ ] Only SPEC numbers appear. Fee values match the `test:db` vectors.
- [ ] No partner logos, testimonials, press, invented stats or prices. The PDF's "20+ screenshots" figure is absent unless sourced.
- [ ] Personas are labelled fictional and match the decided ages and roles.
- [ ] Privacy holds on every DOM screen: no names on declines, no shopper balance on merchant screens, first name + initial, last 4 digits only.
- [ ] Banner text matches SPEC exactly.

**Art**
- [ ] Every frame is on-model against the approved sheet (face, beard, clothes, proportions).
- [ ] Hands have five fingers in every frame. No morphing props, warped faces or text artefacts.
- [ ] Loops are re-timed to 16–36 unique drawings with holds, and loop seamlessly (no pop at the wrap).
- [ ] Clean mattes (no fringe on the page ground). Props carrying DOM screens stay registered within 1 px across the loop.
- [ ] No real brands, currency, flags or religious symbols. A Lahore-native reviewer checks clothing and gestures.
- [ ] Each mobile crop is composed, not shrunk.

**Layout and visual system**
- [ ] No equal-tile grids anywhere (Problem is 7/5; How it works is stage + rail). No headline-left/object-right hero.
- [ ] Two font families at most. Each component uses three sizes and three weights at most. 8 px base unit. Nested radii derive from the outer radius.
- [ ] The page ground is not cream. One UI accent, used only for *settled* and focus, at 80% saturation or less. No pure `#000`/`#fff`. No coloured glow.
- [ ] The six unthemed surfaces are themed: selection, caret, scrollbar, focus ring, link underline, tabular numbers.
- [ ] `100dvh` on the hero, never `100vh`. Headings are bound to their content.
- [ ] Astryx rules: components and tokens, no raw `<div>`, hex or px in code. `npx astryx doctor --built <dir>` passes.

**Motion and interaction**
- [ ] Drawn frames change only on the 1/12 s grid and are never tweened. Money states never bounce or reverse.
- [ ] Animation never shows success before the state is set.
- [ ] The Pause-animations toggle works and its setting persists. Reduced motion shows key frames with every interaction intact.
- [ ] All five interactions work by keyboard and touch. The press never needs holding.
- [ ] Shared lock state is consistent between Safety and For shops, and Reset clears it.
- [ ] `aria-live` announces banner changes.
- [ ] Art images are `alt=""`, except each section's key frame, which gets a one-line description.
- [ ] With JS off, all copy and key frames are visible. One H1 and a valid heading order. WCAG 2.2 AA contrast holds. Lighthouse accessibility is 95 or higher.

**Performance**
- [ ] LCP under 1.5 s, CLS under 0.05, INP under 100 ms. Measured on a mid-range Android device (Pixel 6a / Moto G class) over throttled 4G, and on desktop.
- [ ] Art weight: hero 600 KB or less including the press and eye atlases; each other vignette 450 KB or less; 4 MB or less for the whole page. Each atlas is lazy-loaded at 1.5 viewports.
- [ ] Frame swaps are never more than one frame late. Decoded bitmap memory stays at 120 MB or less on mobile; atlases more than two sections away are released.
- [ ] No horizontal overflow at 320 / 375 / 768 / 1024 / 1440. Screenshots are saved at each.

**Evidence to save in `docs/design/REVIEW.md`**
- Desktop and mobile captures of: the idle hero, the hero after the press, each step, each outcome, offline, the lock state, the Numbers receipt and the footer.
- Keyboard-only, reduced-motion, paused and JS-off runs.
- Web Vitals numbers.
- Known gaps, and the revision made after the first render review.

---

## 9. What would make this generic, and how this direction avoids it

| Generic failure | How this direction avoids it |
|---|---|
| Illustration as spot art beside feature cards | Every section's proof is a live DOM screen *on* or beside the drawn scene; there are no card rows |
| Problem trio or steps as equal 3-up / 4-up tiles | A 7/5 hierarchy for Problem; a single stage + rail for How it works |
| Smooth AI-video motion that reads as generated | Re-timed to held key poses at 12 fps on twos, with per-frame clean-up and rejection |
| Pakistan by symbols | Only observed kiryana specifics; banned list in §5.2 |
| Pastel fintech characters with no mechanism | Safety shows the token → HMAC strip, Thumb Lock and the 1:N limits; For shops lets judges trigger every decline |
| Fake proof (stat counters, logos, quotes) | The numbers are set as a real receipt of the PKR 180 sale, from SPEC values only |
| Motion everywhere, calm nowhere | The cast loops while money stays still; a global pause; only the hero press is theatrical |
| A cream "storybook" page | A cool, light neutral ground, one dark band, modern grotesk type: warm art inside a precise frame |
| Copying human-md.ai | Only the technique transfers; the cast, palette and fonts are FingerPay's own (§5.2) |

---

## 10. Reference evidence

The skill's measured studies are desktop-opening captures (1440 × 1000, Sept 2026). They support layout and evidence choices, not motion claims.
- **human-md.ai:** I didn't inspect it; the technique facts come from the brief's code findings.
- **The user's wallet reel:** not viewed by me.

| Reference (evidence level) | What it supports here |
|---|---|
| Mercury, measured | Aspiration resolving into concrete jobs; disclosure near the promise (the hero chip, the body-size disclaimer) |
| Linear, measured | One work object across many evidence views (the PKR 180 sale) |
| ElevenLabs, measured | A stable selector shell with changing content (step rail, outcome selector) |
| Stripe, measured | A stable frame with a different artifact kind per section (terminal, mechanism strip, SMS, receipt) |
| Blink, measured | Text placed around the thing being explained (the H1 above the act) |
| Fintech reference notes | Trust proof beside the risky claim: limits and PKR 0 next to "thumb only"; HMAC next to "fingerprint" |

---

## Open questions for the user

1. **Intake:** confirm a from-scratch site, keeping the brand mark exactly as is, with merchant screens from `APP.md` shown as labelled "Prototype screens".
2. **Show "What isn't solved yet" (the 1:N table) inside Safety?** I strongly recommend yes: it answers the hardest technical question before a judge asks it.
3. **Personas:** use the `ART-PROMPTS.md` versions (Rasheed mid-40s, Ayesha a late-20s office worker) or the PDF/SPEC versions (52; 34-year-old schoolteacher)? The site, the demo seed and the pitch should all match.
4. **The For-shops phone:** OK to change its prompt to a screen facing the viewer head-on, so the real app UI can sit on it crisply?
5. **Page ground:** OK with a cool, light neutral page and one dark band, rather than a fully dark site? Cut-out art loses its ink outline on dark.
6. **The footer:** list the five team members' names?
