import { randomBytes } from 'node:crypto';
import fastifyCookie from '@fastify/cookie';
import { API_PREFIX } from '@fingerpay/contracts';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { Kysely } from 'kysely';
import type { Logger } from 'pino';
import { registerAuthRoutes } from './modules/auth/routes.js';
import { AuthService } from './modules/auth/service.js';
import { SimulatedHmacMatcher, type BiometricMatcher } from './modules/biometrics/matcher.js';
import { registerCustomerRoutes } from './modules/customers/routes.js';
import { CustomerService } from './modules/customers/service.js';
import { registerDemoRoutes } from './modules/demo/routes.js';
import { registerBankRoutes } from './modules/disputes/routes.js';
import { DisputeAndReversalService } from './modules/disputes/service.js';
import { registerPaymentRoutes } from './modules/payments/routes.js';
import { PaymentService } from './modules/payments/service.js';
import { registerReportingRoutes } from './modules/reporting/routes.js';
import { ReportingService } from './modules/reporting/service.js';
import { registerSystemRoutes } from './modules/system/routes.js';
import { registerTerminalRoutes } from './modules/terminals/routes.js';
import { TerminalService } from './modules/terminals/service.js';
import type { AppConfig } from './platform/config.js';
import { createDevKeyring, parseKeyring, type Keyring } from './platform/crypto/keyring.js';
import type { Database } from './platform/db/types.gen.js';
import { registerErrorHandler } from './platform/http/error-handler.js';
import { registerSecurityHeaders } from './platform/http/headers.js';
import { registerOriginCheck } from './platform/http/origin-check.js';
import {
  CORRELATION_HEADER,
  registerRequestContext,
  resolveCorrelationId,
} from './platform/http/request-context.js';
import { createLogger } from './platform/log/logger.js';
import { InMemoryRateLimiter, type RateLimiter } from './platform/ratelimit/rate-limiter.js';

/** SPEC §4.6 / §3 T21: request bodies are capped at 16 KB. */
export const MAX_BODY_BYTES = 16 * 1024;

export interface BuildAppOptions {
  config: AppConfig;
  db: Kysely<Database>;
  logger?: Logger;
  keyring?: Keyring;
  lookupRootKey?: Buffer;
  demoKey?: Buffer;
  authService?: AuthService;
  terminalService?: TerminalService;
  customerService?: CustomerService;
  paymentService?: PaymentService;
  reportingService?: ReportingService;
  disputeService?: DisputeAndReversalService;
  matcher?: BiometricMatcher;
  rateLimiter?: RateLimiter;
}

function decodeBase64KeyOrFallback(envVal: string | undefined): Buffer {
  if (envVal) {
    const buf = Buffer.from(envVal.trim(), 'base64');
    if (buf.length === 32) return buf;
  }
  return randomBytes(32);
}

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const loggerInstance = (opts.logger ??
    createLogger({ level: opts.config.FP_LOG_LEVEL })) as FastifyBaseLogger;

  const app = Fastify({
    loggerInstance,
    bodyLimit: MAX_BODY_BYTES,
    trustProxy: true,
    genReqId: (req) => resolveCorrelationId(req.headers[CORRELATION_HEADER]),
  });

  // Preserve exact raw JSON body bytes for terminal signature verification (SPEC §4.5).
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string', bodyLimit: MAX_BODY_BYTES },
    (req, body, done) => {
      const rawText = typeof body === 'string' ? body : body.toString('utf8');
      req.rawBodyText = rawText;
      if (rawText.length === 0) {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(rawText));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  const keyring =
    opts.keyring ??
    (process.env.FP_KEYRING && !process.env.FP_KEYRING.includes('REPLACE_')
      ? parseKeyring(process.env.FP_KEYRING)
      : createDevKeyring());

  const lookupRootKey = opts.lookupRootKey ?? decodeBase64KeyOrFallback(process.env.FP_LOOKUP_KEY);
  const demoKey = opts.demoKey ?? decodeBase64KeyOrFallback(process.env.FP_DEMO_KEY);
  const rateLimiter = opts.rateLimiter ?? new InMemoryRateLimiter();
  const matcher = opts.matcher ?? new SimulatedHmacMatcher();

  const authService = opts.authService ?? new AuthService({ db: opts.db, keyring });
  const terminalService = opts.terminalService ?? new TerminalService(opts.db);
  const customerService =
    opts.customerService ??
    new CustomerService({
      db: opts.db,
      keyring,
      lookupRootKey,
      demoKey,
    });
  const paymentService =
    opts.paymentService ??
    new PaymentService({
      db: opts.db,
      matcher,
      customerService,
    });
  const reportingService = opts.reportingService ?? new ReportingService(opts.db);
  const disputeService = opts.disputeService ?? new DisputeAndReversalService(opts.db);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifyCookie);

  registerRequestContext(app);
  registerSecurityHeaders(app);
  registerOriginCheck(app, opts.config.FP_ALLOWED_ORIGINS);
  registerErrorHandler(app);

  await app.register(
    async (v1) => {
      await registerSystemRoutes(v1, { db: opts.db });
      await registerAuthRoutes(v1, authService);
      await registerTerminalRoutes(v1, terminalService);
      await registerPaymentRoutes(v1, { paymentService, terminalService, rateLimiter });
      await registerReportingRoutes(v1, { reportingService, disputeService, rateLimiter });
      await registerCustomerRoutes(v1, { customerService, rateLimiter });
      await registerBankRoutes(v1, { db: opts.db, disputeService });
      await registerDemoRoutes(v1, {
        db: opts.db,
        demoMode: opts.config.FP_DEMO_MODE,
        customerService,
      });
    },
    { prefix: API_PREFIX },
  );

  return app;
}
