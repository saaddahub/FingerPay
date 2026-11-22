// Runs against the isolated local Supabase stack in CI; never creates accounts on a hosted project.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const BASE = process.env.FP_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const local = ["127.0.0.1", "localhost"].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname);
const personal = { fullName: "Signup Test", phone: "03001234567", dateOfBirth: "2000-01-31", occupation: "Student", address: "12 Test Street", city: "Lahore", postalCode: "54000", consent: true };

test("customer and merchant signup persist exactly one bonus across web and bearer sessions", { skip: !local }, async () => {
  let customerCookie = "";
  const sessions: string[] = [];
  for (const accountType of ["customer", "merchant"]) {
    const email = `signup-${randomUUID()}@fingerpay.test`;
    const password = `Test-${randomUUID()}`;
    const signup = await fetch(`${BASE}/api/v1/session`, {
      method: "POST", headers: { "content-type": "application/json", origin: BASE },
      body: JSON.stringify({ action: "signup", email, password }),
    });
    assert.equal(signup.status, 200);
    assert.equal((await signup.json()).signedIn, true);
    const cookie = signup.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    sessions.push(cookie);
    assert.ok(cookie);
    const headers = { cookie, origin: BASE, "content-type": "application/json" };
    const incomplete = await fetch(`${BASE}/api/v1/account`, { headers });
    assert.equal((await incomplete.json()).wallet, null);
    const profile = { ...personal, accountType, ...(accountType === "merchant" ? { businessName: "Test Store", businessType: "Grocery", businessAddress: "25 Test Road", businessCity: "Lahore", registrationNumber: "" } : {}) };
    const create = () => fetch(`${BASE}/api/v1/account`, { method: "POST", headers, body: JSON.stringify(profile) });
    const results = await Promise.all([create(), create()]);
    for (const result of results) {
      assert.equal(result.status, 200);
      const { wallet } = await result.json();
      assert.equal(wallet.balance, "200.00");
      assert.equal(wallet.activity.length, 1);
      assert.equal(wallet.demo, true);
      assert.deepEqual(wallet.profile, profile);
    }
    const invalid = await fetch(`${BASE}/api/v1/account`, { method: "POST", headers, body: JSON.stringify({ ...profile, bonus: 10000 }) });
    assert.equal(invalid.status, 400);
    const foreign = await fetch(`${BASE}/api/v1/account`, { method: "POST", headers: { ...headers, origin: "https://other.example" }, body: JSON.stringify(profile) });
    assert.equal(foreign.status, 403);
    // Native apps use the same account through a verified bearer token.
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    assert.equal(error, null);
    const native = await fetch(`${BASE}/api/v1/account`, { headers: { authorization: `Bearer ${data.session!.access_token}` } });
    assert.equal((await native.json()).wallet.balance, "200.00");
    const staff = await fetch(`${BASE}/api/v1/me`, { headers });
    assert.equal(staff.status, 401, "signup does not grant merchant terminal permissions");
    if (accountType === "customer") customerCookie = cookie;
    else {
      const other = await fetch(`${BASE}/api/v1/account`, { headers: { cookie: customerCookie } });
      assert.equal((await other.json()).wallet.profile.accountType, "customer");
    }
  }
  for (const cookie of sessions) {
    const logout = await fetch(`${BASE}/api/v1/session`, { method: "DELETE", headers: { cookie, origin: BASE } });
    assert.equal(logout.status, 200);
  }
});

test("account endpoints reject anonymous access and session writes require the same origin", async () => {
  assert.equal((await fetch(`${BASE}/api/v1/account`)).status, 401);
  assert.equal((await fetch(`${BASE}/api/v1/account`, { method: "POST", body: "{}" })).status, 401);
  assert.equal((await fetch(`${BASE}/api/v1/session`, { method: "POST", headers: { origin: "https://other.example" }, body: "{}" })).status, 403);
});
