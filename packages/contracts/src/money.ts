/**
 * Money is exact. On the wire it is a decimal string ("180.00"); in code it is a bigint
 * count of paisa (1 PKR = 100 paisa); in Postgres it is numeric(14,2). JavaScript floats
 * never touch an amount.
 */
import { z } from 'zod';

/** An exact amount in paisa. Construct only through `paisa()` / `parseAmount()`. */
export type Paisa = bigint & { readonly __paisaBrand?: 'Paisa' };

export const paisa = (value: bigint): Paisa => value as Paisa;

/** Up to 10 integer digits (fits numeric(14,2) with headroom), at most 2 decimals, no sign. */
const AMOUNT_RE = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/;

export function parseAmount(input: string): Paisa {
  const m = AMOUNT_RE.exec(input);
  if (!m) throw new RangeError(`Invalid amount: ${JSON.stringify(input)}`);
  const rupees = BigInt(m[1]!);
  const fraction = BigInt((m[2] ?? '').padEnd(2, '0'));
  return paisa(rupees * 100n + fraction);
}

export function formatAmount(value: Paisa | bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const rupees = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${rupees}.${fraction}`;
}

/** Integer division rounding half away from zero (== half-up for non-negative values). */
export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('denominator must be positive');
  if (numerator < 0n) return -divRoundHalfUp(-numerator, denominator);
  return (numerator * 2n + denominator) / (denominator * 2n);
}

/** Wire schema for an amount: a strict decimal string, transformed to Paisa. */
export const amountString = z
  .string()
  .regex(AMOUNT_RE, 'amount must be a decimal string with at most 2 decimals')
  .transform((s) => parseAmount(s));

// ---------------------------------------------------------------------------------------
// Pricing (SPEC 6.1). The server computes; clients only display.
// ---------------------------------------------------------------------------------------

export const MDR = {
  /** Sales at or below this are free. PKR 100.00 */
  freeUpTo: paisa(10_000n),
  /** 0.45% expressed as basis points over 10,000. */
  rateBps: 45n,
  /** Fee cap: PKR 25.00 */
  cap: paisa(2_500n),
  /** FingerPay's share of the fee, in percent. The bank gets the remainder. */
  fingerpaySharePct: 70n,
} as const;

export interface MdrBreakdown {
  gross: Paisa;
  fee: Paisa;
  fingerpayShare: Paisa;
  bankShare: Paisa;
  net: Paisa;
}

export function mdrBreakdown(gross: Paisa): MdrBreakdown {
  if (gross < 0n) throw new RangeError('gross must be non-negative');
  if (gross <= MDR.freeUpTo) {
    return { gross, fee: paisa(0n), fingerpayShare: paisa(0n), bankShare: paisa(0n), net: gross };
  }
  let fee = divRoundHalfUp(gross * MDR.rateBps, 10_000n);
  if (fee > MDR.cap) fee = MDR.cap;
  const fingerpayShare = divRoundHalfUp(fee * MDR.fingerpaySharePct, 100n);
  return {
    gross,
    fee: paisa(fee),
    fingerpayShare: paisa(fingerpayShare),
    // Remainder, so the two shares always add up to the fee exactly.
    bankShare: paisa(fee - fingerpayShare),
    net: paisa(gross - fee),
  };
}
