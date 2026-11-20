// Motion tokens (docs/design/MOTION.md §1.1). Springs mirror Apple's damping/response pairs;
// `magnetic` and `tilt` are the client's portfolio values, unchanged.
export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  expoOut: [0.16, 1, 0.3, 1],
  in: [0.55, 0, 1, 0.45],
} as const;

export const spring = {
  ui: { type: "spring", bounce: 0, visualDuration: 0.4 },
  sheet: { type: "spring", bounce: 0.15, visualDuration: 0.35 },
  release: { type: "spring", bounce: 0.2, visualDuration: 0.3 },
  magnetic: { type: "spring", stiffness: 150, damping: 15, mass: 0.1 },
  tilt: { type: "spring", stiffness: 300, damping: 30 },
} as const;

export const stagger = { lettersIn: 0.03, lettersOut: 0.015, words: 0.06, lines: 0.07, rows: 0.07 } as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
