import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { AMOUNT, handle, ok, parseBody, rateLimit } from "@/lib/fp/route";
import { verifyTerminal } from "@/lib/fp/terminal";

export const dynamic = "force-dynamic";

const Body = z.object({ amount: z.string().regex(AMOUNT) }).strict();

// Opens a 120 s charge session (SPEC View A). Signed terminal + signed-in cashier or owner.
export function POST(request: NextRequest) {
  return handle("pos.charges.open", async () => {
    const t = await verifyTerminal(request);
    const staff = await requireStaff(request, ["MERCHANT_OWNER", "MERCHANT_CASHIER"]);
    await rateLimit(`open:${t.terminalId}`, 60, 60);
    const { amount } = parseBody(t.body, Body);
    const [row] = await db()`select * from fp.api_open_charge(${t.terminalId}::uuid, ${t.nonce}, ${t.signedAt}, ${staff.userId}::uuid, ${amount}::numeric)`;
    return ok({ chargeId: row.charge_id, amount: row.amount, expiresAt: row.expires_at }, 201);
  });
}
