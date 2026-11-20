# CLAUDE

Project-specific guidance for AI coding agents.

<!-- ASTRYX:START -->
Astryx v0.7.16 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES (exception: the marketing page `/` is exempt from the Astryx component rules; see "Marketing page exception" below):
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- THEMES: palettes and custom colors go through the theme, never :root overrides. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` and open the PNGs it writes (changes nothing in the app); a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->

## Security rules (non-negotiable; security is this project's top priority)

Source of truth: `docs/SPEC.md`. Database: `supabase/migrations/` (Supabase, PNLF-style). Run `npm run test:db` after any SQL change; it must stay green.

- Money moves only through `fp.post_journal`, called from `fp.api_*` functions. Never grant table privileges to `fp_app`, never add schema `fp` to Supabase's exposed schemas, never touch `fp` with the service-role key.
- New database function = `SECURITY DEFINER` (if it is API) + `SET search_path = ''` + fully qualified names + derive scope from the actor/terminal (never a client-supplied `merchant_id`) + explicit `GRANT EXECUTE ... TO fp_app` + a test in `supabase/tests/fp_db.test.mjs`.
- Applied migrations are immutable: change the schema with a new timestamped migration.
- Never store, log or return raw fingerprints, thumb tokens, CNICs, phone numbers, account numbers or keys. PII is AES-256-GCM encrypted in the server (SPEC §4.3); lookups use HMAC.
- `SUPABASE_SERVICE_ROLE_KEY` never goes into app code or Vercel; only local seed/admin scripts use it.
- Amounts are exact decimals (strings in JSON), never JS floats. Fees are computed in the database (half-up), only displayed by the app.
- Every route: zod `.strict()` validation, role/AAL guard, rate limit, SQLSTATE→HTTP error mapping, no SQL text in responses, redacted logs.
- Demo shortcuts live only behind `FP_DEMO_MODE` + a staff session, and must refuse to run when `FP_ENV=production`.

## Design & UI skills (FingerPay)

Any UI work on the app or website (screens, components, pages, themes, motion, copy) uses the skills below. Load them with the Skill tool before writing UI code.

### 1. Required on every UI task: load all four together
| Skill | Use it for |
|---|---|
| `interface-design` | Product UI craft: layout hierarchy, states, tokens, consistency (app, dashboards, merchant/admin panels) |
| `apple-design` | HIG review for iOS/Android/desktop: navigation, accessibility, dark mode, forms, Apple Pay marks |
| `apple-design-motion` | Spring and gesture motion, interruptible transitions, materials, reduced motion |
| `build-design` | Turning a Figma frame or image into code that matches it, using the project's tokens and components |

### 2. Added for this project
| Skill | Use it for |
|---|---|
| `awwwards` | The marketing website: concept, signature scroll/WebGL moment, self-scoring, performance budget |
| `motion` (Motion AI Kit, in `.claude/skills/motion`) | Motion/animate-in-React code, CSS springs, motion performance audits (MotionScore); the `motion-reviewer` agent audits a whole folder. Free `motion` MCP is in `.mcp.json`; `motion-plus` MCP needs a paid Motion+ account, so don't rely on it. |
| Astryx CLI docs | `npx astryx search/docs/component` before using any Astryx component (rules above) |

### 3. Global UI set (from the user's global CLAUDE.md)
- Direction: `impeccable` (critique, polish, harden, animate, colorize, and so on)
- Craft passes: `better-interface` (one ranked review across all areas), `better-ui`, `better-layout`, `better-typography`, `better-colors`, `better-accessibility`, `better-writing`
- Illustration: `teardown` (technical illustrations, e.g. how a fingerprint scanner or payment works)

### 4. Iteration & testing
The user removed the slash-only flag on 2026-11-17, so load these with the Skill tool like the rest. (A skill update may bring the flag back. If one is missing from the skill list, remove `disable-model-invocation: true` from its SKILL.md again.)
| Skill | Use it for |
|---|---|
| `variant` | Build several versions of a component and pick one |
| `state-machine` | Render every state of a component (loading, empty, error, success) on a throwaway page |
| `break` | Stress a component with every scenario that can reach it (long names, huge amounts, RTL, failures) |
| `interface-review` | Review a branch/PR/uncommitted change for the UI problems it introduced |
| `explain-interface` | Explain how a reference site, effect or animation was built |

### 5. Other design skills that apply
| Skill | Use it for |
|---|---|
| `dataviz` | **Every** chart, sparkline, stat tile or KPI row (balances, spending, merchant sales, admin dashboards) |
| `claude-mem:design-is` | Audit a finished design against Dieter Rams' ten principles, then plan new / refine / redesign |
| Figma `figma-use` skill (via the Figma MCP `get_figma_skill`) | Required before any `use_figma` call. Design in Figma first, then build. |
| `stitch-build:shadcn-ui` | Only if shadcn gets added alongside Astryx |
| `stitch-build:react-native` | If the mobile app is React Native and the designs come from Stitch |
| `stitch-build:react-vite-dashboard`, `stitch-build:remotion` | Vite dashboards from Stitch designs; promo/walkthrough videos |
| `stitch-design:*`, `stitch-utilities:*` (`taste-design`, `design-md`, `enhance-prompt`, `site-md`, `stitch-loop`) | Google Stitch design generation. **Needs the Stitch MCP server, which isn't connected yet.** |
| `artifact-design`, `artifact-diagramming` | Publishing a page, report or diagram as a claude.ai Artifact |

### Order of work
1. **Direction:** `impeccable` + `interface-design` (+ `awwwards` for the website)
2. **Design in Figma first** (Figma MCP + `figma-use`), so the user sees it before it's built
3. **Build:** `build-design` + Astryx workflow, with `apple-design` and `apple-design-motion` applied throughout. Motion via Anime.js v4 / Motion, Lenis smooth scroll, three.js where it earns its place, always with a reduced-motion fallback.
4. **Polish:** `better-interface`, then the specific `better-*` pass it points to
5. **Test:** `state-machine`, `break`, `variant`
6. **Review:** `interface-review`, `design-is`, `awwwards` scoring for the site

### When skills and Astryx disagree
Astryx rules win in code: tokens over hex/px, components over raw `<div>`, theme editor over `:root` overrides. Skills decide what to design; Astryx decides how it's written. Map any skill's raw value to the nearest Astryx token, including motion durations and easing.

### Marketing page exception (user decision 2026-11-20)
The client asked for "no bullshit React components" on the website, so the marketing page at `/` (code in `src/site/`) does **not** use Astryx components, templates, themes or `astryx doctor`. It is hand-written semantic HTML + CSS Modules + the tokens in `src/site/tokens.css` (raw values live only there), with Motion + Lenis. The spec is `DESIGN.md` and `docs/design/*.md` (v4), and `docs/design/BUILD.md` §0 has the details. Still required on `/`: tokens instead of raw hex/px inside components, semantic elements over `<div>` wherever one exists, accessibility, and every security rule above. Every other route (product UI: merchant, admin, `/mobile`) keeps the Astryx rules.
