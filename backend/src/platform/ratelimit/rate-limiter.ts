import { AppError } from '../errors/app-error.js';

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  resetAt: Date;
}

export interface RateLimiter {
  consume(rule: RateLimitRule, key: string): Promise<RateLimitResult>;
}

/**
 * SPEC §8 Rate limits.
 */
export const RATE_LIMIT_RULES = {
  thumbSubmission: { name: 'pos:thumb', limit: 30, windowSeconds: 60 },
  openCharge: { name: 'pos:charge', limit: 60, windowSeconds: 60 },
  nadraAndEnroll: { name: 'branch:enroll', limit: 30, windowSeconds: 3600 },
  csvExport: { name: 'merchant:csv', limit: 10, windowSeconds: 60 },
  healthCheck: { name: 'sys:health', limit: 60, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAtMs: number }>();

  async consume(rule: RateLimitRule, key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = rule.windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetAtMs = windowStart + windowMs;
    const bucketKey = `${rule.name}:${key}:${windowStart}`;

    const existing = this.buckets.get(bucketKey);
    const current = (existing?.count ?? 0) + 1;
    this.buckets.set(bucketKey, { count: current, resetAtMs });

    return {
      allowed: current <= rule.limit,
      current,
      limit: rule.limit,
      resetAt: new Date(resetAtMs),
    };
  }
}

export async function enforceRateLimit(
  limiter: RateLimiter,
  rule: RateLimitRule,
  key: string,
): Promise<void> {
  const res = await limiter.consume(rule, key);
  if (!res.allowed) {
    throw new AppError('RATE_LIMITED', `Rate limit exceeded for ${rule.name}`);
  }
}
