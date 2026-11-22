import type { NextRequest } from "next/server";
import { userFromRequest } from "@/lib/fp/auth";
import { encryptPii, decryptPii } from "@/lib/fp/crypto";
import { db } from "@/lib/fp/db";
import { env } from "@/lib/fp/env";
import { HttpError } from "@/lib/fp/errors";
import { handle, ok, rateLimit } from "@/lib/fp/route";
import { signupProfileSchema, type DemoWallet } from "@/lib/fp/signup";

export const dynamic = "force-dynamic";

async function accountUser(request: NextRequest) {
  if (!env().demoSignup) throw new HttpError(403, "DEMO_DISABLED", "Demo account signup is unavailable.");
  const user = await userFromRequest(request);
  if (!user) throw new HttpError(401, "FP401", "Please sign in to continue.");
  await rateLimit(`account:${user.id}`, 60, 30);
  return user;
}

async function wallet(userId: string) {
  const [row] = await db()`select * from fp.api_signup_wallet(${userId}::uuid)`;
  if (!row) return null;
  const profile = signupProfileSchema.parse(JSON.parse(decryptPii(env().keyring, row.details_enc, { table: "signup_profiles", column: "details_enc", rowId: userId })));
  return { profile, balance: row.balance, currency: "PKR", demo: true,
    activity: [{ label: "Signup bonus", amount: "200.00", createdAt: new Date(row.credited_at).toISOString() }],
  } satisfies DemoWallet;
}

export function GET(request: NextRequest) {
  return handle("account.read", async () => {
    const user = await accountUser(request);
    return ok({ email: user.email, wallet: await wallet(user.id) });
  });
}

export function POST(request: NextRequest) {
  return handle("account.create", async () => {
    const user = await accountUser(request);
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const hostOrigin = host ? `${request.nextUrl.protocol}//${host}` : null;
    if (origin && origin !== request.nextUrl.origin && origin !== hostOrigin) {
      throw new HttpError(403, "FP403", "Request origin is not allowed.");
    }
    const body = await request.text();
    if (body.length > 8192) throw new HttpError(413, "BODY_TOO_LARGE", "Account details are too long.");
    let raw: unknown;
    try { raw = JSON.parse(body); } catch { throw new HttpError(400, "INVALID_BODY", "Enter valid account details."); }
    const parsed = signupProfileSchema.safeParse(raw);
    if (!parsed.success) throw new HttpError(400, "INVALID_BODY", `Check ${parsed.error.issues[0].path.join(" ")}: ${parsed.error.issues[0].message}`);
    const encrypted = encryptPii(env().keyring, JSON.stringify(parsed.data), { table: "signup_profiles", column: "details_enc", rowId: user.id });
    await db()`select fp.api_complete_signup(${user.id}::uuid, ${parsed.data.accountType}, ${encrypted})`;
    return ok({ email: user.email, wallet: await wallet(user.id) });
  });
}
