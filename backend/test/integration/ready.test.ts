import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/platform/config.js';
import { loadMigrationFiles } from '../../src/platform/db/migrator.js';
import { createTestDbHarness, type TestDbHarness } from '../helpers/test-db.js';

describe('M0 foundation integration — roles, migrations and /ready', () => {
  let harness: TestDbHarness;
  let latestVersion: string;
  let latestFilename: string;

  beforeAll(async () => {
    const files = await loadMigrationFiles();
    const last = files.at(-1)!;
    latestVersion = last.version;
    latestFilename = last.filename;
    harness = await createTestDbHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.close();
  });

  it('reports /api/v1/ready = 200 when connected as least-privilege fp_app', async () => {
    const config = loadConfig({
      FP_ENV: 'test',
      FP_DATABASE_URL: 'postgresql://fp_app:test@127.0.0.1:5432/fingerpay',
      FP_ALLOWED_ORIGINS: 'http://localhost:3000',
      FP_LOG_LEVEL: 'silent',
    });
    const app = await buildApp({ config, db: harness.appDb });

    const res = await app.inject({ method: 'GET', url: '/api/v1/ready' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'ready',
      checks: {
        database: { ok: true },
        migrations: { ok: true, detail: latestVersion },
      },
    });

    await app.close();
  });

  it('enforces least-privilege schema and table permissions on fp_app', async () => {
    const roleCfg = await harness.execAsRole<{ rolconfig: string[] }>(
      'fp_app',
      "SELECT rolconfig FROM pg_roles WHERE rolname = 'fp_app'",
    );
    expect(roleCfg.rows[0]?.rolconfig).toEqual(
      expect.arrayContaining([
        'statement_timeout=5s',
        'lock_timeout=3s',
        'idle_in_transaction_session_timeout=15s',
        'TimeZone=UTC',
      ]),
    );

    const roCfg = await harness.execAsRole<{ rolconfig: string[] }>(
      'fp_readonly',
      "SELECT rolconfig FROM pg_roles WHERE rolname = 'fp_readonly'",
    );
    expect(roCfg.rows[0]?.rolconfig).toEqual(
      expect.arrayContaining(['default_transaction_read_only=on', 'statement_timeout=30s']),
    );

    // fp_app can read fp.schema_migrations, but cannot create tables or delete migration records.
    const migs = await harness.execAsRole<{ version: string }>(
      'fp_app',
      'SELECT version FROM fp.schema_migrations ORDER BY version DESC LIMIT 1',
    );
    expect(migs.rows).toEqual([{ version: latestVersion }]);

    await expect(
      harness.execAsRole('fp_app', 'CREATE TABLE fp.rogue (id int)'),
    ).rejects.toThrow();
    await expect(
      harness.execAsRole('fp_app', 'CREATE TABLE public.rogue (id int)'),
    ).rejects.toThrow();
    await expect(
      harness.execAsRole('fp_app', 'CREATE TABLE pgboss.rogue (id int)'),
    ).rejects.toThrow();
    await expect(
      harness.execAsRole(
        'fp_app',
        `DELETE FROM fp.schema_migrations WHERE version = '${latestVersion}'`,
      ),
    ).rejects.toThrow();
  });

  it('supports rolling back and re-applying the latest migration cleanly', async () => {
    const rolledBack = await harness.migrateDown();
    expect(rolledBack).toBe(latestFilename);

    // While rolled back, /ready must return 503 not_ready.
    const config = loadConfig({
      FP_ENV: 'test',
      FP_DATABASE_URL: 'postgresql://fp_app:test@127.0.0.1:5432/fingerpay',
      FP_ALLOWED_ORIGINS: 'http://localhost:3000',
      FP_LOG_LEVEL: 'silent',
    });
    const app = await buildApp({ config, db: harness.appDb });
    const notReadyRes = await app.inject({ method: 'GET', url: '/api/v1/ready' });
    expect(notReadyRes.statusCode).toBe(503);
    await app.close();

    const reapplied = await harness.migrateUp();
    expect(reapplied).toEqual([latestFilename]);
  });
});
