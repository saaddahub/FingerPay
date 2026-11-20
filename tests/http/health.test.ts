// M0 gate over HTTP: health route, roles, rate limit, security headers.
// Needs: local stack + `npm run seed:demo` + the app on FP_TEST_BASE_URL (default http://127.0.0.1:3000).
// usage: npm run test:http
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

process.loadEnvFile(".env.local");
const BASE = process.env.FP_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const creds = new Map([...readFileSync(".demo-credentials.local.md", "utf8").matchAll(/^\| (\S+@\S+) \| `([^`]+)` \|/gm)].map((m) => [m[1], m[2]]));

// Signs in the way the app's server client does and returns the resulting cookie header.
async function sessionCookie(email: string): Promise<string> {
  const jar = new Map<string, string>();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: creds.get(email)! });
  assert.equal(error, null);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

const ip = () => `203.0.113.${randomInt(1, 255)}`;  // TEST-NET-3; a fresh rate-limit bucket per test
const health = (headers: Record<string, string> = {}) => fetch(`${BASE}/api/v1/system/health`, { headers: { "x-forwarded-for": ip(), ...headers } });

test("anonymous callers see only db status", async () => {
  const res = await health();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { db: "ok" });
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("bank admin sees 1 merchant and 2 shoppers", async () => {
  const body = await (await health({ cookie: await sessionCookie("admin@fingerpay.test") })).json();
  assert.equal(body.db, "ok");
  assert.equal(Number(body.merchants), 1);
  assert.equal(Number(body.customers), 2);
});

test("a cashier does not see counts", async () => {
  const res = await health({ cookie: await sessionCookie("cashier@fingerpay.test") });
  assert.deepEqual(await res.json(), { db: "ok" });
});

test("security headers are present (SPEC §4.6)", async () => {
  const res = await health();
  const csp = res.headers.get("content-security-policy") ?? "";
  assert.match(csp, /script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'", "default-src 'self'"]) assert.ok(csp.includes(d), d);
  assert.equal(res.headers.get("strict-transport-security"), "max-age=63072000; includeSubDomains");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(res.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(res.headers.get("x-powered-by"), null);
  assert.equal(res.headers.get("x-xss-protection"), null);
});

test("health is rate limited to 60/min per client", async () => {
  const client = ip();
  const s = new Date().getUTCSeconds();  // fixed 60 s windows: don't straddle a boundary
  if (s > 45) await new Promise((r) => setTimeout(r, (61 - s) * 1000));
  const statuses: number[] = [];
  for (let i = 0; i < 61; i++) statuses.push((await fetch(`${BASE}/api/v1/system/health`, { headers: { "x-forwarded-for": client } })).status);
  assert.equal(statuses.filter((s) => s === 200).length, 60);
  assert.equal(statuses.at(-1), 429);
});
