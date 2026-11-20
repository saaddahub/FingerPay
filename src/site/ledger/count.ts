// Ledger count-up formatting (MOTION.md §7): tween an integer number of the final value's smallest unit and
// format it, so the display never shows float artefacts and never more decimals than the final value.
export function decimalsOf(value: string): number {
  const dot = value.indexOf(".");
  return dot < 0 ? 0 : value.length - dot - 1;
}

export function formatStep(units: number, decimals: number): string {
  const n = Math.round(units);
  const whole = Math.floor(n / 10 ** decimals);
  const frac = decimals ? "." + String(n % 10 ** decimals).padStart(decimals, "0") : "";
  return whole.toLocaleString("en-PK") + frac;
}

/** "5,000" → 5000 units at 0 decimals; "0.45" → 45 units at 2 decimals. */
export function toUnits(value: string): { units: number; decimals: number } {
  const decimals = decimalsOf(value);
  return { units: Math.round(Number(value.replace(/,/g, "")) * 10 ** decimals), decimals };
}
