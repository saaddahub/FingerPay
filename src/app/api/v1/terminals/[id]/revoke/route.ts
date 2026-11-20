import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { handle, ok, rateLimit, uuidParam } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle("terminals.revoke", async () => {
    const staff = await requireStaff(request, ["MERCHANT_OWNER", "BANK_ADMIN"]);
    await rateLimit(`revoke:${staff.userId}`, 60, 20);
    const id = uuidParam((await params).id);
    await db()`select fp.api_revoke_terminal(${staff.userId}::uuid, ${id}::uuid)`;
    return ok({ terminalId: id, status: "REVOKED" });
  });
}
