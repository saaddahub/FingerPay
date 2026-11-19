import {
  customerLookupRequestSchema,
  customerSummarySchema,
  enrollCustomerRequestSchema,
  enrollCustomerResponseSchema,
  nadraVerifyRequestSchema,
  nadraVerifyResponseSchema,
  setThumbLockRequestSchema,
} from '@fingerpay/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { simulateNadraVerify } from '../../integrations/sim/nadra.js';
import { AppError } from '../../platform/errors/app-error.js';
import {
  enforceRateLimit,
  RATE_LIMIT_RULES,
  type RateLimiter,
} from '../../platform/ratelimit/rate-limiter.js';
import { requireRole } from '../auth/guards.js';
import type { CustomerService } from './service.js';

export interface CustomerRoutesDeps {
  customerService: CustomerService;
  rateLimiter: RateLimiter;
}

export async function registerCustomerRoutes(
  app: FastifyInstance,
  deps: CustomerRoutesDeps,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    '/branch/nadra/verify',
    {
      // requireRole enforces AAL2 for bank roles (SPEC §4.1)
      preHandler: [requireRole(['BRANCH_OFFICER', 'BRANCH_MANAGER'])],
      schema: {
        body: nadraVerifyRequestSchema,
        response: {
          200: nadraVerifyResponseSchema,
        },
      },
    },
    async (req) => {
      await enforceRateLimit(
        deps.rateLimiter,
        RATE_LIMIT_RULES.nadraAndEnroll,
        req.staffUser!.id,
      );
      const res = simulateNadraVerify(req.body.cnic, req.body.fullName);
      return {
        verified: res.verified,
        nadraRef: res.nadraRef,
        verifiedAt: res.verifiedAt ? res.verifiedAt.toISOString() : null,
        ...(res.reason ? { reason: res.reason } : {}),
      };
    },
  );

  typed.post(
    '/branch/enrollments',
    {
      preHandler: [requireRole(['BRANCH_OFFICER', 'BRANCH_MANAGER'])],
      schema: {
        body: enrollCustomerRequestSchema,
        response: {
          200: enrollCustomerResponseSchema,
        },
      },
    },
    async (req) => {
      await enforceRateLimit(
        deps.rateLimiter,
        RATE_LIMIT_RULES.nadraAndEnroll,
        req.staffUser!.id,
      );
      const institutionId = req.staffUser!.institutionId;
      if (!institutionId) {
        throw new AppError('FORBIDDEN', 'Branch staff user is missing institution scope');
      }

      const enrolled = await deps.customerService.enrollCustomer({
        actorId: req.staffUser!.id,
        institutionId,
        fullName: req.body.fullName,
        cnic: req.body.cnic,
        accountNumber: req.body.accountNumber,
        accountType: req.body.accountType,
        phone: req.body.phone,
        openingBalance: req.body.openingBalance,
        nadraRef: req.body.nadraRef,
        consentVersion: req.body.consentVersion,
        thumbCaptureToken: req.body.thumbCaptureToken,
        referralCodeUsed: req.body.referralCodeUsed,
      });

      return {
        customerId: enrolled.customerId,
        displayName: enrolled.displayName,
        accountType: enrolled.accountType,
        cnicLast4: enrolled.cnicLast4,
        phoneLast4: enrolled.phoneLast4,
        nadraRef: enrolled.nadraRef,
        referralCode: enrolled.referralCode,
        openingBalance: enrolled.openingBalance,
      };
    },
  );

  typed.post(
    '/branch/customers/lookup',
    {
      preHandler: [requireRole(['BRANCH_OFFICER', 'BRANCH_MANAGER', 'BANK_ADMIN'])],
      schema: {
        body: customerLookupRequestSchema,
        response: {
          200: customerSummarySchema,
        },
      },
    },
    async (req) => {
      return deps.customerService.lookupByCnic(req.staffUser!.institutionId ?? null, req.body.cnic);
    },
  );

  typed.post(
    '/branch/customers/:id/thumb-lock',
    {
      preHandler: [requireRole(['BRANCH_OFFICER', 'BRANCH_MANAGER', 'BANK_ADMIN'])],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: setThumbLockRequestSchema,
        response: {
          200: customerSummarySchema,
        },
      },
    },
    async (req) => {
      return deps.customerService.setThumbLock({
        actorId: req.staffUser!.id,
        institutionId: req.staffUser!.institutionId ?? null,
        customerId: req.params.id,
        locked: req.body.locked,
        reason: req.body.reason,
      });
    },
  );
}
