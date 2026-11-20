# Production and implementation handoff

## Brief for Claude Opus 5.5

> Use high reasoning effort. Read the four landing-v5 files and the product and payment specs before editing. First make a still composition of the opening, the terminal inside the film, and the Settled result. Then make a short in-browser motion proof of the sensor-to-phone handoff, the camera braking into the result, and reversing direction during a fast scroll. Build the checkout dialog and static reading path in parallel with asset refinement. Evaluate the whole story on a narrow touch screen before rendering the full sequence. Report measured browser results and any missing capture or asset.

The first review should be a simple HTML prototype or three still comps plus the motion proof. Approve the wide opening of the sunlit showroom first, then the contact macro and terminal handoff. Keep the review about framing, whether the light behaves consistently, whether the seam matches, and whether a judge understands the transaction. Once those work, refine the page transitions and Android content. A prototype with a visibly provisional clip or card is a working proof. Its media needs the final treatment before client review.

## Inputs and outputs

| Input | Current state | Required for the finished landing |
|---|---|---|
| Android merchant terminal | The native app exists in `android/`. It has amount entry, a waiting view, a demo shopper tray, and a result view. | Capture authentic **Waiting for thumb** and **Settled** states in a demo environment with a fictional transaction. The user’s latest supplied app frame can supersede the initial capture and needs the same crop and privacy review. |
| Film | No 240-frame landing sequence is present in the project’s public assets. | One continuous 240-frame master and the frame exports below. Ship the authored still path whenever the film package is absent. |
| Glass | Portfolio source was reviewed in `src/components/Nav.css`, `SocialMenu.jsx`, and `TiltCard.jsx` in the user’s portfolio. | Adapt the 16 px blur and bounded spring behavior from [DIRECTION.md](DIRECTION.md). |
| Brand and contact | The current brand kit is in `brand/`. | Use an approved wordmark or current mark as specified. Use a contact destination once confirmed. |

## Asset package

### iPhone storyboard reference

[FingerPay dashboard on iPhone](assets/fingerpay-iphone-dashboard.png) is the 1024 × 1536 showcase still. It uses the [actual signed-in Android dashboard capture](assets/fingerpay-dashboard-screen.png) as the display source, composited into the graphite iPhone and sunlit showroom with built-in ImageGen. The public composite uses a neutral store label and omits currency prefixes. Use the raw capture for pixel-exact interface art. The iPhone is a presentation frame for the Android prototype.

<details>
<summary>Dashboard compositing prompt</summary>

```text
Use case: compositing a real app screenshot into a product photograph. Image 1 is the sunlit graphite iPhone photograph and is the scene to edit. Image 2 is the real FingerPay merchant dashboard screenshot and is the display artwork to insert. Keep Image 1's framing, phone hardware, straight-on view, pale limestone and late-afternoon light. Replace its entire screen with Image 2, fitting the screenshot into the display while preserving the real Android dashboard layout, typography, proportion, exact outlined FingerPay ridge emblem, rounded black three-card stack, white background, true zero balances, all four circular actions, and bottom navigation. For the public preview, change only the merchant label at top to "Demo store" and remove the two "PKR" currency prefixes, leaving both existing 0 amounts and positions intact. Keep these exact labels and spellings from Image 2: "Today", "Net settled", "0 sales · 0 screenshots avoided", "TODAY", "Gross sales", "Charge", "Freeze", "Activity", "Refresh", "Home", "Sell", "Activity", "Settings". Keep all the tabs readable and fully within the display. Do not invent sales or add data, labels, buttons, or logos. This is the signed-in merchant dashboard, so remove all previous opening screen elements from Image 1, including the headline, Email fields and Sign in. The phone and original setting are otherwise visually unchanged.
```

</details>

<details>
<summary>Earlier opening-screen reference and prompt</summary>

[Opening on iPhone](assets/fingerpay-iphone-opening.png) used the [actual Android opening capture](assets/fingerpay-opening-screen.png).

```text
Use case: compositing. Edit Image 1, the graphite iPhone product photo in a sunlit limestone showroom. Replace its entire generated checkout display with Image 2, the actual FingerPay app opening screenshot. Use Image 2 as the literal, aligned display artwork and preserve the interface as faithfully as possible. Fit the 9:20 screenshot into the iPhone's display aperture with only the corner masking and the existing small Dynamic Island as hardware occlusion. Keep the screenshot's round outlined ridge mark, left alignment, white background, blank Email and Password fields, pale disabled Sign in button, and original vertical spacing. Its headline must stay "Pay with" on the first line and "nothing." on the second. Its following text must remain exactly "Sign in to run your shop's FingerPay terminal." and the footer must remain "Student prototype · integrations simulated". Do not turn the screenshot into a redesigned UI or retain any of Image 1's "180.00", "Waiting for thumb", or "Cancel sale" screen. Keep Image 1's full straight-on iPhone hardware, 2:3 portrait framing, pale limestone, plaster wall, and late-afternoon window light. No additional text or objects.
```

</details>

<details>
<summary>Earlier waiting-screen concept prompt</summary>

The [earlier concept](assets/fingerpay-iphone-checkout.png) is an illustration for planning the waiting shot. Use a real prototype capture when the animation moves into the terminal.

```text
Use case: product-mockup. Create one 2:3 portrait product photograph for the FingerPay landing film. A single upright graphite iPhone showing the FingerPay merchant checkout waiting screen, in an unbranded minimalist design showroom. Stand the iPhone vertically on a honed pale limestone counter, with a warm pale plaster wall and a diagonal late-afternoon sunlight patch from a window out of frame. Preserve realistic surface texture, grounding shadow, restrained edge reflections and cool room bounce. High-end architectural product photography and believable scale. Straight-on composition, camera parallel to the display, optical center close to the screen midpoint. Keep the whole device, including the softly rounded corners, inside the frame with roughly 10% breathing room. The screen has a white neutral background, beautiful clean black type, and no stock iOS app chrome other than the actual small Dynamic Island hardware cutout. Design an original, very spare FingerPay interface: discreet wordmark at upper left, then a centered large tabular amount and one small waiting status, then a simple black circular FingerPay mark with five gentle curved optical ridges. Use ample white space. Near the bottom a small outlined Cancel sale control and small simulated checkout label. Render the following text verbatim and only these words and characters on the device screen: "FingerPay", "180.00", "Waiting for thumb", "Cancel sale", "Simulated checkout". The focal point is the boundary between the amount and the waiting status. Keep screen typography level, unobscured by glare, and legible. No currency symbols, store names, people, retail props, exterior logos, color gradients, glow, watermarks, duplicate devices, or text outside the phone.
```

</details>

Capture the native prototype at the same viewport, density, bar style, and theme for every state. Start with a Pixel portrait capture around 1080 × 2400 or a larger lossless original. Keep a clean PNG of the screen, then apply physical reflections in the composite. Mark the waiting-panel anchor in normalized screen coordinates and record the device frame margins. The capture should contain only demo data and no notifications, credentials, account identifiers, phone numbers, or usable biometric imagery. For the public composite, crop out store and currency labels where possible. Use an approved, currency-neutral demo text overlay if the crop would hide the amount or the waiting state. Keep production ledger currency formatting governed by the product spec. Prepare an accessible HTML version of important UI text.

Render a color-managed sRGB master, 240 frames at 30 fps, with 001 and 240 as deliberate hold poses. Use original showroom imagery and an original reader and camera path. Keep a clean plate of the sunlit limestone counter without the hand, a contact reference, and the same window direction for the phone composite. Produce an animatic from the anchor frames before rendering a full sequence. Review the actual assets at web size and while changing scroll direction. Inspect the intermediate frames for jitter, stepping, compression halos, dropped geometry, sliding shadows, and changes in the fingertip across the cut.

| Deliverable | Naming and target |
|---|---|
| Wide sequence | `public/landing/checkout/wide/001.webp` through `240.webp`, 1280 × 720 delivery |
| Tall sequence | `public/landing/checkout/tall/001.webp` through `240.webp`, 640 × 1080 delivery, composed for clean center crop on tall phones |
| Critical stills | Opening, contact, terminal waiting, settled. Use optimized responsive files with fixed aspect ratios. The opening poster matches frame 001 of each rendition. |
| Capture originals | Lossless waiting and settled screens. Keep the raw captures and the composite master outside the public bundle. |
| Manifest | Frame count, dimensions, filenames, anchor frames, focal point per crop, and total transferred bytes. Check it at build time. |

The two deliveries use the same 240-frame timeline with wide and tall framing. Design anchors are **001, 025, 065, 105, 137, 185, 222, and 240**. For portrait make the edges and negative space fit the phone while preserving the position and movement of the seam. Keep all critical subjects and status inside the middle 72% of the width. Adjust the framing during the animatic if a tighter crop removes the contact or the pending amount. Avoid shipping raster copies of the large HTML headline in any rendition.

## Implementation by responsibility

- **Server-rendered page.** Keep the existing Next.js route at `/`. Render the headline, links, repeated checkout trigger, prose, disclosure, and stills as authored HTML and CSS. Reuse repository conventions and installed tools. Keep any client-side controller scoped to the scene and the dialog.
- **Scene controller.** Render a single fixed-size canvas over the poster. Use native scroll and sticky positioning. Calculate the range on load and after relevant layout or viewport changes. Scroll listeners record the latest position. One `requestAnimationFrame` chooses the target and paints if it changed. Leave the prior complete composition on-screen while any new image decodes. Pause hidden or offscreen work and release decoded frames and listeners on unmount. Feature-detect the decode path and keep an image fallback for devices where bitmap decoding is unreliable.
- **Asset loading.** Fetch the responsive poster on the critical path. After it paints and the stage is near the viewport, request nearby anchor and directional neighbor frames. Load one rendition. Favor the current target, then its local neighborhood in both directions. Keep roughly two to four fetches in flight, cancel stale unneeded requests, and evict decoded images from an LRU based on byte cost. Call `ImageBitmap.close()` where used. Under reduced motion, low data, or repeated frame misses, keep the stills and the checkout controls usable.
- **Dialog.** Use local, typed fixture state for the three steps, and the installed Motion package only where interruption or drag benefits. Use a regular section anchor to the inline demonstration as the no-JavaScript path. Present the same explanatory copy in that path. Keep outside scroll position stable, restore focus, and honor system navigation and keyboard conventions.
- **Android capture refinement.** Work with the existing Compose UI, roles, signed terminal requests, and exact money formatting. Change presentation and clarity as laid out in [PAGE.md](PAGE.md). Use a dedicated seeded environment for a working transaction capture. Keep the APK and the public marketing interaction as different delivery surfaces with their own test plans.

For this pass, the public page consumes image assets and local fixtures. Real terminal checkout stays behind staff authentication and terminal pairing. The landing page must remain testable when Supabase or the emulator is unavailable.

## Performance targets

| Item | Acceptance target |
|---|---|
| Opening assets | Poster ≤ 120 KB wide and ≤ 90 KB tall. Initial page transfer ≤ 650 KB including the poster, page CSS, public fonts, and initial JavaScript. The initial view can render before film requests. |
| Full motion | Wide rendition ≤ 6 MB transferred. Tall rendition ≤ 4.5 MB. Track encoded bytes per chapter. Adjust render noise, crop, or compression if the package overruns. |
| Decoded image memory | Budget approximately 28 MiB wide and 16 MiB tall for the canvas backing store and the retained decoded frames. Cap canvas resolution and account for decoded memory as roughly width × height × 4 bytes per bitmap. |
| Responsiveness | On a measured mid-range phone and a 4× desktop CPU throttle, seek the latest requested frame and avoid sustained jank. Use frame timing traces. Immediate press feedback is independent of network and decode work. |
| Web vitals | Target LCP < 1.5 s on a controlled desktop run and ≤ 2.5 s on representative mobile. CLS ≤ 0.05. Target INP ≤ 100 ms in the lab and monitor the field where data exists. Report test device, network profile, and actual measurements. |

If a 240-frame rendition exceeds device or bandwidth budgets, preserve all source frames and use a sparse anchor delivery or the designed still path on that device profile. The full sequence remains the primary enhanced experience wherever it meets the budget. Avoid adding a second streaming format until an observed constraint calls for it.

## Acceptance review

1. **Understand it at a glance.** At 1440 × 900 and 390 × 844 the hero makes the product legible without a gesture. The opening reads as an unbranded showroom, and the light leads the eye to the reader. A reviewer can start the demo on the first screen. The result, the fee, and the privacy boundaries remain understandable with motion disabled.
2. **Check the cut.** Compare both sides of the seam at frame 104/105. Verify the direction and character of the light, and that the phone and waiting amount are recognizable before the punch-in. The camera has braked before the word appears, and the receipt arrives without a visible floor-color seam.
3. **Stress the input.** Test fast wheel, slow trackpad, touch, Page Down, backward scroll, resize at mid-scene, and an anchor jump before images finish. Verify immediate direction changes and a clean exit from the sticky scene. Verify that no command waits behind an animation.
4. **Check the dialog.** Open from each trigger. Run all three steps, use Back, replay, open the sample SMS, and interrupt the opening with Escape. On touch try short, long, and canceled drags. Verify native in-panel scrolling, focus return, background inertness, and preserved page position.
5. **Check the content and fallback.** Test 320 px width, tablet, 200% zoom, keyboard-only use, reduced motion, forced colors, and a failed frame request. Test current Safari, Chrome, Firefox, and Android Chrome. Check large type and reduced transparency with a real media frame behind the glass. Verify that the demo works without a Supabase session and that all public claims match the prototype.
6. **Check the product proof.** In the prototype demo environment, verify the captured sale of 180.00, fee of 0.81, and merchant net of 179.19 against the configured currency and the product spec. Check that the public composite uses the neutral sample presentation. Verify that declines hide shopper identity, show a zero fee, and differ visibly from offline and result-unknown states. Confirm the receipt appears on the shopper side.
7. **Check release assets.** Validate 240 sequential images per published rendition, consistent dimensions, positive file sizes, matching posters, and memory eviction on backscroll on both profiles. Check the load with real browser network traces and the declared transfer limits before client review.
