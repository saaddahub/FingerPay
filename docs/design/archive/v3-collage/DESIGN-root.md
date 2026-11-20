# FingerPay design

The decisions, merged. Detail lives in `docs/design/*.md`. Where those docs disagree with this file, **this file wins**. Product truth is in `PRODUCT.md`, the brand in `brand/BRAND.md`.

## User decisions (2026-11-18/19)

1. **The website is a landing page with paper cut-out collage vignettes.** It's not a scroll story and not 3D. The art style follows the user's recorded reference (2026-11-19): vintage hand-coloured, gouache-painted figures cut out like paper (white paper edge, soft shadow), loose watercolour backgrounds, torn-paper labels and ribbons, and hand-drawn speech bubbles. Each section gets one short loop at 12 fps with real copy beside it. Never copy the reference's art or layout. (human-md.ai turned out to be styled photo cut-outs, not drawings; it's no longer the reference.)
2. **The page is light, textured off-white paper** (`#EFE9DE` family with a subtle grain). The cut-outs sit directly on it with their paper edge and shadow, so no panels are needed. This replaces the earlier dark-page decision. Use the light column of the TYPE-AND-COLOR tokens, with full-width ink (`#1C1C1F`) bands for type-only moments. Display type should move toward a tall condensed face with a vintage print feel; revisit the Cabinet Grotesk pick against the reference before the build.
3. **Motion is the one animation library,** alongside Lenis and a canvas frame player. Remove `animejs`. GSAP comes in only if several pinned or scrubbed sections are added later. No three.js; the WebGL layer is one small hand-written shader (MOTION-3D.md).
4. **Vignettes play 3 loops when they come into view, then rest on their key pose.** A single "Pause animations" control stops them all.
5. **No non-PTA claim.** The copy says receipts and Thumb Lock work "on any basic phone with SMS: no smartphone, no data plan". PRODUCT.md is updated to match.
6. **The art comes from Google Flow or Higgsfield,** using `docs/design/ART-PROMPTS.md`, or from real public-domain prints. The cast is old European engraved figures (a Georgian grocer, a Victorian lady shopper, an 18th-century student) collaged with modern objects (scanner, phones). They stay unnamed in the art; the personas in PRODUCT.md (Rasheed, Ayesha, Bilal) stay as the product's demo data.
7. **Modern cast (2026-11-19, replaces the period cast in decision 6).** The figures are present-day Pakistani people (Rasheed, Ayesha, Bilal) in the same hand-inked, watercolour, paper cut-out style. Prompts and drop-in file names: `docs/design/ART-PROMPTS.md` › "Cast v2". The scanner is a modern optical reader drawn in code (`src/app/scanner-art.tsx`), and the hero has no thumbprint wipe.

## The system in one screen

| Area | Decision | Source |
|---|---|---|
| Rule | **People are drawn; money is typed.** Every amount, banner and SMS is real DOM text on or beside the art. The generated art never contains text. | DIRECTION.md |
| Logo | Use the SVGs in `brand/` and never set the wordmark as live text (it's SF Pro, licensed for Apple platforms only). On dark: `#F5F5F7` for the mark and wordmark, `#A1A1A6` for the tagline. | brand/BRAND.md |
| Type | Bricolage Grotesque 800 (optical size 96, tracking -0.04em) for display, Instrument Sans for text and UI, JetBrains Mono for amounts. All variable, self-hosted from `@fontsource-variable` (user decision 2026-11-19, replaces Cabinet Grotesk / League Gothic). | TYPE-AND-COLOR.md, CONSTRAINTS.md |
| Colour | One accent: stamp blue `#77AADB` on dark (`#295E90` on light). Settled is green; declined is **neutral grey, never red**; warning is turmeric; offline TAKE CASH is an inverted ink card. The art palette is in ART-PROMPTS.md §1. | TYPE-AND-COLOR.md |
| Grid and spacing | 4/8/12 columns. No 6+6 text/art splits, and no rows of 3 or 4 equal tiles. 8 px spacing scale. | CONSTRAINTS.md |
| Sections | Nav · Hero (press-and-hold thumb) · Problem (uneven 3-panel) · How it works (4-step staircase) · For shops (the real app UI on Rasheed's phone) · Safety (live Reply LOCK) · Every phone (Bilal's SMS) · Numbers (set as the PKR 180 receipt) · Footer (disclaimer on the shutter) | WEBSITE.md, CONTENT.md |
| Copy | CONTENT.md, verbatim. The disclaimer comes from PRODUCT.md. "Risk Engine", never "AI". | CONTENT.md |
| Motion | One shared ticker (Motion `frame` drives Lenis, the frame player and WebGL), springs by role, money never bounces, and a reduced-motion version of every animation. | MOTION.md |
| Frames | 224 unique frames. Store a base frame plus only the changing region of the others; each vignette's decoded budget is 48 MB at most. On phones, crop 16:9 scenes to 4:5. | WEBSITE.md, CONSTRAINTS.md |
| App | Production terminal in Kotlin + Compose; the web POS is the demo. Keypad first, with the Arch Gauge as the live state. No illustration at the counter moment. Needs a "counter" Astryx theme with 64 dp keys. | APP.md |
| Video | A 12 s silent hero loop and an 84 s pitch film, both reusing the vignette art. | VIDEO.md |
| Quality bar | LCP < 1.5 s, first view ≤ 1.4 MB on desktop and 650 KB on mobile, Lighthouse accessibility ≥ 95, keyboard-operable, and a press-and-hold that also completes with one tap or Enter. | DIRECTION.md, CONTENT.md |

## Backend issues found by the design work (milestone M1/M3, not done yet)

- **A timeout can double-charge.** After a thumb request with no reply, show "Don't take cash yet" and retry the same charge (APP.md, CONTENT.md).
- **The void/refund SMS overstates the refund.** It ignores the cashback that gets clawed back. Fixing it needs a new migration plus test changes.
- **SMS replies like "lock karo" or "Lock." get no answer;** neither does a repeated LOCK.
- **No API lists a shop's terminals,** so an owner can't revoke a stolen phone from another device.

## Still open (not blocking design)

- An original vector logo file, if one exists (the current wordmark is traced).
- A favicon for very small sizes.
- Spoken Urdu confirmation, Urdu on the page, a `/security` page, an investor contact line and team credits.
