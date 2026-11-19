import { randomUUID } from 'node:crypto';
import { isBankRole, type StaffRole } from '@fingerpay/contracts';
import type { Kysely } from 'kysely';
import { AppError } from '../../platform/errors/app-error.js';
import { decryptField, encryptField } from '../../platform/crypto/aead.js';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signStaffAccessToken,
} from '../../platform/crypto/jwt.js';
import type { Keyring } from '../../platform/crypto/keyring.js';
import type { Database } from '../../platform/db/types.gen.js';
import { hashPassword, verifyPassword } from './password.js';
import { generateTotpSecret, verifyTotpToken } from './totp.js';

export interface AuthServiceDeps {
  db: Kysely<Database>;
  keyring: Keyring;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const REFRESH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  async login(email: string, plainPassword: string) {
    const normEmail = email.trim().toLowerCase();
    const user = await this.deps.db
      .selectFrom('fp.staff_users')
      .selectAll()
      .where('email', '=', normEmail)
      .executeTakeFirst();

    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password');
    }

    if (user.status === 'LOCKED' || (user.locked_until && new Date(user.locked_until) > new Date())) {
      throw new AppError('LOCKED', 'Account is temporarily locked due to failed attempts. Try again later.');
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('FORBIDDEN', 'Account is suspended');
    }

    const valid = await verifyPassword(plainPassword, user.password_hash);
    if (!valid) {
      const failed = user.failed_logins + 1;
      const willLock = failed >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = willLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null;

      await this.deps.db
        .updateTable('fp.staff_users')
        .set({
          failed_logins: failed,
          locked_until: lockedUntil,
          status: willLock ? 'LOCKED' : user.status,
        })
        .where('id', '=', user.id)
        .execute();

      if (willLock) {
        throw new AppError('LOCKED', 'Account locked after 5 failed login attempts');
      }
      throw new AppError('UNAUTHORIZED', 'Invalid email or password');
    }

    // Reset failed login counter
    if (user.failed_logins > 0) {
      await this.deps.db
        .updateTable('fp.staff_users')
        .set({ failed_logins: 0, locked_until: null, status: 'ACTIVE' })
        .where('id', '=', user.id)
        .execute();
    }

    const bankRole = isBankRole(user.role as StaffRole);
    const requiresMfa = bankRole || Boolean(user.mfa_enrolled_at);

    if (requiresMfa) {
      // Issue short-lived challenge token for MFA
      const challengeToken = await signStaffAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        ...(user.institution_id ? { inst: user.institution_id } : {}),
        ...(user.branch_id ? { branch: user.branch_id } : {}),
        ...(user.merchant_id ? { merchant: user.merchant_id } : {}),
        aal: 1,
        sid: randomUUID(),
      });

      return {
        status: 'mfa_required' as const,
        mfaChallengeToken: challengeToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role as StaffRole,
          institutionId: user.institution_id,
          branchId: user.branch_id,
          merchantId: user.merchant_id,
          aal: 1 as const,
        },
      };
    }

    // AAL1 authenticated (merchant roles without MFA)
    const familyId = randomUUID();
    const sessionId = randomUUID();
    const accessToken = await signStaffAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(user.institution_id ? { inst: user.institution_id } : {}),
      ...(user.branch_id ? { branch: user.branch_id } : {}),
      ...(user.merchant_id ? { merchant: user.merchant_id } : {}),
      aal: 1,
      sid: sessionId,
    });

    const rawRefreshToken = generateOpaqueRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);

    await this.deps.db
      .insertInto('fp.refresh_tokens')
      .values({
        id: randomUUID(),
        user_id: user.id,
        family_id: familyId,
        token_hash: tokenHash,
        aal: 1,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      })
      .execute();

    return {
      status: 'authenticated' as const,
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as StaffRole,
        institutionId: user.institution_id,
        branchId: user.branch_id,
        merchantId: user.merchant_id,
        aal: 1 as const,
      },
    };
  }

  async verifyMfa(userId: string, totpCode: string) {
    const user = await this.deps.db
      .selectFrom('fp.staff_users')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user || !user.totp_secret_enc) {
      throw new AppError('UNAUTHORIZED', 'MFA is not configured for this user');
    }

    const secret = decryptField(user.totp_secret_enc, this.deps.keyring, {
      table: 'staff_users',
      column: 'totp_secret_enc',
      rowId: user.id,
    });

    const valid = verifyTotpToken(secret, totpCode);
    if (!valid) {
      throw new AppError('UNAUTHORIZED', 'Invalid TOTP code');
    }

    // Upgrade to AAL2
    const familyId = randomUUID();
    const sessionId = randomUUID();
    const accessToken = await signStaffAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(user.institution_id ? { inst: user.institution_id } : {}),
      ...(user.branch_id ? { branch: user.branch_id } : {}),
      ...(user.merchant_id ? { merchant: user.merchant_id } : {}),
      aal: 2,
      sid: sessionId,
    });

    const rawRefreshToken = generateOpaqueRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);

    await this.deps.db
      .insertInto('fp.refresh_tokens')
      .values({
        id: randomUUID(),
        user_id: user.id,
        family_id: familyId,
        token_hash: tokenHash,
        aal: 2,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      })
      .execute();

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as StaffRole,
        institutionId: user.institution_id,
        branchId: user.branch_id,
        merchantId: user.merchant_id,
        aal: 2 as const,
      },
    };
  }

  async enrollMfa(userId: string) {
    const user = await this.deps.db
      .selectFrom('fp.staff_users')
      .select(['id', 'email'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found');
    }

    const { secret, uri } = generateTotpSecret(user.email);
    const encSecret = encryptField(secret, this.deps.keyring, {
      table: 'staff_users',
      column: 'totp_secret_enc',
      rowId: user.id,
    });

    await this.deps.db
      .updateTable('fp.staff_users')
      .set({
        totp_secret_enc: encSecret,
        mfa_enrolled_at: new Date(),
      })
      .where('id', '=', user.id)
      .execute();

    return { secret, uri };
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const record = await this.deps.db
      .selectFrom('fp.refresh_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();

    if (!record) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token');
    }

    // Token reuse detection (RFC 6819)
    if (record.rotated_at !== null || record.revoked_at !== null) {
      // Immediate revocation of the entire token family
      await this.deps.db
        .updateTable('fp.refresh_tokens')
        .set({ revoked_at: new Date() })
        .where('family_id', '=', record.family_id)
        .execute();

      throw new AppError('UNAUTHORIZED', 'Refresh token reuse detected. Family revoked.');
    }

    if (new Date(record.expires_at) < new Date()) {
      throw new AppError('UNAUTHORIZED', 'Refresh token expired');
    }

    const user = await this.deps.db
      .selectFrom('fp.staff_users')
      .selectAll()
      .where('id', '=', record.user_id)
      .executeTakeFirst();

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('UNAUTHORIZED', 'User not active');
    }

    // Rotate token
    await this.deps.db
      .updateTable('fp.refresh_tokens')
      .set({ rotated_at: new Date() })
      .where('id', '=', record.id)
      .execute();

    const newRawRefreshToken = generateOpaqueRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);

    await this.deps.db
      .insertInto('fp.refresh_tokens')
      .values({
        id: randomUUID(),
        user_id: user.id,
        family_id: record.family_id,
        token_hash: newTokenHash,
        aal: record.aal,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      })
      .execute();

    const accessToken = await signStaffAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(user.institution_id ? { inst: user.institution_id } : {}),
      ...(user.branch_id ? { branch: user.branch_id } : {}),
      ...(user.merchant_id ? { merchant: user.merchant_id } : {}),
      aal: record.aal,
      sid: randomUUID(),
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const record = await this.deps.db
      .selectFrom('fp.refresh_tokens')
      .select('family_id')
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();

    if (record) {
      await this.deps.db
        .updateTable('fp.refresh_tokens')
        .set({ revoked_at: new Date() })
        .where('family_id', '=', record.family_id)
        .execute();
    }
  }

  async registerStaffUser(data: {
    email: string;
    password: string;
    role: StaffRole;
    institutionId?: string;
    branchId?: string;
    merchantId?: string;
    totpSecret?: string;
  }) {
    const passwordHash = await hashPassword(data.password);
    const id = randomUUID();

    let totpSecretEnc: Buffer | null = null;
    if (data.totpSecret) {
      totpSecretEnc = encryptField(data.totpSecret, this.deps.keyring, {
        table: 'staff_users',
        column: 'totp_secret_enc',
        rowId: id,
      });
    }

    await this.deps.db
      .insertInto('fp.staff_users')
      .values({
        id,
        email: data.email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: data.role,
        institution_id: data.institutionId ?? null,
        branch_id: data.branchId ?? null,
        merchant_id: data.merchantId ?? null,
        totp_secret_enc: totpSecretEnc,
        mfa_enrolled_at: data.totpSecret ? new Date() : null,
        status: 'ACTIVE',
      })
      .execute();

    return id;
  }
}
