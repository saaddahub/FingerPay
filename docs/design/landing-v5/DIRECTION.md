# Creative direction and visual system

## The idea

A thumb touches a counter reader and the shop sees a payment settle. The site should feel calm because it follows that one action closely, saves its largest visual move for the confirmation, and gives the viewer the same evidence the cashier would see.

Design for a judge or potential partner opening the site cold. In the first viewport they should be able to say what FingerPay is, who uses it, and where to see it work. After the demo, they should be able to explain what the cashier sees, how the shopper gets a receipt, and what happens if the network drops. The interaction should read like product evidence.

## References and design decisions

| Reference | Observation | FingerPay application |
|---|---|---|
| Santal | The sunlit sofa reference makes scale, texture, and shadows tangible. The opening’s spatial movement gives way to oversized philosophy headlines. | Start with a design showroom, framed like an interior photograph. Move from the room into the Android terminal’s waiting panel, settle the camera, and give the result word its own interval. |
| Adam Perlis | A compact, tactile opening control gives one action a strong material presence. His product work has an identifiable screen, a specific action, and an outcome. | Give the demo trigger and transport controls one restrained glass treatment. Let a viewer try the transaction with explicit controls and a clear end state. |
| Apple | Motion follows the physical origin of an action, feedback is brief, and layered materials distinguish controls from content. | Scroll sets the film directly. The dialog opens from its trigger and can reverse. Use frosted glass on floating controls and solid surfaces behind amounts, receipts, and other text. |
| Your portfolio | The navigation uses a 16 px blur with edge definition. Pointer response uses spring motion, including `stiffness: 150`, `damping: 15`, `mass: 0.1`, and an input gain of `0.3` for the magnetic control. | Reuse these values on the inner face of the desktop floating control, capped to 3 px in either axis. Keep its outer hit target fixed. The sheet has separate release physics. |

[Santal](https://santalarch.com/) · [Adam Perlis](https://adamperlis.com/) · [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) · [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

## Ground, type, and layout

Start in a pale, nearly white space. The black chapter begins when the screen fills the camera. Return to white when the receipt becomes readable. Reserve green for a successful status with a text label.

| Role | Light | Dark |
|---|---|---|
| Ground | `#F8F8F6` | `#101112` |
| Primary text | `#101112` | `#F8F8F6` |
| Secondary text | `#565854` | `#AAAEAB` |
| Functional outline and neutral status | `#696C68` | `#AAAEAB` |
| Settled status | `#006341` | `#83DEB6` |

Primary text measures 17.78:1 on both solid grounds. Secondary text measures 6.76:1 on light and 8.42:1 on dark. Settled green measures 6.90:1 on light and 11.78:1 on dark. These ratios describe the solid tokens. Test glass and text over actual imagery separately. Borders that merely separate rows can be quieter than outlines required to identify controls.

Use Instrument Sans Variable for the landing page. Use the browser system sans stack if it fails. Use tabular figures for money and aligned columns. Set regular body copy at 16–18 px with line height 1.5 and a maximum measure of 56 characters. Use 13–14 px for supporting metadata. The first headline sits at weight 450–500, `clamp(3rem, 7.6vw, 7.5rem)`, with tight tracking around −0.055 em. The dark chapter earns weight 700 and around −0.065 em. Set **Settled.** at `clamp(4rem, 14vw, 13rem)` and fit the word at 320 px without horizontal scrolling or cutting off the readable glyphs. Amounts and disclosures remain comfortably legible when text size increases.

Use a 12-column desktop grid with a 1,280 px content maximum, 48–72 px outer gutters, and one dominant alignment per section. Use 6 columns at tablet widths and 4 at compact widths with 20–24 px gutters. The hero uses about five columns for copy and seven for the interior image. Its compact version places copy and actions above a portrait crop that keeps the window shadow, reader, and approaching hand in one composition. Keep 96–144 px between regular desktop chapters and 64–96 px on compact screens. The stage can go full bleed. Its captions and actions land back on the reading grid.

## The sunlit showroom

Set the opening at a checkout counter in an unbranded design showroom. A tall window outside the frame throws late-afternoon sun across a single slab of honed limestone and onto a pale plaster wall. Use one recessed shadow line at the base of the counter and a quiet patch of reflected light on the wall. The black reader is the smallest and darkest object in the composition. Shoot slightly above counter height, with enough depth to separate the front edge, reader, and distant wall. The room should feel specific through its architecture and materials. Keep signage, addresses, storefront branding, and regional retail props out of the frame.

The reader sits just inside the edge of the sunlight. Its satin black shell, flush glass, and shallow chamfer catch the window as the hand comes in. Preserve the same window direction and shadow geometry in the wide shot, the macro shot, and the phone composite. Use warm direct light and cooler room bounce, with detail in both the bright stone and the shaded reader. Let the stone show fine pores and the glass a controlled reflection. The thumb should cast a soft approaching shadow that tightens at contact.

Shoot the interior and hand or render them with physically consistent lighting, then composite the actual Android screen. Keep the warmth in the image while the page keeps its near-white and black grounds. Use a synthetic ridge study or a staged fingertip with no usable biometric detail. The optical moment illustrates a simulated reader.

Floating navigation and the panel’s top controls can use the portfolio’s layered glass language. Start with a 16 px blur, a narrow inset highlight, and an outer shadow derived from `0 10px 30px`. Tune the light navigation to a background around 84% opaque and the dark controls around 82%. Keep the checkout dialog’s copy and numbers on a solid or near-solid surface. Give reduced-transparency mode, forced colors, and the CSS feature fallback solid backgrounds and a clearly visible outline. Cap glass at two simultaneous small surfaces with one backdrop sample per surface.

The wordmark should be black, optically spaced, and compact enough to sit beside one nav action. Use the current FingerPay mark at favicon and native-app sizes for recognition through this pass. If a fresh symbol is explored, use the short offset seam visible where the fingertip meets the reader as the starting shape. Review it at 16, 24, and 48 px in both polarities before choosing to replace the current mark. The camera’s focal point is the app’s transaction state; the mark has a supporting role.

Keep decoration sparse. The composition earns its detail through the object, lettering, and exact lighting. Use plain text links and buttons with generous target areas. Keep a native cursor, normal scrolling, and clear focus. Skip dot navigation, fingerprint line-drawing loops, particles, cloned phone mockups, badges, sound on load, and rows of interchangeable feature cards.
