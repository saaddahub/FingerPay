import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { resolvePgSsl } from './kysely.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MIGRATIONS_DIR = resolve(__dirname, '../../../db/migrations');
export const DEFAULT_BOOTSTRAP_PATH = resolve(__dirname, '../../../db/bootstrap/roles.sql');

export interface MigrationFile {
  version: string;
  filename: string;
  upSql: string;
  downSql: string;
}

const MIGRATION_FILE_RE = /^(\d{14})_[a-z0-9_]+\.sql$/;

export function parseDbmateSql(raw: string, filename: string): { upSql: string; downSql: string } {
  const upMatch = /^--\s*migrate:up\b.*$/m.exec(raw);
  const downMatch = /^--\s*migrate:down\b.*$/m.exec(raw);
  if (!upMatch) {
    throw new Error(`Migration ${filename} is missing "-- migrate:up" marker`);
  }
  const upStart = upMatch.index + upMatch[0].length;
  const upEnd = downMatch ? downMatch.index : raw.length;
  const downStart = downMatch ? downMatch.index + downMatch[0].length : raw.length;
  return {
    upSql: raw.slice(upStart, upEnd).trim(),
    downSql: raw.slice(downStart).trim(),
  };
}

export async function loadMigrationFiles(
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<MigrationFile[]> {
  const entries = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  const files: MigrationFile[] = [];
  for (const filename of entries) {
    const m = MIGRATION_FILE_RE.exec(filename);
    if (!m) {
      throw new Error(
        `Invalid migration filename "${filename}" (expected YYYYMMDDHHMMSS_name.sql)`,
      );
    }
    const raw = await readFile(join(migrationsDir, filename), 'utf8');
    const { upSql, downSql } = parseDbmateSql(raw, filename);
    files.push({ version: m[1]!, filename, upSql, downSql });
  }
  return files;
}

async function ensureMigrationsTable(client: pg.Client): Promise<void> {
  await client.query('CREATE SCHEMA IF NOT EXISTS fp');
  await client.query(`
    CREATE TABLE IF NOT EXISTS fp.schema_migrations (
      version character varying(255) PRIMARY KEY
    )
  `);
}

export async function runMigrationsUp(
  ownerConnectionString: string,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<string[]> {
  const files = await loadMigrationFiles(migrationsDir);
  const ssl = resolvePgSsl(ownerConnectionString);
  const client = new pg.Client({
    connectionString: ownerConnectionString,
    ...(ssl ? { ssl } : {}),
  });
  await client.connect();
  const appliedNow: string[] = [];
  try {
    await ensureMigrationsTable(client);
    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM fp.schema_migrations ORDER BY version ASC',
    );
    const applied = new Set(rows.map((r) => r.version));

    for (const file of files) {
      if (applied.has(file.version)) continue;
      await client.query('BEGIN');
      try {
        await client.query(file.upSql);
        await client.query('INSERT INTO fp.schema_migrations (version) VALUES ($1)', [
          file.version,
        ]);
        await client.query('COMMIT');
        appliedNow.push(file.filename);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    await client.end();
  }
  return appliedNow;
}

export async function runMigrationDown(
  ownerConnectionString: string,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<string | null> {
  const files = await loadMigrationFiles(migrationsDir);
  const byVersion = new Map(files.map((f) => [f.version, f]));
  const ssl = resolvePgSsl(ownerConnectionString);
  const client = new pg.Client({
    connectionString: ownerConnectionString,
    ...(ssl ? { ssl } : {}),
  });
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM fp.schema_migrations ORDER BY version DESC LIMIT 1',
    );
    const latest = rows[0]?.version;
    if (!latest) return null;
    const file = byVersion.get(latest);
    if (!file) {
      throw new Error(`Applied migration version ${latest} not found on disk`);
    }
    await client.query('BEGIN');
    try {
      if (file.downSql) {
        await client.query(file.downSql);
      }
      await client.query('DELETE FROM fp.schema_migrations WHERE version = $1', [latest]);
      await client.query('COMMIT');
      return file.filename;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    await client.end();
  }
}

export interface RolePasswords {
  owner: string;
  app: string;
  worker: string;
  admin: string;
  readonly: string;
}

/**
 * Programmatic equivalent of `backend/db/bootstrap/roles.sql` for ephemeral databases
 * (e.g. Testcontainers in CI and local integration tests).
 */
export async function bootstrapRoles(
  superuserConnectionString: string,
  dbName: string,
  passwords: RolePasswords,
): Promise<void> {
  const client = new pg.Client({ connectionString: superuserConnectionString });
  await client.connect();
  try {
    const roles: Array<[name: string, password: string]> = [
      ['fp_owner', passwords.owner],
      ['fp_app', passwords.app],
      ['fp_worker', passwords.worker],
      ['fp_admin', passwords.admin],
      ['fp_readonly', passwords.readonly],
    ];

    for (const [role, pwd] of roles) {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
            CREATE ROLE ${role} NOLOGIN;
          END IF;
        END
        $$;
      `);
      const escapedPwd = client.escapeLiteral(pwd);
      await client.query(
        `ALTER ROLE ${role} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${escapedPwd}`,
      );
      await client.query(`ALTER ROLE ${role} SET timezone = 'UTC'`);
    }

    await client.query(`ALTER ROLE fp_app SET statement_timeout = '5s'`);
    await client.query(`ALTER ROLE fp_app SET lock_timeout = '3s'`);
    await client.query(`ALTER ROLE fp_app SET idle_in_transaction_session_timeout = '15s'`);
    await client.query(`ALTER ROLE fp_worker SET statement_timeout = '60s'`);
    await client.query(`ALTER ROLE fp_worker SET lock_timeout = '5s'`);
    await client.query(`ALTER ROLE fp_worker SET idle_in_transaction_session_timeout = '60s'`);
    await client.query(`ALTER ROLE fp_readonly SET default_transaction_read_only = on`);
    await client.query(`ALTER ROLE fp_readonly SET statement_timeout = '30s'`);

    const identDb = client.escapeIdentifier(dbName);
    await client.query(`ALTER DATABASE ${identDb} OWNER TO fp_owner`);
    await client.query(`REVOKE ALL ON DATABASE ${identDb} FROM PUBLIC`);
    await client.query(`GRANT CONNECT, TEMPORARY ON DATABASE ${identDb} TO fp_owner`);
    await client.query(
      `GRANT CONNECT ON DATABASE ${identDb} TO fp_app, fp_worker, fp_admin, fp_readonly`,
    );
    await client.query(`REVOKE ALL ON SCHEMA public FROM PUBLIC`);
    await client.query(`ALTER SCHEMA public OWNER TO fp_owner`);
  } finally {
    await client.end();
  }
}
