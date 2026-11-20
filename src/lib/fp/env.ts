// Server environment, parsed once and fail-closed (SPEC §4.8). Never import from client components.
import { z } from "zod";
import { parseKey32, parseKeyring, type Keyring } from "./crypto.ts";

const key32 = z.string().refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes of base64");

const schema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
    FP_DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
    FP_DATABASE_CA: z.string().optional(),  // PEM of Supabase's root CA; required for any non-local database
    FP_KEYRING: z.string().min(2),
    FP_LOOKUP_KEY: key32,
    FP_ENV: z.enum(["development", "staging", "production"]),
    FP_DEMO_MODE: z.enum(["true", "false"]).default("false"),
    FP_DEMO_KEY: key32.optional().or(z.literal("")),
    FP_DEMO_OBSERVER_ID: z.uuid().optional().or(z.literal("")),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    FP_SEED_DATABASE_URL: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (e.FP_DEMO_MODE === "true" && e.FP_ENV === "production") fail("demo mode is refused when FP_ENV=production");
    if (e.FP_DEMO_MODE === "true" && !e.FP_DEMO_KEY) fail("FP_DEMO_KEY is required in demo mode");
    // Seed-only credentials (service role, owner DB login) must never reach a deployed app.
    if (e.FP_ENV !== "development" && e.SUPABASE_SERVICE_ROLE_KEY) fail("SUPABASE_SERVICE_ROLE_KEY must never be deployed");
    if (e.FP_ENV !== "development" && e.FP_SEED_DATABASE_URL) fail("FP_SEED_DATABASE_URL must never be deployed");
  });

export type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  databaseUrl: string;
  databaseCa: string | undefined;
  keyring: Keyring;
  lookupKey: Buffer;
  fpEnv: "development" | "staging" | "production";
  demo: { key: Buffer; observerId: string | undefined } | null;
};

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Names only: values are secrets.
    const problems = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("; ");
    throw new Error(`FingerPay environment is invalid: ${problems}`);
  }
  const e = parsed.data;
  cached = {
    supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: e.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    databaseUrl: e.FP_DATABASE_URL,
    databaseCa: e.FP_DATABASE_CA || undefined,
    keyring: parseKeyring(e.FP_KEYRING),
    lookupKey: parseKey32(e.FP_LOOKUP_KEY, "FP_LOOKUP_KEY"),
    fpEnv: e.FP_ENV,
    demo: e.FP_DEMO_MODE === "true" ? { key: parseKey32(e.FP_DEMO_KEY!, "FP_DEMO_KEY"), observerId: e.FP_DEMO_OBSERVER_ID || undefined } : null,
  };
  return cached;
}
