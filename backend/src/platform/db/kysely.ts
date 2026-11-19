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

/**
 * Enables TLS for remote managed Postgres hosts (such as Supabase) while keeping
 * loopback dev connections plaintext.
 */
export function resolvePgSsl(connectionString: string): pg.ConnectionConfig['ssl'] {
  const isLocal =
    connectionString.includes('127.0.0.1') ||
    connectionString.includes('localhost') ||
    connectionString.includes('::1');
  if (isLocal && !connectionString.includes('sslmode=require')) {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

export function createDb(opts: CreateDbOptions): DbHandle {
  const ssl = resolvePgSsl(opts.connectionString);
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
    ...(ssl ? { ssl } : {}),
    max: opts.maxConnections ?? 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
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
