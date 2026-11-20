import s from "./landing.module.css";

// A modern optical fingerprint reader, drawn as a paper cut-out to sit with the collage figures. The glass lights
// up when the parent sets data-glow="true" (see .scanGlass in landing.module.css). Decorative only.
export function ScannerArt() {
  return (
    <svg className={s.scanArt} viewBox="0 0 120 170" aria-hidden="true" focusable="false">
      <path className={s.scanCable} d="M60 126 C60 146, 52 154, 60 170" />
      <rect className={s.scanEdge} x="5" y="5" width="110" height="130" rx="29" />
      <rect className={s.scanBody} x="12" y="12" width="96" height="116" rx="23" />
      <path className={s.scanHighlight} d="M24 16 H96 a20 20 0 0 1 8 6 H16 a20 20 0 0 1 8 -6Z" />
      <ellipse className={s.scanHalo} cx="60" cy="67" rx="34" ry="40" />
      <rect className={s.scanGlass} x="30" y="30" width="60" height="74" rx="15" />
      <path className={s.scanSheen} d="M36 32 L58 32 L36 70 Z" />
      <rect className={s.scanBezel} x="30" y="30" width="60" height="74" rx="15" />
      <circle className={s.scanLed} cx="60" cy="116" r="3.5" />
    </svg>
  );
}
