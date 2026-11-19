import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/platform/config.js';
import { paisaToPgNumeric, pgNumericToPaisa } from '../../src/platform/db/money-codec.js';
import { createLogger } from '../../src/platform/log/logger.js';
import { REDACT_CENSOR } from '../../src/platform/log/redact.js';

const validBaseEnv = {
  FP_ENV: 'development',
  FP_PORT: '4000',
  FP_DATABASE_URL: 'postgresql://fp_app:secret@127.0.0.1:5432/fingerpay',
  FP_ALLOWED_ORIGINS: 'http://localhost:3000',
  FP_DEMO_MODE: 'true',
};

describe('loadConfig (fail-closed, SPEC §4.6 & T22)', () => {
  it('accepts a valid development configuration', () => {
    const cfg = loadConfig(validBaseEnv);
    expect(cfg.FP_ENV).toBe('development');
    expect(cfg.FP_DEMO_MODE).toBe(true);
    expect(cfg.FP_ALLOWED_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('fails closed when FP_DATABASE_URL is missing', () => {
    const { FP_DATABASE_URL: _dropped, ...rest } = validBaseEnv;
    expect(() => loadConfig(rest)).toThrow(/FP_DATABASE_URL/);
  });

  it('refuses FP_DEMO_MODE=true when FP_ENV=production (SPEC T22)', () => {
    expect(() =>
      loadConfig({
        ...validBaseEnv,
        FP_ENV: 'production',
        FP_DEMO_MODE: 'true',
      }),
    ).toThrow(/FP_DEMO_MODE cannot be enabled when FP_ENV=production/);
  });

  it('allows FP_ENV=production when FP_DEMO_MODE=false', () => {
    const cfg = loadConfig({
      ...validBaseEnv,
      FP_ENV: 'production',
      FP_DEMO_MODE: 'false',
    });
    expect(cfg.FP_ENV).toBe('production');
    expect(cfg.FP_DEMO_MODE).toBe(false);
  });
});

describe('structured logger redaction (SPEC §3 T18 & §4.6)', () => {
  it('redacts PII, credentials, tokens and signatures at top and nested levels', () => {
    const chunks: string[] = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk.toString('utf8'));
        cb();
      },
    });

    const logger = createLogger({ level: 'info', destination: sink });
    logger.info(
      {
        cnic: '35202-1122334-6',
        phone: '+923001234567',
        token: 'raw-capture-token',
        thumb: 'raw-thumb-hex',
        account: 'ABL-SAL-998877665',
        password: 'super-secret-password',
        nested: {
          cnic: '35202-7788990-1',
          totpSecret: 'JBSWY3DPEHPK3PXP',
        },
        req: {
          headers: {
            authorization: 'Bearer eyJhbGciOiJFZERTQSI...',
            cookie: 'fp_refresh=abcdef',
            'x-fp-signature': 'base64url-ecdsa-sig',
          },
        },
      },
      'enrollment check',
    );

    const output = chunks.join('');
    expect(output).not.toContain('35202-1122334-6');
    expect(output).not.toContain('35202-7788990-1');
    expect(output).not.toContain('+923001234567');
    expect(output).not.toContain('raw-capture-token');
    expect(output).not.toContain('raw-thumb-hex');
    expect(output).not.toContain('ABL-SAL-998877665');
    expect(output).not.toContain('super-secret-password');
    expect(output).not.toContain('JBSWY3DPEHPK3PXP');
    expect(output).not.toContain('eyJhbGciOiJFZERTQSI');
    expect(output).not.toContain('fp_refresh=abcdef');
    expect(output).not.toContain('base64url-ecdsa-sig');

    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed.cnic).toBe(REDACT_CENSOR);
    expect(parsed.phone).toBe(REDACT_CENSOR);
  });
});

describe('Postgres numeric <-> Paisa codec', () => {
  it('converts signed and unsigned Postgres numeric strings without float drift', () => {
    expect(pgNumericToPaisa('180.00')).toBe(18_000n);
    expect(pgNumericToPaisa('-179.19')).toBe(-17_919n);
    expect(paisaToPgNumeric(pgNumericToPaisa('-179.19'))).toBe('-179.19');
  });
});
