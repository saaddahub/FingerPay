import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { dayParam, handle, ok, rateLimit } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

// The card figures: net settled today, fees saved, bank balance, month count (View B counters).
export function GET(request: NextRequest) {
  return handle("merchant.summary", async () => {
    const staff = await requireStaff(request, ["MERCHANT_OWNER", "MERCHANT_CASHIER"]);
    await rateLimit(`summary:${staff.userId}`, 60, 60);
    const [{ s }] = await db()`
      select s || jsonb_build_object(
        'gross_sales', s->>'gross_sales',
        'mdr_fees', s->>'mdr_fees',
        'card_pos_fees_at_2_5pct', s->>'card_pos_fees_at_2_5pct',
        'fees_saved_vs_card_pos', s->>'fees_saved_vs_card_pos',
        'net_settled_today', s->>'net_settled_today',
        'allied_bank_balance', s->>'allied_bank_balance'
      ) as s
      from fp.api_merchant_summary(${staff.userId}::uuid, ${dayParam(request)}::date) as result(s)
    `;
    return ok({ ...s, store_name: staff.storeName });
  });
}
