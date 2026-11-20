# Page, copy, and interaction

The reading order is **promise → touch → confirmation → receipt → safeguards → close**. Each section has a single job. Layout and copy remain intelligible when images, motion, and JavaScript are unavailable. Give the stage, checkout example, and safeguards stable anchor targets `#how-it-works`, `#checkout-example`, and `#safety`.

## Opening

The wordmark anchors the top left. Use simple links for **How it works** and **Safety** and one **See checkout** button. At narrow widths keep the wordmark and the checkout action in view. The section links can move into the page flow when they no longer fit. An accessible **Skip to content** link precedes the header.

| Element | Copy |
|---|---|
| H1 | Pay by touch. |
| Explanation | A thumb at checkout. The terminal confirms the payment, and the shopper gets a receipt by SMS. |
| Main action | See checkout |
| Stage link | Watch the touch |
| Disclosure near the actions | Student prototype · simulated payments |

On desktop place the copy slightly above the optical center on the pale ground. Give the right side to the sunlit showroom. Include the limestone counter edge, diagonal window shadow, small black reader, and approaching hand in the first view. On a short phone viewport prioritize the headline, explanation, checkout action, disclosure, and a portrait crop where the reader is still visible within the patch of daylight. Render the first image and main copy from the initial HTML. **Watch the touch** jumps to the start of the stage through a regular anchor. The main button opens the checkout dialog immediately, including while the sequence loads.

## The touch and the confirmation

Use the [film storyboard](MOTION.md). Leave the opening copy behind once the hand and reader take over. Use only two pieces of stage text.

| Beat | On-screen text |
|---|---|
| The terminal comes into view | 180.00 · Waiting for thumb |
| Camera comes to rest | **Settled.** |

After the dark reveal, align a short line under the large word in the same column on compact screens and offset it to the right on desktop. Use **The cashier sees the result on their own terminal.** The confirmation text must be real HTML and appear in reading order. The video or image sequence illustrates it. It should be announced only as normal page content, since a scroll is moving through a story rather than processing a live transaction.

## Checkout proof

Return to a solid white surface. Begin with **One sale, from start to finish.** The left side holds the short exchange. The right side holds an upright Android screen or an accessible replica of the same demo state. The rest of the copy stays on a single reading column on mobile.

> Cashier: Your total is 180.00.  
> Shopper: I’ll pay by thumb.  
> Terminal: Settled.

Display the amount in the same position at each step. Use **See checkout** to open the dialog from this section. After the final step, expose the shopper’s sample SMS and a compact accounting record.

| Checkout result | Example |
|---|---:|
| Sale amount | 180.00 |
| Merchant fee | 0.81 |
| Net to merchant | 179.19 |

The SMS and accounting record have different audiences. The SMS sample can read “FingerPay demo receipt. Payment of 180.00 confirmed. Reply DISPUTE if this wasn’t you. Reply LOCK to block thumb payments.” Keep shopper account balances off merchant screens. Use the same currency-neutral sample throughout the public page, labeled **Simulated checkout** near the amount. Preserve the exact arithmetic from [SPEC.md](../../SPEC.md) in the fixture. This scene illustrates a successful state. The offline and declined paths are explained in the safeguards and documented in the app refinements.

## Checkout dialog

This is a user-opened, three-step illustration of one simulated sale. Use a native `<dialog>` or an equivalently accessible implementation. The first frame is the same amount panel that opens the stage’s app shot. Desktop uses a panel about 720 px wide with comfortable margins; compact screens use a bottom sheet with a safe-area inset and a scrollable body. At large text sizes the sheet can take the full available height.

| State | What the viewer sees | Controls |
|---|---|---|
| Enter amount | “The cashier enters the amount.” The terminal shows **180.00** under **Simulated checkout**. | **Continue** · **Close** |
| Waiting | “The shopper touches the reader.” Keep the amount where it was and show the reader contact area. | **Simulate thumb tap** · **Back** · **Close** |
| Settled | **Settled**, then the fee and net to shop. The shopper’s receipt sits outside the merchant screen and can be expanded under **View sample SMS**. | **Replay checkout** · **Close** |

All buttons are real controls. The amount is fixed for the demonstration and needs no input. One scoped polite status announces the result after the explicit simulated tap. Keep the current step stable on resize. **Replay checkout** returns to the first step. Escape, a visible Close control, and a deliberate mobile swipe on the sheet handle dismiss. Background interaction is inert while the sheet is open and focus returns to the trigger when it closes. Keep the page at its prior scroll position. Include the prototype disclosure in the dialog, including an accessible footer link or visible short disclosure with the full text applied where required by the spec.

The marketing dialog uses local fixtures. It must work without staff sign-in and must neither create a charge nor call a live terminal endpoint. Keep the dialog’s initial state reachable through a normal anchor to the inline example when JavaScript is unavailable.

## Safeguards

Use one editorial block with three rows. Headers are useful explanations, and the text can be read without operating a control.

| Heading | Text |
|---|---|
| No fingerprint images stored | The design uses a keyed hash of a scan token. The student prototype uses simulated inputs. |
| The shopper can lock by SMS | Reply LOCK to block thumb payments. Reply DISPUTE to report a payment. Both commands are illustrated in the sample receipt. |
| If the connection drops, take cash | The terminal does not queue a digital charge. Declines carry no fee. |

Use the receipt’s fee line to explain what was deducted in this example. Keep any timing language as a target or a clearly labeled demonstration until there is measured end-to-end evidence. A real timer, if introduced for the demo, starts when the demo input is received and stops on the exact simulated confirmation event.

## Close

End with **Leave the wallet at home.** and one **See checkout** action. Show a project contact action only when there is a confirmed destination. The full disclaimer belongs in the footer and in the demo console per the spec.

> FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.

Use the wording as supplied by the project spec, including the semicolon in the prescribed disclaimer. Omit partner logos.

## Android refinement for the capture

Keep the app recognizable as the existing merchant terminal. Refine the checkout flow and capture states before changing navigation or other screens. Follow Android conventions for back, safe areas, text scaling, and 48 dp touch targets. The Apple references inform hierarchy and physical feedback.

- **Home.** Put store identity, connection state, and net settled above the actions. Keep Charge as the main action and Freeze visibly distinct. An empty ledger reads “No sales yet” after loading completes. Describe a failed service connection in plain terms and leave a path back to live data through Refresh.
- **Amount and waiting.** Put the amount in a stable position across entry, waiting, and result. Keep Cancel reachable on the waiting screen. The demo shopper tray is staff-only in the native prototype. Visually distinguish it from guidance intended for real reader hardware.
- **Results.** Give settled, declined, offline, and result-unknown states distinct text and actions. A decline hides the shopper’s name and shows zero fee. A lost reply after payment starts tells the cashier to check Activity before starting another charge. Money is formatted from the exact API values.
- **Screenshot continuity.** Use the same bezel, viewport, crop, and store throughout. Hide system notifications. Use a redacted fictional session or dedicated demo environment. Capture clean waiting and confirmed states as separate images, and capture a declined or offline state only for the safeguards if it improves the explanation.
