import {
  merchantLedgerResponseSchema,
  merchantSummaryResponseSchema,
  voidSaleRequestSchema,
  voidSaleResponseSchema,
} from '@fingerpay/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../platform/errors/app-error.js';
import {
  enforceRateLimit,
  RATE_LIMIT_RULES,
  type RateLimiter,
} from '../../platform/ratelimit/rate-limiter.js';
import { requireRole } from '../auth/guards.js';
import type { DisputeAndReversalService } from '../disputes/service.js';
import type { ReportingService } from './service.js';

const dayQuerySchema = z.object({
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export interface ReportingRoutesDeps {
  reportingService: ReportingService;
  disputeService: DisputeAndReversalService;
  rateLimiter: RateLimiter;
}

export async function registerReportingRoutes(
  app: FastifyInstance,
  deps: ReportingRoutesDeps,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/merchant/ledger',
    {
      preHandler: [requireRole(['MERCHANT_CASHIER', 'MERCHANT_OWNER'])],
      schema: {
        querystring: dayQuerySchema,
        response: {
          200: merchantLedgerResponseSchema,
        },
      },
    },
    async (req) => {
      const merchantId = req.staffUser!.merchantId;
      if (!merchantId) {
        throw new AppError('FORBIDDEN', 'User is not scoped to a merchant store');
      }
      return deps.reportingService.getMerchantLedger(merchantId, req.query.day);
    },
  );

  typed.get(
    '/merchant/summary',
    {
      preHandler: [requireRole(['MERCHANT_CASHIER', 'MERCHANT_OWNER'])],
      schema: {
        querystring: dayQuerySchema,
        response: {
          200: merchantSummaryResponseSchema,
        },
      },
    },
    async (req) => {
      const merchantId = req.staffUser!.merchantId;
      if (!merchantId) {
        throw new AppError('FORBIDDEN', 'User is not scoped to a merchant store');
      }
      return deps.reportingService.getMerchantSummary(merchantId, req.query.day);
    },
  );

  typed.get(
    '/merchant/ledger.csv',
    {
      // SPEC §4.1 & M2 gate: Only MERCHANT_OWNER can export CSV (cashier is forbidden).
      preHandler: [requireRole(['MERCHANT_OWNER'])],
      schema: {
        querystring: dayQuerySchema,
      },
    },
    async (req, reply) => {
      const merchantId = req.staffUser!.merchantId;
      if (!merchantId) {
        throw new AppError('FORBIDDEN', 'User is not scoped to a merchant store');
      }
      await enforceRateLimit(deps.rateLimiter, RATE_LIMIT_RULES.csvExport, req.staffUser!.id);
      const csv = await deps.reportingService.exportLedgerCsv(merchantId, req.query.day);
      reply.header('content-type', 'text/csv; charset=utf-8');
      reply.header('content-disposition', 'attachment; filename="fingerpay-settlement.csv"');
      return reply.send(csv);
    },
  );

  typed.post(
    '/merchant/sales/:id/void',
    {
      // SPEC §4.1 & T6: Only MERCHANT_OWNER can void a same-day sale.
      preHandler: [requireRole(['MERCHANT_OWNER'])],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: voidSaleRequestSchema,
        response: {
          200: voidSaleResponseSchema,
        },
      },
    },
    async (req) => {
      const merchantId = req.staffUser!.merchantId;
      if (!merchantId) {
        throw new AppError('FORBIDDEN', 'User is not scoped to a merchant store');
      }
      return deps.disputeService.voidSameDaySale({
        attemptId: req.params.id,
        merchantId,
        ownerId: req.staffUser!.id,
        reason: req.body.reason,
      });
    },
  );
}
