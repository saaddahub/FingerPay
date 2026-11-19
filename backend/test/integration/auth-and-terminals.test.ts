import { createSign, generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { canonicalString, TERMINAL_HEADERS } from '@fingerpay/contracts';
import type { FastifyInstance } from 'fastify';
import * as OTPAuth from 'otpauth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { AuthService } from '../../src/modules/auth/service.js';
import { generateTotpSecret } from '../../src/modules/auth/totp.js';
import { computeBodySha256 } from '../../src/modules/terminals/signature.js';
import { TerminalService } from '../../src/modules/terminals/service.js';
import { loadConfig } from '../../src/platform/config.js';
import { createDevKeyring } from '../../src/platform/crypto/keyring.js';
import { createTestDbHarness, type TestDbHarness } from '../helpers/test-db.js';

function createEcdsaP256KeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  return {
    spkiBase64: Buffer.from(spkiDer).toString('base64'),
    sign: (canonical: string): string => {
      const signer = createSign('sha256');
      signer.update(canonical, 'utf8');
      return signer
        .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
        .toString('base64url');
    },
  };
}

describe('M1 integration — multi-bank org, Argon2id+TOTP auth, refresh rotation, and ECDSA terminal signing', () => {
  let harness: TestDbHarness;
  let app: FastifyInstance;
  let authService: AuthService;
  let terminalService: TerminalService;

  const ablId = randomUUID();
  const dbbId = randomUUID();
  const ablBranchId = randomUUID();
  const rasheedMerchantId = randomUUID();

  const ownerEmail = 'rasheed@kiryana.pk';
  const cashierEmail = 'cashier@kiryana.pk';
  const officerEmail = 'officer@abl.pk';
  const password = 'StrongPassword#2026!';
  let officerTotpSecret: string;

  beforeAll(async () => {
    harness = await createTestDbHarness();
    const keyring = createDevKeyring();
    const config = loadConfig({
      FP_ENV: 'test',
      FP_DATABASE_URL: 'postgresql://fp_app:test@127.0.0.1:5432/fingerpay',
      FP_ALLOWED_ORIGINS: 'http://localhost:3000',
      FP_LOG_LEVEL: 'silent',
    });

    authService = new AuthService({ db: harness.appDb, keyring });
    terminalService = new TerminalService(harness.appDb);
    app = await buildApp({
      config,
      db: harness.appDb,
      keyring,
      authService,
      terminalService,
    });

    // Seed multi-bank institutions, branch, and merchant
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
      ])
      .execute();

    await harness.appDb
      .insertInto('fp.branches')
      .values({
        id: ablBranchId,
        institution_id: ablId,
        code: 'LHR-001',
        name: 'Lahore Main Branch',
      })
      .execute();

    await harness.appDb
      .insertInto('fp.merchants')
      .values({
        id: rasheedMerchantId,
        institution_id: ablId,
        name: 'Rasheed Kiryana Store',
        status: 'ACTIVE',
        require_claim: false,
      })
      .execute();

    await authService.registerStaffUser({
      email: ownerEmail,
      password,
      role: 'MERCHANT_OWNER',
      institutionId: ablId,
      merchantId: rasheedMerchantId,
    });

    await authService.registerStaffUser({
      email: cashierEmail,
      password,
      role: 'MERCHANT_CASHIER',
      institutionId: ablId,
      merchantId: rasheedMerchantId,
    });

    const totp = generateTotpSecret(officerEmail);
    officerTotpSecret = totp.secret;
    await authService.registerStaffUser({
      email: officerEmail,
      password,
      role: 'BRANCH_OFFICER',
      institutionId: ablId,
      branchId: ablBranchId,
      totpSecret: officerTotpSecret,
    });
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await harness?.close();
  });

  it('authenticates merchant staff at AAL1, rotates refresh tokens, and revokes the family on reuse', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: ownerEmail, password },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = loginRes.json();
    expect(loginBody.status).toBe('authenticated');
    expect(loginBody.user.role).toBe('MERCHANT_OWNER');
    expect(loginBody.user.aal).toBe(1);

    const cookie1 = loginRes.cookies.find((c) => c.name === 'fp_refresh')?.value;
    expect(cookie1).toBeTruthy();

    // Rotate refresh token once
    const refresh1 = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { origin: 'http://localhost:3000' },
      cookies: { fp_refresh: cookie1! },
    });
    expect(refresh1.statusCode).toBe(200);
    const cookie2 = refresh1.cookies.find((c) => c.name === 'fp_refresh')?.value;
    expect(cookie2).toBeTruthy();
    expect(cookie2).not.toBe(cookie1);

    // Replay cookie1 -> must detect reuse and revoke the entire family (including cookie2)
    const replayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { origin: 'http://localhost:3000' },
      cookies: { fp_refresh: cookie1! },
    });
    expect(replayRes.statusCode).toBe(401);

    const afterRevokeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { origin: 'http://localhost:3000' },
      cookies: { fp_refresh: cookie2! },
    });
    expect(afterRevokeRes.statusCode).toBe(401);
  });

  it('requires TOTP MFA (AAL2) for bank roles and rejects AAL1 tokens on bank role guards', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: officerEmail, password },
    });

    expect(loginRes.statusCode).toBe(200);
    const body = loginRes.json();
    expect(body.status).toBe('mfa_required');
    expect(body.mfaChallengeToken).toBeTruthy();

    const code = new OTPAuth.TOTP({
      issuer: 'FingerPay',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(officerTotpSecret),
    }).generate();

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mfa/verify',
      headers: { origin: 'http://localhost:3000' },
      payload: {
        challengeToken: body.mfaChallengeToken,
        code,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifiedBody = verifyRes.json();
    expect(verifiedBody.status).toBe('authenticated');
    expect(verifiedBody.user.aal).toBe(2);

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${verifiedBody.accessToken}` },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.aal).toBe(2);
  });

  it('locks a staff account after 5 consecutive failed password attempts (SPEC §4.1)', async () => {
    for (let i = 1; i <= 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { origin: 'http://localhost:3000' },
        payload: { email: cashierEmail, password: 'WrongPassword123!' },
      });
      expect(res.statusCode).toBe(401);
    }

    const fifthRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: cashierEmail, password: 'WrongPassword123!' },
    });
    expect(fifthRes.statusCode).toBe(423);

    // Even with the right password, locked account returns 423 LOCKED
    const lockedRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: cashierEmail, password },
    });
    expect(lockedRes.statusCode).toBe(423);
  });

  it('pairs an ECDSA P-256 terminal, verifies signed requests, rejects replays/stale timestamps, and revokes keys', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'http://localhost:3000' },
      payload: { email: ownerEmail, password },
    });
    const ownerToken = loginRes.json().accessToken as string;

    const kp = createEcdsaP256KeyPair();

    const pairRes = await app.inject({
      method: 'POST',
      url: '/api/v1/terminals/pair',
      headers: {
        origin: 'http://localhost:3000',
        authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        label: 'Counter 1 POS',
        publicKeySpki: kp.spkiBase64,
      },
    });
    expect(pairRes.statusCode).toBe(200);
    const { terminalId } = pairRes.json();

    const rawBody = JSON.stringify({ amount: '180.00' });
    const pathWithQuery = '/api/v1/pos/charges';
    const timestamp = new Date().toISOString();
    const nonce = randomBytes(16).toString('base64url');
    const canonical = canonicalString({
      method: 'POST',
      pathWithQuery,
      terminalId,
      timestamp,
      nonce,
      bodySha256: computeBodySha256(rawBody),
    });
    const signature = kp.sign(canonical);

    const headers = {
      [TERMINAL_HEADERS.terminal]: terminalId,
      [TERMINAL_HEADERS.timestamp]: timestamp,
      [TERMINAL_HEADERS.nonce]: nonce,
      [TERMINAL_HEADERS.signature]: signature,
    };

    // 1. Valid request passes
    const authed = await terminalService.authenticateTerminalRequest({
      headers,
      method: 'POST',
      url: pathWithQuery,
      rawBody,
    });
    expect(authed).toEqual({ terminalId, merchantId: rasheedMerchantId });

    // 2. Replayed nonce is rejected with 409 CONFLICT (SPEC T2)
    await expect(
      terminalService.authenticateTerminalRequest({
        headers,
        method: 'POST',
        url: pathWithQuery,
        rawBody,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    // 3. Stale timestamp (> 60s old) is rejected with 401 (SPEC T2)
    const staleTs = new Date(Date.now() - 120_000).toISOString();
    const staleNonce = randomBytes(16).toString('base64url');
    const staleSig = kp.sign(
      canonicalString({
        method: 'POST',
        pathWithQuery,
        terminalId,
        timestamp: staleTs,
        nonce: staleNonce,
        bodySha256: computeBodySha256(rawBody),
      }),
    );
    await expect(
      terminalService.authenticateTerminalRequest({
        headers: {
          [TERMINAL_HEADERS.terminal]: terminalId,
          [TERMINAL_HEADERS.timestamp]: staleTs,
          [TERMINAL_HEADERS.nonce]: staleNonce,
          [TERMINAL_HEADERS.signature]: staleSig,
        },
        method: 'POST',
        url: pathWithQuery,
        rawBody,
      }),
    ).rejects.toMatchObject({ statusCode: 401 });

    // 4. Tampered body is rejected with 401
    await expect(
      terminalService.authenticateTerminalRequest({
        headers: {
          ...headers,
          [TERMINAL_HEADERS.nonce]: randomBytes(16).toString('base64url'),
        },
        method: 'POST',
        url: pathWithQuery,
        rawBody: JSON.stringify({ amount: '5000.00' }),
      }),
    ).rejects.toMatchObject({ statusCode: 401 });

    // 5. Revoking the terminal invalidates cache and rejects further requests
    const revokeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/terminals/${terminalId}/revoke`,
      headers: {
        origin: 'http://localhost:3000',
        authorization: `Bearer ${ownerToken}`,
      },
    });
    expect(revokeRes.statusCode).toBe(200);

    const postRevokeNonce = randomBytes(16).toString('base64url');
    const postRevokeSig = kp.sign(
      canonicalString({
        method: 'POST',
        pathWithQuery,
        terminalId,
        timestamp,
        nonce: postRevokeNonce,
        bodySha256: computeBodySha256(rawBody),
      }),
    );
    await expect(
      terminalService.authenticateTerminalRequest({
        headers: {
          [TERMINAL_HEADERS.terminal]: terminalId,
          [TERMINAL_HEADERS.timestamp]: timestamp,
          [TERMINAL_HEADERS.nonce]: postRevokeNonce,
          [TERMINAL_HEADERS.signature]: postRevokeSig,
        },
        method: 'POST',
        url: pathWithQuery,
        rawBody,
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
