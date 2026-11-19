import {
  auditEventRowSchema,
  disputeRowSchema,
  integrityReportSchema,
  raastAvailabilityRequestSchema,
  refundDecisionRequestSchema,
  refundRequestSchema,
} from '@fingerpay/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import { AppError } from '../../platform/errors/app-error.js';
import type { Database } from '../../platform/db/types.gen.js';
import { recordAuditEvent, verifyAuditAndLedgerIntegrity } from '../audit/service.js';
import { requireRole } from '../auth/guards.js';
import type { DisputeAndReversalService } from './service.js';

export interface BankRoutesDeps {
  db: Kysely<Database>;
  disputeService: DisputeAndReversalService;
}

export async function registerBankRoutes(
  app: FastifyInstance,
  deps: BankRoutesDeps,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/bank/disputes',
    {
      preHandler: [requireRole(['BRANCH_OFFICER', 'BRANCH_MANAGER', 'BANK_ADMIN', 'AUDITOR'])],
      schema: {
        response: {
          200: z.object({ disputes: z.array(disputeRowSchema) }),
        },
      },
    },
    async (req) => {
      const disputes = await deps.disputeService.listDisputes(
        req.staffUser!.institutionId ?? null,
      );
      return { disputes };
    },
  );

  typed.post(
    '/bank/disputes/:id/refund-request',
    {
      // SPEC §4.1: Maker = BRANCH_OFFICER or BANK_ADMIN (AAL2)
      preHandler: [requireRole(['BRANCH_OFFICER', 'BANK_ADMIN'])],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: refundRequestSchema,
        response: {
          200: z.object({
            reversalId: z.string().uuid(),
            disputeId: z.string().uuid(),
            status: z.literal('PENDING_CHECKER'),
          }),
        },
      },
    },
    async (req) => {
      return deps.disputeService.requestRefund({
        disputeId: req.params.id,
        makerId: req.staffUser!.id,
        reason: req.body.reason,
      });
    },
  );

  typed.post(
    '/bank/refunds/:id/decision',
    {
      // SPEC §4.1: Checker = BRANCH_MANAGER or BANK_ADMIN (AAL2, must differ from maker)
      preHandler: [requireRole(['BRANCH_MANAGER', 'BANK_ADMIN'])],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: refundDecisionRequestSchema,
        response: {
          200: z.object({
            reversalId: z.string().uuid(),
            status: z.enum(['APPROVED', 'REJECTED']),
            journalId: z.string().uuid().nullable(),
          }),
        },
      },
    },
    async (req) => {
      return deps.disputeService.decideRefund({
        reversalId: req.params.id,
        checkerId: req.staffUser!.id,
        decision: req.body.decision,
        reason: req.body.reason,
      });
    },
  );

  typed.get(
    '/bank/audit',
    {
      preHandler: [requireRole(['BANK_ADMIN', 'AUDITOR'])],
      schema: {
        response: {
          200: z.object({ events: z.array(auditEventRowSchema) }),
        },
      },
    },
    async () => {
      const rows = await deps.db
        .selectFrom('fp.audit_events')
        .selectAll()
        .orderBy('id', 'desc')
        .limit(100)
        .execute();

      return {
        events: rows.map((r) => ({
          id: String(r.id),
          occurredAt: new Date(r.occurred_at).toISOString(),
          actorType: r.actor_type,
          actorId: r.actor_id,
          action: r.action,
          entity: r.entity,
          entityId: r.entity_id,
          details: (r.details ?? {}) as Record<string, unknown>,
          prevHash: r.prev_hash,
          rowHash: r.row_hash,
        })),
      };
    },
  );

  typed.get(
    '/bank/integrity',
    {
      preHandler: [requireRole(['BANK_ADMIN', 'AUDITOR'])],
      schema: {
        response: {
          200: integrityReportSchema,
        },
      },
    },
    async () => {
      return verifyAuditAndLedgerIntegrity(deps.db);
    },
  );

  typed.post(
    '/bank/raast-availability',
    {
      preHandler: [requireRole(['BANK_ADMIN'])],
      schema: {
        body: raastAvailabilityRequestSchema,
        response: {
          200: z.object({
            institutionCode: z.string(),
            raastAvailable: z.boolean(),
          }),
        },
      },
    },
    async (req) => {
      const code = req.body.institutionCode.trim().toUpperCase();
      const updated = await deps.db
        .updateTable('fp.institutions')
        .set({ raast_available: req.body.available })
        .where('code', '=', code)
        .returning(['id', 'code', 'raast_available'])
        .executeTakeFirst();

      if (!updated) {
        throw new AppError('NOT_FOUND', `Institution ${code} not found`);
      }

      await recordAuditEvent(deps.db, {
        actorType: 'STAFF',
        actorId: req.staffUser!.id,
        action: 'RAAST_AVAILABILITY_CHANGED',
        entity: 'institution',
        entityId: updated.id,
        details: { code: updated.code, available: updated.raast_available },
      });

      return {
        institutionCode: updated.code,
        raastAvailable: updated.raast_available,
      };
    },
  );
}
