/**
 * SPEC §3 T18 & §4.6: Structured logs with a mandatory redaction list.
 * Tokens, CNICs, phone numbers, account numbers, passwords and terminal signatures must
 * never appear in log output at any nesting level.
 */
export const REDACT_FIELD_NAMES = [
  'authorization',
  'cookie',
  'set-cookie',
  'cnic',
  'phone',
  'token',
  'thumb',
  'account',
  'accountNo',
  'accountNumber',
  'password',
  'passwordHash',
  'totp',
  'totpSecret',
  'refreshToken',
  'x-fp-signature',
  'signature',
] as const;

export const PINO_REDACT_PATHS: string[] = REDACT_FIELD_NAMES.flatMap((field) => [
  field,
  `*.${field}`,
  `*.*.${field}`,
  `req.headers["${field}"]`,
  `res.headers["${field}"]`,
]);

export const REDACT_CENSOR = '[REDACTED]';
