import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { PG_SQLSTATE_TO_ERROR } from '../errors/codes.js';

interface PgLikeError {
  code?: unknown;
  message?: unknown;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler(async (req, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        correlationId: req.id,
      },
    });
  });

  app.setErrorHandler(async (err: FastifyError | Error, req, reply) => {
    const correlationId = req.id;

    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: {
          code: err.code,
          message: err.exposeMessage ? err.message : 'Internal server error',
          correlationId,
        },
      });
    }

    if (hasZodFastifySchemaValidationErrors(err) || err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          correlationId,
        },
      });
    }

    const fastifyCode = (err as FastifyError).code;
    if (fastifyCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.status(413).send({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request body exceeds 16 KB limit',
          correlationId,
        },
      });
    }

    if (
      fastifyCode === 'FST_ERR_CTP_INVALID_MEDIA_TYPE' ||
      fastifyCode === 'FST_ERR_CTP_INVALID_CONTENT_LENGTH' ||
      (err as FastifyError).statusCode === 400
    ) {
      return reply.status(400).send({
        error: {
          code: 'BAD_REQUEST',
          message: 'Malformed request',
          correlationId,
        },
      });
    }

    // Custom FingerPay Postgres trigger/check SQLSTATEs (FP400..FP423).
    // Never forward raw Postgres error text to the client (SPEC §4.6).
    const pgCode = (err as PgLikeError).code;
    if (typeof pgCode === 'string' && pgCode in PG_SQLSTATE_TO_ERROR) {
      const mapped = PG_SQLSTATE_TO_ERROR[pgCode]!;
      req.log.warn({ err, pgCode, correlationId }, 'domain constraint rejected operation');
      return reply.status(mapped.status).send({
        error: {
          code: mapped.code,
          message: 'Request rejected by domain policy',
          correlationId,
        },
      });
    }

    req.log.error({ err, correlationId }, 'unhandled error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        correlationId,
      },
    });
  });
}
