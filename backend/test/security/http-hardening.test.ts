import type { Kysely } from 'kysely';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/platform/config.js';
import type { Database } from '../../src/platform/db/types.gen.js';
import { createLogger } from '../../src/platform/log/logger.js';

const testConfig = loadConfig({
  FP_ENV: 'test',
  FP_PORT: '4000',
  FP_DATABASE_URL: 'postgresql://fp_app:test@127.0.0.1:5432/fingerpay',
  FP_ALLOWED_ORIGINS: 'http://localhost:3000',
  FP_DEMO_MODE: 'false',
  FP_LOG_LEVEL: 'silent',
});

const stubDb = {} as unknown as Kysely<Database>;

describe('HTTP security hardening (SPEC §4.6, T15, T21)', () => {
  it('sets mandatory security headers and omits deprecated X-XSS-Protection', async () => {
    const app = await buildApp({
      config: testConfig,
      db: stubDb,
      logger: createLogger({ level: 'silent' }),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: { 'x-correlation-id': 'test-corr-12345678' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    );
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-xss-protection']).toBeUndefined();
    expect(res.headers['x-correlation-id']).toBe('test-corr-12345678');

    await app.close();
  });

  it('rejects state-changing requests from an untrusted Origin with 403', async () => {
    const app = await buildApp({
      config: testConfig,
      db: stubDb,
      logger: createLogger({ level: 'silent' }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/unknown',
      headers: {
        origin: 'https://evil.example.com',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ hello: 'world' }),
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      error: {
        code: 'ORIGIN_FORBIDDEN',
      },
    });

    await app.close();
  });

  it('rejects bodies larger than 16 KB with 413 PAYLOAD_TOO_LARGE (SPEC T21)', async () => {
    const app = await buildApp({
      config: testConfig,
      db: stubDb,
      logger: createLogger({ level: 'silent' }),
    });

    app.post('/api/v1/echo', async (req) => req.body);

    const oversized = JSON.stringify({ data: 'x'.repeat(17 * 1024) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/echo',
      headers: {
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
      },
      payload: oversized,
    });

    expect(res.statusCode).toBe(413);
    expect(res.json()).toMatchObject({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
      },
    });

    await app.close();
  });

  it('never leaks SQL text or internal exception messages on 500 errors (SPEC §4.6)', async () => {
    const app = await buildApp({
      config: testConfig,
      db: stubDb,
      logger: createLogger({ level: 'silent' }),
    });

    app.get('/api/v1/boom', async () => {
      throw new Error('SELECT cnic_enc FROM fp.customers WHERE id = $1 -- syntax error near $1');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/boom',
    });

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        correlationId: expect.any(String),
      },
    });
    expect(JSON.stringify(body)).not.toContain('SELECT');
    expect(JSON.stringify(body)).not.toContain('cnic_enc');

    await app.close();
  });
});
