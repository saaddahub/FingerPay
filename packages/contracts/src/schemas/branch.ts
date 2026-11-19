import { z } from 'zod';
import { amountString } from '../money.js';

export const nadraVerifyRequestSchema = z.strictObject({
  cnic: z.string().regex(/^\d{5}-?\d{7}-?\d$/, 'CNIC must be 13 digits (XXXXX-XXXXXXX-X)'),
  fullName: z.string().min(2).max(120),
});

export const nadraVerifyResponseSchema = z.strictObject({
  verified: z.boolean(),
  nadraRef: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  reason: z.string().optional(),
});

export const enrollCustomerRequestSchema = z.strictObject({
  fullName: z.string().min(2).max(120),
  cnic: z.string().regex(/^\d{5}-?\d{7}-?\d$/, 'CNIC must be 13 digits'),
  accountNumber: z.string().min(6).max(34),
  accountType: z.enum(['SHOPPER_SALARY', 'STUDENT_NON_PTA']),
  phone: z.string().regex(/^\+?[0-9\s-]{10,16}$/, 'Invalid mobile number'),
  openingBalance: amountString,
  nadraRef: z.string().min(6),
  consentAccepted: z.literal(true),
  consentVersion: z.string().min(1).default('v1.0-2026'),
  thumbCaptureToken: z.string().min(8).max(256).optional(),
  referralCodeUsed: z.string().max(32).optional(),
});

export const enrollCustomerResponseSchema = z.strictObject({
  customerId: z.string().uuid(),
  displayName: z.string(),
  accountType: z.enum(['SHOPPER_SALARY', 'STUDENT_NON_PTA']),
  cnicLast4: z.string().length(4),
  phoneLast4: z.string().length(4),
  nadraRef: z.string(),
  referralCode: z.string(),
  openingBalance: z.string(),
});

export const customerLookupRequestSchema = z.strictObject({
  cnic: z.string().regex(/^\d{5}-?\d{7}-?\d$/),
});

export const customerSummarySchema = z.strictObject({
  customerId: z.string().uuid(),
  displayName: z.string(),
  accountType: z.enum(['SHOPPER_SALARY', 'STUDENT_NON_PTA']),
  cnicLast4: z.string().length(4),
  phoneLast4: z.string().length(4),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']),
  thumbLocked: z.boolean(),
  thumbLockedAt: z.string().nullable(),
  nadraRef: z.string(),
});

export const setThumbLockRequestSchema = z.strictObject({
  locked: z.boolean(),
  reason: z.string().min(3).max(200).optional(),
});
