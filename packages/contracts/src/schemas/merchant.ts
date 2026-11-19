import { z } from 'zod';

export const ledgerRowSchema = z.strictObject({
  id: z.string().uuid(),
  time: z.string(),
  /** First name + initial on settled rows only; null on declines/offline (SPEC §0 #18 & T17). */
  shopper: z.string().nullable(),
  routing: z.enum(['ON_US', 'OFF_US']).nullable(),
  gross: z.string(),
  fee: z.string(),
  net: z.string(),
  raastRef: z.string().nullable(),
  status: z.enum(['SETTLED', 'DECLINED', 'OFFLINE_CASH', 'REVERSED']),
  outcome: z.string(),
});
export type LedgerRow = z.infer<typeof ledgerRowSchema>;

export const merchantLedgerResponseSchema = z.strictObject({
  day: z.string(),
  merchantName: z.string(),
  rows: z.array(ledgerRowSchema),
});

export const merchantSummaryResponseSchema = z.strictObject({
  day: z.string(),
  merchantName: z.string(),
  totalGross: z.string(),
  totalFees: z.string(),
  totalNet: z.string(),
  mdrSavedVsCardPos: z.string(),
  merchantBalance: z.string(),
  screenshotsAvoided: z.number().int().nonnegative(),
  monthlySettledCount: z.number().int().nonnegative(),
  rebateEarned: z.boolean(),
});

export const voidSaleRequestSchema = z.strictObject({
  reason: z.string().min(3).max(200),
});

export const voidSaleResponseSchema = z.strictObject({
  reversalId: z.string().uuid(),
  attemptId: z.string().uuid(),
  journalId: z.string().uuid(),
  amount: z.string(),
  status: z.literal('APPROVED'),
});
