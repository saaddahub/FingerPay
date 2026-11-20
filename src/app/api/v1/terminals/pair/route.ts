import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/fp/auth";
import { db } from "@/lib/fp/db";
import { handle, ok, parseBody, rateLimit } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

const Body = z.object({
  label: z.string().trim().min(1).max(60),
  publicKey: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/).max(200), // base64 SPKI DER; the DB checks it's P-256
}).strict();

// SPEC §4.5: the owner pairs a device; the device keeps its private key in the Android Keystore.
export function POST(request: NextRequest) {
  return handle("terminals.pair", async () => {
    const staff = await requireStaff(request, ["MERCHANT_OWNER"]);
    await rateLimit(`pair:${staff.userId}`, 3600, 10);
    const body = parseBody(await request.text(), Body);
    const spki = Buffer.from(body.publicKey, "base64");
    const [{ terminal_id }] = await db()`select fp.api_pair_terminal(${staff.userId}::uuid, ${body.label}, ${spki}) as terminal_id`;
    return ok({ terminalId: terminal_id, storeName: staff.storeName }, 201);
  });
}
