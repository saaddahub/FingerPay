import pg from 'pg';
import {
  loadMigrationFiles,
  runMigrationDown,
  runMigrationsUp,
} from '../platform/db/migrator.js';

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'status';
  const ownerUrl = process.env.FP_MIGRATE_DATABASE_URL ?? process.env.FP_DATABASE_URL;
  if (!ownerUrl) {
    throw new Error('Set FP_MIGRATE_DATABASE_URL (or FP_DATABASE_URL) as fp_owner before migrating');
  }

  if (cmd === 'up') {
    const applied = await runMigrationsUp(ownerUrl);
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'No pending migrations.');
    return;
  }

  if (cmd === 'down') {
    const rolledBack = await runMigrationDown(ownerUrl);
    console.log(rolledBack ? `Rolled back: ${rolledBack}` : 'Nothing to roll back.');
    return;
  }

  if (cmd === 'status') {
    const files = await loadMigrationFiles();
    const client = new pg.Client({ connectionString: ownerUrl });
    await client.connect();
    try {
      const { rows } = await client
        .query<{ version: string }>('SELECT version FROM fp.schema_migrations')
        .catch(() => ({ rows: [] as Array<{ version: string }> }));
      const applied = new Set(rows.map((r) => r.version));
      for (const f of files) {
        console.log(`${applied.has(f.version) ? '[X]' : '[ ]'} ${f.filename}`);
      }
    } finally {
      await client.end();
    }
    return;
  }

  throw new Error(`Unknown command "${cmd}" (expected up | down | status)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
