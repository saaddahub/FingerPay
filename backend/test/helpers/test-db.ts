import { PGlite } from '@electric-sql/pglite';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type QueryResult,
} from 'kysely';
import pg from 'pg';
import { createDb } from '../../src/platform/db/kysely.js';
import {
  bootstrapRoles,
  loadMigrationFiles,
  runMigrationDown,
  runMigrationsUp,
  type RolePasswords,
} from '../../src/platform/db/migrator.js';
import type { Database } from '../../src/platform/db/types.gen.js';

export type DbRole = 'fp_owner' | 'fp_app' | 'fp_worker' | 'fp_admin' | 'fp_readonly';

export interface TestDbHarness {
  engine: 'testcontainers' | 'pglite';
  appDb: Kysely<Database>;
  execAsRole: <T = Record<string, unknown>>(
    role: DbRole,
    sqlText: string,
    params?: unknown[],
  ) => Promise<{ rows: T[] }>;
  migrateUp: () => Promise<string[]>;
  migrateDown: () => Promise<string | null>;
  close: () => Promise<void>;
}

const PASSWORDS: RolePasswords = {
  owner: 'owner-test-pwd-0123456789abcdef',
  app: 'app-test-pwd-0123456789abcdef',
  worker: 'worker-test-pwd-0123456789abcdef',
  admin: 'admin-test-pwd-0123456789abcdef',
  readonly: 'readonly-test-pwd-0123456789abcdef',
};

function rolePassword(role: DbRole): string {
  switch (role) {
    case 'fp_owner':
      return PASSWORDS.owner;
    case 'fp_app':
      return PASSWORDS.app;
    case 'fp_worker':
      return PASSWORDS.worker;
    case 'fp_admin':
      return PASSWORDS.admin;
    case 'fp_readonly':
      return PASSWORDS.readonly;
  }
}

class PGliteKyselyConnection implements DatabaseConnection {
  constructor(
    private readonly pglite: PGlite,
    private readonly role: DbRole,
  ) {}

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    await this.pglite.exec(`SET ROLE ${this.role}`);
    try {
      const res = await this.pglite.query<R>(
        compiledQuery.sql,
        compiledQuery.parameters as unknown[],
      );
      return {
        rows: res.rows,
        ...(res.affectedRows !== undefined
          ? { numAffectedRows: BigInt(res.affectedRows) }
          : {}),
      };
    } finally {
      await this.pglite.exec('RESET ROLE');
    }
  }

  streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error('Streaming not supported in PGlite harness');
  }
}

class PGliteDriver implements Driver {
  private readonly conn: PGliteKyselyConnection;
  constructor(
    private readonly pglite: PGlite,
    role: DbRole,
  ) {
    this.conn = new PGliteKyselyConnection(pglite, role);
  }
  async init(): Promise<void> {}
  async acquireConnection(): Promise<DatabaseConnection> {
    return this.conn;
  }
  async beginTransaction(): Promise<void> {
    await this.pglite.exec('BEGIN');
  }
  async commitTransaction(): Promise<void> {
    await this.pglite.exec('COMMIT');
  }
  async rollbackTransaction(): Promise<void> {
    await this.pglite.exec('ROLLBACK');
  }
  async releaseConnection(): Promise<void> {}
  async destroy(): Promise<void> {}
}

function createPgliteKysely(pglite: PGlite, role: DbRole): Kysely<Database> {
  const dialect: Dialect = {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new PGliteDriver(pglite, role),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  };
  return new Kysely<Database>({ dialect });
}

async function createTestcontainersHarness(
  container: StartedPostgreSqlContainer,
): Promise<TestDbHarness> {
  await bootstrapRoles(container.getConnectionUri(), container.getDatabase(), PASSWORDS);

  const urlFor = (role: DbRole) =>
    `postgresql://${role}:${encodeURIComponent(rolePassword(role))}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;

  const ownerUrl = urlFor('fp_owner');
  await runMigrationsUp(ownerUrl);
  const appHandle = createDb({ connectionString: urlFor('fp_app'), maxConnections: 5 });

  return {
    engine: 'testcontainers',
    appDb: appHandle.db,
    execAsRole: async <T = Record<string, unknown>>(
      role: DbRole,
      sqlText: string,
      params: unknown[] = [],
    ) => {
      const client = new pg.Client({ connectionString: urlFor(role) });
      await client.connect();
      try {
        const res = await client.query(sqlText, params);
        return { rows: res.rows as T[] };
      } finally {
        await client.end();
      }
    },
    migrateUp: () => runMigrationsUp(ownerUrl),
    migrateDown: () => runMigrationDown(ownerUrl),
    close: async () => {
      await appHandle.close();
      await container.stop();
    },
  };
}

async function createPgliteHarness(): Promise<TestDbHarness> {
  const pglite = await PGlite.create();

  for (const role of ['fp_owner', 'fp_app', 'fp_worker', 'fp_admin', 'fp_readonly'] as const) {
    await pglite.exec(
      `CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
    );
    await pglite.exec(`ALTER ROLE ${role} SET timezone = 'UTC'`);
  }
  await pglite.exec(`
    ALTER ROLE fp_app SET statement_timeout = '5s';
    ALTER ROLE fp_app SET lock_timeout = '3s';
    ALTER ROLE fp_app SET idle_in_transaction_session_timeout = '15s';
    ALTER ROLE fp_worker SET statement_timeout = '60s';
    ALTER ROLE fp_worker SET lock_timeout = '5s';
    ALTER ROLE fp_worker SET idle_in_transaction_session_timeout = '60s';
    ALTER ROLE fp_readonly SET default_transaction_read_only = on;
    ALTER ROLE fp_readonly SET statement_timeout = '30s';
    ALTER DATABASE template1 OWNER TO fp_owner;
    REVOKE ALL ON DATABASE template1 FROM PUBLIC;
    GRANT CONNECT, TEMPORARY, CREATE ON DATABASE template1 TO fp_owner;
    GRANT CONNECT ON DATABASE template1 TO fp_app, fp_worker, fp_admin, fp_readonly;
    REVOKE ALL ON SCHEMA public FROM PUBLIC;
    ALTER SCHEMA public OWNER TO fp_owner;
    SET timezone = 'UTC';
  `);

  const migrateUp = async (): Promise<string[]> => {
    const files = await loadMigrationFiles();
    await pglite.exec('SET ROLE fp_owner');
    const appliedNow: string[] = [];
    try {
      await pglite.exec(`
        CREATE SCHEMA IF NOT EXISTS fp AUTHORIZATION fp_owner;
        CREATE TABLE IF NOT EXISTS fp.schema_migrations (
          version character varying(255) PRIMARY KEY
        );
      `);
      const { rows } = await pglite.query<{ version: string }>(
        'SELECT version FROM fp.schema_migrations ORDER BY version ASC',
      );
      const applied = new Set(rows.map((r) => r.version));
      for (const file of files) {
        if (applied.has(file.version)) continue;
        await pglite.exec(file.upSql);
        await pglite.query('INSERT INTO fp.schema_migrations (version) VALUES ($1)', [
          file.version,
        ]);
        appliedNow.push(file.filename);
      }
    } finally {
      await pglite.exec('RESET ROLE');
    }
    return appliedNow;
  };

  const migrateDown = async (): Promise<string | null> => {
    const files = await loadMigrationFiles();
    const byVersion = new Map(files.map((f) => [f.version, f]));
    await pglite.exec('SET ROLE fp_owner');
    try {
      const { rows } = await pglite.query<{ version: string }>(
        'SELECT version FROM fp.schema_migrations ORDER BY version DESC LIMIT 1',
      );
      const latest = rows[0]?.version;
      if (!latest) return null;
      const file = byVersion.get(latest);
      if (!file) throw new Error(`Migration ${latest} not found`);
      if (file.downSql) {
        await pglite.exec(file.downSql);
      }
      await pglite.query('DELETE FROM fp.schema_migrations WHERE version = $1', [latest]);
      return file.filename;
    } finally {
      await pglite.exec('RESET ROLE');
    }
  };

  await migrateUp();
  const appDb = createPgliteKysely(pglite, 'fp_app');

  return {
    engine: 'pglite',
    appDb,
    execAsRole: async <T = Record<string, unknown>>(
      role: DbRole,
      sqlText: string,
      params: unknown[] = [],
    ) => {
      await pglite.exec(`SET ROLE ${role}`);
      try {
        const res = await pglite.query<T>(sqlText, params);
        return { rows: res.rows };
      } finally {
        await pglite.exec('RESET ROLE');
      }
    },
    migrateUp,
    migrateDown,
    close: async () => {
      await appDb.destroy();
      await pglite.close();
    },
  };
}

export async function createTestDbHarness(): Promise<TestDbHarness> {
  if (process.env.CI === 'true' || process.env.FP_FORCE_TESTCONTAINERS === 'true') {
    const container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('fingerpay')
      .start();
    return createTestcontainersHarness(container);
  }

  try {
    const container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('fingerpay')
      .start();
    return createTestcontainersHarness(container);
  } catch {
    return createPgliteHarness();
  }
}
