import { createHmac } from 'node:crypto';

/**
 * Normalizes a 13-digit Pakistani CNIC by stripping dashes and whitespace: "35202-1122334-6" -> "3520211223346".
 */
export function normalizeCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 13) {
    throw new RangeError(`CNIC must contain exactly 13 digits, got ${digits.length}`);
  }
  return digits;
}

/**
 * Normalizes an Allied Bank or CASA account number: trimmed, uppercase, no whitespace.
 */
export function normalizeAccountNo(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * Normalizes an E.164 phone number: strips whitespace and dashes: "+92 300 1234567" -> "+923001234567".
 */
export function normalizePhone(raw: string): string {
  const clean = raw.trim().replace(/[\s-]/g, '');
  if (!clean.startsWith('+')) {
    throw new RangeError('Phone number must start with country code (+)');
  }
  return clean;
}

/**
 * Computes a 32-byte HMAC-SHA256 blind index over a normalized value using a subkey.
 */
export function computeBlindIndex(normalizedValue: string, subkey: Buffer): Buffer {
  return createHmac('sha256', subkey).update(normalizedValue, 'utf8').digest();
}

/**
 * Computes the 32-byte thumb lookup index HMAC(K_thumb, capture_token).
 * In the prototype/demo, capture_token is a 32-byte hex string or base64 token.
 */
export function computeThumbLookup(captureToken: string, thumbSubkey: Buffer): Buffer {
  return createHmac('sha256', thumbSubkey).update(captureToken, 'utf8').digest();
}
