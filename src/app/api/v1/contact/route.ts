import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { log } from "@/lib/fp/log";
import { NO_STORE } from "@/lib/fp/route";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    email: z.email().max(160),
    kind: z.enum(["contact", "review", "subscribe"]),
    name: z.string().trim().max(100).optional(),
    topic: z.enum(["bank", "shop", "investor", "general"]).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    message: z.string().trim().max(1500).optional(),
  })
  .strict();

// Lightweight per-process rate limiter (10 submissions / 60s per hashed IP) so public pages work even without DB.
const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const entry = buckets.get(ipHash);
  if (!entry || now > entry.resetAt) {
    buckets.set(ipHash, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TOPIC_LABELS: Record<string, string> = {
  bank: "Bank Partner / SBP Raast Integration",
  shop: "Pilot Kiryana Store / Campus Counter",
  investor: "Competition Judge / Investor Review",
  general: "General Inquiry",
};

function buildEmail(data: z.infer<typeof BodySchema>): { subject: string; html: string; text: string } {
  const greeting = data.name ? `Hi ${escapeHtml(data.name)},` : "Hello from FingerPay,";
  const stars = data.rating ? "★".repeat(data.rating) + "☆".repeat(5 - data.rating) : null;
  const topicLabel = data.topic ? TOPIC_LABELS[data.topic] ?? "General Inquiry" : null;

  const subject =
    data.kind === "review"
      ? "Thank you for reviewing FingerPay"
      : data.kind === "contact"
        ? "Thank you for reaching out to the FingerPay team"
        : "Thank you for exploring FingerPay — Project Brief";

  const intro =
    data.kind === "review"
      ? "Thank you for taking a moment to review the FingerPay prototype. Your feedback helps us sharpen our counter experience and security architecture for our pilot."
      : data.kind === "contact"
        ? "Thank you for contacting the FingerPay team. We have logged your message and sent this project brief so you have all technical and economic details on hand."
        : "Thank you for sharing your email on FingerPay. Here is a concise overview of how our phone-free, card-free biometric counter checkout works.";

  const feedbackBlockHtml =
    stars || data.message || topicLabel
      ? `<div style="margin:24px 0;padding:20px;border-radius:16px;background:#f5f5f7;border:1px solid rgba(10,10,11,0.08);">
          <div style="font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#6e6e73;margin-bottom:8px;">
            ${data.kind === "review" ? "Your Review Record" : "Your Inquiry Summary"}
          </div>
          ${stars ? `<div style="font-size:18px;letter-spacing:2px;color:#0a0a0b;margin-bottom:8px;">${stars} (${data.rating}/5)</div>` : ""}
          ${topicLabel ? `<div style="font-size:13px;font-weight:600;color:#0a0a0b;margin-bottom:6px;">Track: ${escapeHtml(topicLabel)}</div>` : ""}
          ${data.message ? `<div style="font-size:14px;line-height:1.55;color:#0a0a0b;">“${escapeHtml(data.message)}”</div>` : ""}
        </div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:32px 16px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:36px 32px;border:1px solid rgba(10,10,11,0.08);box-shadow:0 12px 32px rgba(10,10,11,0.06);">
    <div style="font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#6e6e73;margin-bottom:12px;">
      FingerPay · Paper &amp; Ink Brief
    </div>
    <h1 style="margin:0 0 16px;font-size:28px;line-height:1.1;letter-spacing:-0.03em;font-weight:600;color:#0a0a0b;">
      Pay with nothing. Settled in under 3 seconds.
    </h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#0a0a0b;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6e6e73;">${intro}</p>
    ${feedbackBlockHtml}
    <div style="margin:24px 0;padding-top:20px;border-top:1px solid rgba(10,10,11,0.1);">
      <div style="font-size:11px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:#6e6e73;margin-bottom:12px;">
        How FingerPay Works at a Glance
      </div>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.65;color:#0a0a0b;">
        <li><strong>Under 3 seconds at the counter:</strong> The cashier enters the PKR amount on a hardware-paired Android terminal; the shopper taps a thumb; the screen settles immediately.</li>
        <li><strong>0 fingerprint images stored:</strong> Only a keyed HMAC-SHA256 blind index of the scan token reaches the database. PII is encrypted with AES-256-GCM bound to row and column AAD.</li>
        <li><strong>Built for every phone in Pakistan:</strong> Shoppers need no smartphone or data plan. Receipts arrive by plain SMS with instant <code>Reply LOCK</code> and <code>Reply DISPUTE</code> controls.</li>
        <li><strong>Fair kiryana economics:</strong> PKR 0 fee on sales up to PKR 100, and 0.45% above PKR 100 (capped at PKR 25). Declines cost PKR 0.</li>
      </ul>
    </div>
    <div style="margin:28px 0 16px;">
      <a href="https://www.fingerpay.app/signup" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#0a0a0b;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;margin-right:8px;">
        Claim PKR 200 Demo Wallet →
      </a>
      <a href="https://www.fingerpay.app/how-it-works" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#f5f5f7;color:#0a0a0b;font-size:14px;font-weight:500;text-decoration:none;">
        Read How It Works
      </a>
    </div>
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid rgba(10,10,11,0.08);font-size:12px;line-height:1.5;color:#a1a1a6;">
      FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.
    </p>
  </div>
</body>
</html>`;

  const text = [
    "FingerPay — Pay with nothing. Settled in under 3 seconds.",
    "",
    greeting.replace(/&#39;/g, "'"),
    intro,
    stars ? `Rating: ${stars} (${data.rating}/5)` : "",
    topicLabel ? `Topic: ${topicLabel}` : "",
    data.message ? `Message: "${data.message}"` : "",
    "",
    "Key rules of the FingerPay prototype:",
    "- Under 3 seconds at the counter on any paired Android terminal",
    "- 0 fingerprint images stored (only a keyed HMAC-SHA256 blind index)",
    "- Plain-SMS receipts on any keypad phone with Reply LOCK & Reply DISPUTE",
    "- 0.45% merchant fee above PKR 100 (capped at PKR 25); PKR 0 under PKR 100",
    "",
    "Try the live demo (PKR 200 instant credit): https://www.fingerpay.app/signup",
    "Explore How It Works: https://www.fingerpay.app/how-it-works",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

async function sendViaResend(apiKey: string, to: string, emailContent: { subject: string; html: string; text: string }): Promise<{ sent: boolean; id?: string }> {
  const candidates = [
    process.env.RESEND_FROM_EMAIL,
    "FingerPay <noreply@fingerpay.app>",
    "FingerPay <hello@fingerpay.app>",
    "FingerPay <noreply@fingerpay.dev>",
    "FingerPay <hello@fingerpay.dev>",
    "FingerPay <onboarding@resend.dev>",
  ].filter((v): v is string => Boolean(v));

  const bcc = process.env.RESEND_NOTIFY_EMAIL ? [process.env.RESEND_NOTIFY_EMAIL] : undefined;

  for (const from of candidates) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          ...(bcc ? { bcc } : {}),
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { id?: string };
        return { sent: true, id: json.id };
      }
    } catch {
      // Try next sender candidate or fall back cleanly
    }
  }
  return { sent: false };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("base64url").slice(0, 22);

  if (!checkRateLimit(ipHash)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "too many submissions, please wait a minute" } },
      { status: 429, headers: { ...NO_STORE, "retry-after": "60" } },
    );
  }

  let raw: unknown;
  try {
    const text = await request.text();
    raw = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "body must be valid JSON" } },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "please enter a valid email address and message" } },
      { status: 400, headers: NO_STORE },
    );
  }

  const payload = parsed.data;
  const emailContent = buildEmail(payload);
  const apiKey = process.env.RESEND_API_KEY || process.env.FP_RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY;

  let delivered = false;
  if (apiKey) {
    const res = await sendViaResend(apiKey, payload.email, emailContent);
    delivered = res.sent;
  }

  log.info("site.contact.submitted", {
    kind: payload.kind,
    topic: payload.topic ?? null,
    rating: payload.rating ?? null,
    delivered,
  });

  return NextResponse.json(
    {
      ok: true,
      delivered,
      subject: emailContent.subject,
    },
    { status: 200, headers: NO_STORE },
  );
}
