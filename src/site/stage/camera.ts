// The dive camera (docs/design/MOTION.md §2.4). Pure functions so the maths is testable without a browser.
export type Vec = { x: number; y: number };

export const SEG = {
  settleEnd: 0.04,
  diveEnd: 0.46,
  thresholds: [0.46, 0.5, 0.66, 0.83] as const, // inside, Instant, Private, Certain
  releaseStart: 0.97,
  hysteresis: 0.008,
};

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export type CameraInput = {
  coinCentre: Vec; // screen px at p = 0
  coinDiameter: number; // screen px at p = 0
  aim: Vec; // coin units
  bandUnits: number; // thickness of what we fly into, in coin units
  curvature: number; // sag of the band's edge per unit², h/σ² of the ridge (Gaussian sag ≤ c·d²)
  viewport: { w: number; h: number };
};

export type CameraOut = {
  u: number; // dive progress 0…1
  k: number; // px per coin unit
  k0: number;
  z: number; // k / k0
  Q: Vec; // aim point on screen now
  Q0: Vec; // aim point on screen at p = 0
  origin: Vec; // coin centre on screen now
  done: boolean;
};

/** Smallest zoom at which the band covers the viewport edge to edge, despite the ridge curving away at the
 *  sides: solve (band/2)·k − c·(w/2k)²·k ≥ h/2 for k, then add 10 %. */
export function endZoom(m: Pick<CameraInput, "bandUnits" | "curvature" | "viewport">): number {
  const { w, h } = m.viewport;
  const b = m.bandUnits;
  return (1.1 * (h / 2 + Math.sqrt((h * h) / 4 + (b * m.curvature * w * w) / 2))) / b;
}

export function camera(p: number, m: CameraInput): CameraOut {
  const u = clamp01((p - SEG.settleEnd) / (SEG.diveEnd - SEG.settleEnd));
  const e = easeInOutSine(u);
  const k0 = m.coinDiameter / 48;
  const kEnd = endZoom(m);
  const k = k0 * (kEnd / k0) ** e; // log-space zoom: constant camera speed
  const Q0 = { x: m.coinCentre.x + m.aim.x * k0, y: m.coinCentre.y + m.aim.y * k0 };
  const V = { x: m.viewport.w / 2, y: m.viewport.h / 2 };
  const et = easeInOutSine(Math.min(u / 0.35, 1)); // centre the aim point first, then dive straight in
  const Q = { x: Q0.x + (V.x - Q0.x) * et, y: Q0.y + (V.y - Q0.y) * et };
  return { u, k, k0, z: k / k0, Q, Q0, origin: { x: Q.x - k * m.aim.x, y: Q.y - k * m.aim.y }, done: u >= 1 };
}

/** Segment index with hysteresis: −1 hero/dive, 0 inside, 1 Instant, 2 Private, 3 Certain. */
export function segment(p: number, current: number): number {
  const up = SEG.thresholds.filter((t) => p >= t).length - 1;
  const down = SEG.thresholds.filter((t) => p >= t - SEG.hysteresis).length - 1;
  if (up > current) return up;
  if (down < current) return down;
  return current;
}
