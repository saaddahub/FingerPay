import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseAmount, type StaffRole } from '@fingerpay/contracts';
import { AuthService } from '../modules/auth/service.js';
import { generateTotpSecret } from '../modules/auth/totp.js';
import { CustomerService } from '../modules/customers/service.js';
import { getOrCreateSystemAccount, postJournal } from '../modules/ledger/post-journal.js';
import { currentKarachiDateAndMonth } from '../modules/payments/service.js';
import { loadConfig } from '../platform/config.js';
import { createDevKeyring, parseKeyring } from '../platform/crypto/keyring.js';
import { createDb } from '../platform/db/kysely.js';
import { runMigrationsUp } from '../platform/db/migrator.js';

/**
 * SPEC §9.3: Demo seed script (`pnpm seed:demo`).
 * 1. Runs pending migrations.
 * 2. Seeds multi-bank institutions (ABL, DBB, SBP), branches, and merchants (Rasheed Kiryana Store & Campus Canteen).
 * 3. Creates staff accounts with random passwords + TOTP secrets written ONLY to `.demo-credentials.local.md` (gitignored).
 * 4. Enrolls Ayesha Khan and Bilal Hussain through the real `CustomerService.enrollCustomer` path.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const migrateUrl = process.env.FP_MIGRATE_DATABASE_URL ?? config.FP_DATABASE_URL;
  await runMigrationsUp(migrateUrl);

  const dbHandle = createDb({ connectionString: migrateUrl, maxConnections: 5 });
  const db = dbHandle.db;

  try {
    const existingAbl = await db
      .selectFrom('fp.institutions')
      .select('id')
      .where('code', '=', 'ABL')
      .executeTakeFirst();

    if (existingAbl) {
      console.log('Demo seed already applied (ABL institution exists).');
      return;
    }

    const keyring =
      process.env.FP_KEYRING && !process.env.FP_KEYRING.includes('REPLACE_')
        ? parseKeyring(process.env.FP_KEYRING)
        : createDevKeyring();
    const lookupRootKey = process.env.FP_LOOKUP_KEY
      ? Buffer.from(process.env.FP_LOOKUP_KEY, 'base64')
      : randomBytes(32);
    const demoKey = process.env.FP_DEMO_KEY
      ? Buffer.from(process.env.FP_DEMO_KEY, 'base64')
      : randomBytes(32);

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
        {
          id: ablBranchId,
          institution_id: ablId,
          code: 'LHR-001',
          name: 'Allied Bank Gulberg Branch',
        },
        {
          id: dbbBranchId,
          institution_id: dbbId,
          code: 'CMP-001',
          name: 'Demo Bank B Campus Branch',
        },
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

    // Fund Rasheed (PKR 18,450.00) and marketing pools (PKR 100,000.00) via double-entry ledger
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

    // Create staff users
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
      '# FingerPay Local Demo Credentials (Gitignored — Never Commit)',
      '',
      '| Email | Role | Password | TOTP Base32 Secret |',
      '|---|---|---|---|',
    ];

    let officerId = '';
    for (const s of staffSpecs) {
      const password = `FP-${randomBytes(9).toString('base64url')}!26`;
      const totp = s.mfa ? generateTotpSecret(s.email) : null;
      const uid = await authService.registerStaffUser({
        email: s.email,
        password,
        role: s.role,
        ...(s.institutionId ? { institutionId: s.institutionId } : {}),
        ...(s.branchId ? { branchId: s.branchId } : {}),
        ...(s.merchantId ? { merchantId: s.merchantId } : {}),
        ...(totp ? { totpSecret: totp.secret } : {}),
      });
      if (s.role === 'BRANCH_OFFICER') officerId = uid;
      credLines.push(`| ${s.email} | ${s.role} | \`${password}\` | \`${totp?.secret ?? 'N/A'}\` |`);
    }

    // Enroll Ayesha and Bilal via the real enrollment path (SPEC §9.3)
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

    const credPath = resolve(process.cwd(), '../.demo-credentials.local.md');
    await writeFile(credPath, credLines.join('\n') + '\n', 'utf8');
    console.log(`Demo seed completed. Staff credentials written to ${credPath}`);
  } finally {
    await dbHandle.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
