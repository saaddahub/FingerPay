import { z } from 'zod';

export const staffRoles = [
  'MERCHANT_CASHIER',
  'MERCHANT_OWNER',
  'BRANCH_OFFICER',
  'BRANCH_MANAGER',
  'BANK_ADMIN',
  'AUDITOR',
  'DEMO_OBSERVER',
] as const;

export type StaffRole = (typeof staffRoles)[number];

export const isBankRole = (role: StaffRole): boolean =>
  role === 'BRANCH_OFFICER' ||
  role === 'BRANCH_MANAGER' ||
  role === 'BANK_ADMIN' ||
  role === 'AUDITOR';

export const loginRequestSchema = z.strictObject({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginResponseSchema = z.strictObject({
  status: z.enum(['authenticated', 'mfa_required']),
  accessToken: z.string().optional(),
  mfaChallengeToken: z.string().optional(),
  user: z.strictObject({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(staffRoles),
    institutionId: z.string().uuid().nullable(),
    branchId: z.string().uuid().nullable(),
    merchantId: z.string().uuid().nullable(),
    aal: z.union([z.literal(1), z.literal(2)]),
  }),
});

export const mfaVerifyRequestSchema = z.strictObject({
  challengeToken: z.string(),
  code: z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
});

export const mfaEnrollResponseSchema = z.strictObject({
  secret: z.string(),
  uri: z.string(),
});

export const refreshResponseSchema = z.strictObject({
  accessToken: z.string(),
});

export const staffContextResponseSchema = z.strictObject({
  user: z.strictObject({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(staffRoles),
    institutionId: z.string().uuid().nullable(),
    branchId: z.string().uuid().nullable(),
    merchantId: z.string().uuid().nullable(),
    aal: z.union([z.literal(1), z.literal(2)]),
  }),
});
