import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  pairTerminalRequestSchema,
  pairTerminalResponseSchema,
  revokeTerminalResponseSchema,
} from '@fingerpay/contracts';
import { z } from 'zod';
import { AppError } from '../../platform/errors/app-error.js';
import { requireRole } from '../auth/guards.js';
import type { TerminalService } from './service.js';

export async function registerTerminalRoutes(app: FastifyInstance, terminalService: TerminalService) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    '/terminals/pair',
    {
      preHandler: [requireRole(['MERCHANT_OWNER'])],
      schema: {
        body: pairTerminalRequestSchema,
        response: {
          200: pairTerminalResponseSchema,
        },
      },
    },
    async (req) => {
      const merchantId = req.staffUser!.merchantId;
      if (!merchantId) {
        throw new AppError('FORBIDDEN', 'User is not associated with a merchant store');
      }

      return terminalService.pairTerminal({
        ownerId: req.staffUser!.id,
        merchantId,
        label: req.body.label,
        publicKeySpki: req.body.publicKeySpki,
      });
    },
  );

  typed.post(
    '/terminals/:id/revoke',
    {
      preHandler: [requireRole(['MERCHANT_OWNER', 'BANK_ADMIN'])],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: revokeTerminalResponseSchema,
        },
      },
    },
    async (req) => {
      await terminalService.revokeTerminal(req.params.id, req.staffUser!.id);
      return {
        status: 'revoked' as const,
        terminalId: req.params.id,
        revokedAt: new Date().toISOString(),
      };
    },
  );
}
