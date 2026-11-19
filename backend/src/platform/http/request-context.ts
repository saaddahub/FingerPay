import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

export const CORRELATION_HEADER = 'x-correlation-id';

const SAFE_ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

export function resolveCorrelationId(headerValue: unknown): string {
  if (typeof headerValue === 'string' && SAFE_ID_RE.test(headerValue)) {
    return headerValue;
  }
  return randomUUID();
}

export function registerRequestContext(app: FastifyInstance): void {
  app.addHook('onRequest', async (req, reply) => {
    reply.header(CORRELATION_HEADER, req.id);
  });
}
