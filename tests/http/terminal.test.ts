// The Android terminal's API over HTTP: pairing, signed requests, a sale, freeze/unfreeze, the ledger.
// Needs: a backend with `npm run seed:demo` applied, FP_DEMO_MODE=true, and the app on FP_TEST_BASE_URL.
// usage: npm run test:http
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { signedString } from "../../src/lib/fp/signing.ts";

process.loadEnvFile(".env.local");
const BASE = process.env.FP_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const creds = new Map([...readFileSync(".demo-credentials.local.md", "utf8").matchAll(/^\| (\S+@\S+) \| `([^`]+)` \|/gm)].map((m) => [m[1], m[2]]));

async function token(email: string): Promise<string> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: creds.get(email)! });
  assert.equal(error, null);
  return data.session!.access_token;
}

function signer(terminalId: string, key: KeyObject) {
  return (method: string, path: string, body = "", nonce = randomBytes(16).toString("base64url"), ts = new Date().toISOString()) => ({
    "x-fp-terminal": terminalId,
    "x-fp-timestamp": ts,
    "x-fp-nonce": nonce,
    "x-fp-signature": sign("sha256", Buffer.from(signedString(method, path, terminalId, ts, nonce, body)), { key, dsaEncoding: "ieee-p1363" }).toString("base64url"),
  });
}

const api = (path: string, init: RequestInit & { bearer?: string; signed?: Record<string, string> } = {}) =>
  fetch(BASE + path, {
    ...init,
    headers: { "content-type": "application/json", ...(init.bearer ? { authorization: `Bearer ${init.bearer}` } : {}), ...(init.signed ?? {}), ...(init.headers ?? {}) },
  });

test("the Android terminal flow works end to end", async () => {
  const owner = await token("owner@fingerpay.test");
  const cashier = await token("cashier@fingerpay.test");

  // Pair (owner only)
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const spki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  assert.equal((await api("/api/v1/terminals/pair", { method: "POST", bearer: cashier, body: JSON.stringify({ label: "HTTP test", publicKey: spki }) })).status, 403);
  const paired = await api("/api/v1/terminals/pair", { method: "POST", bearer: owner, body: JSON.stringify({ label: "HTTP test", publicKey: spki }) });
  assert.equal(paired.status, 201);
  const { terminalId } = await paired.json();
  const s = signer(terminalId, privateKey);

  // Signed status; a forged signature is a generic 401
  const self = await api("/api/v1/terminals/self", { signed: s("GET", "/api/v1/terminals/self") });
  assert.equal(self.status, 200);
  assert.equal((await self.json()).frozen, false);
  const forged = { ...s("GET", "/api/v1/terminals/self"), "x-fp-signature": randomBytes(64).toString("base64url") };
  assert.equal((await api("/api/v1/terminals/self", { signed: forged })).status, 401);

  // Replay of the same nonce is refused by the database
  const body = JSON.stringify({ amount: "180.00" });
  const headers = s("POST", "/api/v1/pos/charges", body);
  const open = await api("/api/v1/pos/charges", { method: "POST", bearer: cashier, signed: headers, body });
  assert.equal(open.status, 201);
  const charge = await open.json();
  assert.equal(charge.amount, "180.00");
  assert.equal((await api("/api/v1/pos/charges", { method: "POST", bearer: cashier, signed: headers, body })).status, 409);

  // A body that doesn't match the signature fails
  const tampered = s("POST", "/api/v1/pos/charges", body);
  assert.equal((await api("/api/v1/pos/charges", { method: "POST", bearer: cashier, signed: tampered, body: JSON.stringify({ amount: "1.00" }) })).status, 401);

  // Demo thumb: the first shopper in the tray pays
  const tray = await (await api("/api/v1/demo/finger-tray", { bearer: cashier })).json();
  assert.ok(tray.shoppers.length >= 1);
  assert.ok(!("cnic" in tray.shoppers[0]) && !("balance" in tray.shoppers[0]));
  const thumbBody = JSON.stringify({ source: "demo", customerId: tray.shoppers[0].customerId });
  const paid = await api(`/api/v1/pos/charges/${charge.chargeId}/thumb`, { method: "POST", bearer: cashier, signed: s("POST", `/api/v1/pos/charges/${charge.chargeId}/thumb`, thumbBody), body: thumbBody });
  assert.equal(paid.status, 200);
  const result = await paid.json();
  assert.ok(["SUCCESS", "DECLINED_LOW_BALANCE", "DECLINED_LIMIT"].includes(result.outcome), result.outcome);
  assert.equal(result.amount, "180.00");
  for (const field of ["mdr_fee", "net_to_merchant", "cashback"]) {
    if (result[field] !== null) assert.equal(typeof result[field], "string", field);
  }

  // Freeze (cashier), refused charge, unfreeze needs the owner
  const freeze = (bearer: string, frozen: boolean) => api(`/api/v1/terminals/${terminalId}/freeze`, { method: "POST", bearer, body: JSON.stringify({ frozen }) });
  assert.equal((await freeze(cashier, true)).status, 200);
  const blocked = await api("/api/v1/pos/charges", { method: "POST", bearer: cashier, signed: s("POST", "/api/v1/pos/charges", body), body });
  assert.equal(blocked.status, 423);
  assert.equal((await freeze(cashier, false)).status, 403);
  assert.equal((await freeze(owner, false)).status, 200);

  // Ledger and summary read the staff member's own store; amounts are strings
  const ledger = await (await api("/api/v1/merchant/ledger", { bearer: cashier })).json();
  assert.ok(ledger.sales.some((x: { attemptId: string }) => x.attemptId === result.attempt_id));
  const summary = await (await api("/api/v1/merchant/summary", { bearer: cashier })).json();
  for (const field of ["gross_sales", "mdr_fees", "card_pos_fees_at_2_5pct", "fees_saved_vs_card_pos", "net_settled_today", "allied_bank_balance"]) {
    assert.equal(typeof summary[field], "string", field);
  }

  // Strict bodies: unknown fields and float amounts are refused
  const extra = JSON.stringify({ amount: "10.00", merchantId: "x" });
  assert.equal((await api("/api/v1/pos/charges", { method: "POST", bearer: cashier, signed: s("POST", "/api/v1/pos/charges", extra), body: extra })).status, 400);

  // Clean up: revoke the test terminal
  assert.equal((await api(`/api/v1/terminals/${terminalId}/revoke`, { method: "POST", bearer: owner })).status, 200);
  assert.equal((await api("/api/v1/terminals/self", { signed: s("GET", "/api/v1/terminals/self") })).status, 401);
});
