import {
  fingerTrayPersonaSchema,
  smsFeedRowSchema,
  smsReplyRequestSchema,
  smsReplyResponseSchema,
} from '@fingerpay/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import { AppError } from '../../platform/errors/app-error.js';
import type { Database } from '../../platform/db/types.gen.js';
import { requireStaffAuth } from '../auth/guards.js';
import type { CustomerService } from '../customers/service.js';
import { handleSmsReply } from '../notifications/sms.js';

export interface DemoRoutesDeps {
  db: Kysely<Database>;
  demoMode: boolean;
  customerService: CustomerService;
}

export async function registerDemoRoutes(
  app: FastifyInstance,
  deps: DemoRoutesDeps,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // SPEC T22 & M3 gate: Demo routes return 404 when FP_DEMO_MODE is off, and require a staff session.
  async function requireDemoEnabled(req: FastifyRequest) {
    if (!deps.demoMode) {
      throw new AppError('NOT_FOUND', 'Route not found');
    }
    await requireStaffAuth(req, undefined as never);
  }

  typed.get(
    '/demo/finger-tray',
    {
      preHandler: [requireDemoEnabled],
      schema: {
        response: {
          200: z.object({ personas: z.array(fingerTrayPersonaSchema) }),
        },
      },
    },
    async () => {
      const rows = await deps.db
        .selectFrom('fp.customers as c')
        .innerJoin('fp.institutions as i', 'i.id', 'c.institution_id')
        .select([
          'c.id',
          'c.display_name',
          'c.account_type',
          'i.code as institution_code',
          'c.phone_last4',
          'c.cnic_last4',
          'c.thumb_locked_at',
          'c.demo_token',
        ])
        .orderBy('c.created_at', 'asc')
        .execute();

      return {
        personas: rows.map((r) => ({
          customerId: r.id,
          displayName: r.display_name,
          accountType: r.account_type,
          institutionCode: r.institution_code,
          phoneLast4: r.phone_last4,
          cnicLast4: r.cnic_last4,
          thumbLocked: r.thumb_locked_at !== null,
          demoToken: r.demo_token ?? deps.customerService.generateDemoThumbToken(r.id),
        })),
      };
    },
  );

  typed.get(
    '/demo/sms-feed',
    {
      preHandler: [requireDemoEnabled],
      schema: {
        response: {
          200: z.object({ messages: z.array(smsFeedRowSchema) }),
        },
      },
    },
    async () => {
      const rows = await deps.db
        .selectFrom('fp.sms_messages')
        .select([
          'id',
          'direction',
          'customer_id',
          'phone_last4',
          'template',
          'body',
          'related_attempt_id',
          'created_at',
        ])
        .orderBy('created_at', 'desc')
        .limit(100)
        .execute();

      return {
        messages: rows.map((m) => ({
          id: m.id,
          direction: m.direction,
          customerId: m.customer_id,
          phoneLast4: m.phone_last4,
          template: m.template,
          body: m.body,
          relatedAttemptId: m.related_attempt_id,
          createdAt: new Date(m.created_at).toISOString(),
        })),
      };
    },
  );

  typed.post(
    '/demo/sms/:id/reply',
    {
      preHandler: [requireDemoEnabled],
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: smsReplyRequestSchema,
        response: {
          200: smsReplyResponseSchema,
        },
      },
    },
    async (req) => {
      return handleSmsReply(deps.db, {
        smsId: req.params.id,
        text: req.body.text,
      });
    },
  );
}
