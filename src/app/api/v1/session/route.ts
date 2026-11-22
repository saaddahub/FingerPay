import { createHmac, randomInt } from "node:crypto";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/fp/db";
import { env } from "@/lib/fp/env";
import { HttpError } from "@/lib/fp/errors";
import { handle, ok, parseBody, rateLimit } from "@/lib/fp/route";
import { credentialsSchema } from "@/lib/fp/signup";

export const dynamic = "force-dynamic";

function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const hostOrigin = host ? `${request.nextUrl.protocol}//${host}` : null;
  if (!origin || (origin !== request.nextUrl.origin && origin !== hostOrigin)) {
    throw new HttpError(403, "FP403", "Request origin is not allowed.");
  }
}

function otpDigest(email: string, code: string): Buffer {
  return createHmac("sha256", env().lookupKey)
    .update(`otp:${email.trim().toLowerCase()}:${code.trim()}`)
    .digest();
}

function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

function buildOtpEmailHtml(email: string, code: string): string {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your FingerPay verification code</title>
</head>
<body style="margin:0;padding:40px 20px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,sans-serif;color:#0a0a0b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;border:1px solid rgba(10,10,11,0.1);overflow:hidden;">
    <tr>
      <td style="padding:36px 36px 20px;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6e6e73;margin-bottom:10px;">
          FingerPay · Email Verification
        </div>
        <h1 style="margin:0 0 12px;font-size:26px;font-weight:500;letter-spacing:-0.03em;line-height:1.15;color:#0a0a0b;">
          Verify your email address.
        </h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#6e6e73;">
          Enter this 6-digit verification code on the FingerPay website or Android app to confirm <strong style="color:#0a0a0b;font-weight:500;">${email}</strong> and unlock your PKR 200.00 demo wallet credit.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 36px 24px;">
        <div style="padding:24px;border-radius:16px;background:#f5f5f7;border:1px solid rgba(10,10,11,0.08);text-align:center;">
          <div style="font-size:36px;font-weight:500;letter-spacing:0.16em;font-variant-numeric:tabular-nums;color:#0a0a0b;">
            ${spaced}
          </div>
          <div style="margin-top:8px;font-size:12px;color:#6e6e73;">
            Valid for 15 minutes · Single use
          </div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 36px 32px;">
        <p style="margin:0;font-size:12px;line-height:1.55;color:#a1a1a6;">
          If you did not request a FingerPay account, you can safely ignore this email. FingerPay is a student prototype; all bank, identity, and payment integrations are simulated.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new HttpError(503, "MAIL_UNAVAILABLE", "Email verification service is not configured.");
  }
  const preferredFrom = process.env.RESEND_FROM_EMAIL?.trim();
  const candidates = Array.from(
    new Set([
      ...(preferredFrom ? [preferredFrom] : []),
      "FingerPay <noreply@fingerpay.app>",
      "FingerPay <onboarding@resend.dev>",
    ]),
  );

  const subject = `${code} is your FingerPay verification code`;
  const html = buildOtpEmailHtml(email, code);
  const text = `Your FingerPay verification code is: ${code}\n\nEnter this 6-digit code in FingerPay to confirm ${email} and activate your PKR 200.00 demo wallet. Valid for 15 minutes.`;

  for (const from of candidates) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [email], subject, html, text }),
    });
    if (res.ok) return;
  }
  throw new HttpError(502, "MAIL_FAILED", "Could not send the verification code to your email. Check your address and try again.");
}

function sessionPayload(session: { access_token: string; refresh_token: string; expires_in: number } | null) {
  if (!session) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
  };
}

export function POST(request: NextRequest) {
  return handle("session.create", async () => {
    checkOrigin(request);
    if (!env().demoSignup) throw new HttpError(403, "DEMO_DISABLED", "Demo accounts are unavailable.");
    const body = await request.text();
    if (body.length > 2048) throw new HttpError(413, "BODY_TOO_LARGE", "Request is too long.");
    const input = parseBody(body, credentialsSchema);
    const normalizedEmail = input.email.trim().toLowerCase();
    const bucket = createHmac("sha256", env().lookupKey).update(normalizedEmail).digest("hex");
    await rateLimit(`auth:${bucket}`, 60, 10);

    const supabase = await createClient();
    const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
    const isLocalSupabase = ["127.0.0.1", "localhost"].includes(new URL(env().supabaseUrl).hostname);
    const useEmailOtp = hasResend && !isLocalSupabase;

    if (input.action === "signup" || input.action === "resend") {
      if (useEmailOtp) {
        const code = generateOtpCode();
        await db()`select fp.api_register_email_otp(${normalizedEmail}, ${input.password}, ${otpDigest(normalizedEmail, code)})`;
        await sendOtpEmail(normalizedEmail, code);
        return ok({ signedIn: false, requiresCode: true, email: normalizedEmail });
      }
      // Local CI fallback when running against 127.0.0.1 without external mail delivery
      const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password: input.password });
      if (error) {
        throw new HttpError(
          error.status === 429 ? 429 : 400,
          "AUTH",
          "Could not create your account. Try signing in if you already registered.",
        );
      }
      return ok({ signedIn: !!data.session, requiresCode: !data.session, session: sessionPayload(data.session) });
    }

    if (input.action === "verify") {
      const [row] = await db()`select fp.api_verify_email_otp(${normalizedEmail}, ${otpDigest(normalizedEmail, input.code!)}) as verified`;
      if (!row?.verified) {
        throw new HttpError(400, "INVALID_CODE", "Invalid or expired 6-digit verification code. Check your email or tap Resend code.");
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: input.password });
      if (error || !data.session) {
        throw new HttpError(400, "AUTH", "Email verified, but sign-in failed. Please sign in with your password.");
      }
      return ok({ signedIn: true, requiresCode: false, session: sessionPayload(data.session) });
    }

    // action === "login"
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: input.password });
    if (error) {
      if (useEmailOtp && /not confirmed/i.test(error.message ?? "")) {
        const code = generateOtpCode();
        await db()`select fp.api_register_email_otp(${normalizedEmail}, ${input.password}, ${otpDigest(normalizedEmail, code)})`;
        await sendOtpEmail(normalizedEmail, code);
        return ok({ signedIn: false, requiresCode: true, email: normalizedEmail });
      }
      throw new HttpError(
        error.status === 429 ? 429 : 400,
        "AUTH",
        "Could not sign in. Check your email and password.",
      );
    }
    return ok({ signedIn: !!data.session, requiresCode: false, session: sessionPayload(data.session) });
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
