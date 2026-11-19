import * as OTPAuth from 'otpauth';

export interface TotpEnrollment {
  secret: string; // base32
  uri: string;
}

export function generateTotpSecret(email: string, issuer = 'FingerPay'): TotpEnrollment {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Validates a 6-digit TOTP token allowing a +/- 1 time-step window (90s total) for clock drift.
 */
export function verifyTotpToken(secretBase32: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: 'FingerPay',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: token.trim(), window: 1 });
  return delta !== null;
}
