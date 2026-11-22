import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/fp/env";
import { HttpError } from "@/lib/fp/errors";
import { handle, ok, parseBody, rateLimit } from "@/lib/fp/route";
import { credentialsSchema } from "@/lib/fp/signup";

export const dynamic = "force-dynamic";

function checkOrigin(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) throw new HttpError(403, "FP403", "Request origin is not allowed.");
}

export function POST(request: NextRequest) {
  return handle("session.create", async () => {
    checkOrigin(request);
    if (!env().demoSignup) throw new HttpError(403, "DEMO_DISABLED", "Demo accounts are unavailable.");
    const body = await request.text();
    if (body.length > 2048) throw new HttpError(413, "BODY_TOO_LARGE", "Request is too long.");
    const input = parseBody(body, credentialsSchema);
    const bucket = createHmac("sha256", env().lookupKey).update(input.email.toLowerCase()).digest("hex");
    await rateLimit(`auth:${bucket}`, 60, 6);
    const supabase = await createClient();
    const { data, error } = input.action === "signup"
      ? await supabase.auth.signUp({ email: input.email, password: input.password })
      : await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) throw new HttpError(error.status === 429 ? 429 : 400, "AUTH", input.action === "signup"
      ? "Could not create your account. Try signing in if you already registered."
      : "Could not sign in. Check your email, password and email confirmation.");
    return ok({ signedIn: !!data.session });
  });
}

export function DELETE(request: NextRequest) {
  return handle("session.delete", async () => {
    checkOrigin(request);
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new HttpError(503, "AUTH", "Could not sign out. Please try again.");
    return ok({ signedOut: true });
  });
}
