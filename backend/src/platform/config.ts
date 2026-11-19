import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const envSchema = z
  .object({
    FP_ENV: z.enum(['development', 'test', 'staging', 'production']),
    FP_HOST: z.string().min(1).default('0.0.0.0'),
    FP_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    FP_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    FP_DATABASE_URL: z
      .string()
      .url('FP_DATABASE_URL must be a valid postgres connection URL')
      .refine((u) => u.startsWith('postgres://') || u.startsWith('postgresql://'), {
        message: 'FP_DATABASE_URL must start with postgres:// or postgresql://',
      }),
    FP_DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
    FP_ALLOWED_ORIGINS: z
      .string()
      .min(1)
      .transform((s) =>
        s
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ),
    FP_DEMO_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .superRefine((cfg, ctx) => {
    // SPEC §3 T22 / §4.8: startup refuses demo mode when FP_ENV=production.
    if (cfg.FP_ENV === 'production' && cfg.FP_DEMO_MODE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['FP_DEMO_MODE'],
        message: 'FP_DEMO_MODE cannot be enabled when FP_ENV=production (SPEC T22)',
      });
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

/**
 * Tries loading environment files (.env.local, .env) if present in the current or parent directory.
 */
function tryLoadEnvFiles(): void {
  if (typeof process.loadEnvFile !== 'function') return;

  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env.local'),
    resolve(process.cwd(), '../.env'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        process.loadEnvFile(path);
      } catch {
        // Ignore unreadable/invalid format errors in optional files
      }
    }
  }
}

/**
 * Parses and validates configuration from an environment object. Fails closed on any missing
 * or invalid setting — never falls back to placeholder credentials (SPEC §4.6).
 */
export function loadConfig(rawEnv?: Record<string, string | undefined>): AppConfig {
  if (!rawEnv) {
    tryLoadEnvFiles();
  }
  const source = rawEnv ?? process.env;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'env'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid FingerPay configuration: ${issues}`);
  }
  return parsed.data;
}
