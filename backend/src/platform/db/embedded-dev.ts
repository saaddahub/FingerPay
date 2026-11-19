import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseAmount, type StaffRole } from '@fingerpay/contracts';
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
import { AuthService } from '../../modules/auth/service.js';
import { generateTotpSecret } from '../../modules/auth/totp.js';
import { CustomerService } from '../../modules/customers/service.js';
import { getOrCreateSystemAccount, postJournal } from '../../modules/ledger/post-journal.js';
import { currentKarachiDateAndMonth } from '../../modules/payments/service.js';
import { createDevKeyring, parseKeyring, type Keyring } from '../crypto/keyring.js';
import { loadMigrationFiles } from './migrator.js';
import type { Database } from './types.gen.js';

interface PGliteLike {
  exec(sql: string): Promise<unknown>;
  query<R>(sql: string, params?: unknown[]): Promise<{ rows: R[]; affectedRows?: number }>;
  close(): Promise<void>;
}

/**
 * Serializes queries on the single-connection PGlite WASM engine so concurrent HTTP
 * requests from the browser console never interleave inside a transaction.
 */
class SerializedPgliteDriver implements Driver {
  private chain: Promise<void> = Promise.resolve();
  private inTx = false;
  private txDepth = 0;

  constructor(private readonly pglite: PGliteLike) {}

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    const pglite = this.pglite;
    return {
      executeQuery: async <R>(compiled: CompiledQuery): Promise<QueryResult<R>> => {
        const exec = async () => {
          const res = await pglite.query<R>(compiled.sql, compiled.parameters as unknown[]);
          return {
            rows: res.rows,
            ...(res.affectedRows !== undefined
              ? { numAffectedRows: BigInt(res.affectedRows) }
              : {}),
          };
        };
        return this.inTx ? exec() : this.enqueue(exec);
      },
      streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
        throw new Error('Streaming not supported in embedded dev DB');
      },
    };
  }

  async beginTransaction(): Promise<void> {
    await this.enqueue(async () => {
      if (this.txDepth === 0) {
        await this.pglite.exec('BEGIN');
        this.inTx = true;
      }
      this.txDepth++;
    });
  }

  async commitTransaction(): Promise<void> {
    this.txDepth = Math.max(0, this.txDepth - 1);
    if (this.txDepth === 0) {
      try {
        await this.pglite.exec('COMMIT');
      } finally {
        this.inTx = false;
      }
    }
  }

  async rollbackTransaction(): Promise<void> {
    this.txDepth = Math.max(0, this.txDepth - 1);
    if (this.txDepth === 0) {
      try {
        await this.pglite.exec('ROLLBACK');
      } finally {
        this.inTx = false;
      }
    }
  }

  async releaseConnection(): Promise<void> {}
  async destroy(): Promise<void> {}
}

function decodeBase64KeyOrFallback(envVal: string | undefined): Buffer {
  if (envVal) {
    const buf = Buffer.from(envVal.trim(), 'base64');
    if (buf.length === 32) return buf;
  }
  return randomBytes(32);
}

/**
 * Development-only embedded PostgreSQL (PGlite) bootstrapper:
 * creates roles, runs migrations 0001–0004, and seeds demo institutions, merchants,
 * staff accounts, and personas (Ayesha & Bilal) so the developer console is immediately usable
 * when Docker Postgres is not running locally.
 */
export async function startEmbeddedDevDb(): Promise<{
  db: Kysely<Database>;
  keyring: Keyring;
  lookupRootKey: Buffer;
  demoKey: Buffer;
  close: () => Promise<void>;
}> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pglite = (await PGlite.create()) as unknown as PGliteLike;

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
    ALTER DATABASE template1 OWNER TO fp_owner;
    REVOKE ALL ON DATABASE template1 FROM PUBLIC;
    GRANT CONNECT, TEMPORARY, CREATE ON DATABASE template1 TO fp_owner;
    GRANT CONNECT ON DATABASE template1 TO fp_app, fp_worker, fp_admin, fp_readonly;
    REVOKE ALL ON SCHEMA public FROM PUBLIC;
    ALTER SCHEMA public OWNER TO fp_owner;
    SET timezone = 'UTC';
  `);

  const files = await loadMigrationFiles();
  await pglite.exec('SET ROLE fp_owner');
  try {
    await pglite.exec(`
      CREATE SCHEMA IF NOT EXISTS fp AUTHORIZATION fp_owner;
      CREATE TABLE IF NOT EXISTS fp.schema_migrations (
        version character varying(255) PRIMARY KEY
      );
    `);
    for (const file of files) {
      await pglite.exec(file.upSql);
      await pglite.query('INSERT INTO fp.schema_migrations (version) VALUES ($1)', [file.version]);
    }
  } finally {
    await pglite.exec('RESET ROLE');
  }

  const dialect: Dialect = {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new SerializedPgliteDriver(pglite),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  };
  const db = new Kysely<Database>({ dialect });

  const keyring =
    process.env.FP_KEYRING && !process.env.FP_KEYRING.includes('REPLACE_')
      ? parseKeyring(process.env.FP_KEYRING)
      : createDevKeyring();
  const lookupRootKey = decodeBase64KeyOrFallback(process.env.FP_LOOKUP_KEY);
  const demoKey = decodeBase64KeyOrFallback(process.env.FP_DEMO_KEY);

  // Seed demo data (ABL, DBB, SBP, Rasheed Kiryana, Campus Canteen, Staff, Ayesha & Bilal)
  const authService = new AuthService({ db, keyring });
  const customerService = new CustomerService({ db, keyring, lookupRootKey, demoKey });

  const ablId = randomUUID();
  const dbbId = randomUUID();
  const sbpId = randomUUID();
  const ablBranchId = randomUUID();
  const dbbBranchId = randomUUID();
  const rasheedMerchantId = randomUUID();
  const rasheedCasaId = randomUUID();
  const canteenMerchantId = randomUUID();
  const canteenCasaId = randomUUID();

  await db
    .insertInto('fp.institutions')
    .values([
      {
        id: ablId,
        code: 'ABL',
        name: 'Allied Bank (Simulated)',
        kind: 'BANK',
        raast_participant_code: 'ABLPKKA',
        raast_available: true,
        dispute_prefix: 'ABL',
      },
      {
        id: dbbId,
        code: 'DBB',
        name: 'Demo Bank B (Simulated)',
        kind: 'BANK',
        raast_participant_code: 'DBBPKKA',
        raast_available: true,
        dispute_prefix: 'DBB',
      },
      {
        id: sbpId,
        code: 'SBP',
        name: 'SBP Raast Switch (Simulated)',
        kind: 'CENTRAL',
        raast_participant_code: 'SBPPKKA',
        raast_available: true,
        dispute_prefix: 'SBP',
      },
    ])
    .execute();

  await db
    .insertInto('fp.branches')
    .values([
      { id: ablBranchId, institution_id: ablId, code: 'LHR-001', name: 'Allied Bank Gulberg' },
      { id: dbbBranchId, institution_id: dbbId, code: 'CMP-001', name: 'Demo Bank B Campus' },
    ])
    .execute();

  await db
    .insertInto('fp.accounts')
    .values([
      {
        id: rasheedCasaId,
        book_institution_id: ablId,
        owner_type: 'MERCHANT',
        owner_id: rasheedMerchantId,
        kind: 'MERCHANT_CASA',
        balance_mode: 'SYNC',
        status: 'ACTIVE',
      },
      {
        id: canteenCasaId,
        book_institution_id: dbbId,
        owner_type: 'MERCHANT',
        owner_id: canteenMerchantId,
        kind: 'MERCHANT_CASA',
        balance_mode: 'SYNC',
        status: 'ACTIVE',
      },
    ])
    .execute();

  await db
    .insertInto('fp.merchants')
    .values([
      {
        id: rasheedMerchantId,
        institution_id: ablId,
        name: 'Rasheed Kiryana Store',
        settlement_account_id: rasheedCasaId,
        status: 'ACTIVE',
        require_claim: false,
      },
      {
        id: canteenMerchantId,
        institution_id: dbbId,
        name: 'Campus Canteen (DBB)',
        settlement_account_id: canteenCasaId,
        status: 'ACTIVE',
        require_claim: false,
      },
    ])
    .execute();

  const ablEquity = await getOrCreateSystemAccount(db, ablId, 'OPENING_EQUITY');
  const ablPool = await getOrCreateSystemAccount(db, ablId, 'MARKETING_POOL');
  await postJournal(db, {
    kind: 'FUNDING',
    refType: 'SEED_OPENING',
    refId: rasheedMerchantId,
    memo: 'Seed Rasheed Kiryana opening balance & ABL marketing pool',
    entries: [
      { bookInstitutionId: ablId, accountId: ablEquity.id, amount: -parseAmount('118450.00') },
      { bookInstitutionId: ablId, accountId: rasheedCasaId, amount: parseAmount('18450.00') },
      { bookInstitutionId: ablId, accountId: ablPool.id, amount: parseAmount('100000.00') },
    ],
  });

  const dbbEquity = await getOrCreateSystemAccount(db, dbbId, 'OPENING_EQUITY');
  const dbbPool = await getOrCreateSystemAccount(db, dbbId, 'MARKETING_POOL');
  await postJournal(db, {
    kind: 'FUNDING',
    refType: 'SEED_OPENING',
    refId: canteenMerchantId,
    memo: 'Seed Campus Canteen opening balance & DBB marketing pool',
    entries: [
      { bookInstitutionId: dbbId, accountId: dbbEquity.id, amount: -parseAmount('55000.00') },
      { bookInstitutionId: dbbId, accountId: canteenCasaId, amount: parseAmount('5000.00') },
      { bookInstitutionId: dbbId, accountId: dbbPool.id, amount: parseAmount('50000.00') },
    ],
  });

  const { monthPkt } = currentKarachiDateAndMonth();
  await db
    .insertInto('fp.merchant_monthly_stats')
    .values({
      merchant_id: rasheedMerchantId,
      month_pkt: monthPkt,
      settled_count: 142,
      rebate_journal_id: null,
    })
    .execute();

  const devPassword = 'FingerPay#2026!';
  const staffSpecs: Array<{
    email: string;
    role: StaffRole;
    institutionId?: string;
    branchId?: string;
    merchantId?: string;
    mfa: boolean;
  }> = [
    {
      email: 'rasheed@kiryana.pk',
      role: 'MERCHANT_OWNER',
      institutionId: ablId,
      merchantId: rasheedMerchantId,
      mfa: false,
    },
    {
      email: 'cashier@kiryana.pk',
      role: 'MERCHANT_CASHIER',
      institutionId: ablId,
      merchantId: rasheedMerchantId,
      mfa: false,
    },
    {
      email: 'canteen@dbb.pk',
      role: 'MERCHANT_OWNER',
      institutionId: dbbId,
      merchantId: canteenMerchantId,
      mfa: false,
    },
    {
      email: 'officer@abl.pk',
      role: 'BRANCH_OFFICER',
      institutionId: ablId,
      branchId: ablBranchId,
      mfa: true,
    },
    {
      email: 'manager@abl.pk',
      role: 'BRANCH_MANAGER',
      institutionId: ablId,
      branchId: ablBranchId,
      mfa: true,
    },
    {
      email: 'admin@abl.pk',
      role: 'BANK_ADMIN',
      institutionId: ablId,
      mfa: true,
    },
    {
      email: 'auditor@abl.pk',
      role: 'AUDITOR',
      institutionId: ablId,
      mfa: true,
    },
  ];

  const credLines: string[] = [
    '# FingerPay Local Dev Demo Credentials (Gitignored)',
    '',
    '| Email | Role | Password | TOTP Base32 Secret |',
    '|---|---|---|---|',
  ];

  let officerId = '';
  for (const s of staffSpecs) {
    const totp = s.mfa ? generateTotpSecret(s.email) : null;
    const uid = await authService.registerStaffUser({
      email: s.email,
      password: devPassword,
      role: s.role,
      ...(s.institutionId ? { institutionId: s.institutionId } : {}),
      ...(s.branchId ? { branchId: s.branchId } : {}),
      ...(s.merchantId ? { merchantId: s.merchantId } : {}),
      ...(totp ? { totpSecret: totp.secret } : {}),
    });
    if (s.role === 'BRANCH_OFFICER') officerId = uid;
    credLines.push(`| ${s.email} | ${s.role} | \`${devPassword}\` | \`${totp?.secret ?? 'N/A'}\` |`);
  }

  await customerService.enrollCustomer({
    actorId: officerId,
    institutionId: ablId,
    fullName: 'Ayesha Khan',
    cnic: '35202-1122334-6',
    accountNumber: 'ABL-SAL-998877665',
    accountType: 'SHOPPER_SALARY',
    phone: '+923001122334',
    openingBalance: parseAmount('15000.00'),
    nadraRef: 'NADRA-20261118-AYESHA01',
    consentVersion: 'v1.0-2026',
  });

  await customerService.enrollCustomer({
    actorId: officerId,
    institutionId: ablId,
    fullName: 'Bilal Hussain',
    cnic: '35202-7788990-1',
    accountNumber: 'ABL-STU-445566778',
    accountType: 'STUDENT_NON_PTA',
    phone: '+923007788990',
    openingBalance: parseAmount('450.00'),
    nadraRef: 'NADRA-20261118-BILAL001',
    consentVersion: 'v1.0-2026',
    customReferralCode: 'BILAL-FP100',
    markFirstPaymentCompleted: true,
  });

  // Switch runtime connection to least-privilege fp_app!
  await pglite.exec('SET ROLE fp_app');

  const credPath = resolve(process.cwd(), '../.demo-credentials.local.md');
  await writeFile(credPath, credLines.join('\n') + '\n', 'utf8').catch(() => undefined);

  return {
    db,
    keyring,
    lookupRootKey,
    demoKey,
    close: async () => {
      await db.destroy();
      await pglite.close();
    },
  };
}
