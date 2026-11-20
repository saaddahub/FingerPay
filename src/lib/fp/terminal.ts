// Terminal request signing (SPEC §4.5). Order: strict header parse → rate limit → key lookup (≤ 30 s cache)
// → ECDSA P-256 verify. The database then enforces status, the 60 s window and nonce uniqueness in the same
// transaction as the action. Every failure is a generic 401, logged as a security event.
import { createPublicKey, verify, type KeyObject } from "node:crypto";
import type { NextRequest } from "next/server";
import { db } from "./db.ts";
import { HttpError } from "./errors.ts";
import { log } from "./log.ts";
import { rateLimit, UUID } from "./route.ts";
import { signedString } from "./signing.ts";

export type SignedRequest = { terminalId: string; merchantId: string; nonce: Buffer; signedAt: Date; body: string };

const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
const KEY_TTL_MS = 30_000;
const keys = new Map<string, { key: KeyObject | null; merchantId: string; at: number }>();

function reject(reason: string, terminalId?: string): never {
  log.security("terminal_auth_failed", { reason, terminal: terminalId });
  throw new HttpError(401, "FP401", "unauthenticated");
}

async function publicKey(terminalId: string): Promise<{ key: KeyObject | null; merchantId: string }> {
  const hit = keys.get(terminalId);
  if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit;
  const [row] = await db()`select * from fp.api_terminal_auth(${terminalId}::uuid)`;
  const entry = {
    key: row && row.status === "ACTIVE" ? createPublicKey({ key: Buffer.from(row.public_key_spki), format: "der", type: "spki" }) : null,
    merchantId: row?.merchant_id ?? "",
    at: Date.now(),
  };
  keys.set(terminalId, entry);
  return entry;
}

export async function verifyTerminal(request: NextRequest): Promise<SignedRequest> {
  const h = request.headers;
  const terminalId = (h.get("x-fp-terminal") ?? "").toLowerCase();
  const timestamp = h.get("x-fp-timestamp") ?? "";
  const nonceText = h.get("x-fp-nonce") ?? "";
  const sigText = h.get("x-fp-signature") ?? "";

  // 1. Strict header parse
  if (!UUID.test(terminalId)) reject("bad_terminal_header");
  if (!TS.test(timestamp) || Number.isNaN(Date.parse(timestamp))) reject("bad_timestamp", terminalId);
  if (!B64URL.test(nonceText) || !B64URL.test(sigText)) reject("bad_encoding", terminalId);
  const nonce = Buffer.from(nonceText, "base64url");
  const signature = Buffer.from(sigText, "base64url");
  if (nonce.length < 16 || nonce.length > 32 || signature.length !== 64) reject("bad_lengths", terminalId);

  // 2. Rate limit (all signed requests, per terminal)
  await rateLimit(`terminal:${terminalId}`, 60, 240);

  // 3–4. Key lookup and signature
  const { key, merchantId } = await publicKey(terminalId);
  if (!key) reject("unknown_or_revoked", terminalId);
  const body = await request.text();
  const url = new URL(request.url);
  const message = signedString(request.method, url.pathname + url.search, terminalId, timestamp, nonceText, body);
  const valid = verify("sha256", Buffer.from(message, "utf8"), { key, dsaEncoding: "ieee-p1363" }, signature);
  if (!valid) reject("bad_signature", terminalId);

  return { terminalId, merchantId, nonce, signedAt: new Date(timestamp), body };
}
