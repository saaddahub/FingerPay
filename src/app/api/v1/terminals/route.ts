import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { handle, ok, rateLimit } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

// The owner's terminals, so a lost phone can be frozen or revoked from another device.
export function GET(request: NextRequest) {
  return handle("terminals.list", async () => {
    const staff = await requireStaff(request, ["MERCHANT_OWNER"]);
    await rateLimit(`terminals:${staff.userId}`, 60, 60);
    const rows = await db()`select * from fp.api_list_terminals(${staff.userId}::uuid)`;
    return ok({
      terminals: rows.map((r) => ({
        terminalId: r.terminal_id, label: r.label, status: r.status, frozen: r.frozen,
        pairedAt: r.paired_at, lastSeenAt: r.last_seen_at,
      })),
    });
  });
}
