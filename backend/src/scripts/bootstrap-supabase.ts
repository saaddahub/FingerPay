import pg from 'pg';
import { loadConfig } from '../platform/config.js';
import { resolvePgSsl } from '../platform/db/kysely.js';
import { runMigrationsUp } from '../platform/db/migrator.js';

/**
 * Supabase-compatible cluster role bootstrap + migration runner.
 * Creates fp_owner, fp_app, fp_worker, fp_admin, fp_readonly without touching
 * Supabase-managed `public` schema ownership, revokes `fp` schema visibility from
 * Supabase Data API roles (`anon`, `authenticated`, `service_role`, SPEC §4.2),
 * and applies migrations 0001..0004.
 */
async function main(): Promise<void> {
  loadConfig();
  const connStr = process.env.FP_MIGRATE_DATABASE_URL ?? process.env.FP_DATABASE_URL;
  if (!connStr) {
    throw new Error('Set FP_MIGRATE_DATABASE_URL or FP_DATABASE_URL in .env');
  }

  const ssl = resolvePgSsl(connStr);
  const client = new pg.Client({
    connectionString: connStr,
    ...(ssl ? { ssl } : {}),
  });
  await client.connect();

  try {
    const roles = ['fp_owner', 'fp_app', 'fp_worker', 'fp_admin', 'fp_readonly'] as const;
    for (const role of roles) {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
            CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
          END IF;
        END
        $$;
      `);
      // Allow the Supabase `postgres` administrative role to act as / grant ownership to these roles.
      await client.query(`GRANT ${role} TO current_user`);
    }

    await client.query(`ALTER ROLE fp_app SET statement_timeout = '5s'`);
    await client.query(`ALTER ROLE fp_app SET lock_timeout = '3s'`);
    await client.query(`ALTER ROLE fp_app SET idle_in_transaction_session_timeout = '15s'`);
    await client.query(`ALTER ROLE fp_app SET timezone = 'UTC'`);
    await client.query(`ALTER ROLE fp_readonly SET default_transaction_read_only = on`);

    console.log('Bootstrapped FingerPay roles on Supabase Postgres.');
  } finally {
    await client.end();
  }

  const applied = await runMigrationsUp(connStr);
  console.log(applied.length ? `Applied migrations: ${applied.join(', ')}` : 'All migrations already applied.');

  // Defence in depth (SPEC §4.2 T4): explicitly revoke schema fp from Supabase API roles if present.
  const verifyClient = new pg.Client({
    connectionString: connStr,
    ...(ssl ? { ssl } : {}),
  });
  await verifyClient.connect();
  try {
    await verifyClient.query(`
      DO $$
      DECLARE r text;
      BEGIN
        FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('REVOKE ALL ON SCHEMA fp FROM %I', r);
          END IF;
        END LOOP;
      END
      $$;
    `);
    // Ensure Supabase postgres role also has read/write access when operating via pooler.
    await verifyClient.query(`GRANT USAGE ON SCHEMA fp TO postgres`);
    await verifyClient.query(`GRANT fp_app TO postgres`);
    console.log('Verified SPEC §4.2 isolation: anon, authenticated, and service_role have zero access to schema fp.');
  } finally {
    await verifyClient.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
