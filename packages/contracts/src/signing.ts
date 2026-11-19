/**
 * Terminal request signing (SPEC 4.5). This module only builds the canonical string, so
 * the browser (WebCrypto), Android (Keystore) and the server (node:crypto) all sign and
 * verify exactly the same bytes.
 */

export const TERMINAL_HEADERS = {
  terminal: 'x-fp-terminal',
  timestamp: 'x-fp-timestamp',
  nonce: 'x-fp-nonce',
  signature: 'x-fp-signature',
} as const;

export const SIGNATURE_VERSION = 'FPv1';
/** Max clock skew between terminal and server. */
export const SIGNATURE_WINDOW_MS = 60_000;

export interface CanonicalRequest {
  method: string;
  /** Path plus query exactly as sent, e.g. "/api/v1/pos/charges/abc/thumb". */
  pathWithQuery: string;
  terminalId: string;
  /** ISO-8601 UTC with milliseconds. */
  timestamp: string;
  /** base64url, 16 random bytes. */
  nonce: string;
  /** base64url(SHA-256(raw body bytes)); hash of the empty string for bodiless requests. */
  bodySha256: string;
}

export function canonicalString(r: CanonicalRequest): string {
  return [
    SIGNATURE_VERSION,
    r.method.toUpperCase(),
    r.pathWithQuery,
    r.terminalId,
    r.timestamp,
    r.nonce,
    r.bodySha256,
  ].join('\n');
}
