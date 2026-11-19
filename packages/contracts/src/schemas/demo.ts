import { z } from 'zod';

export const fingerTrayPersonaSchema = z.strictObject({
  customerId: z.string().uuid(),
  displayName: z.string(),
  accountType: z.enum(['SHOPPER_SALARY', 'STUDENT_NON_PTA']),
  institutionCode: z.string(),
  phoneLast4: z.string(),
  cnicLast4: z.string(),
  thumbLocked: z.boolean(),
  demoToken: z.string(),
});

export const smsFeedRowSchema = z.strictObject({
  id: z.string().uuid(),
  direction: z.enum(['OUT', 'IN']),
  customerId: z.string().uuid().nullable(),
  phoneLast4: z.string().length(4),
  template: z.string(),
  body: z.string(),
  relatedAttemptId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export const smsReplyRequestSchema = z.strictObject({
  text: z.string().min(1).max(160),
});

export const smsReplyResponseSchema = z.strictObject({
  action: z.enum(['THUMB_LOCKED', 'DISPUTE_OPENED', 'HELP_SENT']),
  ticket: z.string().nullable(),
  replySmsId: z.string().uuid(),
  replyBody: z.string(),
});
