import type { NextRequest } from "next/server";
import { db } from "@/lib/fp/db";
import { handle, ok } from "@/lib/fp/route";
import { verifyTerminal } from "@/lib/fp/terminal";

export const dynamic = "force-dynamic";

// A terminal's own state (signed): label, store and whether it's frozen. Feeds the "This terminal" card.
export function GET(request: NextRequest) {
  return handle("terminals.self", async () => {
    const t = await verifyTerminal(request);
    const [row] = await db()`select * from fp.api_terminal_status(${t.terminalId}::uuid, ${t.nonce}, ${t.signedAt})`;
    return ok({ terminalId: t.terminalId, label: row.label, storeName: row.store_name, frozen: row.frozen });
  });
}
