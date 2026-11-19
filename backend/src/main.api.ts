import { sql } from 'kysely';
import { buildApp } from './app.js';
import { loadConfig } from './platform/config.js';
import { startEmbeddedDevDb } from './platform/db/embedded-dev.js';
import { createDb } from './platform/db/kysely.js';
import { createLogger } from './platform/log/logger.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.FP_LOG_LEVEL, service: 'fingerpay-api' });

  let app: Awaited<ReturnType<typeof buildApp>>;
  let closeDb: () => Promise<void>;

  const pgHandle = createDb({
    connectionString: config.FP_DATABASE_URL,
    maxConnections: config.FP_DB_POOL_MAX,
  });

  let pgReachable = false;
  try {
    await sql`SELECT 1`.execute(pgHandle.db);
    pgReachable = true;
  } catch (err) {
    if (config.FP_ENV !== 'development') {
      logger.error({ err }, 'failed to connect to PostgreSQL');
      await pgHandle.close();
      throw err;
    }
    await pgHandle.close();
    logger.warn(
      'Local PostgreSQL on FP_DATABASE_URL is unreachable — starting embedded dev PostgreSQL (PGlite) with migrations and demo seed',
    );
  }

  if (pgReachable) {
    closeDb = pgHandle.close;
    app = await buildApp({ config, db: pgHandle.db, logger });
  } else {
    const embedded = await startEmbeddedDevDb();
    closeDb = embedded.close;
    app = await buildApp({
      config,
      db: embedded.db,
      logger,
      keyring: embedded.keyring,
      lookupRootKey: embedded.lookupRootKey,
      demoKey: embedded.demoKey,
    });
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down api server');
    await app.close();
    await closeDb();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.FP_HOST, port: config.FP_PORT });
  logger.info(
    {
      host: config.FP_HOST,
      port: config.FP_PORT,
      env: config.FP_ENV,
      demo: config.FP_DEMO_MODE,
      embeddedDb: !pgReachable,
    },
    'fingerpay api listening',
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
