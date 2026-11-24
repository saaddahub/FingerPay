// Scroll segments of the Inside stage (docs/design/MOTION.md §2.2). Pure functions so they're testable without a browser.
export const SEG = {
  // Crossing the first threshold plays the pay moment; it lands straight on Instant (inside and Instant share it).
  thresholds: [0.03, 0.03, 0.36, 0.68] as const, // inside, Instant, Private, Certain
  releaseStart: 0.94,
  hysteresis: 0.008,
};

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Segment index with hysteresis: −1 hero, 0 inside, 1 Instant, 2 Private, 3 Certain. */
export function segment(p: number, current: number): number {
  const up = SEG.thresholds.filter((t) => p >= t).length - 1;
  const down = SEG.thresholds.filter((t) => p >= t - SEG.hysteresis).length - 1;
  if (up > current) return up;
  if (down < current) return down;
  return current;
}
