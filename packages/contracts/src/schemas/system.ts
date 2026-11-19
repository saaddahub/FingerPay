import { z } from 'zod';

/** Every non-2xx response body. No SQL, stack traces or internals, ever. */
export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: z.string(),
    message: z.string(),
    correlationId: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  service: z.string(),
  version: z.string(),
  time: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const readyCheckSchema = z.strictObject({
  ok: z.boolean(),
  latencyMs: z.number().optional(),
  detail: z.string().optional(),
});

export const readyResponseSchema = z.strictObject({
  status: z.enum(['ready', 'not_ready']),
  checks: z.strictObject({
    database: readyCheckSchema,
    migrations: readyCheckSchema,
  }),
});
export type ReadyResponse = z.infer<typeof readyResponseSchema>;
