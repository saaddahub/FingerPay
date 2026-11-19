import { hkdfSync } from 'node:crypto';

/**
 * Derives a purpose-specific 32-byte subkey using HKDF-SHA256 (RFC 5869)
 * so a single root secret is never reused directly for multiple purposes.
 */
export function deriveSubkey(rootKey: Buffer, info: string, salt: Buffer = Buffer.alloc(0)): Buffer {
  const derived = hkdfSync('sha256', rootKey, salt, Buffer.from(info, 'utf8'), 32);
  return Buffer.from(derived);
}
