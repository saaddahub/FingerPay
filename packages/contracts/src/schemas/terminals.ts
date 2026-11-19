import { z } from 'zod';

export const pairTerminalRequestSchema = z.strictObject({
  label: z.string().min(1).max(64).default('POS Terminal'),
  publicKeySpki: z.string().min(64), // base64 DER SPKI
});

export const pairTerminalResponseSchema = z.strictObject({
  terminalId: z.string().uuid(),
  merchantId: z.string().uuid(),
  label: z.string(),
  keySha256: z.string(),
});

export const revokeTerminalResponseSchema = z.strictObject({
  status: z.literal('revoked'),
  terminalId: z.string().uuid(),
  revokedAt: z.string(),
});
