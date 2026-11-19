import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  loginRequestSchema,
  loginResponseSchema,
  mfaEnrollResponseSchema,
  mfaVerifyRequestSchema,
  refreshResponseSchema,
  staffContextResponseSchema,
  type StaffRole,
} from '@fingerpay/contracts';
import { AppError } from '../../platform/errors/app-error.js';
import { requireStaffAuth } from './guards.js';
import type { AuthService } from './service.js';

const COOKIE_NAME = 'fp_refresh';
const COOKIE_OPTIONS = {
  path: '/api/v1/auth',
  httpOnly: true,
  secure: process.env.FP_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60, // 24 hours
};

export async function registerAuthRoutes(app: FastifyInstance, authService: AuthService) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    '/auth/login',
    {
      schema: {
        body: loginRequestSchema,
        response: {
          200: loginResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const res = await authService.login(req.body.email, req.body.password);

      if (res.status === 'authenticated' && 'refreshToken' in res && res.refreshToken) {
        reply.setCookie(COOKIE_NAME, res.refreshToken, COOKIE_OPTIONS);
      }

      return reply.send({
        status: res.status,
        accessToken: 'accessToken' in res ? res.accessToken : undefined,
        mfaChallengeToken: 'mfaChallengeToken' in res ? res.mfaChallengeToken : undefined,
        user: res.user,
      });
    },
  );

  typed.post(
    '/auth/mfa/verify',
    {
      schema: {
        body: mfaVerifyRequestSchema,
        response: {
          200: loginResponseSchema,
        },
      },
    },
    async (req, reply) => {
      // Decode challenge token to get userId
      const { verifyStaffAccessToken } = await import('../../platform/crypto/jwt.js');
      let payload;
      try {
        payload = await verifyStaffAccessToken(req.body.challengeToken);
      } catch {
        throw new AppError('UNAUTHORIZED', 'Invalid or expired MFA challenge token');
      }

      const res = await authService.verifyMfa(payload.sub, req.body.code);
      reply.setCookie(COOKIE_NAME, res.refreshToken, COOKIE_OPTIONS);

      return reply.send({
        status: 'authenticated',
        accessToken: res.accessToken,
        user: res.user,
      });
    },
  );

  typed.post(
    '/auth/mfa/enroll',
    {
      preHandler: [requireStaffAuth],
      schema: {
        response: {
          200: mfaEnrollResponseSchema,
        },
      },
    },
    async (req) => {
      return authService.enrollMfa(req.staffUser!.id);
    },
  );

  typed.post(
    '/auth/refresh',
    {
      schema: {
        response: {
          200: refreshResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const rawCookie = req.cookies[COOKIE_NAME];
      if (!rawCookie) {
        throw new AppError('UNAUTHORIZED', 'Missing refresh token cookie');
      }

      const res = await authService.refresh(rawCookie);
      reply.setCookie(COOKIE_NAME, res.refreshToken, COOKIE_OPTIONS);

      return reply.send({ accessToken: res.accessToken });
    },
  );

  typed.post(
    '/auth/logout',
    async (req, reply) => {
      const rawCookie = req.cookies[COOKIE_NAME];
      if (rawCookie) {
        await authService.logout(rawCookie);
      }
      reply.clearCookie(COOKIE_NAME, { path: COOKIE_OPTIONS.path });
      return reply.send({ status: 'ok' });
    },
  );

  typed.get(
    '/me',
    {
      preHandler: [requireStaffAuth],
      schema: {
        response: {
          200: staffContextResponseSchema,
        },
      },
    },
    async (req) => {
      return {
        user: {
          id: req.staffUser!.id,
          email: req.staffUser!.email ?? '',
          role: req.staffUser!.role as StaffRole,
          institutionId: req.staffUser!.institutionId ?? null,
          branchId: req.staffUser!.branchId ?? null,
          merchantId: req.staffUser!.merchantId ?? null,
          aal: req.staffUser!.aal,
        },
      };
    },
  );
}
