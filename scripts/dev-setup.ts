// Local dev only. Points .env.local at the local Supabase stack, gives fp_app a fresh random password
// on the LOCAL database, and generates the app keys. Prints no secret values.
// usage: npm run dev:setup   (after `npx supabase start`)
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const ENV_FILE = ".env.local";
const STAGING_FILE = ".env.staging.local";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

const parseEnv = (text: string) =>
  new Map(text.split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]));

const status = parseEnv(execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
const apiUrl = status.get("API_URL"), dbUrl = status.get("DB_URL");
const anonKey = status.get("ANON_KEY") || status.get("PUBLISHABLE_KEY");
const serviceKey = status.get("SERVICE_ROLE_KEY") || status.get("SECRET_KEY");
if (!apiUrl || !dbUrl || !anonKey || !serviceKey) throw new Error("local Supabase is not running: run `npx supabase start` first");
if (!LOCAL_HOSTS.has(new URL(dbUrl).hostname) || !LOCAL_HOSTS.has(new URL(apiUrl).hostname)) {
  throw new Error("refusing: dev-setup only ever touches a local database");
}

// The live project's values are kept for staging, moved once and never overwritten.
if (existsSync(ENV_FILE) && readFileSync(ENV_FILE, "utf8").includes(".supabase.co")) {
  if (existsSync(STAGING_FILE)) throw new Error(`${ENV_FILE} points at a hosted project and ${STAGING_FILE} already exists; sort them out by hand`);
  renameSync(ENV_FILE, STAGING_FILE);
  console.log(`moved the hosted project's values to ${STAGING_FILE}`);
}
const prev = existsSync(ENV_FILE) ? parseEnv(readFileSync(ENV_FILE, "utf8")) : new Map<string, string>();

// Existing keys are kept: rotating them here would orphan every encrypted row and thumb lookup.
const b64 = () => randomBytes(32).toString("base64");
const generated: string[] = [];
const keep = (name: string, make: () => string) => prev.get(name) || (generated.push(name), make());

const password = randomBytes(24).toString("base64url");  // [A-Za-z0-9_-] only: safe inside a SQL literal
const owner = postgres(dbUrl, { max: 1, onnotice: () => {} });
await owner.unsafe(`ALTER ROLE fp_app WITH LOGIN PASSWORD '${password}'`);
await owner.end();
const appUrl = new URL(dbUrl);
appUrl.username = "fp_app";
appUrl.password = password;

writeFileSync(ENV_FILE, `# Local dev stack (written by npm run dev:setup). Never commit. Hosted values live in ${STAGING_FILE}.
NEXT_PUBLIC_SUPABASE_URL=${apiUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}

FP_DATABASE_URL=${appUrl.toString()}
FP_KEYRING=${keep("FP_KEYRING", () => JSON.stringify({ active: 1, keys: { 1: b64() } }))}
FP_LOOKUP_KEY=${keep("FP_LOOKUP_KEY", b64)}

FP_ENV=development
FP_DEMO_MODE=true
FP_DEMO_KEY=${keep("FP_DEMO_KEY", b64)}
FP_DEMO_OBSERVER_ID=${prev.get("FP_DEMO_OBSERVER_ID") ?? ""}

# LOCAL ONLY, seed script: the local stack's well-known dev credentials. Never deployed (env.ts refuses them).
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}
FP_SEED_DATABASE_URL=${dbUrl}
`);
console.log(`wrote ${ENV_FILE} for the local stack at ${apiUrl}; fp_app has a new random local password`);
console.log(generated.length ? `generated: ${generated.join(", ")}` : "kept the existing app keys");
