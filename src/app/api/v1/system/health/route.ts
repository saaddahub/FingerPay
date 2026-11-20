import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { currentStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { toHttp } from "@/lib/fp/errors";

export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

// Public: {db:"ok"}. Bank admins and auditors also see counts (SPEC §8). 60/min per client IP.
export async function GET(request: NextRequest) {
  try {
    const sql = db();
    // Vercel overwrites x-forwarded-for, so it can't be spoofed there. Hashed: no raw IPs in the DB.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const bucket = "health:" + createHash("sha256").update(ip).digest("base64url").slice(0, 22);
    const [{ allowed }] = await sql`select fp.api_rate_limit(${bucket}, 60, 60) as allowed`;
    if (!allowed) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message: "too many requests" } }, { status: 429, headers: { ...NO_STORE, "retry-after": "60" } });
    }
    const [{ health }] = await sql`select fp.api_health() as health`;
    const staff = await currentStaff();
    const body = staff && (staff.role === "BANK_ADMIN" || staff.role === "AUDITOR") ? health : { db: health.db };
    return NextResponse.json(body, { headers: NO_STORE });
  } catch (err) {
    const { status, body } = toHttp(err, "system.health");
    return NextResponse.json(body, { status, headers: NO_STORE });
  }
}
