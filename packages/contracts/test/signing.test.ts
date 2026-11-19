import { describe, expect, it } from 'vitest';
import { BANNERS_EN, OUTCOME_CODES, canonicalString } from '../src';

describe('terminal request signing canonical string (SPEC §4.5)', () => {
  it('joins version, uppercase method, path+query, terminal, timestamp, nonce and body hash with LF', () => {
    const out = canonicalString({
      method: 'post',
      pathWithQuery: '/api/v1/pos/charges/01933c8a/thumb?mode=1',
      terminalId: '01933c89-0000-7000-8000-000000000001',
      timestamp: '2026-11-18T18:00:00.123Z',
      nonce: 'YWJjZGVmZ2hpamtsbW5vcA',
      bodySha256: '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU',
    });

    expect(out).toBe(
      [
        'FPv1',
        'POST',
        '/api/v1/pos/charges/01933c8a/thumb?mode=1',
        '01933c89-0000-7000-8000-000000000001',
        '2026-11-18T18:00:00.123Z',
        'YWJjZGVmZ2hpamtsbW5vcA',
        '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU',
      ].join('\n'),
    );
  });
});

describe('outcome banners (SPEC §5 View A)', () => {
  it('covers every outcome code plus OFFLINE', () => {
    for (const code of OUTCOME_CODES) {
      expect(BANNERS_EN[code]({ amount: '180.00' })).toMatch(/\S+/);
    }
    expect(BANNERS_EN.SUCCESS({ amount: '180' })).toBe('PAYMENT SUCCESSFUL — PKR 180 RECEIVED');
    expect(BANNERS_EN.OFFLINE({})).toBe(
      'INTERNET DOWN — TAKE CASH IMMEDIATELY (SALE NOT CHARGED)',
    );
  });
});
