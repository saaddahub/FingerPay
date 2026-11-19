/**
 * Canonical application error codes and their HTTP status mappings (SPEC §4.6).
 */
export const ERROR_CODES = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  ORIGIN_FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  LOCKED: 423,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Maps custom FingerPay Postgres SQLSTATEs (FP400..FP423) to HTTP codes if raised by triggers. */
export const PG_SQLSTATE_TO_ERROR: Record<string, { code: ErrorCode; status: number }> = {
  FP400: { code: 'BAD_REQUEST', status: 400 },
  FP401: { code: 'UNAUTHORIZED', status: 401 },
  FP402: { code: 'PAYMENT_REQUIRED', status: 402 },
  FP403: { code: 'FORBIDDEN', status: 403 },
  FP404: { code: 'NOT_FOUND', status: 404 },
  FP409: { code: 'CONFLICT', status: 409 },
  FP423: { code: 'LOCKED', status: 423 },
};
