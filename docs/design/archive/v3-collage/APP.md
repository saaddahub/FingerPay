# FingerPay merchant terminal app: UI design

> **Status:** v1, 2026-11-18. Owner skills: `interface-design`, `apple-design`.
> **Builds on:** `docs/design/BRIEF.md` (binding), `PRODUCT.md`, `docs/SPEC.md` §4.1, §5 (Views A–E), §6, §11, and the user's playbook §3–5.
> **Decides:** screens, states, layout, hierarchy, materials, touch targets and the Astryx mapping for the merchant terminal (Views A and B), plus a layout skeleton for the staff consoles (Views C–E).
> **Leaves to others:**
> - fonts and colours: `TYPE-AND-COLOR.md` (this doc names *role tokens* and lists colour-world inputs)
> - springs, durations and choreography: `MOTION.md` (this doc states *intent* only)
> - final wording: `CONTENT.md` (banner strings below are SPEC §5 verbatim)
> - where they conflict: `DESIGN.md`

---

## 0. Decisions at a glance

1. **The first screen is the keypad, not a wallet home.** The cashier's verb is *charge*. The reel-style "home" (big balance, stacked cards, round glass buttons) becomes **Today**, the owner's second tab.
2. **Operate mode at the counter:** the charge runs as one full-screen, opaque, glass-free flow:
   - open charge → waiting → checking → result
   - the result is a banner that stays on screen until the cashier taps New sale; it never auto-hides
3. **Glass only on the floating functional layer:**
   - allowed: bottom bar, status capsule, sheets, round action buttons on Today
   - never on the amount, the keypad, a result banner or a ledger row
4. **Money is drawn from strings:**
   - typed amounts are whole rupees and show no decimals
   - database amounts (net, fee, balance) always show two decimals, with the decimals at half size
5. **Counter-sized targets:**
   - keypad keys 64 dp tall, Charge 64 dp, presets 56 dp, everything else 48 dp
   - every action sits in the bottom 60% of the screen; the top 40% is read-only
6. **Signature: the Arch Gauge.** The brand's nested-arch fingerprint mark is the terminal's state instrument: it waits, sweeps, closes and breaks. It is honest: it never fakes step-by-step progress.
7. **Platform:** Kotlin + Jetpack Compose for the production Android terminal. The Next.js + Astryx web POS stays the demo terminal, and the reference implementation of this spec.

---

## 1. Intent and domain

### 1.1 Who

**The cashier.** Often the owner's son, nephew or a hired helper (18–30), sometimes Rasheed himself.
- **Where:** standing behind a steel-edged glass counter under tube lights, 7–10 pm rush, three people waiting.
- **Hands:** one hand is often busy with a shopping bag, change, or the scale.
- **Phone habits:** fluent with WhatsApp and Easypaisa/JazzCash screenshots. Has never used a "dashboard".
- **Reading:** reads Urdu and Roman Urdu comfortably, English labels well enough. Reads the screen in glances of under a second.

**The owner** (persona: Rasheed Ahmed, Rasheed Kiryana Store).
- Does everything the cashier does.
- At shutter-down, and once mid-afternoon, checks: "how much came in, did it reach Allied Bank, is anything wrong?"
- The only person who can void, export, pair or revoke (SPEC §4.1).

**The five minutes around a sale (cashier)**

| When | What happens | What the screen must do |
|---|---|---|
| −5:00 to −0:30 | Serving the previous shopper; bagging; weighing daal on the tarazu | Sit on the keypad, idle and ready. No modal, no nag, no toast |
| −0:30 | Adds up the items aloud: "ek sau assi" | Keypad accepts digits instantly; presets cover the common baskets (PKR 80/150/180/500) |
| −0:05 | Taps Charge, turns the scanner toward the shopper | Charge opens in one tap; the amount gets big enough to read across the counter (~1 m) |
| 0:00 | Shopper presses a thumb on the scanner | Screen echoes the scanner: "Place thumb on scanner" → Checking |
| +0:01 to +0:03 | Waits, not looking | Result fills the screen; colour, icon, word, sound and haptic all say the same thing (`feedback.md › Best practices`) |
| +0:03 | Glances: paid or not? | One word decides it: RECEIVED / DECLINED / TAKE CASH |
| +0:05 | Hands over the bag, or asks for cash | Result stays until New sale. No auto-dismiss (`accessibility.md › Cognitive`: "Prefer dismissing views with an explicit action") |
| +0:10 | Next shopper | New sale → keypad, cleared |

**Owner's five minutes:** Today tab → net settled today → Allied Bank balance → scan the rows for DECLINED or REVERSED → maybe void a mistyped PKR 1,800 → export the day's CSV for the accountant.

**The verbs:** *Charge. Confirm. Take cash when told.* For the owner, also *reconcile, void, export.*

**Feel:** a weighed scale, not a wallet. The screen stays still and quiet until money moves, then gives a verdict in one word, like the tarazu settling. Brand expression lives in precise details: the arch mark, the split decimals, the measured "1.42 s". It is not decoration.

### 1.2 Domain (concepts from the kiryana's own world)

1. **Galla:** the cash box under the counter. The merchant app is the galla's digital twin: it shows only the shop's own money, never the shopper's.
2. **Khata:** the ledger book, one page per day. **Today** is today's khata page, with Asia/Karachi day boundaries.
3. **Parchi / cash memo:** the paper slip. The settled state reads like a slip: amount, net, reference, time.
4. **Angootha lagana:** the inked thumb impression, the signature of people who don't sign. A thumb meaning consent is culturally familiar; FingerPay turns it into payment.
5. **Khulla (change):** the "no change" problem. Whole-rupee amounts and presets make the counter faster than counting coins.
6. **The screenshot ritual:** squinting at a shopper's Easypaisa/Raast transfer screenshot. FingerPay replaces it, hence the "screenshots avoided" counter.
7. **Sheesha counter and barni jars:** glass sits *on top of* the goods; you see through it to what matters. This is the domain reason for the glass rule (§6).
8. **Tarazu:** the balance scale. The ledger balances like the scale, and the verdict settles.
9. **Shutter-down:** the end-of-day ritual, when the settlement summary is read.

### 1.3 Colour world (inputs for TYPE-AND-COLOR)

These are observations, not picks. TYPE-AND-COLOR chooses the values; the constraints in the second table come from the counter.

| # | Thing in the world | Colour quality | Use it suggests |
|---|---|---|---|
| 1 | Tube-light white on painted shelves | Cool, flat, ~6500 K, washes out low contrast | The ambient to test against; push the amount and banners to 7:1 |
| 2 | Steel counter edge and galvanised shutter | Cool mid-greys with a hard specular line | The neutral ramp for surfaces and hairlines |
| 3 | Khata cloth binding and the red ruled margin | Deep maroon, faded red rule lines | A candidate for the one accent or for the "attention" status (not error) |
| 4 | PKR notes: green ink plus the holographic security strip | Muted banknote greens; iridescent foil only in a thin strip | "Holographic" from the reel becomes security-print linework, not rainbow gradients |
| 5 | Stamp-pad ink of a thumb impression | Blue-violet | A cultural cue only. **Banned as an accent or glow by the playbook §3.1.** At most a desaturated ink-blue |
| 6 | Brass tarazu pans and weights | Warm dull metal | A possible warm counterweight to the steel greys |
| 7 | Carbon-copy blue of the duplicate cash memo | Dusty blue | A possible "info / already paid" tone |
| 8 | Glass barni jars | Clear glass, hard white edge highlights, no frost | Glass in this app is clear with a crisp edge, not milky blur |

**Constraints this app puts on the palette**
- One accent, saturation under 80%. The brand is monochrome (BRIEF), so the accent is used for the single primary action per view and the focus ring.
- Five status roles, each with an icon and a word, never hue alone (`color.md › Inclusive color`):

  | Role | Meaning |
  |---|---|
  | `settled` | Received |
  | `declined` | Not paid, PKR 0 fee |
  | `take-cash` | Offline: a physical action |
  | `paused` | Terminal throttled |
  | `info` | Already paid, duplicate |

- `take-cash` must be the most distinct state of all. It asks for a different physical action, so it can't look like a decline.
- Status text: 4.5:1 minimum, 7:1 target on result banners (`dark-mode.md › Dark Mode colors`: "strive for a contrast ratio of 7:1, especially in small text"). Non-text marks: 3:1.
- Both appearances: no pure `#000` or `#fff` (playbook §3.1). The light appearance is the one tested for sunlight (§8.3).

### 1.4 Signature: the Arch Gauge

The brand mark is a fingerprint of nested arches, open at the bottom, with staggered stroke ends (BRIEF). In the terminal the mark is not a logo; it is the **charge-session instrument**, drawn as live strokes:

| State | Arch Gauge does | Truth it tells |
|---|---|---|
| Waiting for thumb | Arches drawn at rest; the **outermost arch drains** over the 120 s charge expiry | "The scanner is armed; time left" (also shown as text) |
| Checking | A single highlight **sweeps along the arches** (indeterminate) | "Working". No fake per-step progress: the server does it in one transaction (SPEC §6.3) |
| Settled | The arches **close into a solid mark**; the measured `processing_ms` sits beneath it ("1.42 s") | "Paid, and how fast it really was" |
| Declined | Arches drop to outline and the **outer arch breaks** at its open end | "Stopped", without colour alone |
| Take cash | The gauge is **removed**; the screen becomes plain signage | The instrument has nothing to measure offline |

It is decorative to assistive technology (`aria-hidden`; in Compose, `contentDescription = null`). Every state is carried by text first. Reduced motion: no sweep or drain; static arches plus the text countdown.

Where else the signature appears (the signature test, five places):
1. the Waiting screen (above)
2. the Settled screen (closed mark + measured time)
3. the **Today stack**, whose security-print linework (the reel's "holographic" translated to banknote guilloche) is drawn from the arch strokes
4. **Pairing**, where the arches draw in while the device key is generated ("this phone's key")
5. the **launch / unlock** screen, where the closed mark is the only graphic

### 1.5 Defaults rejected

| Default | Why it's wrong here | Instead |
|---|---|---|
| **Wallet home first:** balance card, 4-icon quick-action grid, recent transactions list | That is an owner-reading layout. The cashier's job is to type and charge in under 3 s | Keypad first. Today is a separate tab, and the reel's look lives there |
| **Success/decline as a modal or toast**, with a confetti or check Lottie that auto-hides | The cashier is looking at the shopper, not the screen. A 3 s toast is gone when they look back. Auto-hide fails WCAG 2.2.1 | The result replaces the screen and persists until New sale. Colour + icon + word + sound + haptic |
| **The reel taken literally:** glass cards everywhere, glow halos, a glass keypad | Glass lowers contrast exactly where sunlight needs it most. Glow is banned (playbook §3.1). `materials.md › Liquid Glass`: "Don't use Liquid Glass in the content layer" | Glass only on the floating layer (§6). The amount and keypad stay opaque |

Also rejected: card-wrapped transaction lists (Astryx rule: dense data = rows), and green/red full-screen flashes as the only signal.

### 1.6 The reel, translated

| Reel element | Operate translation | Where |
|---|---|---|
| Dark glass surfaces | Glass on the bottom bar, status capsule and sheets only; opaque everywhere money is | §6 |
| Holographic stacked cards that fan and flip | **Today stack:** three summary cards (Today / Allied Bank / This month). Every card's visible edge carries its own number, so nothing is hidden behind interaction. Security-print linework instead of rainbow foil | S9 |
| Big balance, smaller decimals | Split-decimal amounts (§7), on database amounts only | everywhere |
| Round glass action buttons | Three round glass buttons on Today: Refresh, Export, More. Never on the Sell screen, where buttons are wide and opaque | S9 |
| Spring motion everywhere | Springs on navigation, sheets and the Today stack. **No animation on keypad presses** beyond the press state: they repeat 100+ times a day (interface-design › Motion). Result arrival is fast and unbouncy. Details in MOTION.md | MOTION.md |

### 1.7 A small illustrated touch (the website is illustrated now)

BRIEF now sets the website as a hand-drawn cast at 12 fps: Rasheed's counter, Ayesha, Bilal with a basic phone. The app keeps Operate discipline, so illustration may appear **only where nobody is waiting**:

| Place | Allowed? | What | Rule |
|---|---|---|---|
| Today empty state ("No sales yet today") | **Yes**, the one main home for it | One still drawing from the website cast, e.g. Rasheed's counter with the shutter half up | Static image, ≤ 30 KB WebP, decorative (`alt=""`), never above the fold of a non-empty Today |
| Pairing success and first sign-in | Yes | A small still of the counter with the scanner, beside the "This phone is now a FingerPay terminal" line | Shown once per device; doesn't block the Continue button |
| Revoked / not paired | Yes | A still of the shutter down | The reason text and the next step come first |
| Settings → About | Yes | The cast line-up, small, with the disclaimer | Never animated |
| Settled moment | **No drawing.** The closed Arch Gauge is the celebration | — | The counter must clear in under 1 s; a character pose would invite a pause and delay the next sale |
| Any decline, offline, paused, waiting or checking state | **Never** | — | A friendly face on "PAYMENT DECLINED" in front of a queue reads as mockery, and any delay costs the cashier |

Constraints:
- Art comes from the website's frame list (no app-only drawings).
- Line colour comes from TYPE-AND-COLOR's ink role, so drawings follow the appearance.
- No frame animation in the app at all. If MOTION.md wants one, the only candidate is a 4-frame blink on the Today empty state, and it is off under reduced motion.

---

## 2. Platform recommendation

**What SPEC §11 requires:**
- the key lives in the Android Keystore (StrongBox if present)
- a Play Integrity verdict at pairing and daily
- an R307 scanner over USB-TTL using `usb-serial-for-android`
- an offline banner that works with no network
- Supabase Auth with PKCE
- the phone's own fingerprint unlocks the app only

| Requirement | Kotlin + Compose | React Native + native modules | PWA on the merchant's phone |
|---|---|---|---|
| Hardware-backed, non-extractable P-256 key (StrongBox, key attestation) | Native `KeyPairGenerator` + `setIsStrongBoxBacked` | Needs a native module (Kotlin anyway) | WebCrypto non-extractable key in IndexedDB. **Not hardware-backed, no attestation** |
| Play Integrity at pairing and daily | Native API | Native module | **Not available** to a web origin |
| R307 over USB-TTL | `usb-serial-for-android` is a Java library: direct | Native module wrapping it | WebUSB plus a hand-written CP2102/CH340 driver: fragile, unverified. **SPEC §4.6 sets `Permissions-Policy: usb=()`**, which would have to be loosened |
| Offline TAKE CASH with no network | Trivial | Trivial | Needs a service worker; works |
| Dedicated counter device (lock-task / kiosk mode, keep screen on) | `startLockTask`, device-owner policies | Native module | Not possible |
| Haptics, sound, Urdu text-to-speech (SPEC §13 #4) | `HapticFeedback`, `TextToSpeech` | Libraries | Limited vibration; Web Speech, uneven Urdu support |
| Reuse of the web POS's React/Astryx UI | None (Astryx is React DOM) | **None either** (Astryx doesn't run in RN) | Full |
| Moving parts in a security-first app | Fewest | JS runtime + bridge + 3 native modules | Smallest code, weakest device guarantees |

**Recommendation: Kotlin + Jetpack Compose for the production terminal.**
- Every hard requirement in §11 is native, and React Native would need three native modules written in Kotlin anyway.
- RN's one advantage, code sharing, doesn't exist here: Astryx doesn't render in RN.
- What *is* shared is platform-neutral:
  - the API and the `FPv1` signing protocol (SPEC §4.5)
  - the outcome-code → copy map (the Urdu-ready table in SPEC §5)
  - this doc's screens and states
  - TYPE-AND-COLOR's tokens, exported as a Compose theme
- **Android conventions win on Android:** predictive back, edge-to-edge system bars, 48 dp minimum targets, the system share sheet for CSV. Apple HIG is cited here for principles that hold on every platform.

**The web POS (now, for the demo):**
- Next.js + Astryx in the browser, a WebCrypto key (SPEC §4.5), the demo **finger tray** in place of the scanner.
- It is the reference implementation of every state in this doc, and the device judges see.
- It keeps the security headers as they are; no WebUSB.
- Compose later copies its behaviour.

---

## 3. Screen inventory

**Notation:**
- Wireframes are drawn at compact phone width (360 dp, 16 dp side margins). Tablet (≥ 600 dp) is drawn where the layout changes.
- `▓` is an opaque content surface, `░` is the glass functional layer, `( )` is a round button, `[ ]` is a rectangular button.
- Every screen lists **Focal** (what wins and how), **States** (loading, empty, error, disabled), and an Astryx line, expanded in §10.

### Navigation map

```
 Launch ─► not paired? ─► S1 Pair (owner) ─┐
        └► paired ─► S2 Sign-in / Unlock ──┴─► Tabs:  Sell (S3) │ Today (S9) │ Settings (S12)
                                                         │             │              │
             full-screen charge flow (modal) ◄───────────┘             │              ├─► S13 Revoke
             S4 Waiting → S5 Checking → S6 Settled                     ├─► S10 Sale detail → Void
                                      → S7 Declines                    └─► S11 Export CSV
             S8 Take cash: takes over from any state when offline
```

Bottom bar: three tabs (Sell, Today, Settings). The cashier sees Sell and Today plus a reduced Settings. Tabs never hide; the charge flow is a full-screen modal that *covers* them (`sheets.md › Best practices`: "a full-screen style of modal view ... to help people perform multistep tasks"; tabs navigate and never act, per `apple-design › Lens 2`).

---

### S1 Pair this phone (owner, once per device)

```
┌────────────────────────────────────┐
│ ░ Step 2 of 3                 ✕  ░ │
│                                    │
│            ╭───────╮               │
│           ╭╯╭─────╮╰╮   Arch Gauge │
│           │ │╭───╮│ │   draws in as│
│           │ ││   ││ │   the key is │
│                         generated  │
│   Pair this phone to               │
│   Rasheed Kiryana Store            │  ← focal: store name, display size
│   Signed in as Rasheed A. (owner)  │
│                                    │
│   ✓ Device key created on this     │
│     phone; it never leaves it      │
│   ◌ Checking this phone is genuine │  ← Play Integrity (Android)
│   ○ Register with FingerPay        │
│                                    │
│ ┌────────────────────────────────┐ │
│ │        Pair this phone         │ │  primary, 64 dp
│ └────────────────────────────────┘ │
│         Not your store? Sign out   │
└────────────────────────────────────┘
```

- **Steps:** (1) owner signs in (S2 form, owner role required) → (2) confirm store + key + integrity → (3) paired. The paired screen shows "Terminal ••7F3A", the last 4 of the public key's SHA-256, which isn't secret, and the illustrated still (§1.7).
- **Focal:** the store name. It is the one thing the owner must verify, so it gets the largest type on the screen. The checklist is secondary ink.
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading | Checklist rows spin one at a time (real steps, each awaited) |
  | Empty | n/a |
  | Error | Integrity failed: "This phone can't be used as a terminal (Play Integrity check failed)". No retry loop; Sign out. Network: "No internet. Pairing needs a connection." + Try again. Not owner: "Only the store owner can pair a terminal." |
  | Disabled | The Pair button is disabled until the key exists and integrity passes. The reason is shown as text under it, never only as a tooltip |

- **Astryx:** `form-wizard` template (horizontal progress), `Stepper`, `Item` rows with `StatusDot` (icon variant), `Button` primary, `Banner` for errors.

### S2 Staff sign-in and unlock

```
┌────────────────────────────────────┐
│ ● Rasheed Kiryana Store   ••7F3A   │  read-only: store + terminal
│                                    │
│   Sign in to sell                  │  heading
│                                    │
│   Email                            │
│   ┌──────────────────────────────┐ │  48 dp fields, 16 px+ text
│   │ cashier@…                    │ │
│   └──────────────────────────────┘ │
│   Password                         │
│   ┌──────────────────────────[👁]┐ │  show/hide, paste allowed
│   └──────────────────────────────┘ │
│   [ CAPTCHA (web only) ]           │  SPEC §4.7 Turnstile
│                                    │
│ ┌────────────────────────────────┐ │
│ │            Sign in             │ │  primary, 56 dp
│ └────────────────────────────────┘ │
└────────────────────────────────────┘

 Returning (Android, after first sign-in):
┌────────────────────────────────────┐
│            (closed arch mark)      │
│   Unlock FingerPay                 │
│   Use this phone's screen lock     │  ← never "fingerprint" alone
│ ┌────────────────────────────────┐ │
│ │      Unlock with this phone    │ │  → BiometricPrompt
│ └────────────────────────────────┘ │
│   Sign in as someone else          │
└────────────────────────────────────┘
```

- **Two fingerprints in one app is a confusion risk.** The phone's sensor only unlocks the app (SPEC §11); shoppers pay on the FingerPay scanner. The copy must never let a cashier think the phone's sensor takes payments.
  - Unlock always says "this phone's screen lock".
  - Payment always says "FingerPay scanner".
  - Neither uses the arch mark as a button.
- **Focal:** the primary button, the only accent on the screen. Store + terminal sit at the top as read-only proof that this device is paired.
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading | The button shows a spinner + "Signing in…" (`buttons.md › Mobile`: "the label 'Checkout' could change to 'Checking out…'") |
  | Error | Inline under the field, `aria-live="polite"`, focus moved: "Email or password is wrong." (generic, no account enumeration). Locked by rate limit: "Too many tries. Wait 1 minute." Session expired mid-shift: return here with "Signed out after 15 minutes idle" (JWT 900 s) |
  | Empty | n/a |
  | Disabled | Sign in is disabled until both fields have content. Bank roles are refused: "This app is for shop staff. Use the bank console." |

- MFA is optional for merchant roles (SPEC §4.1). If enrolled: a second step with one 6-digit field (`inputmode=numeric`, `autocomplete=one-time-code`).
- **Astryx:** `login` template (minimal centred form), `TextInput` (email/password types), `Button`, `Banner`. Card variant: `login-card`.

### S3 Sell (POS idle): keypad and presets

Compact (360 dp):
```
┌────────────────────────────────────┐
│ ░ ● Online · Rasheed Kiryana  ⓢ ░  │  status capsule (glass), 40 dp; ⓢ = scanner OK
│                                    │
│                          PKR       │  unit label, small caps, secondary
│                          180       │  ← focal: amount, display size, right-aligned
│                                    │
│  ┌────────┐┌────────┐┌────────┐┌───┐
│  │ PKR 80 ││PKR 150 ││PKR 180 ││500│  presets, 56 dp, horizontally fitted
│  └────────┘└────────┘└────────┘└───┘
│  ┌──────────┬──────────┬──────────┐│
│  │    1     │    2     │    3     ││  keypad: opaque, 64 dp rows, 8 dp gaps
│  ├──────────┼──────────┼──────────┤│
│  │    4     │    5     │    6     ││
│  ├──────────┼──────────┼──────────┤│
│  │    7     │    8     │    9     ││
│  ├──────────┼──────────┼──────────┤│
│  │  Clear   │    0     │    ⌫     ││  Clear = clear all; ⌫ = backspace
│  └──────────┴──────────┴──────────┘│
│ ┌────────────────────────────────┐ │
│ │      Charge PKR 180            │ │  primary, 64 dp, label repeats amount
│ └────────────────────────────────┘ │
│ ░  Sell  │   Today   │  Settings ░ │  glass bottom bar
└────────────────────────────────────┘
```

Tablet (≥ 600 dp, landscape counter tablet):
```
┌───────────────────────────────────────────────────────────────────────┐
│ ░ ● Online · Rasheed Kiryana Store · ••7F3A · ⓢ Scanner ready        ░ │
│ ┌──────────────────────────────┐  ┌─────────────────────────────────┐ │
│ │                    PKR       │  │ Today so far                    │ │
│ │                    180       │  │ PKR 18,629.19 net settled       │ │
│ │ [80] [150] [180] [500]       │  │ ─────────────────────────────── │ │
│ │ ┌────┬────┬────┐             │  │ 19:42  Ayesha K.   180  SETTLED │ │
│ │ │ 1  │ 2  │ 3  │  keypad     │  │ 19:40  —           500 DECLINED │ │
│ │ │ 4  │ 5  │ 6  │  max 400 dp │  │ 19:31  Bilal H.    180  SETTLED │ │
│ │ │ 7  │ 8  │ 9  │  wide       │  │ (last 5 rows, read-only)        │ │
│ │ │ C  │ 0  │ ⌫  │             │  │                                 │ │
│ │ [     Charge PKR 180     ]   │  │                                 │ │
│ └──────────────────────────────┘  └─────────────────────────────────┘ │
│ ░            Sell          │          Today          │    Settings  ░ │
└───────────────────────────────────────────────────────────────────────┘
```
- The keypad column is capped at 400 dp, so keys never stretch into slabs. The extra width shows a read-only "Today so far" pane, but **the function is the same at every width** (`layout.md › Size classes`: "Don't change your app's functionality based on the space it occupies").

**Behaviour**
- **Entry:** digits append; ⌫ removes the last digit; Clear empties.
- **Presets:** a preset *replaces* the amount; it never adds to it. Adding would invite silent double-counting.
- **Leading zeros** are ignored; whole rupees only (SPEC View A has no decimal key).
- **Maximum entry:** 6 digits (PKR 999,999). See Open question 4. Per-tap limits are enforced by the server, because the terminal doesn't know the shopper's account type.
- **Charge label:** repeats the amount ("Charge PKR 180") so the last thing read before charging is the number.
- **Hardware keyboard / USB numpad** (some counters have one): 0–9, Backspace, Escape = Clear, Enter = Charge.

**Focal:** the amount.
- It is the largest thing on screen, on a quiet field (size + space).
- The Charge button is the only accent fill (colour), and the only other thing that can win.
- The status capsule is smallest and lives in the glass layer, so it reads as chrome, not content.

**States**

| State | Behaviour |
|---|---|
| Loading (app start, session check) | Amount area shows `0` immediately; the keypad works at once; the status capsule shows "Connecting…" with a neutral dot. Charge waits for the session |
| Empty (amount 0) | Amount shows `0` in secondary ink. Charge is disabled with the visible line "Enter an amount" |
| Error | Opening the charge failed (5xx/timeout): `Banner` error above the keypad, "Couldn't open the sale. Try again." The amount is kept. Rate limit: "Too many sales opened. Wait a moment." |
| Disabled: offline | The capsule turns `take-cash`. Charge becomes **Take cash PKR 180** (S8), never a dead button |
| Disabled: scanner unplugged (Android) | The capsule shows "Scanner not connected". Charge is disabled with the reason "Plug in the FingerPay scanner" |
| Disabled: terminal paused (throttle) | The keypad works; Charge is replaced by the S7 paused banner with a countdown |
| Disabled: terminal revoked | Full-screen S13 end state |

- **Astryx:** `Layout` (header = status capsule, content = amount + keypad, footer = Charge), `Grid` 3×4 of `Button` (keypad), `HStack` of `Button` (presets), `Text` with a custom theme type `amount-entry`, `StatusDot`, `Banner`. Tablet: `Layout` `end` panel with `Table` (compact).

### S4 Charge open: waiting for thumb

```
┌────────────────────────────────────┐
│                        ✕ Cancel    │  ghost, 48 dp, top-trailing
│                                    │
│   PKR                              │
│   180                              │  ← focal: hero amount, readable at ~1 m
│                                    │
│            ╭───────╮               │
│           ╭╯╭─────╮╰╮              │  Arch Gauge at rest;
│           │ │╭───╮│ │              │  outer arch drains over 120 s
│           │ ││   ││ │              │
│                                    │
│   Shopper: place thumb             │
│   on the FingerPay scanner         │  instruction, large body
│                                    │
│   1:48 left                        │  text countdown (polite, every 30 s)
│                                    │
│ ┌────────────────────────────────┐ │
│ │          Cancel sale           │ │  secondary, 56 dp (bottom reach)
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

- **Full-screen, opaque, no glass, no tab bar.** The charge exists on the server (120 s expiry, one open charge per terminal).
- **Cancel** appears twice: top-trailing, the platform convention, and bottom, for thumb reach. Both call `POST /pos/charges/{id}/cancel`.
- **No confirmation on cancel.** The expected result of Cancel is losing the charge (`feedback.md › Best practices`: "don't warn people when data loss is the expected result").
- **Focal:** the amount, so the shopper can verify it across the counter before pressing. Then the instruction. The Arch Gauge sits between them as the visual anchor, not the focal.
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading (opening the charge) | Charge shows a spinner + "Opening sale…" for ≤ 1 s, then this screen. If it exceeds 3 s: S3 error |
  | Error | Scanner disconnected mid-wait: an inline `Banner` warning "Scanner unplugged. Plug it in or cancel." with the countdown still running. Network lost: S8 (nothing was sent with a thumb, so TAKE CASH is safe) |
  | Expired at 0:00 | Becomes the S7 "START A NEW SALE" variant (CHARGE_EXPIRED) |
  | Disabled | n/a |

- **Demo (web only):** the finger tray is a separate panel (D1), never on this screen.
- **Astryx:** `Layout`, `Text` (`amount-hero`), Arch Gauge as an inline SVG component (the one custom drawing), `Button` ×2, `Banner`, `useAnnounce` for the countdown.

### S5 Checking

```
┌────────────────────────────────────┐
│                                    │  (Cancel removed: a request is in flight)
│   PKR                              │
│   180                              │  amount stays put: no layout shift
│                                    │
│            ╭───────╮               │
│           ╭╯╭─────╮╰╮              │  one highlight sweeping
│           │ │╭───╮│ │              │  along the arches (indeterminate)
│           │ ││   ││ │              │
│                                    │
│   Checking…                        │  `aria-busy`; announced once
│   Risk Engine                      │  secondary: names the system honestly
│                                    │
└────────────────────────────────────┘
```

- **Typical duration** is 0.4–1.5 s (target < 3 s, SPEC §1).
  - Under 300 ms, skip the sweep entirely so the screen doesn't flicker.
  - **Cancel is hidden.** Once a thumb request is in flight, cancelling can't un-send it.
- **Focal:** the word "Checking…". The amount is unchanged in place, so the eye doesn't need to move.
- **States:**

  | State | Behaviour |
  |---|---|
  | Slow, > 3 s | Secondary line: "Still checking. Don't take cash yet." |
  | **Connection lost while checking** | **Unconfirmed** variant (S8b). Never TAKE CASH here: the payment may have committed |
  | 5xx with correlation id | "Couldn't confirm this sale" → the S8b flow (retry the same charge id; replay returns the receipt, SPEC §4.9) |
  | Empty / disabled | n/a |

- **Astryx:** same frame as S4; `Spinner` is not used. The sweep is the gauge. Under reduced motion, a static gauge + "Checking…".

### S6 Settled

```
┌────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  `settled` status field, top 55%
│▓  ✓ PAYMENT SUCCESSFUL            ▓│  headline (SPEC string, part 1)
│▓                                  ▓│
│▓  PKR                             ▓│
│▓  180  RECEIVED                   ▓│  ← focal: amount + RECEIVED (part 2)
│▓                                  ▓│
│▓      (closed arch mark) 1.42 s   ▓│  measured processing_ms
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│   Paid by Ayesha K.                │  first name + initial (settled only)
│   Net to Allied Bank  PKR 179.19   │  split decimals
│   Fee                 PKR   0.81   │
│   Shopper cashback    PKR  50.00   │  only if > 0; paid by FingerPay
│   Raast ref (simulated) …8F21C0    │  middle-truncated, mono
│                                    │
│ ┌────────────────────────────────┐ │
│ │            New sale            │ │  primary, 64 dp
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

- **Persists until New sale.**
  - Hardware Enter = New sale.
  - A digit key starts a new sale with that digit, so the fastest cashiers never touch New sale.
- **Feedback stack:** the success haptic plus a short tone fire once on arrival (`accessibility.md › Hearing`: "Use haptics in addition to audio cues"). Optional spoken Urdu "ek sau assi rupay wusool" (SPEC §13 #4), off by default, set in Settings.
- **Replay** (`replayed: true` from the API) shows the same screen plus the line "Already settled. Shown again, not charged twice."
- **Privacy:**
  - The shopper is shown as `customer_display_name` (first name + initial), which the database returns only on SUCCESS.
  - There is no shopper balance anywhere; the API doesn't send one.
- **Focal:** "180 RECEIVED". The verdict word sits next to the number, so one fixation answers both "paid?" and "how much?". The receipt rows are secondary and can be read later.
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading | n/a (arrives complete) |
  | Empty | Fields absent from the response collapse; no zeros invented |
  | Error | n/a |
  | Disabled | n/a |

- **Astryx:** `Layout`, a status field built from the `Banner` frame (`status="success"`, title = SPEC string) *or* a themed `Card` region if Banner can't take the hero size (decide in the build), `Text` `amount-hero`, `Item` rows (compact) for the receipt lines, `Button` primary, `useAnnounce` (assertive, once: "Payment successful, PKR 180 received").

### S7 Declines (every outcome in SPEC §5)

One shared layout; only the field colour, icon, strings and actions change. The banner text is the **SPEC string verbatim**, split at its colon or dash into a headline (large) and a detail (one step smaller). **No shopper name on any decline** (the database returns none).

```
┌────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  `declined` field (or paused/info, see table)
│▓  ✕ PAYMENT DECLINED              ▓│  ← focal: headline
│▓                                  ▓│
│▓  INSUFFICIENT BALANCE            ▓│  detail
│▓  (PKR 0 FEE CHARGED)             ▓│
│▓                                  ▓│
│▓  PKR 500   not charged           ▓│  amount, demoted (secondary size)
│▓      (broken outer arch)         ▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│   Ask for another way to pay.      │  next step (CONTENT.md)
│                                    │
│ ┌────────────────────────────────┐ │
│ │       Try thumb again (2 left) │ │  only while the charge is still open
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │            New sale            │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

The database increments `thumb_attempts` on **every** decline and locks the charge at 3 (`fp_api.sql`). So for the first two declines the charge is still open, and "Try thumb again" is offered. After the third, the screen becomes the CHARGE_LOCKED variant.

| Outcome code | Field role + icon | Headline / detail (SPEC verbatim, split) | Actions | Notes |
|---|---|---|---|---|
| `DECLINED_LOW_BALANCE` | declined, ✕ | PAYMENT DECLINED / INSUFFICIENT BALANCE (PKR 0 FEE CHARGED) | Try again (if open), New sale | Never show how short the shopper is: there is no balance on merchant screens |
| `DECLINED_UNREGISTERED_THUMB` | declined, ? | THUMB NOT RECOGNIZED / ENROL AT ALLIED BANK BRANCH | Try again (if open), New sale | Most likely a misplaced thumb: Try again is primary here |
| `DECLINED_DUPLICATE_TAP` | **info**, ↺ (not red) | DUPLICATE TAP BLOCKED / THIS SALE WAS ALREADY PAID | New sale | Good news for the shop: the money already arrived. Shown calm, never as an error |
| `DECLINED_LIMIT` | declined, ✕ | PAYMENT DECLINED / ABOVE THUMB-PAY LIMIT (PKR 0 FEE CHARGED) | New sale | Don't suggest splitting the sale; limits exist against cloned thumbs (SPEC §0 #9) |
| `DECLINED_THUMB_LOCKED` | declined, lock | PAYMENT DECLINED / THUMB PAYMENTS ARE LOCKED BY THE OWNER | New sale | "Owner" here means the *account holder*, not the shop owner. Open question 6 |
| `DECLINED_ACCOUNT_INACTIVE` | declined, ✕ | PAYMENT DECLINED / ACCOUNT NOT ACTIVE | New sale | |
| `DECLINED_TERMINAL_THROTTLED` | **paused**, pause | TOO MANY UNKNOWN THUMBS / TERMINAL PAUSED FOR 10 MINUTES | Take cash (secondary), countdown "9:42" | A terminal state, not a shopper state. Sell shows this banner, with Charge replaced, until the countdown ends |
| `CHARGE_LOCKED` | neutral, ✕ | START A NEW SALE | New sale | Proposed detail line (CONTENT.md): "3 thumbs didn't match this sale." |
| `CHARGE_EXPIRED` | neutral, clock | START A NEW SALE | New sale | Proposed detail: "No thumb within 2 minutes." |
| `CHARGE_CANCELLED` | neutral | START A NEW SALE | New sale | Usually never shown: Cancel goes straight to S3 |

- **Focal:** the headline: largest text, on the status field, top-left in reading order (`layout.md › Visual hierarchy`). The amount is deliberately demoted on declines ("not charged") so it can't be mistaken for a receipt.
- **Feedback:** one decline haptic (a double tick) plus a low tone. Never the success tone. Assertive announcement once.
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading | n/a |
  | Error | Try again fails (network): S8b |
  | Disabled | Try again hides (not disables) once the charge is locked, so no dead button sits in the primary slot |

- **Astryx:** same frame as S6; `Banner` statuses: `error` (declined), `info` (duplicate), `warning` (paused); `Timer`-style countdown text; `Button`.

### S8 Offline: TAKE CASH

```
┌────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  `take-cash` field, full height
│▓                                  ▓│
│▓  INTERNET DOWN                   ▓│  headline part 1
│▓                                  ▓│
│▓  TAKE CASH                       ▓│  ← focal: the two-word instruction,
│▓  IMMEDIATELY                     ▓│    largest text in the whole app
│▓                                  ▓│
│▓  PKR 180                         ▓│  if an amount was entered
│▓  (SALE NOT CHARGED)              ▓│  detail
│▓                                  ▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│   Waiting for internet…  ◌         │
│ ┌────────────────────────────────┐ │
│ │        Cash taken · Done       │ │  records the offline event locally
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

- **Trigger:** the client detects no connectivity in S3 (Charge tapped) or S4 (no thumb request sent yet).
- **Nothing is queued** (SPEC §1 pillar 6). "Cash taken · Done" stores an informational offline event locally; it uploads to `POST /pos/offline-events` on reconnect and appears in Today as `OFFLINE_CASH`.
- **On reconnect:** return to S3, with a `Toast` "Back online" (info, auto-hide 5 s; it's non-essential).
- **Focal:** TAKE CASH, the largest type in the product. No Arch Gauge, no glass, no tab bar, no illustration. It is signage.
- **States:**

  | State | Behaviour |
  |---|---|
  | No amount entered | "INTERNET DOWN — TAKE CASH IMMEDIATELY (SALE NOT CHARGED)" without the amount line |
  | Disabled | n/a |

#### S8b Unconfirmed (connection lost *after* a thumb was sent)

```
│▓  CAN'T CONFIRM YET               ▓│  `info` field, never take-cash
│▓  Don't take cash yet.            ▓│  ← focal
│▓  PKR 180 · retrying…  ◌          ▓│
│   If it was paid, the shopper gets │
│   an SMS receipt.                  │
│ [ Retry now ]  [ Check Today later ]│
```

- **Why:** the thumb request may have committed. Telling the cashier to TAKE CASH here could make the shopper pay twice.
- **Behaviour:**
  - Auto-retry the **same charge id**; an idempotent replay returns the original receipt (SPEC §4.9).
  - On success, go to S6 with the replay line.
  - After 30 s, the "Check Today later" path keeps the charge id, and Today shows a pending-check row until it's resolved.
- This state isn't in SPEC §5. Open question 2.

### S9 Today: the daily ledger and settlement summary (the reel-style home)

Compact:
```
┌────────────────────────────────────┐
│ ░ Today · Wed 18 Nov       ● 19:44░│  glass capsule; "updated" time
│                                    │
│  ┌──────────────────────────────┐  │
│  │╲ ╲ security-print arches  ╲ ╲│  │  card 3 edge: This month · 143 tx
│  ┌──────────────────────────────┐  │
│  │ Allied Bank balance          │  │  card 2 edge (always legible):
│  │ PKR 18,629.19                │  │  label + figure on the visible strip
│  ┌──────────────────────────────┐  │
│  │ Net settled today            │  │  card 1 (top)
│  │ PKR 4,312.75                 │  │  ← focal: hero, split decimals
│  │ Gross 4,330.00 · Fees 17.25  │  │
│  │ Fees saved vs card 2.5%  …   │  │
│  └──────────────────────────────┘  │
│   ( ⟳ )      ( ⇩ )      ( ⋯ )      │  round glass buttons, 56 dp:
│  Refresh    Export      More       │  Refresh · Export (owner) · More
│                                    │
│  24 sales · 23 screenshots avoided │  counters as one sentence, not tiles
│  ──────────────────────────────── │
│  19:42  Ayesha K.     180.00   ✓   │  rows: time · shopper · gross · status
│  19:40  —             500.00   ✕   │  declines: no name, ever
│  19:31  Bilal H.      180.00   ✓   │
│  18:05  —             260.00   ⇄   │  ⇄ OFFLINE_CASH
│  17:12  Ayesha K.   1,800.00   ↩   │  ↩ REVERSED (voided)
│  …                                 │
│ ░  Sell  │   Today   │  Settings ░ │
└────────────────────────────────────┘
```

- **Counters** come from SPEC View B: total gross, MDR fees saved vs a 2.5% card POS, Allied Bank balance, screenshots avoided (+1 per settled sale), this month's transactions, plus net settled.
  - The hero card holds net / gross / fees / fees saved.
  - Card 2 holds the bank balance; card 3 holds this month.
  - Screenshots avoided and the sale count read as **one sentence**, not a tile row (no three-equal-cards).
- **The stack (the holographic cards, translated):**
  - Three cards offset 12 dp vertically. **Each visible edge shows its label and figure**, so nothing needs a tap to read.
  - Tap or swipe down to fan them out (spring, MOTION.md); tap a card to bring it to the top.
  - The security-print linework is drawn from the arch strokes at low contrast (≤ 1.3:1 against the card), so it never competes with the figures.
  - These cards are **content: opaque, no glass.** Reduced motion: no fan; the cards show as three stacked rows.
- **Rows:**
  - Tap a row → S10.
  - Time is `HH:MM` Asia/Karachi. Gross is right-aligned, tabular. Status shows a symbol **plus** the word on tablet; on compact, the symbol plus an accessible label, and the word appears in S10.
  - Fee, net and Raast ref live in S10 on compact, and as columns on tablet.
- **Day picker:** the date in the capsule opens a day sheet (yesterday, pick a date). Today is the default (SPEC View B).
- **Focal:** "Net settled today" on the top card: the largest figure, the only hero-size number on the screen. Bank balance is second (a smaller figure on its edge strip). Rows are the third tier, compact density.

Tablet (≥ 600 dp): two panes. Left 360 dp: the stack + round buttons. Right: a full `Table` with columns time · shopper · gross · MDR fee · net to Allied Bank · Raast ref · status, a sticky header, numbers right-aligned (playbook §4.2).

**States**

| State | Behaviour |
|---|---|
| Loading | `Skeleton` shapes matching the stack and 6 rows (playbook §4: "skeleton … matching final UI dimensions; no spinners"). Cached last figures show with "Updated 19:12" if available |
| Empty (no sales today) | The stack shows real zeros (PKR 0.00). Below it: the **illustrated still** (§1.7) + "No sales yet today" + `Button` "Go to Sell" |
| Error | `Banner` error "Couldn't load today's ledger" + Try again. Last cached data stays visible and marked stale. Offline: `Banner` warning "Offline. Figures from 19:12." |
| Disabled | Export is shown to owners only. For a cashier, the Export round button is **absent**, and More explains "Owner tools: sign in as the owner" (no dead control in the main row) |

- **Astryx:** `table-page` template (record-level facts block above a flat table) for the tablet; on compact the same blocks stacked: `Card` ×3 (stack), `IconButton` `elevation="med"` ×3 with labels below (the round glass buttons; glass comes from the theme's component override), `Text`, `Table` (compact, `dividers="rows"`) or `Item` list on compact, `StatusDot` with `icon`, `Skeleton`, `EmptyState`, `Banner`.

### S10 Sale detail and same-day void (owner)

```
 Sheet (medium detent, grabber)          Void reason (same sheet, step 2)
┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│ ░          ───                    ░│ │ ░ ‹ Back      Void sale           ░│
│ ░ Sale · 17:12 · SETTLED          ░│ │ ░                                 ░│
│ ░ PKR 1,800.00                    ░│ │ ░ Why are you voiding it?         ░│
│ ░ Ayesha K.                       ░│ │ ░ ◉ Wrong amount typed            ░│
│ ░ Fee 8.10 · Net 1,791.90         ░│ │ ░ ○ Charged twice by mistake      ░│
│ ░ Raast ref (sim.) …A71F          ░│ │ ░ ○ Shopper returned the goods    ░│
│ ░ Settled in 1.38 s               ░│ │ ░ ○ Other                         ░│
│ ░                                 ░│ │ ░ ┌───────────────────────────┐   ░│
│ ░ [ Void sale ]  destructive      ░│ │ ░ │ Note (required for Other) │   ░│
│ ░ Same day only · owner only      ░│ │ ░ └───────────────────────────┘   ░│
│ ░                         [Close] ░│ │ ░ [ Void PKR 1,800.00 ] destruct. ░│
└────────────────────────────────────┘ └────────────────────────────────────┘
                    then a confirmation alert:
          ┌──────────────────────────────────────┐
          │ Void this PKR 1,800.00 sale?         │
          │ PKR 1,800.00 goes back to the        │
          │ shopper's account and leaves today's │
          │ total. This can't be undone.         │
          │ [ Cancel ]      [ Void sale ]        │  Cancel is the default
          └──────────────────────────────────────┘
```

- **Sheet:** glass (a functional layer), medium detent first (`sheets.md › Mobile`: "consider supporting the medium detent"). It has a grabber, swipe to dismiss, and Close.
  - When a reason has been chosen, swiping to dismiss asks for confirmation (`sheets.md › Mobile`: "If people have unsaved changes … use an action sheet to let them confirm").
- **One sheet at a time:** the reason step replaces the detail inside the same sheet (`sheets.md › Best practices`: "Display only one sheet at a time").
- **Destructive, so:**
  - the confirmation states the amount and the consequence
  - Cancel is the default (`buttons.md › Role`: "Don't assign the primary role to a button that performs a destructive action")
  - `feedback.md › Best practices`: warn for "data loss that's unexpected and irreversible"
- **Who can void:** SETTLED rows from today, owner session only.
  - If a cashier is signed in, the sheet shows the detail plus "Only the owner can void a sale. [Switch to owner]", which signs the owner in on this device and returns here (Open question 5).
  - DECLINED, OFFLINE_CASH, REVERSED and past-day rows have no void action, and the sheet says why: "Voids are same-day only."
- **After voiding:** the row becomes REVERSED; the totals update; a `Toast` "Sale voided. PKR 1,800.00 returned to the shopper." Referral clawback is the server's business and isn't shown.
- **Focal:** the amount in the detail. In the reason step, the selected reason; the destructive button stays at the bottom.
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading | The Void button shows a spinner + "Voiding…" |
  | Error | Already reversed (409): "This sale was already voided." Past day: "Voids are same-day only." Network: the sheet stays open with an error `Banner` |
  | Disabled | Void (reason step) is disabled until a reason is chosen, plus a note for Other |

- **Astryx:** `BottomSheet` (`purpose="form"`, `snapPoints`), `Item` rows, `RadioList` with descriptions, `TextArea` (`isRequired` when Other), `Button` `destructive`, `AlertDialog`, `Toast`.

### S11 Export daily settlement CSV (owner)

```
┌────────────────────────────────────┐
│ ░          ───                    ░│
│ ░ Export settlement               ░│
│ ░ Day   [ Today, Wed 18 Nov  ▾ ]  ░│
│ ░ 24 rows · CSV                   ░│
│ ░ Includes first name + initial   ░│  privacy note: what leaves the device
│ ░ on settled rows. No CNIC, no    ░│
│ ░ phone, no balances.             ░│
│ ░ [ Export CSV ]  primary         ░│
└────────────────────────────────────┘
```

- **Delivery:** Android uses the system share sheet (WhatsApp to the accountant is the realistic path); web downloads `fingerpay-settlement-YYYY-MM-DD.csv`.
- The server escapes formula cells (SPEC §4.6, T19); the UI only requests the file.
- **Focal:** Export CSV, the sheet's only primary.
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading | Button spinner "Preparing…" |
  | Empty day | Export stays enabled and produces a header-only file. The line reads "No sales on this day; the file will only have headers." |
  | Error | Rate-limited: "Too many exports. Wait a minute." Offline: "Export needs internet." |
  | Disabled | Not shown to cashiers at all |

- **Astryx:** `BottomSheet` (`purpose="info"`, `height="hug"`), `Select` or a day-picker sheet, `Text`, `Button` primary.

### S12 Settings

```
┌────────────────────────────────────┐
│ Settings                           │
│ ─ This terminal ────────────────── │
│ Store            Rasheed Kiryana   │
│ Terminal         ••7F3A            │
│ Scanner          ● Connected  ›    │  USB status, permission
│ Integrity check  ● Passed today    │  Play Integrity daily (Android)
│ ─ Sales ───────────────────────── │
│ Sound on result           [ ● ]    │  Switch
│ Spoken amount (Urdu)      [   ]    │  Switch, SPEC §13 #4
│ Vibrate on result         [ ● ]    │
│ ─ You ─────────────────────────── │
│ Signed in as  Rasheed A. (owner)   │
│ Sign out                           │
│ ─ Owner ───────────────────────── │
│ Revoke this terminal…              │  destructive text, owner only
│ About & disclaimer                 │  disclaimer text from PRODUCT.md
│ ░  Sell  │   Today   │  Settings ░ │
└────────────────────────────────────┘
```

- **No in-app light/dark switch** (`dark-mode.md › Best practices`: "Avoid offering an app-specific appearance setting"). See §8.3 and Open question 3.
- **Cashier view:** the Owner group is hidden. The rest is the same.
- **Focal:** none dominant by design. It's a reference list with grouped rows and section headers (`lists-and-tables.md › Style`).
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading | Scanner/integrity rows show "Checking…" |
  | Error | Scanner: "Not connected: plug in the scanner and allow USB access" (› opens the Android USB permission). Integrity failed: "This phone failed today's check. Payments are off." Sell is then disabled with the same reason |
  | Disabled | Switches stay operable offline (local settings) |

- **Astryx:** `settings` template (Settings Form), `Section` + `Heading` per group, `Item` rows with `endContent`, `Switch`, `StatusDot`, `Button` ghost/destructive.

### S13 Revoke this terminal (owner)

```
 AlertDialog                              End state (this device)
┌──────────────────────────────────────┐ ┌────────────────────────────────────┐
│ Revoke this terminal?                │ │      (shutter-down still, §1.7)    │
│ This phone will stop taking FingerPay│ │   This phone is no longer a        │
│ payments within 30 seconds. To use   │ │   FingerPay terminal               │
│ it again you'll pair it from the     │ │   Revoked 19:50 by Rasheed A.      │
│ start. Today's sales stay in the     │ │ ┌────────────────────────────────┐ │
│ ledger.                              │ │ │      Pair this phone again     │ │
│ [ Cancel ]   [ Revoke terminal ]     │ │ └────────────────────────────────┘ │
└──────────────────────────────────────┘ └────────────────────────────────────┘
```

- Calls `POST /terminals/{id}/revoke`; the server cache makes it effective within 30 s (SPEC §4.5).
- **The end state is also what a terminal sees** when it was revoked elsewhere (by the owner on another device or by a bank admin): any terminal request returning 401 with a revoked status lands here.
- **Gap:** SPEC §8 has no `GET /terminals`, so an owner can't see or revoke a *stolen* phone from another device (T13). Open question 7.
- **States:**

  | State | Behaviour |
  |---|---|
  | Loading | "Revoking…" |
  | Error | "Couldn't revoke. Check internet and try again." The terminal keeps working until it succeeds, and the dialog says so |
  | Disabled | Not available to cashiers |

- **Astryx:** `AlertDialog`, `EmptyState` (end state, with `actions`), `Button`.

### D1 Web demo console (desktop, demo mode only)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ FingerPay demo · simulated integrations (disclaimer)               Staff: demo  │
├───────────────────────┬─────────────────────────────┬───────────────────────────┤
│ SMS feed (View D)     │   TERMINAL (390 dp column)  │ ┄┄ SIMULATOR ┄┄┄┄┄┄┄┄┄┄┄┄ │
│ ••4521 Receipt PKR 180│   S3–S8 exactly as on the   │ Finger tray               │
│ ••7789 Declined…      │   phone, same states        │ [ Ayesha Khan  (salary) ] │
│ [Reply DISPUTE][LOCK] │                             │ [ Bilal Hussain (student)]│
│                       │                             │ [ Low balance  (Bilal)  ] │
│                       │                             │ [ Unregistered thumb    ] │
│                       │                             │ [ Toggle internet down  ] │
└───────────────────────┴─────────────────────────────┴───────────────────────────┘
```

- **The simulator panel is visibly not the product:** a dashed "SIMULATOR" frame, a neutral palette, its own heading. It renders only behind `FP_DEMO_MODE` + a staff session (SPEC T22). The tray names shoppers because it is the demo's control panel. **The terminal column still never shows a name on declines.**
- **Astryx:** `Layout` with `start` (SMS feed, `table-inbox` reduced to a list) and `end` (simulator) panels; the terminal column as above.

---

## 4. States: shared rules and matrix

**Shared rules**
- **Show something immediately** (`loading.md › Best practices`: "Show something as soon as possible").
  - The keypad works before the session resolves.
  - Today shows skeletons or cached figures.
  - No full-screen spinners anywhere.
- **Errors are inline, in the voice of the screen, with a next step** (`feedback.md › Best practices`: "Show people when a command can't be carried out and help them understand why"). No SQL text and no codes, except a correlation id in a "Details" disclosure for support.
- **Disabled controls say why in visible text** under or beside them (playbook §4). Tooltips alone don't work on touch.
  - Controls a role can never use are **absent**, not disabled (void, export, revoke for cashiers).
  - Controls blocked by a temporary condition are **disabled with a reason** (Charge while the scanner is unplugged).
- **Result screens never time out.** Toasts are used only for non-essential confirmations (back online, sale voided) and auto-hide at 5 s.
- **Announcements:** results are announced once (assertive). The countdown is announced politely every 30 s. Banners themselves create no live region (Astryx Banner note), so `useAnnounce` is called from the state transition.

**Matrix** (✓ designed above, n/a not applicable)

| Screen | Loading | Empty | Error | Disabled |
|---|---|---|---|---|
| S1 Pair | stepwise checklist | n/a | integrity / network / not owner | Pair until key + integrity |
| S2 Sign-in | button spinner | n/a | inline, generic, rate limit, session expired | until fields filled; bank roles refused |
| S3 Sell | keypad live, "Connecting…" | amount 0 → Charge disabled | open-charge failure banner | offline → Take cash; scanner; paused; revoked |
| S4 Waiting | "Opening sale…" ≤ 1 s | n/a | scanner unplugged; network → S8 | n/a |
| S5 Checking | the state itself | n/a | slow line; lost → S8b | Cancel hidden |
| S6 Settled | n/a | absent fields collapse | n/a | n/a |
| S7 Declines | n/a | n/a | retry failure → S8b | Try again hidden when locked |
| S8 Take cash | "Waiting for internet…" | no amount variant | n/a | n/a |
| S9 Today | skeleton + cached | zeros + illustration + Go to Sell | banner + stale data | Export absent for cashier |
| S10 Void | "Voiding…" | n/a | 409 / past day / network | until reason (+ note) |
| S11 Export | "Preparing…" | header-only file | rate limit / offline | hidden for cashier |
| S12 Settings | "Checking…" rows | n/a | scanner / integrity | n/a |
| S13 Revoke | "Revoking…" | n/a | keeps working until success | hidden for cashier |

---

## 5. Hierarchy: the shared ladder

Every screen uses the same four tiers, so a cashier's eye learns one pattern (interface-design: "weight and colour do more hierarchy work than size"):

| Tier | What | Levers |
|---|---|---|
| 1. Verdict | RECEIVED, DECLINED, TAKE CASH, Checking… | Largest size, heaviest weight, status field behind it, top-left |
| 2. Money | The amount | Display size, tabular, split decimals (§7). Tier 1 on S3/S4, where there's no verdict yet |
| 3. Context | Shopper initial, net, fee, ref, store, countdown | Body size, secondary ink |
| 4. Chrome | Status capsule, tab bar, Settings rows | Smallest, glass or plain, never accent |

**Per-screen focal summary**

| Screen | Focal | Wins by |
|---|---|---|
| S1 | Store name | Size; the checklist demoted to secondary ink |
| S2 | Sign in button | The only accent on the screen |
| S3 | Amount | Size + an empty field around it; Charge is the only accent fill |
| S4 | Amount (then instruction) | Hero size, readable at ~1 m |
| S5 | "Checking…" | It's the only thing that changed; the amount stays still |
| S6 | "180 RECEIVED" | Verdict word beside the number, on the status field |
| S7 | Headline | Status field + size; the amount demoted with "not charged" |
| S8 | TAKE CASH | Largest type in the product; nothing else on the field |
| S9 | Net settled today | The only hero-size figure; other figures one tier down |
| S10 | Amount; then the chosen reason | Size; the destructive action anchored at the bottom |
| S11 | Export CSV | The sheet's only primary |
| S12 | (none, by design) | A grouped reference list |
| S13 | Consequence sentence | Alert title + body; destructive button not default |

---

## 6. Glass and material rules

The domain reason: on a sheesha counter, glass sits **over** the goods and never *is* the goods. Apple's model says the same (`liquid-glass.md › The two layers`; `materials.md › Liquid Glass`: "forms a distinct functional layer for controls and navigation elements … that floats above the content layer").

| Allowed (functional layer) | Never (content layer) |
|---|---|
| Bottom tab bar | Any amount, anywhere |
| Status capsule (S3/S9 header) | Keypad keys and presets (opaque: sunlight contrast, and they're used 100+ times a day) |
| Bottom sheets (S10, S11, day picker) | Result fields (S6, S7, S8), which are opaque status fills |
| The three round action buttons on Today | Today stack cards (content; security print instead) |
| | Ledger rows and tables |
| | The whole charge flow S4–S8: **zero glass from Charge to New sale** |

**Material rules**
1. **Clear, not milky.** Glass is drawn as the barni jar: a translucent fill, a hard 1 dp top-edge highlight, a light backdrop blur. TYPE-AND-COLOR/MOTION set the values.
   - Starting points from `liquid-glass.md › Cross-platform translation`: "Regular about 20 to 40 px" blur, fill "about 60 to 80% opacity".
   - Use the *regular* variant everywhere; the app has no media backgrounds, so *clear* never applies (`materials.md`: "Only use clear Liquid Glass for components that appear over visually rich backgrounds").
2. **Labels on glass are monochrome.** The accent appears on glass only as the selected tab's indicator (`color.md › Liquid Glass color`: "Apply color sparingly … reserve it for … status indicators or primary actions").
3. **Scroll edge, not a painted bar.** On Today, rows fade under the capsule and tab bar; no solid strip is painted beneath them (`layout.md › Visual hierarchy`: "use a scroll edge effect to visually elevate controls above content").
4. **Android:** blur only on API 31+ (`RenderEffect`), and only on the tab bar and sheets. Below that, an opaque tinted surface with the same edge highlight (`liquid-glass.md › React Native`: "On Android, blur is costly and inconsistent … Prefer an opaque or lightly translucent bar").
5. **Opaque fallbacks:** Reduce Transparency, `prefers-reduced-transparency`, `prefers-contrast: more`, Android high-contrast text, and any battery saver all switch every glass surface to an opaque fill with a 1 dp border (`liquid-glass.md › Review checklist` #5).
6. **No glow.** Depth is occlusion only (playbook §3.1). Glass gets at most the theme's `low` shadow.
7. **Count:** at most three glass elements on any screen (capsule, tab bar, and either the round buttons or one sheet). Never glass on glass: when a sheet is open, the tab bar behind it is covered by the scrim, not layered.

---

## 7. Big-number treatment for PKR amounts

**Source and formatting**
- Amounts arrive as **decimal strings** (SPEC §4.6) and are formatted as strings:
  - group the integer part with commas (`18,629.19`)
  - never `Number()`, `parseFloat` or `Intl.NumberFormat` on a float
- **Unit:** "PKR", shown as a separate, smaller label (secondary ink, tracked caps). It sits **above** the hero amount on S3–S8, so the figures keep the full width, and inline before figures in rows ("PKR 180.00").
- **Grouping:** Western 3-digit (1,000,000). Not lakh grouping, which isn't standard in Pakistani banking.

**Two kinds of amount**

| Kind | Example | Decimals |
|---|---|---|
| Typed by the cashier (keypad, Charge label, waiting hero) | `180` | **None.** The keypad has no decimal key; showing `.00` would suggest paisa entry |
| Produced by the database (net, fee, balance, ledger gross, cashback, settled hero) | `179.19` | **Always two**, split treatment below |

**Split decimals (the reel's move)**
- The integer at 100% size; the decimal point and two decimals at **50%**, same baseline, one weight lighter, secondary ink. They still meet 4.5:1 at their own size, so no ghosting.
- On the settled hero the received amount is shown as typed ("180"). The split decimals show on the net/fee rows below it.

**Figures**
- Tabular lining figures everywhere (`font-variant-numeric: tabular-nums lining-nums`; one of the playbook's six unthemed surfaces).
- Ledger amounts are right-aligned so decimal points line up.

**Sizes (as constraints; TYPE-AND-COLOR sets the scale)**

| Role token | Where | Constraint |
|---|---|---|
| `amount-hero` | S4–S8 | Cap height ≥ 40 dp at 360 dp width (readable at ~1 m across a counter); "PKR 999,999" must fit 328 dp without truncation |
| `amount-entry` | S3 | One step below hero; fits 6 digits + grouping |
| `amount-display` | Today top card | Below hero; split decimals |
| `amount-edge` | Stack card edges, sheet header | Large body, semibold |
| `amount-row` | Rows | Body size, tabular |

- **Never shrink-to-fit continuously.** If a hero amount won't fit (very large numbers, or a 200% text size), step down exactly one role. Never truncate money: `typography.md › Supporting Dynamic Type`: "Keep text truncation to a minimum".
- **Text scaling:** amounts scale with system text size up to 200% (`accessibility.md › Vision`: "at least 200 percent"). At large sizes the S6 receipt rows stack label-over-value (`typography.md`: "consider using a stacked layout").
- **Zero:** `0` on S3 (secondary ink). `PKR 0.00` on Today (real zeros, primary ink). A decline says "PKR 0 FEE CHARGED", verbatim from SPEC.
- **Live updates:** the figures on Today count up to a new value only when the change happened while the screen was visible, and never on first paint (MOTION.md intent). Reduced motion: swap instantly.

---

## 8. Touch targets, one-handed use, sunlight

### 8.1 Target sizes

Apple's baseline is 44×44 pt default (`accessibility.md › Mobility`; `buttons.md › Best practices`); Android's minimum is 48 dp. A counter is harder than both: speed, glances, wet or dusty fingers, a moving body.

| Control | Height | Min width | Gap to neighbour |
|---|---|---|---|
| Keypad key | **64 dp** | ⅓ of keypad (≥ 96 dp) | 8 dp |
| Charge / New sale / Take cash | **64 dp** | full width minus margins | 16 dp above |
| Presets | **56 dp** | ≥ 72 dp | 8 dp |
| Try again / Cancel sale | 56 dp | full width | 12 dp |
| Round glass buttons (Today) | 56 dp circle | 56 dp | 24 dp between centres' edges |
| Everything else (rows, switches, sheet buttons, tabs) | 48 dp | 48 dp | 12 dp around bezelled controls, 24 dp around bezel-less (`accessibility.md › Mobility`: "about 12 points of padding … about 24 points") |

**Astryx note.** The largest control token is `--size-element-lg` = 36 px, below all of these. The terminal therefore runs inside a **nested "counter" theme** (Astryx supports nested `<Theme>` providers) that raises the control heights and spacing, made with the theme editor (`editor set <counter> spacing more --on button`, verified with `editor show --png`). The staff consoles keep the base theme. No raw px in components (project CLAUDE.md).

### 8.2 One-handed reach

- **The bottom 60% is for acting; the top 40% is for reading** (`designing-for-ios.md › Best practices`: controls "in the middle or bottom area of the display" are easier to reach).
  - The amount, verdicts and status sit high, where the shopper can also see them.
  - Every button sits low.
- **Primary actions are full-width,** so either hand's thumb reaches them. No primary action lives in a top corner. The top-trailing Cancel on S4 is a duplicate of the bottom one.
- **No gesture-only actions.** Swipe-to-void doesn't exist; void is a button in a sheet (`accessibility.md › Mobility`: "Offer alternatives to gestures").
- **Keypad layout** is phone-style (1-2-3 on top), not calculator-style, because cashiers type prices on phones all day.

### 8.3 Sunlight and tube-light legibility

- Many counters face the street, and `color.md › Best practices` warns: "In bright surroundings, colors look darker and more muted".
- **Targets:**
  - 7:1 for amounts, verdicts and banner text in both appearances
  - 4.5:1 minimum for all other text
  - 3:1 for key edges and focus rings
- **No meaning in hue alone:** every status has an icon and a word (`accessibility.md › Vision`: "Convey information with more than color alone"). Settled vs declined must pass a greyscale squint test.
- **Weights:** no light or thin weights on the counter surface (`typography.md › Ensuring legibility`: "avoid light font weights"). Key labels are semibold.
- **Appearance:** the app follows the system appearance; there's no in-app toggle (`dark-mode.md`).
  - The **light appearance is the sunlight-tested one,** because dark screens show more reflections in daylight.
  - The dark appearance carries the reel's look and must hit the same contrast targets.
  - Whether a counter device is set to light during shop hours is the owner's system setting (Open question 3).
- **Keep the screen awake** during S3–S8 (Android `FLAG_KEEP_SCREEN_ON`; web Screen Wake Lock where available). The screen dims after 2 minutes idle on S3 only.

---

## 9. Staff consoles (Views C–E): skeleton and key components

Analyze mode: desktop-first web, MFA (AAL2), dense, **opaque: no glass at all**, base theme (not the counter theme), the same ink and status roles as the terminal.

**Shell (all three views)**

```
┌──────────────┬──────────────────────────────────────────────────────────┐
│ FingerPay    │ ░ page title            Officer: S. Malik · MFA ✓ · ⎋   │  TopNav strip
│ Bank console │──────────────────────────────────────────────────────────│
│              │                                                          │
│ Enroll       │   content (template per view)                            │
│ Customers    │                                                          │
│ SMS & disputes                                                          │
│ Refunds      │                                                          │
│ Audit log    │                                                          │
│ Terminals    │                                                          │
│ (role-filtered per SPEC §4.1)                                           │
│──────────────│                                                          │
│ disclaimer   │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

- **Shell:** `AppShell` + `SideNav` (items filtered by role; never show a destination the role can't open) + a header with name, role and AAL2 status (`StatusDot` + text; Badge is for counts only). The sidebar is 240 dp: "navigation serves content".
- **Identifiers:**
  - Phone and CNIC are last 4 only, everywhere.
  - Hashes are middle-truncated (`lists-and-tables.md › Content`: "an ellipsis in the middle of text can make an item easier to distinguish").
  - IDs use the mono role.

| View | Template | Key components | Notes |
|---|---|---|---|
| **C: Enrollment** | `form-wizard-vertical`: steps in a left rail; a guidance panel follows the focused field | `Stepper`, `TextInput` (CNIC masked `XXXXX-XXXXXXX-X`, `inputmode=numeric`), `Select` (account type), `NumberInput` (opening balance, simulation), `CheckboxInput` (versioned biometric consent, required), `Button` per step (Verify CNIC with NADRA → Scan & hash thumbprint → Link account & activate), `Banner` per result | Steps unlock in order. Duplicate thumb/CNIC/account: an error `Banner` saying "refused and audited". The consent text version is shown beside the checkbox. "Simulated" labels on the NADRA step |
| **C: Customer lookup + Thumb Lock** | `detail-page` (summary header + activity) | `TextInput` search by CNIC, `Item` summary (name, CNIC ••••, phone ••••, status), `Switch` or `Button` Lock/Unlock + `AlertDialog`, activity timeline | Unlocking needs a stated reason (audited). Lock is instant |
| **D: SMS feed + disputes** | `table-inbox` (two-pane queue, resizable divider) | `Table` (compact) of SMS: time, phone ••••, kind, body preview; reading pane with `Button` Reply DISPUTE / Reply LOCK (demo); disputes queue `Table` → detail with Request refund (maker) | Ticket ID `ABL-DSP-…` in mono with copy. Live feed: new rows animate in only at the top, and pause while the user is scrolled down |
| **D: Refund maker–checker** | same inbox, Refunds tab | Detail: requested by / amount / reason; `Button` Approve (primary) / Reject (secondary) + `AlertDialog` | If the viewer is the maker, both buttons are **disabled with visible text**: "You requested this refund. A different approver must decide." (T6) |
| **E: Bank console** | `table-filter` (filter tokens, saved views, detail pane) | Audit `Table` (dense: time, actor, action, entity, row hash …), `Button` Run integrity check → result `Banner` (success: "Audit chain and all balances verified"; error: "Chain broken at row 5", with a link to the row), Terminals `Table` with Revoke + `AlertDialog` | Integrity runs show a determinate `ProgressBar` only if the API streams progress; otherwise an indeterminate one with "Checking N rows…" |

**Console states:** tables use `Skeleton` rows for loading, `EmptyState` with a next action for empty, an inline `Banner` + retry for errors, and disabled-with-reason for role or maker conflicts. AAL2 lapsed → a re-authenticate `Dialog` (`purpose="required"`), never a silent redirect that loses form input.

---

## 10. Astryx mapping

`npx astryx build` matched no template for the POS (it fell back to an app shell), so the terminal is composed from the frame and foundation components. The other screens map to real templates. The **counter theme** (nested `<Theme>`) wraps S3–S8.

| Screen | Template (scaffold with `npx astryx template <id>`) | Components |
|---|---|---|
| App frame (terminal) | none (custom bottom-bar frame): `Layout` with `footer` = tab bar | `Layout`, `HStack`, `Button`/`IconButton` (tabs, `ghost`), `StatusDot` |
| S1 Pair | `form-wizard` | `Stepper`, `Step`, `Item`, `StatusDot`, `Button`, `Banner`, Arch Gauge (custom SVG) |
| S2 Sign-in / Unlock | `login` (or `login-card`) | `TextInput`, `Button`, `Banner` |
| S3 Sell | none → `Layout` | `Grid` (3×4 keypad of `Button`), `HStack` (presets), `Text` (custom type `amount-entry`), `StatusDot`, `Banner`; tablet: `Layout` `end` + `Table` (compact) |
| S4–S5 Waiting / Checking | none → `Layout` | `Text` (`amount-hero`), Arch Gauge, `Button`, `Banner`, `useAnnounce` |
| S6–S7 Settled / Declines | none → `Layout` | `Banner` (`success` / `error` / `info` / `warning`) or a themed `Card` status field, `Text`, `Item` (receipt rows), `Button`, `useAnnounce` |
| S8 / S8b Take cash / Unconfirmed | none → `Layout` | `Banner` frame (`warning`, themed as `take-cash`), `Text`, `Button`, `Spinner` (inline "waiting for internet"), `Toast` (back online) |
| S9 Today | `table-page` (facts block + flat table) | `Card` ×3 (stack), `IconButton` `elevation="med"` + `Text` label (round glass buttons), `Text`, `Table` / `Item`, `StatusDot` (`icon`), `Skeleton`, `EmptyState`, `Banner` |
| S10 Detail + Void | none (sheet over S9) | `BottomSheet` (`purpose="form"`, `snapPoints`), `Item`, `RadioList`, `TextArea`, `Button` (`destructive`), `AlertDialog`, `Toast` |
| S11 Export | none (sheet) | `BottomSheet` (`height="hug"`), `Select`, `Text`, `Button` |
| S12 Settings | `settings` | `Section`, `Heading`, `Item`, `Switch`, `StatusDot`, `Button` |
| S13 Revoke | none | `AlertDialog`, `EmptyState` (`actions`) |
| D1 Demo console | none → `Layout` (`start`/`end` panels) | `Layout`, `Item`/`Table`, `Button` |
| C Enrollment | `form-wizard-vertical` | `Stepper`, `TextInput`, `Select`, `NumberInput`, `CheckboxInput`, `Button`, `Banner` |
| C Lookup | `detail-page` | `TextInput`, `Item`, `Switch`, `AlertDialog` |
| D SMS + disputes | `table-inbox` | `Table`, `Button`, `AlertDialog`, `Toast` |
| E Bank console | `table-filter` | `Table`, `Button`, `Banner`, `ProgressBar`, `AlertDialog` |
| Console shell | `shell-side-nav` | `AppShell`, `SideNav`, `TopNav` |

**Build notes for implementers**
- **StyleX:** the CLI reports that some templates (e.g. `shell-top-nav`) use StyleX and need a compiler plugin. `next.config.ts` has none today. Check each template with `npx astryx docs styling-overview` before scaffolding, or add the plugin first.
- **Custom drawing:** the Arch Gauge is the one custom-drawn component: an SVG built from `brand/` vectors once they exist. Everything else is Astryx.
- **Tokens:**
  - The role tokens named here (`amount-hero`, `settled`, `take-cash`, …) become theme entries. Text types: "Themes may add custom types" (Astryx `Text`). Colours go through `defineTheme` / the theme editor, never `:root` overrides.
  - Motion maps to `--duration-*` and `--ease-*`.
- **No raw `<div>`, hex or px** (project rules). The Compose app mirrors the same tokens as a `MaterialTheme`-free custom theme.
- **Before delivering a build:** `npx astryx doctor --built <dir>`.

---

## 11. Component checkpoints (interface-design)

Each line names a role token TYPE-AND-COLOR will define. Spacing base: 4 dp (`--spacing-1`); counter density is spacious, console density is compact.

**Amount display (S3–S8)**
```
Intent:     cashier + shopper verify one number in < 1 s, at arm's length and across the counter
Hierarchy:  tier 2 (tier 1 before a verdict); wins by size + the empty field around it
Palette:    ink-primary on surface-counter; decimals ink-secondary (≥ 4.5:1 at their size)
Depth:      none: flat on the opaque content surface; money never floats
Surfaces:   surface-counter (base), the same in both appearances' structure
Typography: amount-hero / amount-entry, semibold, tabular lining, tight tracking on large sizes
Spacing:    16 dp margins, ≥ 32 dp clear space above and below
```
**Keypad (S3)**
```
Intent:     typed 100+ times an hour without looking twice; must never miss or double a tap
Hierarchy:  tier 3 visually (quiet keys) so the amount above wins
Palette:    key fill one step off the surface; label ink-primary; pressed = one step darker
Depth:      surface shift only, no shadows (a grid of shadows reads as noise)
Surfaces:   control-key (an inset-like fill), opaque, never glass
Typography: key-label, semibold, large body size; "Clear" and ⌫ one step smaller
Spacing:    64 dp rows, 8 dp gaps, keypad max width 400 dp
```
**Charge / New sale button**
```
Intent:     the one action per screen; reachable by either thumb
Hierarchy:  the only accent fill on the counter screens
Palette:    accent fill + on-accent label (≥ 4.5:1); disabled = neutral fill + visible reason
Depth:      flat; press = scale 0.97 (≥ 0.95) + a darker fill
Surfaces:   n/a (a solid control)
Typography: action-label, semibold; the label repeats the amount
Spacing:    64 dp height, full width minus 32 dp, 16 dp above
```
**Result field (S6–S8)**
```
Intent:     a verdict at a glance, from a cashier who wasn't looking
Hierarchy:  tier 1: status fill + headline size, top 55% of the screen
Palette:    status roles settled / declined / info / paused / take-cash, each with icon + word, 7:1 text
Depth:      none: a field of colour, not a floating card
Surfaces:   status-*-field (solid), status-*-ink
Typography: verdict (largest), detail (one step down), amount-hero or amount-edge
Spacing:    24 dp internal padding, verdict-to-detail 8 dp, field-to-receipt 24 dp
```
**Arch Gauge**
```
Intent:     echo the scanner's state; make waiting feel armed, not frozen
Hierarchy:  anchor between amount and instruction; never the focal; aria-hidden
Palette:    ink-secondary strokes at rest, ink-primary when closed, status ink when broken
Depth:      none (line art)
Surfaces:   sits on whichever surface is behind it
Typography: the measured time beneath in data-small, tabular
Spacing:    120 dp tall on compact, centred, 24 dp above and below
```
**Today stack + round buttons**
```
Intent:     the owner's reel moment: three figures, all legible without touching anything
Hierarchy:  top card's net settled = only hero figure; edge strips one tier down; rows tier 3
Palette:    card surface one step above the page; security print ≤ 1.3:1; round buttons on glass, monochrome icons
Depth:      layered offset (12 dp) + the theme's low shadow on cards; glass only on the round buttons
Surfaces:   surface-page → surface-card (+1 step) → glass-functional
Typography: amount-display (split decimals), amount-edge, label caps tracked for card titles
Spacing:    16 dp card padding, 12 dp stack offset, 24 dp to the round buttons, 32 dp to rows
```
**Ledger row**
```
Intent:     scan 30 rows for anything not ✓
Hierarchy:  status symbol + gross carry the row; time and name secondary
Palette:    ink-primary gross; ink-secondary time/name; status icon colour + accessible label
Depth:      dividers only (rows), no cards
Surfaces:   page surface; pressed = overlay-pressed
Typography: amount-row tabular right-aligned; body for the name; mono not used on compact
Spacing:    48 dp row height, 16 dp margins
```

---

## 12. Checks run on this design

- **Swap test.**
  - Replace the Arch Gauge with a spinner, and S4–S6 become any POS. Replace the stack with three tiles, and Today becomes any dashboard. These are the two places the identity lives, and both carry real information.
  - Swapping the font changes little here, by design; TYPE-AND-COLOR carries that.
- **Squint test.** In every screen one block dominates: the amount or the verdict field. Status survives greyscale (icon + word).
- **Signature test.** The Arch Gauge appears in five places: Waiting, Checking, Settled, Declined (broken), Pairing; plus the security print on Today and the launch mark.
- **Token test.** The role names (`surface-counter`, `amount-hero`, `take-cash`, `glass-functional`, `security-print`) say "a payment counter", not "any app".
- **HIG/platform pass.**
  - One prominent button per view (`buttons.md › Style`: "Keep the number of prominent buttons to one or two per view").
  - Destructive actions are never primary.
  - One sheet at a time.
  - Glass on the functional layer only.
  - No app-specific appearance toggle.
  - Targets at or above platform defaults.

---

## 13. Open questions for the user

1. **Platform:** confirm Kotlin + Compose for the production terminal (and the web POS as the demo terminal). Is the team comfortable with Kotlin, or is React Native a team-skill requirement despite needing native modules anyway?
2. **Unconfirmed sales (S8b):** if the connection drops after the thumb was sent, the terminal says "Don't take cash yet" and retries, instead of TAKE CASH. This is a new state beyond SPEC §5. Approve it?
3. **Appearance on the counter:** follow the phone's system setting (recommended, per HIG), or should a dedicated counter device be set to light during shop hours for sunlight? The reel's dark look stays available either way.
4. **Maximum typed amount:** cap keypad entry at 6 digits (PKR 999,999)? Kiryana baskets rarely pass PKR 10,000, and per-tap limits stop at PKR 5,000 anyway.
5. **Voids by an owner on a cashier's shift:** switch user on the terminal (owner signs in, voids, cashier signs back in), or require the owner to void from their own phone?
6. **"Locked by the owner"** in the SPEC banner means the *account holder*, but merchant staff will read "owner" as the shop owner. May CONTENT.md change it to "locked by the account holder"? (The same applies to SPEC's all-caps strings: keep them verbatim, or allow sentence case for the detail line?)
7. **Stolen-phone revoke:** SPEC §8 has no "list my terminals" endpoint, so an owner can't revoke a stolen phone from another device. Add `GET /terminals` (owner) to the API?
8. **Attempts left:** the database locks a charge after 3 declines but doesn't return attempts remaining or charge status. Add both to the thumb response so "Try thumb again (2 left)" is exact rather than counted on the client?
9. **Spoken Urdu confirmation** (SPEC §13 #4): build it for the demo, and should it be on by default at the counter?
10. **Shopper-facing amount:** should the waiting screen offer a "turn to shopper" mode (rotated 180°, amount only) for counters where the shopper can't see the cashier's screen?
