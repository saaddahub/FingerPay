import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { dayParam, handle, ok, rateLimit } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

// Today's sales for the staff member's own store (View B). Shopper names only on settled rows (database rule).
export function GET(request: NextRequest) {
  return handle("merchant.ledger", async () => {
    const staff = await requireStaff(request, ["MERCHANT_OWNER", "MERCHANT_CASHIER"]);
    await rateLimit(`ledger:${staff.userId}`, 60, 60);
    const rows = await db()`select * from fp.api_merchant_ledger(${staff.userId}::uuid, ${dayParam(request)}::date)`;
    return ok({
      sales: rows.map((r) => ({
        attemptId: r.attempt_id, occurredAt: r.occurred_at, shopper: r.shopper, gross: r.gross, fee: r.mdr_fee,
        net: r.net_to_merchant, cashback: r.cashback, raastRef: r.raast_ref, status: r.status, outcome: r.outcome, terminal: r.terminal_label,
      })),
    });
  });
}
