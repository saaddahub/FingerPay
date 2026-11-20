// The fingerpay theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in fingerpay.settings.json and the generated fingerpay.settings.ts;
// change them with `astryx experimental theme editor set fingerpay ...`. Add your own changes below: they win over the settings.
import {defineTheme} from '@astryxdesign/core/theme';
import {fingerpaySettings} from './fingerpay.settings';

export const fingerpayTheme = defineTheme({
  extends: fingerpaySettings,
  name: 'fingerpay',
  // What the editor can't set (TYPE-AND-COLOR.md §2.8). The landing page and the paper collage use these.
  localTokens: {
    // Ink and paper beyond the semantic roles
    '--fp-ink-3': '#615B54', // meta text on paper, 5.2:1 on #EFE9DE
    '--fp-ink-band': '#1C1C1F',
    '--fp-on-band': '#EFE9DE',
    '--fp-on-band-2': '#D9D2C6', // body text in ink bands, 11.9:1
    '--fp-on-band-3': '#B9B1A5', // meta text in ink bands, 8.4:1
    '--fp-rule-band': 'rgb(239 233 222 / 0.2)',
    '--fp-rule': 'rgb(28 28 31 / 0.14)',
    '--fp-nav-scrim': 'rgb(239 233 222 / 0.86)',
    '--fp-declined': '#5E5A55', // declined is neutral grey, never red
    // Illustration swatches (ART-PROMPTS.md §1)
    '--fp-ill-kraft': '#D8BF98',
    '--fp-ill-scanner': '#2C2A27',
    '--fp-ill-sensor': '#22252A',
    '--fp-ill-sensor-lit': '#FFF8E8',
    '--fp-ill-sensor-warm': '#F3E3BE',
    '--fp-ill-skin': '#E8C9A8',
    '--fp-ill-screen': '#E9E8E2',
    '--fp-ill-sensor-mid': '#5D6168',
    '--fp-ill-sensor-edge': '#9A8F78',
    '--fp-ill-line': '#3B2A20',
    '--fp-ill-sheen': 'rgb(255 255 255 / 0.12)',
    '--fp-ill-skin-shade': 'rgb(120 80 50 / 0.12)',
    '--fp-ring-track': 'rgb(250 247 243 / 0.25)',
    '--fp-rule-dash': 'rgb(28 28 31 / 0.35)',
    '--fp-rule-dot': 'rgb(28 28 31 / 0.3)',
    '--fp-ill-graphite': '#26272B',
    '--fp-ill-graphite-hi': 'rgb(255 255 255 / 0.1)',
    '--fp-ill-glass': '#14202A',
    '--fp-ill-glass-lit': '#FFF4DE',
    '--fp-ill-glass-sheen': 'rgb(255 255 255 / 0.14)',
    '--fp-ill-led': '#5E5A55',
    '--fp-lamp': 'rgb(255 236 200 / 0.55)',
    '--fp-dim': 'rgb(28 28 31 / 0.15)', // --motion-dim: the room dims 15% while the thumb is down
    // Paper cut-out depth: one tight contact shadow plus one soft occlusion, tinted to the ground
    '--fp-shadow-cutout': 'drop-shadow(0 1px 1.5px rgb(28 28 31 / 0.22)) drop-shadow(0 12px 18px rgb(76 71 65 / 0.2))',
    '--fp-shadow-torn': 'drop-shadow(0 1px 1px rgb(28 28 31 / 0.18)) drop-shadow(0 6px 10px rgb(76 71 65 / 0.14))',
    '--fp-shadow-device': '0 1px 2px rgb(28 28 31 / 0.3), 0 24px 40px rgb(76 71 65 / 0.3)',
    // Display type (Bricolage Grotesque, optical size 96) and amounts
    '--fp-display-weight': '800',
    '--fp-display-tracking': '-0.04em',
    '--fp-display-hero': 'clamp(3rem, 6.6vw, 6rem)',
    '--fp-display-section': 'clamp(2.25rem, 4.6vw, 4.25rem)',
    '--fp-display-signoff': 'clamp(2.75rem, 6vw, 5.5rem)',
    '--fp-display-strip': 'clamp(1.25rem, 2vw, 1.75rem)',
    '--fp-display-step': '4.5rem',
    '--fp-amount-lg': 'clamp(1.25rem, 2vw, 1.75rem)',
    '--fp-amount-xl': '2.25rem',
    // Page rhythm beyond the 3rem spacing scale
    '--fp-gutter': 'clamp(1rem, 4vw, 2rem)',
    '--fp-content': '90rem',
    '--fp-space-section': 'clamp(6rem, 10vw, 8rem)',
    '--fp-space-xl': '4rem',
    '--fp-space-2xl': '6rem',
    '--fp-ease-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
  },
});
