import { describe, expect, it } from 'vitest';
import {
  amountString,
  divRoundHalfUp,
  formatAmount,
  mdrBreakdown,
  paisa,
  parseAmount,
} from '../src/money';

describe('money parsing and formatting', () => {
  it('parses decimal strings to exact paisa', () => {
    expect(parseAmount('0')).toBe(0n);
    expect(parseAmount('0.00')).toBe(0n);
    expect(parseAmount('180')).toBe(18_000n);
    expect(parseAmount('180.5')).toBe(18_050n);
    expect(parseAmount('180.19')).toBe(18_019n);
    expect(parseAmount('9999999999.99')).toBe(999_999_999_999n);
  });

  it('rejects floats, negative numbers, extra decimals and leading zeros', () => {
    for (const bad of ['', '-1', '01.00', '10.123', '1e5', 'NaN', '100.', '.50', ' 100']) {
      expect(() => parseAmount(bad), bad).toThrow();
      expect(amountString.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('formats paisa back to two-decimal strings', () => {
    expect(formatAmount(paisa(0n))).toBe('0.00');
    expect(formatAmount(paisa(5n))).toBe('0.05');
    expect(formatAmount(paisa(18_000n))).toBe('180.00');
    expect(formatAmount(paisa(-17_919n))).toBe('-179.19');
  });

  it('rounds half away from zero (never banker’s rounding)', () => {
    // 0.585 -> 0.59 (even digit 8 before 5 would round down under half-even)
    expect(divRoundHalfUp(585n, 10n)).toBe(59n);
    // 0.575 -> 0.58
    expect(divRoundHalfUp(575n, 10n)).toBe(58n);
  });
});

describe('MDR fee breakdown — SPEC §6.1 test vectors', () => {
  const vectors: Array<[gross: string, fee: string, fp: string, bank: string, net: string]> = [
    ['50.00', '0.00', '0.00', '0.00', '50.00'],
    ['100.00', '0.00', '0.00', '0.00', '100.00'],
    ['100.01', '0.45', '0.32', '0.13', '99.56'],
    ['130.00', '0.59', '0.41', '0.18', '129.41'],
    ['180.00', '0.81', '0.57', '0.24', '179.19'],
    ['500.00', '2.25', '1.58', '0.67', '497.75'],
    ['5555.56', '25.00', '17.50', '7.50', '5530.56'],
    ['10000.00', '25.00', '17.50', '7.50', '9975.00'],
  ];

  it.each(vectors)(
    'gross PKR %s -> fee %s (FP %s + bank %s), net %s',
    (grossStr, feeStr, fpStr, bankStr, netStr) => {
      const b = mdrBreakdown(parseAmount(grossStr));
      expect(formatAmount(b.fee)).toBe(feeStr);
      expect(formatAmount(b.fingerpayShare)).toBe(fpStr);
      expect(formatAmount(b.bankShare)).toBe(bankStr);
      expect(formatAmount(b.net)).toBe(netStr);
      // Invariants that the database CHECK constraints also enforce:
      expect(b.fingerpayShare + b.bankShare).toBe(b.fee);
      expect(b.gross - b.fee).toBe(b.net);
    },
  );
});
