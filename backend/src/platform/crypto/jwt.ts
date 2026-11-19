import { createHash, randomBytes } from 'node:crypto';
import { exportJWK, generateKeyPair, jwtVerify, SignJWT } from 'jose';

type JoseKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

export interface StaffJwtPayload {
  sub: string;
  email?: string | undefined;
  role: string;
  inst?: string | undefined;
  branch?: string | undefined;
  merchant?: string | undefined;
  aal: 1 | 2;
  sid: string;
}

export interface JwtKeypair {
  privateKey: JoseKey;
  publicKey: JoseKey;
  kid: string;
}

/**
 * In-memory or persisted EdDSA keypair manager.
 */
let currentKeypair: JwtKeypair | null = null;

export async function getOrGenerateJwtKeypair(): Promise<JwtKeypair> {
  if (currentKeypair) return currentKeypair;

  const { privateKey, publicKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
  const jwk = await exportJWK(publicKey);
  const kid = jwk.x?.slice(0, 16) ?? 'fp-key-1';

  currentKeypair = { privateKey, publicKey, kid };
  return currentKeypair;
}

export async function signStaffAccessToken(
  payload: StaffJwtPayload,
  keypair?: JwtKeypair,
): Promise<string> {
  const kp = keypair ?? (await getOrGenerateJwtKeypair());
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    inst: payload.inst,
    branch: payload.branch,
    merchant: payload.merchant,
    aal: payload.aal,
    sid: payload.sid,
  })
    .setProtectedHeader({ alg: 'EdDSA', kid: kp.kid })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer('fingerpay')
    .setAudience('fingerpay-staff')
    .setExpirationTime('15m')
    .sign(kp.privateKey);
}

export async function verifyStaffAccessToken(
  token: string,
  keypair?: JwtKeypair,
): Promise<StaffJwtPayload> {
  const kp = keypair ?? (await getOrGenerateJwtKeypair());
  const { payload } = await jwtVerify(token, kp.publicKey, {
    issuer: 'fingerpay',
    audience: 'fingerpay-staff',
  });

  return {
    sub: payload.sub!,
    ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
    role: payload.role as string,
    ...(typeof payload.inst === 'string' ? { inst: payload.inst } : {}),
    ...(typeof payload.branch === 'string' ? { branch: payload.branch } : {}),
    ...(typeof payload.merchant === 'string' ? { merchant: payload.merchant } : {}),
    aal: (payload.aal as 1 | 2) ?? 1,
    sid: payload.sid as string,
  };
}

/**
 * Generates an opaque random 32-byte URL-safe refresh token.
 */
export function generateOpaqueRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Computes SHA-256 hash of an opaque refresh token for safe storage in the database.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
