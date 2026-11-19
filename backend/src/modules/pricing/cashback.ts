import { divRoundHalfUp, paisa, type Paisa } from '@fingerpay/contracts';
import type { AccountType } from '../../platform/db/types.gen.js';

export const CASHBACK_RULES = {
  /** First-tap bonus: PKR 50 if first successful payment is >= PKR 150 (SPEC §6.2). */
  firstTapMinGross: paisa(15_000n),
  firstTapBonus: paisa(5_000n),
  /** Student cashback: 2% (max PKR 20) for STUDENT_NON_PTA on non-first payments. */
  studentRatePct: 2n,
  studentCap: paisa(2_000n),
  /** Referral bonus: PKR 100 to referring student when referee makes their first payment. */
  referralBonus: paisa(10_000n),
  /** High-volume merchant rebate: PKR 500 once per store per month at 500 settled tx. */
  highVolumeThreshold: 500,
  highVolumeRebate: paisa(50_000n),
} as const;

export interface ComputeCashbackInput {
  gross: Paisa;
  accountType: AccountType;
  isFirstPayment: boolean;
  marketingPoolBalance: Paisa;
}

/**
 * SPEC §0 #16 & §6.2:
 * - First-tap bonus (PKR 50 on >= PKR 150) and student 2% never stack.
 * - If the marketing pool lacks funds, the payment still succeeds with PKR 0 cashback.
 */
export function computeCashback(input: ComputeCashbackInput): Paisa {
  let candidate: Paisa = paisa(0n);

  if (input.isFirstPayment) {
    if (input.gross >= CASHBACK_RULES.firstTapMinGross) {
      candidate = CASHBACK_RULES.firstTapBonus;
    }
  } else if (input.accountType === 'STUDENT_NON_PTA') {
    const twoPct = paisa(divRoundHalfUp(input.gross * CASHBACK_RULES.studentRatePct, 100n));
    candidate = twoPct > CASHBACK_RULES.studentCap ? CASHBACK_RULES.studentCap : twoPct;
  }

  if (candidate > 0n && input.marketingPoolBalance >= candidate) {
    return candidate;
  }
  return paisa(0n);
}
