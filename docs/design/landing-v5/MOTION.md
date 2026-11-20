# Motion and 240-frame sequence

## Signature shot

**Action:** the camera starts at the edge of a sunlit limestone counter in a design showroom. It moves along the window light toward a fingertip reaching the reader. The merchant’s terminal comes into view, carrying the same reflection. The shot moves into the native terminal screen. The camera stops and **Settled.** takes the full width of the composition.

**Input:** one vertically scrollable document. The timeline begins when the stage reaches its sticky position, follows scroll in both directions, and releases back into the page. A first-time visitor sees what to do from **Watch the touch**. The **See checkout** dialog is reachable without walking through the timeline. The scene has no autoplay on page load.

**Source:** 240 sequentially rendered images, corresponding to one eight-second master at 30 fps. This is an editorial playback equivalent. Scroll determines viewing time. The film has no numerical speed claim. Make the 240 frames from one continuous camera and compositing timeline with consistent lighting and geometry.

| Frames | Composition and movement | What lands |
|---|---|---|
| **001–024** | Frame 001 establishes the showroom. The counter edge, distant plaster wall, and diagonal window shadow give the shot depth. The black reader is a precise object against pale stone. As the hand enters, move the foreground no more than 3% of frame width, with a smaller shift in the distant wall. The shadow on each surface stays fixed to that surface. | The eye follows the light across the stone to what the hand is about to touch. |
| **025–064** | Follow the bright edge on the counter into a controlled macro push. Move focus from the counter plane to the sensor glass. Preserve the thumb’s silhouette, pressure, and contact shadow. Use roughly 4–6 frames for the last compression. The physical contact seam is the sharpest point. | The finger comes to rest exactly once. The glass gives one short highlight response. |
| **065–104** | A grazing reflection travels across a synthetic ridge relief under the glass. Hold the hand nearly still while the light travels. The highlight thins into the seam at the sensor’s far edge. | A single optical event signals the moment of contact. The cashier can still see the pending amount. |
| **105–136** | Match the reader’s chamfer and its seam to the edge of the Android glass and waiting panel, with the same window reflection briefly present on the bezel. Match the on-screen position, direction, and luminance of the line across the cut. Pull back just enough to establish the upright phone. By 136 the amount and waiting state are readable. | An actual terminal capture takes over the composition. |
| **137–184** | Advance into the waiting panel. The phone grows from less than one-third of the viewport’s shorter edge to overscan. Lock the camera onto the boundary beneath the amount. The bezel leaves the shot before the transition resolves. | The viewer understands that the camera is moving into the terminal, with the screen carrying the transition. |
| **185–210** | Continue through the lower edge of the transaction panel. The dark panel reaches every edge. Luminance and angle match on both sides of the seam. Take the last 6–8 frames to brake into a near-level black plane. | The scene comes to rest before the word enters. Leave at least four clean source frames with negligible camera displacement. |
| **211–240** | Keep frame geometry steady. Let the original status divider finish extending behind the artwork, then resolve a clean dark result ground. Set **Settled.** as a live text layer, revealed between 222 and 232. Hold the result through 240. | One bold word, a supporting sentence, and a visually separate simulated-status treatment. |

### Continuity

- On the wide crop, start with the reader seam near **(0.64, 0.60)** of the stage. On the tall crop, move it near **(0.51, 0.57)**. These are compositing targets from the upper-left, measured after rendition-specific framing.
- Match the sensor-to-phone handoff at the seam’s midpoint and tangent. Compare frames 104 and 105 with a half-opacity overlay. Target a positional discontinuity under 1% of the short edge and a tangent change under 5°. Any brief mask crossfade should sit inside the same frames and travel along the seam. A full-screen dissolve weakens the sense of one camera moving.
- The waiting-panel boundary is the zoom anchor in frames 137–184. Mark the intended point in normalized coordinates on the real screen capture. Use the same point for portrait. Camera movement should accelerate away from the established phone, feel approximately constant in perceived scale through the middle, then settle before the word. A starting curve for apparent scale is `s0 × (s1 / s0)^u`, with an eased entrance and brake applied in the render. Keep the browser mapping linear in scroll.
- Keep the sun fixed in the scene. The reflection changes as the viewer moves past the glass and the hand occludes it. Encode that change in the sequence. Check the contact shadow and window direction on both sides of the match cut before spending time on polish.
- Build the last near-black rectangle as a color-managed match to `#101112`. Check frame 240 against the CSS background on desktop and on a phone. Hold green until the completion state. Text and the explanatory disclosure come from the DOM. Raster assets may contain the text already present on the captured phone.

## Direct scroll mapping

Use native document scroll with a single sticky scene. Target **100 svh of stage plus 220 svh of scroll travel** on desktop and **100 svh plus 140 svh** on touch portrait. Read the actual sticky travel from layout so changes in browser chrome or content sizes preserve the mapping. If visual viewport height is short or large text crowds the stage, switch to the normal-flow stills.

```text
distance = max(1, sceneWrapperHeight - stickyStageHeight)
p        = clamp((scrollY - sceneStartY) / distance, 0, 1)
frame    = 1 + round(239 * p)
```

Scroll changes the target frame on the next animation frame. Wheel, trackpad, touch, keyboard, reverse scroll, and jump-to-anchor all use this same mapping. Leave the platform’s scroll physics in control. Paint the target bitmap when ready and use the nearest ready bitmap during a decode miss. Reprioritize requests from the latest scroll position so the renderer never plays an old queue in the background. Use a preloaded frame within the current chapter, or its still, for a large jump. Keep the target frame and HTML layers bound to position. If a large jump occurs before a chapter has a bitmap, show that chapter’s static treatment so the copy and image still agree.

Between frames 222 and 232 reveal the single word with a bottom-to-top mask and at most 16 px of vertical travel. Use one fixed display weight. Let the supporting sentence appear from 230 to 238 with a narrower motion range. At 240 both are fully legible. All exits reverse from the current value. On the way out, the settled divider becomes the top rule of the white receipt section. Use normal scroll to carry the white section in, with a slim overlap that matches the rule. The receipt remains reachable directly from the navigation and dialog.

## Transitions elsewhere

| Trigger | Movement | Timing and interruption |
|---|---|---|
| First view | Brand and headline already visible. The reader still can settle up to 8 px as its image decodes. | 180 ms opacity and transform. Reserve its final layout size from the start. |
| Navigation overlaps the stage | A narrow highlight travels with the glass edge. Text switches between calibrated light and dark variants across the chapter boundary. | 160–200 ms on opacity. Use two prepared color states over moving media. Keep the target areas fixed. |
| Hover and press | Desktop floating control follows the pointer by up to 3 px. Press compresses its inner surface to 0.97 and changes the highlight. | Feedback starts on pointer-down or keyboard activation. Return with the portfolio spring in [DIRECTION.md](DIRECTION.md). |
| Checkout opens | The clicked control provides the desktop entrance origin. The glass controls and solid panel seat together. On phone the sheet travels from the bottom safe area. | Desktop 260–320 ms, mobile approximately 320 ms. Use a critically damped spring. Close from the current visible pose. |
| Drag the sheet | Move the sheet 1:1 from the initial grab offset, using the handle and pointer capture. List scrolling stays native inside the panel. | Keep the last few samples for release velocity. Project 180 ms forward. Dismiss past about 30% of panel height or a deliberate downward flick, otherwise spring to open. Cancel restores the open pose. |
| Checkout advances | Keep the amount and its baseline fixed while the new state enters below it. At the tap, one short line tightens into the settled status. | 130–200 ms for the state swap. The acknowledgement begins on press. Replay, Back, and Close can interrupt motion. |
| Sample SMS opens | Unmask the text from its heading and gently introduce the accounting rows. Align all amounts on the decimal column. | 180–220 ms. Stagger at most 35 ms across three rows. Monetary values appear whole. |
| Safeguard rows and close | Give each assembly a short opacity or 8 px lift when it enters view. The final call to action stays visible immediately. | 160–220 ms, once during forward reading. No repeating idle movement. |

Use CSS for short color and opacity transitions. Use the installed Motion package for interruptible springs and pointer-driven interactions where it helps. The film itself uses canvas and a single scheduled paint. Sample transforms and opacity rather than starting independent time-based timelines in each chapter. Keep paint-heavy blur out of the scroll loop.

## Access and fallback

- Under reduced motion, show the reader contact still, terminal waiting still, and settled screen in normal document flow. Keep the same captions and text. Remove the sticky travel, zoom, magnetism, and sheet drag animation. Use an immediate state update or an opacity change up to 120 ms.
- On low-data or missing assets, use the same stills and the same interactive dialog. A failure in the animation never blocks the page or its calls to action.
- Handle a change to reduced-motion preference while the page is open by releasing the frame cache and returning to normal flow at the nearest section anchor. Without JavaScript, serve the opening image and the full inline checkout explanation in reading order.
- A single focus path covers the header, stage skip, example, dialog, safeguards, and footer. The stage cannot trap focus. The mobile drag is supplementary to a labeled Close button. Provide visible focus, 44 px minimum web targets, and appropriate status text independent of color.
