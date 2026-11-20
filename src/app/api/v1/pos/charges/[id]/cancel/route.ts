import type { NextRequest } from "next/server";
import { db } from "@/lib/fp/db";
import { handle, ok, uuidParam } from "@/lib/fp/route";
import { verifyTerminal } from "@/lib/fp/terminal";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle("pos.charges.cancel", async () => {
    const t = await verifyTerminal(request);
    const chargeId = uuidParam((await params).id);
    const [{ cancelled }] = await db()`select fp.api_cancel_charge(${t.terminalId}::uuid, ${t.nonce}, ${t.signedAt}, ${chargeId}::uuid) as cancelled`;
    return ok({ chargeId, cancelled });
  });
}
