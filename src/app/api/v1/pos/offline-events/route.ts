import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { AMOUNT, handle, ok, parseBody, rateLimit } from "@/lib/fp/route";
import { verifyTerminal } from "@/lib/fp/terminal";

export const dynamic = "force-dynamic";

const Body = z.object({ amount: z.string().regex(AMOUNT), occurredAt: z.iso.datetime() }).strict();

// "TAKE CASH" sales are recorded for the ledger on reconnect. Nothing is ever charged later (SPEC View A).
export function POST(request: NextRequest) {
  return handle("pos.offline", async () => {
    const t = await verifyTerminal(request);
    const staff = await requireStaff(request, ["MERCHANT_OWNER", "MERCHANT_CASHIER"]);
    await rateLimit(`offline:${t.terminalId}`, 60, 60);
    const { amount, occurredAt } = parseBody(t.body, Body);
    const [{ id }] = await db()`select fp.api_record_offline_fallback(${t.terminalId}::uuid, ${t.nonce}, ${t.signedAt}, ${staff.userId}::uuid, ${amount}::numeric, ${new Date(occurredAt)}) as id`;
    return ok({ attemptId: id }, 201);
  });
}
