import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/fp/auth";
import { demoThumbToken, thumbLookup } from "@/lib/fp/crypto";
import { db } from "@/lib/fp/db";
import { env } from "@/lib/fp/env";
import { HttpError } from "@/lib/fp/errors";
import { handle, ok, parseBody, rateLimit, UUID, uuidParam } from "@/lib/fp/route";
import { verifyTerminal } from "@/lib/fp/terminal";

export const dynamic = "force-dynamic";

// A reader token (the scanner's one-time token, base64url, 32 bytes) or, in demo mode only, a simulated tap.
const Body = z.discriminatedUnion("source", [
  z.object({ source: z.literal("reader"), token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict(),
  z.object({ source: z.literal("demo"), customerId: z.string().regex(UUID).nullable() }).strict(), // null = an unregistered thumb
]);

// SPEC §6.3: the whole pipeline is one database call. The raw token never leaves this function: only its
// keyed HMAC reaches the database, and nothing about it is logged.
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle("pos.charges.thumb", async () => {
    const receivedAt = new Date();
    const t = await verifyTerminal(request);
    await rateLimit(`thumb:${t.terminalId}`, 60, 30);
    const chargeId = uuidParam((await params).id);
    const body = parseBody(t.body, Body);
    const e = env();
    let token: Buffer;
    if (body.source === "reader") {
      token = Buffer.from(body.token, "base64url");
    } else {
      // Demo shortcut: behind FP_DEMO_MODE (refused in production by env()) and a staff session.
      if (!e.demo) throw new HttpError(404, "FP404", "not found");
      await requireStaff(request, ["MERCHANT_OWNER", "MERCHANT_CASHIER"]);
      token = body.customerId ? demoThumbToken(e.demo.key, body.customerId.toLowerCase()) : randomBytes(32);
    }
    const lookup = thumbLookup(e.lookupKey, token);
    const [{ r }] = await db()`
      select r || jsonb_strip_nulls(jsonb_build_object(
        'amount', r->>'amount',
        'mdr_fee', r->>'mdr_fee',
        'net_to_merchant', r->>'net_to_merchant',
        'cashback', r->>'cashback'
      )) as r
      from fp.api_thumb_pay(${t.terminalId}::uuid, ${t.nonce}, ${t.signedAt}, ${receivedAt}, ${chargeId}::uuid, ${lookup}) as result(r)
    `;
    return ok(r);
  });
}
