import {
  cancelChargeResponseSchema,
  offlineEventRequestSchema,
  offlineEventResponseSchema,
  openChargeRequestSchema,
  openChargeResponseSchema,
  thumbPayRequestSchema,
  thumbPayResponseSchema,
} from '@fingerpay/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../platform/errors/app-error.js';
import {
  enforceRateLimit,
  RATE_LIMIT_RULES,
  type RateLimiter,
} from '../../platform/ratelimit/rate-limiter.js';
import { requireRole } from '../auth/guards.js';
import type { TerminalService } from '../terminals/service.js';
import type { PaymentService } from './service.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBodyText?: string;
  }
}

export interface PaymentRoutesDeps {
  paymentService: PaymentService;
  terminalService: TerminalService;
  rateLimiter: RateLimiter;
}

export async function registerPaymentRoutes(
  app: FastifyInstance,
  deps: PaymentRoutesDeps,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  async function verifyTerminal(req: FastifyRequest) {
    return deps.terminalService.authenticateTerminalRequest({
      headers: req.headers,
      method: req.method,
      url: req.url,
      rawBody: req.rawBodyText ?? (req.body ? JSON.stringify(req.body) : ''),
    });
  }

  typed.post(
    '/pos/charges',
    {
      preHandler: [requireRole(['MERCHANT_CASHIER', 'MERCHANT_OWNER'])],
      schema: {
        body: openChargeRequestSchema,
        response: {
          200: openChargeResponseSchema,
        },
      },
    },
    async (req) => {
      const term = await verifyTerminal(req);
      await enforceRateLimit(deps.rateLimiter, RATE_LIMIT_RULES.openCharge, term.terminalId);

      // SPEC T16: Terminal and cashier must belong to the same merchant store.
      if (req.staffUser!.merchantId !== term.merchantId) {
        throw new AppError('FORBIDDEN', 'Terminal does not belong to the authenticated staff store');
      }

      return deps.paymentService.openCharge({
        terminalId: term.terminalId,
        merchantId: term.merchantId,
        openedBy: req.staffUser!.id,
        amount: req.body.amount,
      });
    },
  );

  typed.post(
    '/pos/charges/:id/thumb',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: thumbPayRequestSchema,
        response: {
          200: thumbPayResponseSchema,
        },
      },
    },
    async (req) => {
      const term = await verifyTerminal(req);
      await enforceRateLimit(deps.rateLimiter, RATE_LIMIT_RULES.thumbSubmission, term.terminalId);

      return deps.paymentService.thumbPay({
        chargeId: req.params.id,
        terminalId: term.terminalId,
        merchantId: term.merchantId,
        token: req.body.token,
        claim: req.body.claim,
      });
    },
  );

  typed.post(
    '/pos/charges/:id/cancel',
    {
      preHandler: [requireRole(['MERCHANT_CASHIER', 'MERCHANT_OWNER'])],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: cancelChargeResponseSchema,
        },
      },
    },
    async (req) => {
      const term = await verifyTerminal(req);
      if (req.staffUser!.merchantId !== term.merchantId) {
        throw new AppError('FORBIDDEN', 'Terminal does not belong to the authenticated staff store');
      }

      return deps.paymentService.cancelCharge({
        chargeId: req.params.id,
        terminalId: term.terminalId,
        actorId: req.staffUser!.id,
      });
    },
  );

  typed.post(
    '/pos/offline-events',
    {
      preHandler: [requireRole(['MERCHANT_CASHIER', 'MERCHANT_OWNER'])],
      schema: {
        body: offlineEventRequestSchema,
        response: {
          200: offlineEventResponseSchema,
        },
      },
    },
    async (req) => {
      const term = await verifyTerminal(req);
      if (req.staffUser!.merchantId !== term.merchantId) {
        throw new AppError('FORBIDDEN', 'Terminal does not belong to the authenticated staff store');
      }

      return deps.paymentService.recordOfflineEvent({
        terminalId: term.terminalId,
        merchantId: term.merchantId,
        occurredAt: req.body.occurredAt,
        amount: req.body.amount,
      });
    },
  );
}
