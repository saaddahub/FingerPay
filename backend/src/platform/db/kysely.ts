import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './types.gen.js';

export interface CreateDbOptions {
  connectionString: string;
  maxConnections?: number;
}

export interface DbHandle {
  db: Kysely<Database>;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export function createDb(opts: CreateDbOptions): DbHandle {
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
    max: opts.maxConnections ?? 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'fingerpay-backend',
  });

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return {
    db,
    pool,
    close: async () => {
      await db.destroy();
    },
  };
}
