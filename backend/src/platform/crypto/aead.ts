import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Keyring } from './keyring.js';

const MAGIC_BYTE = 0x01;
const NONCE_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = 1 + 2 + NONCE_LEN; // 15 bytes
const MIN_BLOB_LEN = HEADER_LEN + TAG_LEN; // 31 bytes (empty plaintext)

export interface EncryptOptions {
  table: string;
  column: string;
  rowId: string;
}

export function buildAad(opts: EncryptOptions): Buffer {
  return Buffer.from(`fp:v1:${opts.table}:${opts.column}:${opts.rowId}`, 'utf8');
}

/**
 * Encrypts a plaintext string with AES-256-GCM using the active key from the keyring.
 * Returns a Buffer adhering to SPEC §4.3:
 * `0x01 || version (2B BE) || nonce (12B) || ciphertext || tag (16B)`
 */
export function encryptField(plaintext: string, keyring: Keyring, opts: EncryptOptions): Buffer {
  const version = keyring.activeVersion;
  const key = keyring.keys.get(version);
  if (!key) {
    throw new Error(`Key version ${version} not available in keyring`);
  }

  const nonce = randomBytes(NONCE_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const aad = buildAad(opts);
  cipher.setAAD(aad);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const out = Buffer.alloc(1 + 2 + NONCE_LEN + ciphertext.length + TAG_LEN);
  out.writeUInt8(MAGIC_BYTE, 0);
  out.writeUInt16BE(version, 1);
  nonce.copy(out, 3);
  ciphertext.copy(out, HEADER_LEN);
  tag.copy(out, HEADER_LEN + ciphertext.length);

  return out;
}

/**
 * Decrypts an AES-256-GCM blob. Verifies the AAD and authentication tag.
 */
export function decryptField(
  rawBlob: Buffer | Uint8Array,
  keyring: Keyring,
  opts: EncryptOptions,
): string {
  const blob = Buffer.isBuffer(rawBlob) ? rawBlob : Buffer.from(rawBlob);
  if (blob.length < MIN_BLOB_LEN) {
    throw new Error(`Encrypted blob too short (${blob.length} bytes)`);
  }

  const magic = blob.readUInt8(0);
  if (magic !== MAGIC_BYTE) {
    throw new Error(`Invalid encryption format magic byte: 0x${magic.toString(16)}`);
  }

  const version = blob.readUInt16BE(1);
  const key = keyring.keys.get(version);
  if (!key) {
    throw new Error(`Key version ${version} not found in keyring`);
  }

  const nonce = blob.subarray(3, HEADER_LEN);
  const ciphertext = blob.subarray(HEADER_LEN, blob.length - TAG_LEN);
  const tag = blob.subarray(blob.length - TAG_LEN);

  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  const aad = buildAad(opts);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error('Decryption failed: integrity check or AAD mismatch', { cause: err });
  }
}
