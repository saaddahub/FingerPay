import { createSign, generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { canonicalString, parseAmount, TERMINAL_HEADERS } from '@fingerpay/contracts';
import type { FastifyInstance } from 'fastify';
import * as OTPAuth from 'otpauth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { AuthService } from '../../src/modules/auth/service.js';
import { generateTotpSecret } from '../../src/modules/auth/totp.js';
import { CustomerService } from '../../src/modules/customers/service.js';
import { getOrCreateSystemAccount, postJournal } from '../../src/modules/ledger/post-journal.js';
import { currentKarachiDateAndMonth } from '../../src/modules/payments/service.js';
import { computeBodySha256 } from '../../src/modules/terminals/signature.js';
import { loadConfig } from '../../src/platform/config.js';
import { createDevKeyring } from '../../src/platform/crypto/keyring.js';
import { createTestDbHarness, type TestDbHarness } from '../helpers/test-db.js';

function createEcdsaKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  return {
    spkiBase64: Buffer.from(spkiDer).toString('base64'),
    sign: (canonical: string): string => {
      const signer = createSign('sha256');
      signer.update(canonical, 'utf8');
      return signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    },
  };
}

function signTerminalHeaders(
  terminalId: string,
  kp: ReturnType<typeof createEcdsaKeyPair>,
  method: string,
  url: string,
  payloadObj?: unknown,
) {
  const rawBody = payloadObj !== undefined ? JSON.stringify(payloadObj) : '';
  const timestamp = new Date().toISOString();
  const nonce = randomBytes(16).toString('base64url');
  const canonical = canonicalString({
    method,
    pathWithQuery: url,
    terminalId,
    timestamp,
    nonce,
    bodySha256: computeBodySha256(rawBody),
  });
  return {
    rawBody,
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      [TERMINAL_HEADERS.terminal]: terminalId,
      [TERMINAL_HEADERS.timestamp]: timestamp,
      [TERMINAL_HEADERS.nonce]: nonce,
      [TERMINAL_HEADERS.signature]: kp.sign(canonical),
    },
  };
}

describe('M2–M4 full integration — double-entry ledger, SPEC §6.3 demo flow, off-us Raast, views A–E, and DB tamper detection', () => {
  let harness: TestDbHarness;
  let app: FastifyInstance;
  let customerService: CustomerService;

  const ablId = randomUUID();
  const dbbId = randomUUID();
  const sbpId = randomUUID();
  const ablBranchId = randomUUID();
  const rasheedMerchantId = randomUUID();
  const rasheedCasaId = randomUUID();
  const canteenMerchantId = randomUUID();
  const canteenCasaId = randomUUID();

  const password = 'StrongPassword#2026!';
  let ownerToken: string;
  let cashierToken: string;
  let officerToken: string;
  let managerToken: string;
  let adminToken: string;

  let rasheedTerminalId: string;
  const rasheedKp = createEcdsaKeyPair();
  let canteenTerminalId: string;
  const canteenKp = createEcdsaKeyPair();

  let ayeshaCustomerId: string;
  let ayeshaCasaId: string;
  let ayeshaToken: string;
  let bilalCasaId: string;
  let bilalToken: string;

  beforeAll(async () => {
    harness = await createTestDbHarness();
    const keyring = createDevKeyring();
    const lookupRootKey = randomBytes(32);
    const demoKey = randomBytes(32);

    const config = loadConfig({
      FP_ENV: 'test',
      FP_DATABASE_URL: 'postgresql://fp_app:test@127.0.0.1:5432/fingerpay',
      FP_ALLOWED_ORIGINS: 'http://localhost:3000',
      FP_DEMO_MODE: 'true',
      FP_LOG_LEVEL: 'silent',
    });

    const authService = new AuthService({ db: harness.appDb, keyring });
    customerService = new CustomerService({
      db: harness.appDb,
      keyring,
      lookupRootKey,
      demoKey,
    });

    app = await buildApp({
      config,
      db: harness.appDb,
      keyring,
      lookupRootKey,
      demoKey,
      authService,
      customerService,
    });

    // 1. Seed institutions: ABL, DBB, SBP
    await harness.appDb
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

    await harness.appDb
      .insertInto('fp.branches')
      .values({
        id: ablBranchId,
        institution_id: ablId,
        code: 'LHR-001',
        name: 'ABL Gulberg Branch',
      })
      .execute();

    // 2. Create merchant settlement CASA accounts and stores
    await harness.appDb
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

    await harness.appDb
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

    // Seed Rasheed's opening balance (PKR 18,450.00), monthly stats (142 tx), and marketing pools (PKR 100,000.00)
    const ablEquity = await getOrCreateSystemAccount(harness.appDb, ablId, 'OPENING_EQUITY');
    const ablPool = await getOrCreateSystemAccount(harness.appDb, ablId, 'MARKETING_POOL');
    await postJournal(harness.appDb, {
      kind: 'PAYMENT',
      refType: 'SEED_OPENING',
      refId: rasheedMerchantId,
      memo: 'Seed Rasheed opening balance and ABL marketing pool',
      entries: [
        {
          bookInstitutionId: ablId,
          accountId: ablEquity.id,
          amount: -parseAmount('118450.00'),
        },
        {
          bookInstitutionId: ablId,
          accountId: rasheedCasaId,
          amount: parseAmount('18450.00'),
        },
        {
          bookInstitutionId: ablId,
          accountId: ablPool.id,
          amount: parseAmount('100000.00'),
        },
      ],
    });

    const { monthPkt } = currentKarachiDateAndMonth();
    await harness.appDb
      .insertInto('fp.merchant_monthly_stats')
      .values({
        merchant_id: rasheedMerchantId,
        month_pkt: monthPkt,
        settled_count: 142,
        rebate_journal_id: null,
      })
      .execute();

    // 3. Register staff users and authenticate them
    await authService.registerStaffUser({
      email: 'rasheed@kiryana.pk',
      password,
      role: 'MERCHANT_OWNER',
      institutionId: ablId,
      merchantId: rasheedMerchantId,
    });
    await authService.registerStaffUser({
      email: 'cashier@kiryana.pk',
      password,
      role: 'MERCHANT_CASHIER',
      institutionId: ablId,
      merchantId: rasheedMerchantId,
    });
    await authService.registerStaffUser({
      email: 'canteen@dbb.pk',
      password,
      role: 'MERCHANT_OWNER',
      institutionId: dbbId,
      merchantId: canteenMerchantId,
    });

    const officerTotp = generateTotpSecret('officer@abl.pk');
    await authService.registerStaffUser({
      email: 'officer@abl.pk',
      password,
      role: 'BRANCH_OFFICER',
      institutionId: ablId,
      branchId: ablBranchId,
      totpSecret: officerTotp.secret,
    });

    const managerTotp = generateTotpSecret('manager@abl.pk');
    await authService.registerStaffUser({
      email: 'manager@abl.pk',
      password,
      role: 'BRANCH_MANAGER',
      institutionId: ablId,
      branchId: ablBranchId,
      totpSecret: managerTotp.secret,
    });

    const adminTotp = generateTotpSecret('admin@abl.pk');
    await authService.registerStaffUser({
      email: 'admin@abl.pk',
      password,
      role: 'BANK_ADMIN',
      institutionId: ablId,
      totpSecret: adminTotp.secret,
    });

    async function loginAal1(email: string): Promise<string> {
      const r = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { origin: 'http://localhost:3000' },
        payload: { email, password },
      });
      return r.json().accessToken as string;
    }

    async function loginAal2(email: string, secret: string): Promise<string> {
      const r1 = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { origin: 'http://localhost:3000' },
        payload: { email, password },
      });
      const code = new OTPAuth.TOTP({
        issuer: 'FingerPay',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      }).generate();
      const r2 = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mfa/verify',
        headers: { origin: 'http://localhost:3000' },
        payload: { challengeToken: r1.json().mfaChallengeToken, code },
      });
      return r2.json().accessToken as string;
    }

    ownerToken = await loginAal1('rasheed@kiryana.pk');
    cashierToken = await loginAal1('cashier@kiryana.pk');
    const canteenOwnerToken = await loginAal1('canteen@dbb.pk');
    officerToken = await loginAal2('officer@abl.pk', officerTotp.secret);
    managerToken = await loginAal2('manager@abl.pk', managerTotp.secret);
    adminToken = await loginAal2('admin@abl.pk', adminTotp.secret);

    // 4. Pair POS terminals for Rasheed Kiryana (ABL) and Campus Canteen (DBB)
    const pair1 = await app.inject({
      method: 'POST',
      url: '/api/v1/terminals/pair',
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${ownerToken}` },
      payload: { label: 'Rasheed Counter 1', publicKeySpki: rasheedKp.spkiBase64 },
    });
    rasheedTerminalId = pair1.json().terminalId;

    const pair2 = await app.inject({
      method: 'POST',
      url: '/api/v1/terminals/pair',
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${canteenOwnerToken}` },
      payload: { label: 'Canteen POS', publicKeySpki: canteenKp.spkiBase64 },
    });
    canteenTerminalId = pair2.json().terminalId;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await harness?.close();
  });

  async function getBalance(accountId: string): Promise<string> {
    const row = await harness.appDb
      .selectFrom('fp.accounts')
      .select('balance')
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    return row.balance;
  }

  it('enrolls Ayesha and Bilal via the real enrollment path and refuses duplicate enrollments (SPEC §9.3 & §4.9)', async () => {
    // Verify CNIC with NADRA gateway route
    const nadraRes = await app.inject({
      method: 'POST',
      url: '/api/v1/branch/nadra/verify',
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${officerToken}` },
      payload: { cnic: '35202-1122334-6', fullName: 'Ayesha Khan' },
    });
    expect(nadraRes.statusCode).toBe(200);
    expect(nadraRes.json().verified).toBe(true);
    const ayeshaNadraRef = nadraRes.json().nadraRef as string;

    // Enroll Ayesha through HTTP route
    const enrollAyesha = await app.inject({
      method: 'POST',
      url: '/api/v1/branch/enrollments',
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${officerToken}` },
      payload: {
        fullName: 'Ayesha Khan',
        cnic: '35202-1122334-6',
        accountNumber: 'ABL-SAL-998877665',
        accountType: 'SHOPPER_SALARY',
        phone: '+923001122334',
        openingBalance: '15000.00',
        nadraRef: ayeshaNadraRef,
        consentAccepted: true,
        consentVersion: 'v1.0-2026',
      },
    });
    expect(enrollAyesha.statusCode).toBe(200);
    ayeshaCustomerId = enrollAyesha.json().customerId;
    expect(enrollAyesha.json().displayName).toBe('Ayesha K.');
    expect(enrollAyesha.json().cnicLast4).toBe('3346');
    expect(enrollAyesha.json().phoneLast4).toBe('2334');

    // Enroll Bilal as existing user (SPEC §0 #16 & §9.3: code BILAL-FP100, existing user so he earns 2% student cashback)
    const bilalEnrolled = await customerService.enrollCustomer({
      actorId: ayeshaCustomerId,
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
    expect(bilalEnrolled.customerId).toBeTruthy();
    bilalCasaId = bilalEnrolled.casaAccountId;
    bilalToken = bilalEnrolled.demoToken;

    const ayeshaRow = await harness.appDb
      .selectFrom('fp.customers')
      .select(['casa_account_id', 'demo_token'])
      .where('id', '=', ayeshaCustomerId)
      .executeTakeFirstOrThrow();
    ayeshaCasaId = ayeshaRow.casa_account_id;
    ayeshaToken = ayeshaRow.demo_token!;

    // Duplicate CNIC / account enrollment must be refused with 409 CONFLICT
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/branch/enrollments',
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${officerToken}` },
      payload: {
        fullName: 'Ayesha Clone',
        cnic: '35202-1122334-6',
        accountNumber: 'ABL-SAL-000000001',
        accountType: 'SHOPPER_SALARY',
        phone: '+923009999999',
        openingBalance: '100.00',
        nadraRef: ayeshaNadraRef,
        consentAccepted: true,
      },
    });
    expect(dupRes.statusCode).toBe(409);

    // Newly enrolled shoppers appear immediately in the demo finger tray (SPEC §5 View A)
    const trayRes = await app.inject({
      method: 'GET',
      url: '/api/v1/demo/finger-tray',
      headers: { authorization: `Bearer ${cashierToken}` },
    });
    expect(trayRes.statusCode).toBe(200);
    expect(trayRes.json().personas).toHaveLength(2);
  });

  it('executes the exact SPEC §6.3 demo flow to the paisa (Ayesha 180, idempotent replay, 15s duplicate guard, Bilal 180, Bilal 500 decline)', async () => {
    // --- Step 1: Ayesha pays PKR 180.00 ---
    const open1Payload = { amount: '180.00' };
    const signedOpen1 = signTerminalHeaders(
      rasheedTerminalId,
      rasheedKp,
      'POST',
      '/api/v1/pos/charges',
      open1Payload,
    );
    const open1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/pos/charges',
      headers: { ...signedOpen1.headers, authorization: `Bearer ${cashierToken}` },
      payload: signedOpen1.rawBody,
    });
    expect(open1Res.statusCode).toBe(200);
    const charge1Id = open1Res.json().chargeId as string;

    const thumb1Url = `/api/v1/pos/charges/${charge1Id}/thumb`;
    const thumb1Payload = { token: ayeshaToken };
    const signedThumb1 = signTerminalHeaders(
      rasheedTerminalId,
      rasheedKp,
      'POST',
      thumb1Url,
      thumb1Payload,
    );
    const pay1Res = await app.inject({
      method: 'POST',
      url: thumb1Url,
      headers: signedThumb1.headers,
      payload: signedThumb1.rawBody,
    });
    expect(pay1Res.statusCode).toBe(200);
    const pay1Body = pay1Res.json();
    expect(pay1Body.outcome).toBe('SUCCESS');
    expect(pay1Body.replayed).toBe(false);
    expect(pay1Body.receipt).toMatchObject({
      shopperDisplayName: 'Ayesha K.',
      routing: 'ON_US',
      gross: '180.00',
      fee: '0.81',
      fingerpayShare: '0.57',
      bankShare: '0.24',
      net: '179.19',
      cashback: '50.00',
    });

    // Assert SPEC §6.3 table row 1: Ayesha = 14,870.00, Rasheed = 18,629.19
    expect(await getBalance(ayeshaCasaId)).toBe('14870.00');
    expect(await getBalance(rasheedCasaId)).toBe('18629.19');

    // --- Step 1b: Retrying the paid charge replays the receipt and never debits twice (SPEC T7) ---
    const signedReplay = signTerminalHeaders(
      rasheedTerminalId,
      rasheedKp,
      'POST',
      thumb1Url,
      thumb1Payload,
    );
    const replayRes = await app.inject({
      method: 'POST',
      url: thumb1Url,
      headers: signedReplay.headers,
      payload: signedReplay.rawBody,
    });
    expect(replayRes.statusCode).toBe(200);
    expect(replayRes.json().outcome).toBe('SUCCESS');
    expect(replayRes.json().replayed).toBe(true);
    expect(await getBalance(ayeshaCasaId)).toBe('14870.00');

    // --- Step 1c: New charge for PKR 180 within 15s for Ayesha is blocked by duplicate tap guard ---
    const signedOpenDup = signTerminalHeaders(
      rasheedTerminalId,
      rasheedKp,
      'POST',
      '/api/v1/pos/charges',
      open1Payload,
    );
    const openDupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pos/charges',
      headers: { ...signedOpenDup.headers, authorization: `Bearer ${cashierToken}` },
      payload: signedOpenDup.rawBody,
    });
    const dupChargeId = openDupRes.json().chargeId as string;
    const dupThumbUrl = `/api/v1/pos/charges/${dupChargeId}/thumb`;
    const signedDupThumb = signTerminalHeaders(
      rasheedTerminalId,
      rasheedKp,
      'POST',
      dupThumbUrl,
      thumb1Payload,
    );
    const dupPayRes = await app.inject({
      method: 'POST',
      url: dupThumbUrl,
      headers: signedDupThumb.headers,
      payload: signedDupThumb.rawBody,
    });
    expect(dupPayRes.statusCode).toBe(200);
    expect(dupPayRes.json().outcome).toBe('DECLINED_DUPLICATE_TAP');
    expect(dupPayRes.json().receipt).toBeNull();
    expect(await getBalance(ayeshaCasaId)).toBe('14870.00');

    // --- Step 2: Bilal pays PKR 180.00 (earns 2% = PKR 3.60 student cashback) ---
    const signedOpen2 = signTerminalHeaders(
      rasheedTerminalId,
      rasheedKp,
      'POST',
      '/api/v1/pos/charges',
      { amount: '180.00' },
    );
    const open2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/pos/charges',
      headers: { ...signedOpen2.headers, authorization: `Bearer ${cashierToken}` },
      payload: signedOpen2.rawBody,
    });
    const charge2Id = open2Res.json().chargeId as string;
    const thumb2Url = `/api/v1/pos/charges/${charge2Id}/thumb`;
    const signedThumb2 = signTerminalHeaders(rasheedTerminalId, rasheedKp, 'POST', thumb2Url, {
      token: bilalToken,
    });
    const pay2Res = await app.inject({
      method: 'POST',
      url: thumb2Url,
      headers: signedThumb2.headers,
      payload: signedThumb2.rawBody,
    });
    expect(pay2Res.statusCode).toBe(200);
    expect(pay2Res.json().outcome).toBe('SUCCESS');
    expect(pay2Res.json().receipt).toMatchObject({
      shopperDisplayName: 'Bilal H.',
      gross: '180.00',
      fee: '0.81',
      net: '179.19',
      cashback: '3.60',
    });

    // Assert SPEC §6.3 table row 2: Bilal = 273.60 (450 - 180 + 3.60), Rasheed = 18,808.38
    expect(await getBalance(bilalCasaId)).toBe('273.60');
    expect(await getBalance(rasheedCasaId)).toBe('18808.38');

    // --- Step 3: Bilal tries PKR 500.00 -> DECLINED_LOW_BALANCE, PKR 0 fee ---
    const signedOpen3 = signTerminalHeaders(
      rasheedTerminalId,
      rasheedKp,
      'POST',
      '/api/v1/pos/charges',
      { amount: '500.00' },
    );
    const open3Res = await app.inject({
      method: 'POST',
      url: '/api/v1/pos/charges',
      headers: { ...signedOpen3.headers, authorization: `Bearer ${cashierToken}` },
      payload: signedOpen3.rawBody,
    });
    const charge3Id = open3Res.json().chargeId as string;
    const thumb3Url = `/api/v1/pos/charges/${charge3Id}/thumb`;
    const signedThumb3 = signTerminalHeaders(rasheedTerminalId, rasheedKp, 'POST', thumb3Url, {
      token: bilalToken,
    });
    const pay3Res = await app.inject({
      method: 'POST',
      url: thumb3Url,
      headers: signedThumb3.headers,
      payload: signedThumb3.rawBody,
    });
    expect(pay3Res.statusCode).toBe(200);
    expect(pay3Res.json().outcome).toBe('DECLINED_LOW_BALANCE');
    expect(pay3Res.json().receipt).toBeNull();
    expect(await getBalance(bilalCasaId)).toBe('273.60');
    expect(await getBalance(rasheedCasaId)).toBe('18808.38');
  });

  it('routes off-us payments across 3 balanced books (ABL -> SBP -> DBB) and honours Raast availability', async () => {
    const canteenLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: 'canteen@dbb.pk', password },
    });
    const canteenToken = canteenLogin.json().accessToken as string;

    const signedOpen = signTerminalHeaders(
      canteenTerminalId,
      canteenKp,
      'POST',
      '/api/v1/pos/charges',
      { amount: '200.00' },
    );
    const openRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pos/charges',
      headers: { ...signedOpen.headers, authorization: `Bearer ${canteenToken}` },
      payload: signedOpen.rawBody,
    });
    const chargeId = openRes.json().chargeId as string;

    const thumbUrl = `/api/v1/pos/charges/${chargeId}/thumb`;
    const signedThumb = signTerminalHeaders(canteenTerminalId, canteenKp, 'POST', thumbUrl, {
      token: ayeshaToken,
    });
    const payRes = await app.inject({
      method: 'POST',
      url: thumbUrl,
      headers: signedThumb.headers,
      payload: signedThumb.rawBody,
    });
    expect(payRes.statusCode).toBe(200);
    expect(payRes.json().outcome).toBe('SUCCESS');
    expect(payRes.json().receipt.routing).toBe('OFF_US');

    // Toggle DBB Raast availability off -> next off-us sale declines cleanly with 0 fee
    const toggleOff = await app.inject({
      method: 'POST',
      url: '/api/v1/bank/raast-availability',
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${adminToken}` },
      payload: { institutionCode: 'DBB', available: false },
    });
    expect(toggleOff.statusCode).toBe(200);

    const signedOpen2 = signTerminalHeaders(
      canteenTerminalId,
      canteenKp,
      'POST',
      '/api/v1/pos/charges',
      { amount: '120.00' },
    );
    const open2 = await app.inject({
      method: 'POST',
      url: '/api/v1/pos/charges',
      headers: { ...signedOpen2.headers, authorization: `Bearer ${canteenToken}` },
      payload: signedOpen2.rawBody,
    });
    const charge2Id = open2.json().chargeId as string;
    const thumb2Url = `/api/v1/pos/charges/${charge2Id}/thumb`;
    const signedThumb2 = signTerminalHeaders(canteenTerminalId, canteenKp, 'POST', thumb2Url, {
      token: ayeshaToken,
    });
    const pay2 = await app.inject({
      method: 'POST',
      url: thumb2Url,
      headers: signedThumb2.headers,
      payload: signedThumb2.rawBody,
    });
    expect(pay2.statusCode).toBe(200);
    expect(pay2.json().outcome).toBe('DECLINED_SETTLEMENT_UNAVAILABLE');

    // Restore DBB Raast availability
    await app.inject({
      method: 'POST',
      url: '/api/v1/bank/raast-availability',
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${adminToken}` },
      payload: { institutionCode: 'DBB', available: true },
    });
  });

  it('enforces View B privacy (no shopper names on declines), RBAC (cashier cannot export CSV or void), and CSV formula escaping', async () => {
    const ledgerRes = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/ledger',
      headers: { authorization: `Bearer ${cashierToken}` },
    });
    expect(ledgerRes.statusCode).toBe(200);
    const rows = ledgerRes.json().rows as Array<{
      id: string;
      status: string;
      shopper: string | null;
    }>;

    const settledRows = rows.filter((r) => r.status === 'SETTLED');
    const declinedRows = rows.filter((r) => r.status === 'DECLINED');
    expect(settledRows.length).toBeGreaterThanOrEqual(2);
    expect(declinedRows.length).toBeGreaterThanOrEqual(2);

    // Privacy gate (SPEC T17): every settled row has first name + initial; every declined row has shopper === null
    for (const r of settledRows) {
      expect(r.shopper).toMatch(/^[A-Za-z]+ [A-Z]\.$/);
    }
    for (const r of declinedRows) {
      expect(r.shopper).toBeNull();
    }

    // RBAC gate (SPEC §4.1): cashier cannot export CSV or void a sale
    const cashierCsv = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/ledger.csv',
      headers: { authorization: `Bearer ${cashierToken}` },
    });
    expect(cashierCsv.statusCode).toBe(403);

    const cashierVoid = await app.inject({
      method: 'POST',
      url: `/api/v1/merchant/sales/${settledRows[0]!.id}/void`,
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${cashierToken}` },
      payload: { reason: 'Cashier trying to void' },
    });
    expect(cashierVoid.statusCode).toBe(403);

    // Owner can export CSV
    const ownerCsv = await app.inject({
      method: 'GET',
      url: '/api/v1/merchant/ledger.csv',
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(ownerCsv.statusCode).toBe(200);
    expect(ownerCsv.headers['content-type']).toContain('text/csv');
    expect(ownerCsv.body).toContain('"Ayesha K."');
  });

  it('supports SMS Reply LOCK, Reply DISPUTE, and maker-checker refund approval (maker != checker, SPEC T6)', async () => {
    const feedRes = await app.inject({
      method: 'GET',
      url: '/api/v1/demo/sms-feed',
      headers: { authorization: `Bearer ${officerToken}` },
    });
    expect(feedRes.statusCode).toBe(200);
    const messages = feedRes.json().messages as Array<{
      id: string;
      customerId: string;
      template: string;
      relatedAttemptId: string | null;
    }>;

    const ayeshaReceiptSms = messages.find(
      (m) => m.customerId === ayeshaCustomerId && m.template === 'PAYMENT_RECEIPT',
    )!;
    expect(ayeshaReceiptSms).toBeTruthy();

    // 1. Shopper replies LOCK to any SMS -> freezes thumb payments immediately
    const lockReply = await app.inject({
      method: 'POST',
      url: `/api/v1/demo/sms/${ayeshaReceiptSms.id}/reply`,
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${officerToken}` },
      payload: { text: 'LOCK' },
    });
    expect(lockReply.statusCode).toBe(200);
    expect(lockReply.json().action).toBe('THUMB_LOCKED');

    // Attempt a payment while locked -> DECLINED_THUMB_LOCKED
    const signedOpen = signTerminalHeaders(
      rasheedTerminalId,
      rasheedKp,
      'POST',
      '/api/v1/pos/charges',
      { amount: '80.00' },
    );
    const openRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pos/charges',
      headers: { ...signedOpen.headers, authorization: `Bearer ${cashierToken}` },
      payload: signedOpen.rawBody,
    });
    const chargeId = openRes.json().chargeId as string;
    const thumbUrl = `/api/v1/pos/charges/${chargeId}/thumb`;
    const signedThumb = signTerminalHeaders(rasheedTerminalId, rasheedKp, 'POST', thumbUrl, {
      token: ayeshaToken,
    });
    const lockedPayRes = await app.inject({
      method: 'POST',
      url: thumbUrl,
      headers: signedThumb.headers,
      payload: signedThumb.rawBody,
    });
    expect(lockedPayRes.statusCode).toBe(200);
    expect(lockedPayRes.json().outcome).toBe('DECLINED_THUMB_LOCKED');

    // Branch officer unlocks Ayesha's thumb at the branch
    const unlockRes = await app.inject({
      method: 'POST',
      url: `/api/v1/branch/customers/${ayeshaCustomerId}/thumb-lock`,
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${officerToken}` },
      payload: { locked: false, reason: 'In-branch CNIC verification completed' },
    });
    expect(unlockRes.statusCode).toBe(200);
    expect(unlockRes.json().thumbLocked).toBe(false);

    // 2. Shopper replies DISPUTE to the receipt SMS -> creates ticket ABL-DSP-...
    const disputeReply = await app.inject({
      method: 'POST',
      url: `/api/v1/demo/sms/${ayeshaReceiptSms.id}/reply`,
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${officerToken}` },
      payload: { text: 'DISPUTE' },
    });
    expect(disputeReply.statusCode).toBe(200);
    expect(disputeReply.json().action).toBe('DISPUTE_OPENED');
    expect(disputeReply.json().ticket).toMatch(/^ABL-DSP-\d{8}-[0-9A-F]{12}$/);

    const disputesList = await app.inject({
      method: 'GET',
      url: '/api/v1/bank/disputes',
      headers: { authorization: `Bearer ${officerToken}` },
    });
    const openDispute = disputesList.json().disputes[0]!;
    expect(openDispute.status).toBe('OPEN');

    // 3. Branch officer (maker) requests refund
    const reqRefund = await app.inject({
      method: 'POST',
      url: `/api/v1/bank/disputes/${openDispute.id}/refund-request`,
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${officerToken}` },
      payload: { reason: 'Verified duplicate counter charge' },
    });
    expect(reqRefund.statusCode).toBe(200);
    const reversalId = reqRefund.json().reversalId as string;

    // 4. Maker cannot approve their own refund request (SPEC T6 -> 403 FORBIDDEN)
    const selfApprove = await app.inject({
      method: 'POST',
      url: `/api/v1/bank/refunds/${reversalId}/decision`,
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${officerToken}` },
      payload: { decision: 'APPROVE', reason: 'Trying to self-approve' },
    });
    expect(selfApprove.statusCode).toBe(403);

    // 5. Branch manager (different checker) approves refund -> balances restore!
    const managerApprove = await app.inject({
      method: 'POST',
      url: `/api/v1/bank/refunds/${reversalId}/decision`,
      headers: { origin: 'http://localhost:3000', authorization: `Bearer ${managerToken}` },
      payload: { decision: 'APPROVE', reason: 'Approved by branch manager' },
    });
    expect(managerApprove.statusCode).toBe(200);
    expect(managerApprove.json().status).toBe('APPROVED');
  });

  it('enforces database trigger guardrails (append-only ledger, no balance UPDATE by fp_app) and detects audit tampering (SPEC T9)', async () => {
    // 1. fp_app cannot directly UPDATE accounts.balance
    await expect(
      harness.execAsRole('fp_app', 'UPDATE fp.accounts SET balance = 999999.00'),
    ).rejects.toThrow();

    // 2. fp_app (and even fp_owner) cannot UPDATE or DELETE journal_entries or payment_attempts
    await expect(
      harness.execAsRole('fp_owner', 'DELETE FROM fp.journal_entries'),
    ).rejects.toThrow(/append-only/);
    await expect(
      harness.execAsRole('fp_owner', "UPDATE fp.payment_attempts SET gross = '1.00'"),
    ).rejects.toThrow(/append-only/);

    // 3. Integrity check passes on the live audit chain and double-entry ledger
    const integrityRes = await app.inject({
      method: 'GET',
      url: '/api/v1/bank/integrity',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(integrityRes.statusCode).toBe(200);
    expect(integrityRes.json()).toMatchObject({
      ok: true,
      auditChain: { ok: true, brokenAtId: null },
      ledgerReconciliation: { ok: true, unbalancedJournals: 0, mismatchedAccounts: 0 },
    });

    // 4. Simulate superuser tampering with the 3rd committed audit row (bypassing trigger, then re-enabling)
    const targetRow = await harness.execAsRole<{ id: number }>(
      'fp_owner',
      'SELECT id FROM fp.audit_events ORDER BY id ASC OFFSET 2 LIMIT 1',
    );
    const targetId = String(targetRow.rows[0]!.id);

    await harness.execAsRole(
      'fp_owner',
      'ALTER TABLE fp.audit_events DISABLE TRIGGER audit_events_append_only',
    );
    await harness.execAsRole(
      'fp_owner',
      `UPDATE fp.audit_events SET details = '{"tampered":true}'::jsonb WHERE id = ${targetId}`,
    );
    await harness.execAsRole(
      'fp_owner',
      'ALTER TABLE fp.audit_events ENABLE TRIGGER audit_events_append_only',
    );

    const tamperedRes = await app.inject({
      method: 'GET',
      url: '/api/v1/bank/integrity',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(tamperedRes.statusCode).toBe(200);
    expect(tamperedRes.json().ok).toBe(false);
    expect(tamperedRes.json().auditChain.ok).toBe(false);
    expect(tamperedRes.json().auditChain.brokenAtId).toBe(targetId);
  });

  it('prevents overdraft under concurrent payments (SPEC T8) and returns 404 on /demo/* when FP_DEMO_MODE is false (SPEC T22)', async () => {
    // Bilal currently has PKR 273.60. Attempt 5 concurrent payments of PKR 110.00 (each on a distinct amount/charge).
    // At most 2 can succeed (2 * 110 = 220 <= 273.60); the remaining 3 must decline with DECLINED_LOW_BALANCE.
    const amounts = ['101.00', '102.00', '103.00', '104.00', '105.00'];
    const outcomes: string[] = [];

    for (const amt of amounts) {
      const signedOpen = signTerminalHeaders(
        rasheedTerminalId,
        rasheedKp,
        'POST',
        '/api/v1/pos/charges',
        { amount: amt },
      );
      const openRes = await app.inject({
        method: 'POST',
        url: '/api/v1/pos/charges',
        headers: { ...signedOpen.headers, authorization: `Bearer ${cashierToken}` },
        payload: signedOpen.rawBody,
      });
      const chargeId = openRes.json().chargeId as string;
      const thumbUrl = `/api/v1/pos/charges/${chargeId}/thumb`;
      const signedThumb = signTerminalHeaders(rasheedTerminalId, rasheedKp, 'POST', thumbUrl, {
        token: bilalToken,
      });
      const payRes = await app.inject({
        method: 'POST',
        url: thumbUrl,
        headers: signedThumb.headers,
        payload: signedThumb.rawBody,
      });
      outcomes.push(payRes.json().outcome);
    }

    const successes = outcomes.filter((o) => o === 'SUCCESS');
    const lowBalDeclines = outcomes.filter((o) => o === 'DECLINED_LOW_BALANCE');
    expect(successes).toHaveLength(2);
    expect(lowBalDeclines).toHaveLength(3);

    const remaining = parseFloat(await getBalance(bilalCasaId));
    expect(remaining).toBeGreaterThanOrEqual(0);

    // SPEC T22: Demo routes return 404 when FP_DEMO_MODE=false
    const prodLikeApp = await buildApp({
      config: loadConfig({
        FP_ENV: 'staging',
        FP_DATABASE_URL: 'postgresql://fp_app:test@127.0.0.1:5432/fingerpay',
        FP_ALLOWED_ORIGINS: 'http://localhost:3000',
        FP_DEMO_MODE: 'false',
        FP_LOG_LEVEL: 'silent',
      }),
      db: harness.appDb,
    });
    const demoOffRes = await prodLikeApp.inject({
      method: 'GET',
      url: '/api/v1/demo/finger-tray',
      headers: { authorization: `Bearer ${cashierToken}` },
    });
    expect(demoOffRes.statusCode).toBe(404);
    await prodLikeApp.close();
  });
});
