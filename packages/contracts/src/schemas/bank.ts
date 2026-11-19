import { z } from 'zod';

export const disputeRowSchema = z.strictObject({
  id: z.string().uuid(),
  ticket: z.string(),
  attemptId: z.string().uuid(),
  shopperDisplayName: z.string(),
  phoneLast4: z.string(),
  amount: z.string(),
  source: z.enum(['SMS', 'BRANCH']),
  reason: z.string(),
  status: z.enum(['OPEN', 'REFUND_REQUESTED', 'REFUNDED', 'REJECTED']),
  reversalId: z.string().uuid().nullable(),
  makerId: z.string().uuid().nullable(),
  checkerId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export const refundRequestSchema = z.strictObject({
  reason: z.string().min(3).max(200),
});

export const refundDecisionRequestSchema = z.strictObject({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().min(3).max(200),
});

export const auditEventRowSchema = z.strictObject({
  id: z.string(),
  occurredAt: z.string(),
  actorType: z.enum(['STAFF', 'TERMINAL', 'SHOPPER_SMS', 'SYSTEM']),
  actorId: z.string(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  details: z.record(z.unknown()),
  prevHash: z.string(),
  rowHash: z.string(),
});

export const integrityReportSchema = z.strictObject({
  ok: z.boolean(),
  checkedAt: z.string(),
  auditChain: z.strictObject({
    ok: z.boolean(),
    totalEvents: z.number().int().nonnegative(),
    headHash: z.string().nullable(),
    brokenAtId: z.string().nullable(),
  }),
  ledgerReconciliation: z.strictObject({
    ok: z.boolean(),
    totalJournals: z.number().int().nonnegative(),
    unbalancedJournals: z.number().int().nonnegative(),
    mismatchedAccounts: z.number().int().nonnegative(),
  }),
});

export const raastAvailabilityRequestSchema = z.strictObject({
  institutionCode: z.string().min(2).max(12),
  available: z.boolean(),
});
