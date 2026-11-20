import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { env } from "@/lib/fp/env";
import { HttpError } from "@/lib/fp/errors";
import { handle, ok, rateLimit } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

// Demo only (FP_DEMO_MODE + a staff session; env() refuses demo mode in production): who can be "tapped".
// Shoppers appear as first name and initial; no balances, phones or CNICs.
export function GET(request: NextRequest) {
  return handle("demo.finger_tray", async () => {
    if (!env().demo) throw new HttpError(404, "FP404", "not found");
    const staff = await requireStaff(request, ["MERCHANT_OWNER", "MERCHANT_CASHIER"]);
    await rateLimit(`tray:${staff.userId}`, 60, 60);
    const rows = await db()`select * from fp.api_demo_finger_tray()`;
    return ok({ shoppers: rows.map((r) => ({ customerId: r.customer_id, name: r.display_name, accountType: r.account_type })) });
  });
}
