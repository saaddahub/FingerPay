import type { FastifyReply, FastifyRequest } from 'fastify';
import { isBankRole, type StaffRole } from '@fingerpay/contracts';
import { AppError } from '../../platform/errors/app-error.js';
import { verifyStaffAccessToken } from '../../platform/crypto/jwt.js';
import { verifySupabaseToken } from '../../platform/supabase/auth.js';

export interface AuthenticatedStaffUser {
  id: string;
  email?: string | undefined;
  role: StaffRole;
  institutionId?: string | null | undefined;
  branchId?: string | null | undefined;
  merchantId?: string | null | undefined;
  aal: 1 | 2;
}

declare module 'fastify' {
  interface FastifyRequest {
    staffUser?: AuthenticatedStaffUser;
  }
}

export async function parseStaffAuth(req: FastifyRequest): Promise<AuthenticatedStaffUser> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7).trim();

  // 1. Try native EdDSA verification
  try {
    const verified = await verifyStaffAccessToken(token);
    return {
      id: verified.sub,
      ...(verified.email ? { email: verified.email } : {}),
      role: verified.role as StaffRole,
      institutionId: verified.inst ?? null,
      branchId: verified.branch ?? null,
      merchantId: verified.merchant ?? null,
      aal: verified.aal,
    };
  } catch {
    // 2. Try Supabase JWT verification via JWKS
    const sbUser = await verifySupabaseToken(token);
    if (sbUser) {
      return {
        id: sbUser.id,
        email: sbUser.email,
        role: (sbUser.role as StaffRole) ?? 'MERCHANT_CASHIER',
        aal: sbUser.aal === 'aal2' ? 2 : 1,
      };
    }
  }

  throw new AppError('UNAUTHORIZED', 'Invalid or expired access token');
}

export async function requireStaffAuth(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  req.staffUser = await parseStaffAuth(req);
}

export function requireRole(allowedRoles: readonly StaffRole[]) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!req.staffUser) {
      req.staffUser = await parseStaffAuth(req);
    }

    if (!allowedRoles.includes(req.staffUser.role)) {
      throw new AppError('FORBIDDEN', `Role ${req.staffUser.role} is not authorized for this resource`);
    }

    // SPEC §4.1: If user is a bank role, AAL2 (MFA completed) is mandatory
    if (isBankRole(req.staffUser.role) && req.staffUser.aal < 2) {
      throw new AppError('FORBIDDEN', 'MFA (AAL2) step-up required for bank roles');
    }
  };
}

export async function requireAal2(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!req.staffUser) {
    req.staffUser = await parseStaffAuth(req);
  }
  if (req.staffUser.aal < 2) {
    throw new AppError('FORBIDDEN', 'AAL2 (TOTP MFA) is required for this action');
  }
}
