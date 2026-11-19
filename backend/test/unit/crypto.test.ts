import { describe, expect, it } from 'vitest';
import { decryptField, encryptField } from '../../src/platform/crypto/aead.js';
import {
  computeBlindIndex,
  normalizeAccountNo,
  normalizeCnic,
  normalizePhone,
} from '../../src/platform/crypto/blind-index.js';
import { deriveSubkey } from '../../src/platform/crypto/hkdf.js';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signStaffAccessToken,
  verifyStaffAccessToken,
} from '../../src/platform/crypto/jwt.js';
import { createDevKeyring } from '../../src/platform/crypto/keyring.js';

describe('platform/crypto AEAD (AES-256-GCM with AAD)', () => {
  it('encrypts and decrypts with the active key and verified AAD', () => {
    const keyring = createDevKeyring();
    const opts = { table: 'customers', column: 'cnic_enc', rowId: 'row-12345' };
    const plaintext = '35202-1122334-6';

    const encrypted = encryptField(plaintext, keyring, opts);
    expect(encrypted.length).toBeGreaterThan(plaintext.length);
    expect(encrypted.readUInt8(0)).toBe(0x01); // Magic byte

    const decrypted = decryptField(encrypted, keyring, opts);
    expect(decrypted).toBe(plaintext);
  });

  it('fails decryption if AAD differs (copying encrypted blob to another row/column)', () => {
    const keyring = createDevKeyring();
    const optsA = { table: 'customers', column: 'cnic_enc', rowId: 'row-ayesha' };
    const optsB = { table: 'customers', column: 'cnic_enc', rowId: 'row-bilal' };

    const encrypted = encryptField('35202-1122334-6', keyring, optsA);

    expect(() => decryptField(encrypted, keyring, optsB)).toThrow(/Decryption failed/);
  });

  it('fails decryption if ciphertext or tag is tampered', () => {
    const keyring = createDevKeyring();
    const opts = { table: 'customers', column: 'cnic_enc', rowId: 'row-123' };
    const encrypted = encryptField('35202-1122334-6', keyring, opts);

    // Tamper with last byte
    encrypted[encrypted.length - 1]! ^= 0xff;

    expect(() => decryptField(encrypted, keyring, opts)).toThrow(/Decryption failed/);
  });
});

describe('platform/crypto blind indexing & normalization', () => {
  const rootKey = Buffer.alloc(32, 0x42);
  const cnicSubkey = deriveSubkey(rootKey, 'fp:v1:cnic');
  const phoneSubkey = deriveSubkey(rootKey, 'fp:v1:phone');

  it('normalizes Pakistani CNIC formats identically', () => {
    expect(normalizeCnic('35202-1122334-6')).toBe('3520211223346');
    expect(normalizeCnic(' 3520211223346 ')).toBe('3520211223346');
    expect(() => normalizeCnic('12345')).toThrow(/13 digits/);

    const idx1 = computeBlindIndex(normalizeCnic('35202-1122334-6'), cnicSubkey);
    const idx2 = computeBlindIndex(normalizeCnic('3520211223346'), cnicSubkey);
    expect(idx1).toEqual(idx2);
    expect(idx1.length).toBe(32);
  });

  it('normalizes accounts and phones', () => {
    expect(normalizeAccountNo(' abl-sal-998877665 ')).toBe('ABL-SAL-998877665');
    expect(normalizePhone('+92 300 1234567')).toBe('+923001234567');
  });

  it('HKDF produces distinct subkeys for different info tags', () => {
    expect(cnicSubkey).not.toEqual(phoneSubkey);
  });
});

describe('platform/crypto JWT & Refresh Tokens (EdDSA)', () => {
  it('signs and verifies EdDSA access tokens with claims', async () => {
    const token = await signStaffAccessToken({
      sub: 'usr-123',
      role: 'BRANCH_OFFICER',
      inst: 'inst-abl',
      aal: 2,
      sid: 'sid-abc',
    });

    const verified = await verifyStaffAccessToken(token);
    expect(verified.sub).toBe('usr-123');
    expect(verified.role).toBe('BRANCH_OFFICER');
    expect(verified.inst).toBe('inst-abl');
    expect(verified.aal).toBe(2);
  });

  it('generates high-entropy refresh tokens and deterministic SHA-256 hashes', () => {
    const token = generateOpaqueRefreshToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    const hash1 = hashRefreshToken(token);
    const hash2 = hashRefreshToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
