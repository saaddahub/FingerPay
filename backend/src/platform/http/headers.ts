import type { FastifyInstance } from 'fastify';

/**
 * Mandatory security response headers (SPEC §4.6).
 * Note: deprecated `X-XSS-Protection` is deliberately omitted per SPEC §4.6.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};

export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook('onSend', async (_req, reply, payload) => {
    for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
      reply.header(header, value);
    }
    return payload;
  });
}
