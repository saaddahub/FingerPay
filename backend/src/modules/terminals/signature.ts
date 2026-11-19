import { createHash, createVerify } from 'node:crypto';
import {
  canonicalString,
  SIGNATURE_WINDOW_MS,
  TERMINAL_HEADERS,
} from '@fingerpay/contracts';
import { AppError } from '../../platform/errors/app-error.js';

export function computeBodySha256(rawBody?: string | Buffer): string {
  const hash = createHash('sha256');
  if (rawBody && (typeof rawBody === 'string' ? rawBody.length > 0 : rawBody.length > 0)) {
    hash.update(rawBody);
  }
  return hash.digest('base64url');
}

/**
 * Converts a base64 DER SPKI public key into a PEM string for node:crypto.
 */
export function spkiToPem(spkiBase64: string): string {
  const formatted = spkiBase64.match(/.{1,64}/g)?.join('\n') ?? spkiBase64;
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----\n`;
}

/**
 * Computes SHA-256 of the SPKI public key (hex) for audit logging.
 */
export function computeKeySha256(spkiBase64: string): string {
  return createHash('sha256').update(Buffer.from(spkiBase64, 'base64')).digest('hex');
}

export interface VerifyTerminalSignatureParams {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  rawBody?: string | Buffer;
  publicKeySpki: string;
}

/**
 * SPEC §4.5: Validates terminal timestamp (60s window) and ECDSA P-256 IEEE-P1363 signature.
 */
export function verifyTerminalRequestSignature(params: VerifyTerminalSignatureParams): {
  terminalId: string;
  nonce: string;
} {
  const terminalId = params.headers[TERMINAL_HEADERS.terminal];
  const timestamp = params.headers[TERMINAL_HEADERS.timestamp];
  const nonce = params.headers[TERMINAL_HEADERS.nonce];
  const signature = params.headers[TERMINAL_HEADERS.signature];

  if (
    typeof terminalId !== 'string' ||
    typeof timestamp !== 'string' ||
    typeof nonce !== 'string' ||
    typeof signature !== 'string'
  ) {
    throw new AppError('UNAUTHORIZED', 'Missing required X-FP terminal headers');
  }

  // 1. Clock skew check (60s window)
  const tsMs = Date.parse(timestamp);
  if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > SIGNATURE_WINDOW_MS) {
    throw new AppError('UNAUTHORIZED', 'Terminal request timestamp outside allowed 60s window');
  }

  // 2. Compute body hash
  const bodySha256 = computeBodySha256(params.rawBody);

  // 3. Build canonical string
  const canonical = canonicalString({
    method: params.method,
    pathWithQuery: params.url,
    terminalId,
    timestamp,
    nonce,
    bodySha256,
  });

  // 4. Verify ECDSA P-256 signature
  const pem = spkiToPem(params.publicKeySpki);
  const verifier = createVerify('sha256');
  verifier.update(canonical, 'utf8');

  try {
    const sigBuf = Buffer.from(signature, 'base64url');
    const valid = verifier.verify(
      { key: pem, dsaEncoding: 'ieee-p1363' },
      sigBuf,
    );
    if (!valid) {
      throw new AppError('UNAUTHORIZED', 'Invalid terminal request signature');
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('UNAUTHORIZED', 'Signature verification failed', { cause: err });
  }

  return { terminalId, nonce };
}
