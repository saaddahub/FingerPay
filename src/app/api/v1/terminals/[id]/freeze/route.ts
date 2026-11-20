import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { handle, ok, parseBody, rateLimit, uuidParam } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

const Body = z.object({ frozen: z.boolean() }).strict();

// "Freeze card": owners and cashiers freeze, only owners unfreeze (enforced in fp.api_set_terminal_frozen).
// Scope comes from the actor's store in the database, never from the client.
export function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle("terminals.freeze", async () => {
    const staff = await requireStaff(request, ["MERCHANT_OWNER", "MERCHANT_CASHIER"]);
    await rateLimit(`freeze:${staff.userId}`, 60, 20);
    const id = uuidParam((await params).id);
    const { frozen } = parseBody(await request.text(), Body);
    const [{ r }] = await db()`select fp.api_set_terminal_frozen(${staff.userId}::uuid, ${id}::uuid, ${frozen}) as r`;
    return ok({ terminalId: r.terminal_id, frozen: r.frozen });
  });
}
