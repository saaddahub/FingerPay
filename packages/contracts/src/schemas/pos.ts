import { z } from 'zod';
import { amountString } from '../money.js';
import { OUTCOME_CODES } from '../outcomes.js';

export const openChargeRequestSchema = z.strictObject({
  amount: amountString,
});

export const openChargeResponseSchema = z.strictObject({
  chargeId: z.string().uuid(),
  merchantId: z.string().uuid(),
  terminalId: z.string().uuid(),
  amount: z.string(),
  status: z.literal('OPEN'),
  expiresAt: z.string(),
});

export const thumbPayRequestSchema = z.strictObject({
  /** 32-byte capture simulation token (never a raw fingerprint image). */
  token: z.string().min(8).max(256),
  /** Optional 1:1 claim (last 4 digits of CNIC or phone, SPEC §4.4 / Q7). */
  claim: z.string().regex(/^\d{4}$/, 'claim must be 4 digits').optional(),
});

export const thumbPayReceiptSchema = z.strictObject({
  attemptId: z.string().uuid(),
  chargeId: z.string().uuid(),
  shopperDisplayName: z.string(),
  routing: z.enum(['ON_US', 'OFF_US']),
  gross: z.string(),
  fee: z.string(),
  fingerpayShare: z.string(),
  bankShare: z.string(),
  net: z.string(),
  cashback: z.string(),
  raastRef: z.string(),
  settledAt: z.string(),
});

export const thumbPayResponseSchema = z.strictObject({
  outcome: z.enum(OUTCOME_CODES),
  chargeId: z.string().uuid(),
  attemptId: z.string().uuid().nullable(),
  processingMs: z.number().int().nonnegative(),
  replayed: z.boolean().default(false),
  /** Present only on SUCCESS — never includes shopper balance or shopper name on declines (SPEC §5). */
  receipt: thumbPayReceiptSchema.nullable(),
});

export const cancelChargeResponseSchema = z.strictObject({
  chargeId: z.string().uuid(),
  status: z.literal('CANCELLED'),
});

export const offlineEventRequestSchema = z.strictObject({
  occurredAt: z.string().datetime(),
  amount: amountString.optional(),
});

export const offlineEventResponseSchema = z.strictObject({
  eventId: z.string().uuid(),
  status: z.literal('RECORDED'),
});
