// The Ridge Coin's geometry, in coin units (viewBox −24…24, origin at the centre, y down).
// Same parameters as brand/fingerpay-mark.svg (docs/design/SYSTEM.md §7): change one, regenerate the other.
export const RING = { r: 22, width: 2.2 } as const;
export const CLIP_R = RING.r - RING.width / 2 - 2.6; // 18.3
export const RIDGES = {
  width: 2.1,
  yBottom: 14.5,
  yTop: -10,
  h: [3.0, 4.4, 5.8, 7.0, 8.0, 8.8],
  sigma: [12, 11.4, 10.8, 10.3, 9.9, 9.6],
  peakX: 1.2,
  samples: 49,
} as const;

export const ridgeBase = (i: number) =>
  RIDGES.yBottom + ((RIDGES.yTop - RIDGES.yBottom) * i) / (RIDGES.h.length - 1);

export const ridgeY = (i: number, x: number, hScale = 1) =>
  ridgeBase(i) - RIDGES.h[i] * hScale * Math.exp(-(((x - RIDGES.peakX) / RIDGES.sigma[i]) ** 2));

/** Points of ridge i, sampled across the coin (x from −24 to 24). */
export function ridgePoints(i: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let s = 0; s < RIDGES.samples; s++) {
    const x = -24 + (48 * s) / (RIDGES.samples - 1);
    pts.push([x, ridgeY(i, x)]);
  }
  return pts;
}

/** Where the dive aims (MOTION.md §2.4): ridge 5's peak on a light screen, the 4–5 gap on a dark one. */
export const AIM = {
  ridge: { x: RIDGES.peakX, y: ridgeY(4, RIDGES.peakX), band: RIDGES.width, curvature: RIDGES.h[4] / RIDGES.sigma[4] ** 2 },
  gap: {
    x: RIDGES.peakX,
    y: (ridgeY(3, RIDGES.peakX) + ridgeY(4, RIDGES.peakX)) / 2,
    band: ridgeY(3, RIDGES.peakX) - ridgeY(4, RIDGES.peakX) - RIDGES.width,
    curvature: RIDGES.h[4] / RIDGES.sigma[4] ** 2, // the gap's top edge is ridge 5, the more curved of the two
  },
} as const;
