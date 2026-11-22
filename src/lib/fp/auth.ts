import { createClient as createTokenClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { db } from "./db.ts";
import { env } from "./env.ts";
import { HttpError } from "./errors.ts";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "BRANCH_OFFICER" | "BRANCH_MANAGER" | "MERCHANT_OWNER" | "MERCHANT_CASHIER" | "BANK_ADMIN" | "AUDITOR";
export type Staff = { userId: string; role: StaffRole; merchantId: string | null; displayName: string; storeName: string | null };

async function staffFor(userId: string): Promise<Staff | null> {
  const [row] = await db()`select * from fp.api_staff_context(${userId}::uuid)`;
  if (!row || row.status !== "ACTIVE") return null;
  return { userId, role: row.role, merchantId: row.merchant_id, displayName: row.display_name, storeName: row.store_name };
}

// The signed-in staff member, re-read from fp.staff on every call (a disabled account stops at once).
export async function currentStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? staffFor(user.id) : null;
}

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

/** The Android terminal sends its Supabase access token as a bearer token (SPEC §11: Supabase Auth, PKCE);
 *  the web console uses cookies. The token is checked with Supabase Auth on every request, never decoded locally. */
export async function staffFromRequest(request: NextRequest): Promise<Staff | null> {
  const user = await userFromRequest(request);
  return user ? staffFor(user.id) : null;
}

export async function userFromRequest(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
  const token = BEARER.exec(header)?.[1];
  if (!token) return null;
  const e = env();
  const supabase = createTokenClient(e.supabaseUrl, e.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error || !user ? null : user;
}

export async function requireStaff(request: NextRequest, roles?: StaffRole[]): Promise<Staff> {
  const staff = await staffFromRequest(request);
  if (!staff) throw new HttpError(401, "FP401", "unauthenticated");
  if (roles && !roles.includes(staff.role)) throw new HttpError(403, "FP403", "forbidden");
  return staff;
}
