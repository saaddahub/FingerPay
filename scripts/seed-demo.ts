// Demo seed (SPEC §9.3). Repeatable: a second run changes nothing. Refuses FP_ENV=production.
// usage: npm run seed:demo                     (local stack, .env.local)
//        node scripts/seed-demo.ts .env.staging.local
// The service-role key is used only for the Auth admin API (creating staff). Schema fp is written
// by the owner connection (merchant, ledger funding) and by fp_app through the real enrollment path.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { accountIndex, cnicIndex, demoThumbToken, encryptPii, last4, normalizeAccountNo, parseKey32, parseKeyring } from "../src/lib/fp/crypto.ts";
import { sslFor } from "../src/lib/fp/db.ts";
import { enrollCustomer } from "../src/lib/fp/enrollment.ts";

const envFile = process.argv[2] ?? ".env.local";
process.loadEnvFile(envFile);
const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing in ${envFile}`);
  return v;
};
if (process.env.FP_ENV === "production") throw new Error("the demo seed refuses to run when FP_ENV=production");

const keys = { keyring: parseKeyring(need("FP_KEYRING")), lookupKey: parseKey32(need("FP_LOOKUP_KEY"), "FP_LOOKUP_KEY") };
const demoKey = parseKey32(need("FP_DEMO_KEY"), "FP_DEMO_KEY");
const ca = process.env.FP_DATABASE_CA || undefined;
const connect = (url: string) => postgres(url, { max: 1, prepare: false, ssl: sslFor(url, ca), onnotice: () => {} });
const owner = connect(need("FP_SEED_DATABASE_URL"));
const app = connect(need("FP_DATABASE_URL"));
const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
}).auth.admin;

const STORE = { name: "Rasheed Kiryana Store", owner: "Rasheed Ahmed", location: "Johar Town, Lahore", accountNo: "ABL-BIZ-001928374" };
const STAFF = [
  { email: "officer@fingerpay.test", name: "Branch Officer", role: "BRANCH_OFFICER", atStore: false },
  { email: "manager@fingerpay.test", name: "Branch Manager", role: "BRANCH_MANAGER", atStore: false },
  { email: "owner@fingerpay.test", name: "Rasheed Ahmed", role: "MERCHANT_OWNER", atStore: true },
  { email: "cashier@fingerpay.test", name: "Store Cashier", role: "MERCHANT_CASHIER", atStore: true },
  { email: "admin@fingerpay.test", name: "Bank Admin", role: "BANK_ADMIN", atStore: false },
  { email: "auditor@fingerpay.test", name: "Bank Auditor", role: "AUDITOR", atStore: false },
  { email: "observer@fingerpay.test", name: "Demo Observer", role: "AUDITOR", atStore: false },  // reads the demo SMS feed
] as const;
const SHOPPERS = [
  { fullName: "Ayesha Khan", displayName: "Ayesha K.", cnic: "35202-1122334-6", phone: "03001234567", accountNo: "ABL-SAL-998877665", accountType: "SHOPPER_SALARY", openingBalance: "15000.00" },
  { fullName: "Bilal Hussain", displayName: "Bilal H.", cnic: "35202-7788990-1", phone: "03451234567", accountNo: "ABL-STU-445566778", accountType: "STUDENT_NON_PTA", openingBalance: "450.00" },
] as const;

try {
  // ── 1. Staff accounts (Auth admin API). Passwords go only to the gitignored credentials file.
  const CREDS = ".demo-credentials.local.md";
  const saved = new Map<string, string>();
  if (existsSync(CREDS)) for (const m of readFileSync(CREDS, "utf8").matchAll(/^\| (\S+@\S+) \| `([^`]+)` \|/gm)) saved.set(m[1], m[2]);
  const { data: list, error: listErr } = await admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const ids = new Map<string, string>();
  let created = 0, reset = 0;
  const newPassword = () => randomBytes(18).toString("base64url") + "Aa1!";  // meets the 12+ mixed-class policy
  for (const s of STAFF) {
    const existing = list.users.find((u) => u.email === s.email);
    if (!existing) {
      const password = newPassword();
      const { data, error } = await admin.createUser({ email: s.email, password, email_confirm: true });
      if (error) throw error;
      ids.set(s.email, data.user.id);
      saved.set(s.email, password);
      created++;
    } else {
      ids.set(s.email, existing.id);
      if (!saved.has(s.email)) {  // credentials file lost: issue a new password rather than leave the account unusable
        const password = newPassword();
        const { error } = await admin.updateUserById(existing.id, { password });
        if (error) throw error;
        saved.set(s.email, password);
        reset++;
      }
    }
  }
  if (created || reset) {
    writeFileSync(CREDS, `# FingerPay demo staff (local/staging only). Gitignored. Never paste into chat or git.\n\n| Email | Password | Role |\n|---|---|---|\n` +
      STAFF.map((s) => `| ${s.email} | \`${saved.get(s.email)}\` | ${s.role} |`).join("\n") + "\n");
  }

  // ── 2. Store, staff rows, ledger funding (owner connection, one transaction).
  await owner.begin(async (tx) => {
    let [store] = await tx`select merchant_id from fp.merchants where store_name = ${STORE.name}`;
    if (!store) [store] = await tx`insert into fp.merchants(store_name, owner_display_name, location)
      values (${STORE.name}, ${STORE.owner}, ${STORE.location}) returning merchant_id`;
    const merchantId: string = store.merchant_id;

    for (const s of STAFF) {
      await tx`insert into fp.staff(auth_user_id, display_name, role, merchant_id)
        values (${ids.get(s.email)!}::uuid, ${s.name}, ${s.role}, ${s.atStore ? merchantId : null}::uuid)
        on conflict (auth_user_id) do nothing`;
    }

    const [acct] = await tx`select account_id from fp.accounts where merchant_id = ${merchantId}::uuid`;
    if (!acct) {
      const no = normalizeAccountNo(STORE.accountNo);
      await tx`insert into fp.accounts(kind, merchant_id, account_no_enc, account_no_idx, account_no_last4)
        values ('MERCHANT_CASA', ${merchantId}::uuid,
          ${encryptPii(keys.keyring, no, { table: "accounts", column: "account_no_enc", rowId: merchantId })}::bytea,
          ${accountIndex(keys.lookupKey, no)}::bytea, ${last4(no)})`;
    }

    const account = async (where: "OPENING_EQUITY" | "MARKETING_POOL" | "MERCHANT") =>
      where === "MERCHANT"
        ? (await tx`select account_id from fp.accounts where merchant_id = ${merchantId}::uuid`)[0].account_id
        : (await tx`select account_id from fp.accounts where kind = ${where}`)[0].account_id;
    const equity = await account("OPENING_EQUITY");
    // post_journal is idempotent on its key + payload, so re-running returns the original journals.
    const journal = (kind: string, key: string, memo: string, to: string, amount: string) =>
      tx`select fp.post_journal(${kind}, ${key}, 'seed', ${memo},
        ${tx.json([{ account_id: equity, amount: "-" + amount }, { account_id: to, amount }])})`;
    await journal("POOL_FUNDING", "seed:marketing-pool", "Marketing pool funding (simulation)", await account("MARKETING_POOL"), "100000.00");
    await journal("OPENING_BALANCE", "seed:rasheed-opening", "Opening balance (simulation)", await account("MERCHANT"), "18450.00");
    await tx`insert into fp.merchant_monthly_stats(merchant_id, month, tx_count)
      values (${merchantId}::uuid, date_trunc('month', now() at time zone 'Asia/Karachi')::date, 142)
      on conflict (merchant_id, month) do nothing`;
    // Demo databases only (SPEC §9.3 step 4); the migrations never grant this.
    await tx`grant execute on function fp.api_demo_finger_tray() to fp_app`;
  });

  // ── 3. Shoppers through the real enrollment path, as fp_app, acting as the branch officer.
  const officer = ids.get("officer@fingerpay.test")!;
  let enrolled = 0;
  for (const s of SHOPPERS) {
    const [found] = await app`select customer_id from fp.api_find_customer(${officer}::uuid, ${cnicIndex(keys.lookupKey, s.cnic)}::bytea)`;
    if (found) continue;
    const customerId = randomUUID();
    const result = await enrollCustomer(app, keys, {
      ...s, actor: officer, customerId, thumbToken: demoThumbToken(demoKey, customerId),
      nadraRef: "NADRA-SIM-" + randomBytes(6).toString("hex").toUpperCase(), consentVersion: "bio-consent-v1", referralCode: null,
    });
    if (!result.ok) throw new Error(`enrolling ${s.displayName} failed: ${result.error}`);
    enrolled++;
  }
  // Bilal is an existing user with a known referral code (SPEC §0 row 16, §9.3 step 3).
  await owner`update fp.customers set referral_code = 'BILAL-FP100', first_payment_at = coalesce(first_payment_at, now())
    where cnic_idx = ${cnicIndex(keys.lookupKey, SHOPPERS[1].cnic)}::bytea
      and (referral_code is distinct from 'BILAL-FP100' or first_payment_at is null)`;

  // ── 4. The demo SMS feed reads as the observer.
  const observer = ids.get("observer@fingerpay.test")!;
  const envText = readFileSync(envFile, "utf8");
  if (!envText.includes(`FP_DEMO_OBSERVER_ID=${observer}`)) {
    writeFileSync(envFile, /^FP_DEMO_OBSERVER_ID=.*$/m.test(envText)
      ? envText.replace(/^FP_DEMO_OBSERVER_ID=.*$/m, `FP_DEMO_OBSERVER_ID=${observer}`)
      : envText.trimEnd() + `\nFP_DEMO_OBSERVER_ID=${observer}\n`);
  }

  const [{ health }] = await app`select fp.api_health() as health`;
  console.log(`staff: ${created} created, ${reset} password(s) reset, ${STAFF.length - created - reset} unchanged; shoppers enrolled: ${enrolled}`);
  console.log(`database now has ${health.merchants} merchant(s), ${health.customers} shopper(s); credentials in ${CREDS}`);
} finally {
  await owner.end();
  await app.end();
}
