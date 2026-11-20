import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/fp/auth";
import { handle, ok, rateLimit } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

// Who is signed in (staff). The Android app calls this right after sign-in.
export function GET(request: NextRequest) {
  return handle("me", async () => {
    const staff = await requireStaff(request);
    await rateLimit(`me:${staff.userId}`, 60, 60);
    return ok({ role: staff.role, displayName: staff.displayName, storeName: staff.storeName });
  });
}
