import type { FastifyInstance } from 'fastify';
import { AppError } from '../errors/app-error.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * SPEC §4.6 CSRF protection: every state change is a POST with a JSON body, backed up by an
 * Origin allowlist check in addition to SameSite=Strict cookies.
 */
export function registerOriginCheck(app: FastifyInstance, allowedOrigins: readonly string[]): void {
  const allowSet = new Set(allowedOrigins);

  app.addHook('onRequest', async (req) => {
    if (!STATE_CHANGING_METHODS.has(req.method)) return;
    const origin = req.headers.origin;
    if (origin !== undefined && !allowSet.has(origin)) {
      req.log.warn({ event: 'security.origin_rejected', origin, method: req.method, url: req.url });
      throw new AppError('ORIGIN_FORBIDDEN', 'Origin is not permitted');
    }
  });
}
