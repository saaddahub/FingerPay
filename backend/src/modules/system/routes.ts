import {
  healthResponseSchema,
  readyResponseSchema,
  type ReadyResponse,
} from '@fingerpay/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { sql, type Kysely } from 'kysely';
import { loadMigrationFiles } from '../../platform/db/migrator.js';
import type { Database } from '../../platform/db/types.gen.js';

export interface SystemRoutesDeps {
  db: Kysely<Database>;
  version?: string;
}

export async function registerSystemRoutes(
  app: FastifyInstance,
  deps: SystemRoutesDeps,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  const expectedFiles = await loadMigrationFiles();
  const latestExpectedVersion = expectedFiles.at(-1)?.version ?? null;
  const serviceVersion = deps.version ?? '0.1.0';

  typed.get(
    '/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({
      status: 'ok' as const,
      service: 'fingerpay-backend',
      version: serviceVersion,
      time: new Date().toISOString(),
    }),
  );

  typed.get(
    '/ready',
    {
      schema: {
        response: {
          200: readyResponseSchema,
          503: readyResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const start = performance.now();
      let dbOk = false;
      let dbLatencyMs: number | undefined;
      let migrationsOk = false;
      let migrationDetail: string | undefined;

      try {
        await sql`SELECT 1`.execute(deps.db);
        dbOk = true;
        dbLatencyMs = Math.round(performance.now() - start);
      } catch (err) {
        req.log.error({ err }, 'readiness database ping failed');
      }

      if (dbOk) {
        try {
          const rows = await deps.db
            .selectFrom('fp.schema_migrations')
            .select('version')
            .orderBy('version', 'desc')
            .limit(1)
            .execute();
          const currentVersion = rows[0]?.version ?? null;
          if (latestExpectedVersion === null || currentVersion === latestExpectedVersion) {
            migrationsOk = true;
            migrationDetail = currentVersion ?? 'none';
          } else {
            migrationDetail = `expected ${latestExpectedVersion}, found ${currentVersion ?? 'none'}`;
          }
        } catch (err) {
          req.log.error({ err }, 'readiness migration check failed');
          migrationDetail = 'schema_migrations unreadable';
        }
      }

      const ready = dbOk && migrationsOk;
      const body: ReadyResponse = {
        status: ready ? 'ready' : 'not_ready',
        checks: {
          database: {
            ok: dbOk,
            ...(dbLatencyMs !== undefined ? { latencyMs: dbLatencyMs } : {}),
          },
          migrations: {
            ok: migrationsOk,
            ...(migrationDetail !== undefined ? { detail: migrationDetail } : {}),
          },
        },
      };

      return reply.status(ready ? 200 : 503).send(body);
    },
  );
}
