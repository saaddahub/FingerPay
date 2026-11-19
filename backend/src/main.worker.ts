import PgBoss from 'pg-boss';
import { loadConfig } from './platform/config.js';
import { createLogger } from './platform/log/logger.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ level: config.FP_LOG_LEVEL, service: 'fingerpay-worker' });

  const boss = new PgBoss({
    connectionString: config.FP_DATABASE_URL,
    schema: 'pgboss',
    application_name: 'fingerpay-worker',
  });

  boss.on('error', (err) => {
    logger.error({ err }, 'pg-boss background error');
  });

  await boss.start();
  logger.info({ env: config.FP_ENV }, 'fingerpay worker started');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'stopping worker');
    await boss.stop({ graceful: true, timeout: 10_000 });
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
