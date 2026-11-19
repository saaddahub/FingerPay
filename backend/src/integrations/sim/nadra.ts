import { randomBytes } from 'node:crypto';
import { normalizeCnic } from '../../platform/crypto/blind-index.js';

export interface NadraVerifyResult {
  verified: boolean;
  nadraRef: string | null;
  verifiedAt: Date | null;
  reason?: string;
}

/**
 * SPEC §5 View C: Server NADRA simulator.
 * Checks 13-digit CNIC format; `00000-0000000-0` simulates "not found".
 */
export function simulateNadraVerify(rawCnic: string, fullName: string): NadraVerifyResult {
  let digits: string;
  try {
    digits = normalizeCnic(rawCnic);
  } catch {
    return {
      verified: false,
      nadraRef: null,
      verifiedAt: null,
      reason: 'INVALID_CNIC_FORMAT',
    };
  }

  if (digits === '0000000000000' || fullName.trim().length < 2) {
    return {
      verified: false,
      nadraRef: null,
      verifiedAt: null,
      reason: 'CNIC_NOT_FOUND_IN_NADRA',
    };
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ref = `NADRA-${stamp}-${randomBytes(4).toString('hex').toUpperCase()}`;
  return {
    verified: true,
    nadraRef: ref,
    verifiedAt: new Date(),
  };
}
