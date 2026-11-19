import { formatAmount, parseAmount } from '@fingerpay/contracts';
import { describe, expect, it } from 'vitest';
import { simulateNadraVerify } from '../../src/integrations/sim/nadra.js';
import { formatDisplayName } from '../../src/modules/customers/service.js';
import { computeCashback } from '../../src/modules/pricing/cashback.js';
import { escapeCsvCell } from '../../src/modules/reporting/service.js';

describe('cashback rules (SPEC §0 #16 & §6.2)', () => {
  const richPool = parseAmount('100000.00');
  const emptyPool = parseAmount('0.00');

  it('awards PKR 50 first-tap bonus on first payment >= PKR 150', () => {
    expect(
      formatAmount(
        computeCashback({
          gross: parseAmount('180.00'),
          accountType: 'SHOPPER_SALARY',
          isFirstPayment: true,
          marketingPoolBalance: richPool,
        }),
      ),
    ).toBe('50.00');

    expect(
      formatAmount(
        computeCashback({
          gross: parseAmount('149.99'),
          accountType: 'SHOPPER_SALARY',
          isFirstPayment: true,
          marketingPoolBalance: richPool,
        }),
      ),
    ).toBe('0.00');
  });

  it('awards 2% student cashback (max PKR 20) on non-first payments and never stacks with first-tap', () => {
    // Student first payment >= 150 gets PKR 50 (not 50 + 3.60)
    expect(
      formatAmount(
        computeCashback({
          gross: parseAmount('180.00'),
          accountType: 'STUDENT_NON_PTA',
          isFirstPayment: true,
          marketingPoolBalance: richPool,
        }),
      ),
    ).toBe('50.00');

    // Student existing user payment of PKR 180 gets 2% = PKR 3.60
    expect(
      formatAmount(
        computeCashback({
          gross: parseAmount('180.00'),
          accountType: 'STUDENT_NON_PTA',
          isFirstPayment: false,
          marketingPoolBalance: richPool,
        }),
      ),
    ).toBe('3.60');

    // Capped at PKR 20.00
    expect(
      formatAmount(
        computeCashback({
          gross: parseAmount('1500.00'),
          accountType: 'STUDENT_NON_PTA',
          isFirstPayment: false,
          marketingPoolBalance: richPool,
        }),
      ),
    ).toBe('20.00');
  });

  it('succeeds with PKR 0 cashback if the marketing pool is empty (promotion never blocks a sale)', () => {
    expect(
      formatAmount(
        computeCashback({
          gross: parseAmount('180.00'),
          accountType: 'SHOPPER_SALARY',
          isFirstPayment: true,
          marketingPoolBalance: emptyPool,
        }),
      ),
    ).toBe('0.00');
  });
});

describe('privacy display names, NADRA simulator & CSV formula injection guard', () => {
  it('formats shopper names as first name + initial only (SPEC §0 #18)', () => {
    expect(formatDisplayName('Ayesha Khan')).toBe('Ayesha K.');
    expect(formatDisplayName('Bilal Hussain')).toBe('Bilal H.');
    expect(formatDisplayName('Rasheed')).toBe('Rasheed');
  });

  it('simulates NADRA CNIC verification and rejects 00000-0000000-0', () => {
    const ok = simulateNadraVerify('35202-1122334-6', 'Ayesha Khan');
    expect(ok.verified).toBe(true);
    expect(ok.nadraRef).toMatch(/^NADRA-\d{8}-[0-9A-F]{8}$/);

    const missing = simulateNadraVerify('00000-0000000-0', 'Ghost User');
    expect(missing.verified).toBe(false);
    expect(missing.reason).toBe('CNIC_NOT_FOUND_IN_NADRA');
  });

  it('escapes CSV formula injection prefixes (=, +, -, @, TAB, CR) per SPEC T19', () => {
    expect(escapeCsvCell("=CMD|' /C calc'!A0")).toBe(`"'=CMD|' /C calc'!A0"`);
    expect(escapeCsvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(escapeCsvCell('+180.00')).toBe('"\'+180.00"');
    expect(escapeCsvCell('-180.00')).toBe('"\'-180.00"');
    expect(escapeCsvCell('@SUM(A1:A2)')).toBe('"\'@SUM(A1:A2)"');
    expect(escapeCsvCell('\tmalicious')).toBe('"\'\tmalicious"');
    expect(escapeCsvCell('Ayesha K.')).toBe('"Ayesha K."');
  });
});
