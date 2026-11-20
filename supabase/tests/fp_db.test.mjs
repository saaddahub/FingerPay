// FingerPay SQL test suite: applies supabase/migrations to PGlite (Postgres 18, WASM) with
// Supabase's roles stubbed, then runs every spec scenario and attack as the fp_app role.
// usage: npm run test:db
import { PGlite } from '@electric-sql/pglite';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHmac, randomBytes, randomUUID, generateKeyPairSync } from 'node:crypto';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const db = await PGlite.create();

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const eq = (a, b, name) => ok(String(a) === String(b), name, `expected ${b}, got ${a}`);
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const one = async (sql, params = []) => (await q(sql, params))[0];
const errOf = async (sql, params = []) => { try { await db.query(sql, params); return null; } catch (e) { return e.code || e.message; } };
const asApp = async (fn) => { await db.exec('SET ROLE fp_app'); try { return await fn(); } finally { await db.exec('RESET ROLE'); } };
const enc = () => new Uint8Array([1, ...randomBytes(48)]);  // stand-in for an AES-GCM blob (format byte 0x01)
const h32 = () => new Uint8Array(randomBytes(32));
const K_BIO = randomBytes(32), K_DEMO = randomBytes(32);
const thumbOf = (customerId) => {   // demo token -> HMAC lookup, exactly as the server will do it
  const token = createHmac('sha256', K_DEMO).update('cust:' + customerId).digest();
  return new Uint8Array(createHmac('sha256', K_BIO).update(token).digest());
};
const bal = async (where) => Number((await one(`SELECT balance FROM fp.accounts WHERE ${where}`)).balance);
const sys = (kind) => bal(`kind = '${kind}'`);

// ── Supabase stand-ins ───────────────────────────────────────────────────────────────────
await db.exec(`
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);`);

console.log('# migrations');
for (const f of readdirSync(join(repo, 'supabase/migrations')).sort()) {
  try { await db.exec(readFileSync(join(repo, 'supabase/migrations', f), 'utf8')); ok(true, `apply ${f}`); }
  catch (e) { ok(false, `apply ${f}`, e.message); process.exit(1); }
}

// ── Seed (owner), mirroring the demo seed script ────────────────────────────────────────
const staff = { officer: randomUUID(), manager: randomUUID(), owner: randomUUID(), cashier: randomUUID(), admin: randomUUID(), auditor: randomUUID() };
for (const id of Object.values(staff)) await q('INSERT INTO auth.users(id) VALUES ($1)', [id]);
const merchant = (await one(`INSERT INTO fp.merchants(store_name, owner_display_name, location)
  VALUES ('Rasheed Kiryana Store','Rasheed Ahmed','Johar Town, Lahore') RETURNING merchant_id`)).merchant_id;
await q(`INSERT INTO fp.accounts(kind, merchant_id, account_no_enc, account_no_idx, account_no_last4) VALUES ('MERCHANT_CASA',$1,$2,$3,'8374')`, [merchant, enc(), h32()]);
const staffRows = [['officer','BRANCH_OFFICER',null],['manager','BRANCH_MANAGER',null],['owner','MERCHANT_OWNER',merchant],
  ['cashier','MERCHANT_CASHIER',merchant],['admin','BANK_ADMIN',null],['auditor','AUDITOR',null]];
for (const [k, role, m] of staffRows) await q('INSERT INTO fp.staff(auth_user_id, display_name, role, merchant_id) VALUES ($1,$2,$3,$4)', [staff[k], 'Demo ' + k, role, m]);
const journal = (kind, key, entries) => q('SELECT fp.post_journal($1,$2,$3,$4,$5::jsonb)', [kind, key, 'seed', 'seed', JSON.stringify(entries)]);
const acct = async (where) => (await one(`SELECT account_id FROM fp.accounts WHERE ${where}`)).account_id;
await journal('POOL_FUNDING', 'seed:pool', [{ account_id: await acct(`kind='OPENING_EQUITY'`), amount: -100000 }, { account_id: await acct(`kind='MARKETING_POOL'`), amount: 100000 }]);
await journal('OPENING_BALANCE', 'seed:rasheed', [{ account_id: await acct(`kind='OPENING_EQUITY'`), amount: -18450 }, { account_id: await acct(`merchant_id='${merchant}'`), amount: 18450 }]);
await q(`INSERT INTO fp.merchant_monthly_stats(merchant_id, month, tx_count) VALUES ($1, date_trunc('month', now() AT TIME ZONE 'Asia/Karachi')::date, 142)`, [merchant]);

const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const spki = new Uint8Array(publicKey.export({ type: 'spki', format: 'der' }));
const spki2 = new Uint8Array(generateKeyPairSync('ec', { namedCurve: 'P-256' }).publicKey.export({ type: 'spki', format: 'der' }));
const nonce = () => new Uint8Array(randomBytes(16));

console.log('# privileges & hardening');
const apiFns = (await q(`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='fp' AND has_function_privilege('fp_app', p.oid, 'EXECUTE') ORDER BY 1`)).map(r => r.proname);
ok(apiFns.length > 0 && apiFns.every(n => n.startsWith('api_')), 'fp_app can execute only fp.api_* functions', apiFns.join(','));
ok(!apiFns.includes('api_demo_finger_tray'), 'demo finger tray is not granted by migrations');
eq((await one(`SELECT count(*) c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='fp'
  AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    OR has_function_privilege('service_role', p.oid, 'EXECUTE'))`)).c, 0, 'anon/authenticated/service_role can execute no fp function');
eq((await one(`SELECT count(*) c FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='fp' AND c.relkind='r'
  AND (has_table_privilege('fp_app', c.oid, 'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('service_role', c.oid, 'SELECT')
    OR has_table_privilege('anon', c.oid, 'SELECT') OR has_table_privilege('authenticated', c.oid, 'SELECT'))`)).c, 0, 'no role has direct table access');
eq((await one(`SELECT count(*) c FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='fp' AND c.relkind='r' AND NOT c.relrowsecurity`)).c, 0, 'RLS enabled on every fp table');
eq((await one(`SELECT count(*) c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='fp'
  AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) cfg WHERE cfg LIKE 'search_path=%')`)).c, 0, 'every fp function pins search_path');
ok(!(await one(`SELECT has_schema_privilege('anon','fp','USAGE') a`)).a && !(await one(`SELECT has_schema_privilege('service_role','fp','USAGE') a`)).a, 'anon and service_role cannot even see schema fp');
eq(await asApp(() => errOf('SELECT * FROM fp.customers')), '42501', 'fp_app SELECT on a table is denied');
eq(await asApp(() => errOf(`SELECT fp.post_journal('PAYMENT','x12345678','x','x','[]'::jsonb)`)), '42501', 'fp_app cannot call post_journal directly');
await db.exec('SET ROLE service_role');
eq(await errOf('SELECT fp.api_health()'), '42501', 'service_role cannot call FingerPay functions');
await db.exec('RESET ROLE');

console.log('# terminal pairing & signed-request guard');
eq(await asApp(() => errOf('SELECT fp.api_pair_terminal($1,$2,$3)', [staff.cashier, 'Till', spki])), 'FP403', 'cashier cannot pair a terminal');
eq(await asApp(() => errOf('SELECT fp.api_pair_terminal($1,$2,$3)', [staff.owner, 'Till', new Uint8Array(91)])), 'FP400', 'non-P-256 key rejected');
const term = (await asApp(() => one('SELECT fp.api_pair_terminal($1,$2,$3) t', [staff.owner, 'Counter 1', spki]))).t;
const term2 = (await asApp(() => one('SELECT fp.api_pair_terminal($1,$2,$3) t', [staff.owner, 'Counter 2', spki2]))).t;
ok(term, 'owner pairs a terminal');
const open = (amount, t = term, actor = staff.cashier) => asApp(() => one('SELECT * FROM fp.api_open_charge($1,$2,now(),$3,$4)', [t, nonce(), actor, amount]));
const pay = (charge, thumb, t = term, n = nonce()) => asApp(async () => (await one('SELECT fp.api_thumb_pay($1,$2,now(),now(),$3,$4) r', [t, n, charge, thumb])).r);
const n1 = nonce();
await asApp(() => one('SELECT * FROM fp.api_open_charge($1,$2,now(),$3,$4)', [term, n1, staff.cashier, '10.00']));
eq(await asApp(() => errOf('SELECT * FROM fp.api_open_charge($1,$2,now(),$3,$4)', [term, n1, staff.cashier, '10.00'])), 'FP409', 'replayed nonce rejected');
eq(await asApp(() => errOf(`SELECT * FROM fp.api_open_charge($1,$2,now() - interval '2 minutes',$3,$4)`, [term, nonce(), staff.cashier, '10.00'])), 'FP401', 'stale signed timestamp rejected');
eq(await asApp(() => errOf('SELECT * FROM fp.api_open_charge($1,$2,now(),$3,$4)', [term, nonce(), staff.officer, '10.00'])), 'FP403', 'branch officer cannot run the till');
eq(await asApp(() => errOf('SELECT * FROM fp.api_open_charge($1,$2,now(),$3,$4)', [term, nonce(), staff.cashier, '10.005'])), 'FP400', 'sub-paisa amount rejected');

console.log('# enrollment (View C)');
const enroll = (actor, id, name, type, opening, referral = null, thumb = thumbOf(id), cnicIdx = h32()) => asApp(async () => (await one(
  `SELECT fp.api_enroll_customer($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::smallint,$17,$18,$19) r`,
  [actor, id, name, type, enc(), enc(), cnicIdx, '3346', enc(), '4567', enc(), h32(), '7665', opening, thumb, 1, 'NADRA-SIM-0001', 'consent-v1', referral])).r);
const ayesha = randomUUID(), bilal = randomUUID();
eq(await asApp(() => errOf(`SELECT fp.api_enroll_customer($1,$2,'X Y','SHOPPER_SALARY',$3,$3,$4,'1111',$3,'1111',$3,$4,'1111',1,$4,1::smallint,'NADRA-1','v1',null)`, [staff.cashier, randomUUID(), enc(), h32()])), 'FP403', 'cashier cannot enroll customers');
ok((await enroll(staff.officer, ayesha, 'Ayesha K.', 'SHOPPER_SALARY', '15000.00')).ok, 'branch officer enrolls Ayesha');
ok((await enroll(staff.officer, bilal, 'Bilal H.', 'STUDENT_NON_PTA', '450.00')).ok, 'branch officer enrolls Bilal');
eq((await enroll(staff.officer, randomUUID(), 'Fraud X.', 'SHOPPER_SALARY', '0', null, thumbOf(ayesha))).error, 'DUPLICATE_THUMB', 'same thumb on a second account is refused');
eq((await one(`SELECT count(*) c FROM fp.audit_log WHERE action='enrollment.rejected'`)).c, 1, 'duplicate-thumb attempt is audited, not lost');
// seed facts from the spec: Bilal is an existing user with code BILAL-FP100
await q(`UPDATE fp.customers SET referral_code='BILAL-FP100', first_payment_at = now() - interval '30 days' WHERE customer_id=$1`, [bilal]);
eq((await asApp(() => one('SELECT fp.api_health() h'))).h.customers, 2, 'health: 2 shoppers');

console.log('# fee math (SPEC §6.1 vectors)');
for (const [g, fee, fpv, bank, net] of [['50','0.00','0.00','0.00','50.00'],['100','0.00','0.00','0.00','100.00'],['100.01','0.45','0.32','0.13','99.56'],
    ['130','0.59','0.41','0.18','129.41'],['180','0.81','0.57','0.24','179.19'],['500','2.25','1.58','0.67','497.75'],['5555.56','25.00','17.50','7.50','5530.56'],['10000','25.00','17.50','7.50','9975.00']]) {
  const r = await one('SELECT * FROM fp.mdr_breakdown($1::numeric)', [g]);
  ok(Number(r.mdr_fee) === Number(fee) && Number(r.fp_revenue) === Number(fpv) && Number(r.bank_revenue) === Number(bank) && Number(r.net_to_merchant) === Number(net),
     `mdr ${g} -> ${fee} / ${fpv} / ${bank} / ${net}`, JSON.stringify(r));
}

console.log('# checkout scenarios (View A)');
let c = await open('180.00');
let r = await pay(c.charge_id, thumbOf(ayesha));
eq(r.outcome, 'SUCCESS', 'Ayesha PKR 180 succeeds');
eq(Number(r.net_to_merchant), 179.19, 'net to Rasheed 179.19');
eq(Number(r.cashback), 50, 'first-tap cashback PKR 50');
eq(await bal(`customer_id='${ayesha}'`), 14870, 'Ayesha balance 14,870.00');
eq(await bal(`merchant_id='${merchant}'`), 18629.19, 'Rasheed balance 18,629.19');
eq(await sys('FP_FEE_INCOME'), 0.57, 'FingerPay fee income 0.57');
eq(await sys('BANK_FEE_INCOME'), 0.24, 'Allied Bank fee income 0.24');
eq((await one(`SELECT tx_count FROM fp.merchant_monthly_stats WHERE merchant_id=$1`, [merchant])).tx_count, 143, 'monthly count 142 -> 143');
const smsA = await one(`SELECT sms_id, body FROM fp.sms_outbox WHERE customer_id=$1 AND kind='PAYMENT_RECEIPT'`, [ayesha]);
ok(smsA.body.includes('PKR 180.00 paid at Rasheed Kiryana Store') && smsA.body.includes('Cashback Earned: PKR 50.00') && smsA.body.includes('Available Balance: PKR 14,870.00'), 'SMS receipt matches spec', smsA.body);
const r2 = await pay(c.charge_id, thumbOf(ayesha));
ok(r2.replayed === true && r2.attempt_id === r.attempt_id, 'retrying a paid charge replays the receipt');
eq(await bal(`customer_id='${ayesha}'`), 14870, 'replay did not debit twice');
r = await pay((await open('180.00')).charge_id, thumbOf(ayesha));
eq(r.outcome, 'DECLINED_DUPLICATE_TAP', 'same shopper/amount/store within 15 s is blocked');
ok(r.customer_display_name === null, 'declines never show the shopper name to the merchant');

r = await pay((await open('180.00')).charge_id, thumbOf(bilal));
eq(r.outcome, 'SUCCESS', 'Bilal PKR 180 succeeds');
eq(Number(r.cashback), 3.6, 'student cashback 2% = 3.60');
eq(await bal(`customer_id='${bilal}'`), 273.6, 'Bilal balance 273.60');
c = await open('500.00');
r = await pay(c.charge_id, thumbOf(bilal));
eq(r.outcome, 'DECLINED_LOW_BALANCE', 'Bilal PKR 500 declined: low balance');
eq(await bal(`customer_id='${bilal}'`), 273.6, 'decline leaves balance untouched, PKR 0 fee');
ok((await one(`SELECT body FROM fp.sms_outbox WHERE customer_id=$1 AND kind='DECLINE_NOTICE'`, [bilal])).body.includes('declined (insufficient balance)'), 'shopper is told about the declined attempt');

c = await open('25.00');
for (let i = 1; i <= 3; i++) eq((await pay(c.charge_id, h32())).outcome, 'DECLINED_UNREGISTERED_THUMB', `unknown thumb attempt ${i}`);
eq((await pay(c.charge_id, h32())).outcome, 'CHARGE_LOCKED', 'charge locks after 3 failed thumbs');
eq((await pay((await open('6000.00')).charge_id, thumbOf(ayesha))).outcome, 'DECLINED_LIMIT', 'above per-tap limit declined');

const lock = await asApp(async () => (await one('SELECT fp.api_sms_reply($1,$2,null) r', [smsA.sms_id, 'lock'])).r);
ok(lock.thumb_locked, 'Ayesha replies LOCK to her SMS');
eq((await pay((await open('90.00')).charge_id, thumbOf(ayesha))).outcome, 'DECLINED_THUMB_LOCKED', 'locked thumb is declined');
ok(await one(`SELECT 1 x FROM fp.sms_outbox WHERE customer_id=$1 AND kind='SECURITY_ALERT'`, [ayesha]), 'locked-thumb attempt triggers a security alert SMS');
eq(await asApp(() => errOf('SELECT fp.api_set_thumb_lock($1,$2,false)', [staff.cashier, ayesha])), 'FP403', 'merchant cannot unlock a thumb');
ok((await asApp(() => one('SELECT fp.api_set_thumb_lock($1,$2,false) r', [staff.officer, ayesha]))).r, 'branch officer unlocks after a visit');

const off = await asApp(() => one(`SELECT fp.api_record_offline_fallback($1,$2,now(),$3,$4,now() - interval '3 minutes') a`, [term, nonce(), staff.cashier, '150.00']));
ok(off.a, 'offline cash fallback recorded (no money moved)');

console.log('# ledger & summary (View B)');
const ledger = await asApp(() => q('SELECT * FROM fp.api_merchant_ledger($1, null)', [staff.owner]));
ok(ledger.some(x => x.status === 'SETTLED') && ledger.some(x => x.status === 'DECLINED') && ledger.some(x => x.status === 'OFFLINE_CASH'), 'ledger shows SETTLED, DECLINED, OFFLINE_CASH');
ok(ledger.filter(x => x.status !== 'SETTLED').every(x => x.shopper === null), 'ledger hides shopper names on non-settled rows');
const sum = (await asApp(() => one('SELECT fp.api_merchant_summary($1, null) s', [staff.cashier]))).s;
eq(Number(sum.gross_sales), 360, 'summary gross sales 360');
eq(Number(sum.fees_saved_vs_card_pos), 7.38, 'fees saved vs 2.5% card POS: 9.00 - 1.62 = 7.38');
eq(sum.screenshots_avoided, 2, 'screenshots avoided counter = 2');
eq(await asApp(() => errOf('SELECT * FROM fp.api_merchant_ledger($1, null)', [staff.officer])), 'FP403', 'bank staff cannot read a store ledger via the merchant API');

console.log('# void (owner, same day)');
const ayeshaSale = ledger.find(x => x.status === 'SETTLED' && x.shopper === 'Ayesha K.');
eq(await asApp(() => errOf('SELECT fp.api_void_payment($1,$2,$3)', [staff.cashier, ayeshaSale.attempt_id, 'typo'])), 'FP403', 'cashier cannot void');
const merchBeforeVoid = await bal(`merchant_id='${merchant}'`);
await asApp(() => one('SELECT fp.api_void_payment($1,$2,$3) v', [staff.owner, ayeshaSale.attempt_id, 'Wrong amount typed']));
eq(await bal(`customer_id='${ayesha}'`), 15000, 'void restores Ayesha to 15,000 (cashback clawed back)');
eq((merchBeforeVoid - await bal(`merchant_id='${merchant}'`)).toFixed(2), '179.19', 'void takes exactly the 179.19 net back from Rasheed');
eq(await sys('FP_FEE_INCOME'), 0.57, 'void returns the voided sale\'s fee (only Bilal\'s 0.57 remains)');
eq(await asApp(() => errOf('SELECT fp.api_void_payment($1,$2,$3)', [staff.owner, ayeshaSale.attempt_id, 'again'])), 'FP409', 'cannot void twice');

console.log('# dispute -> refund with maker-checker');
const smsB = await one(`SELECT sms_id FROM fp.sms_outbox WHERE customer_id=$1 AND kind='PAYMENT_RECEIPT'`, [bilal]);
const d1 = await asApp(async () => (await one(`SELECT fp.api_sms_reply($1,'DISPUTE',null) r`, [smsB.sms_id])).r);
ok(/^ABL-DSP-\d{8}-[0-9A-F]{12}$/.test(d1.tracking_ref), 'SMS DISPUTE opens a ticket ' + d1.tracking_ref);
const d2 = await asApp(async () => (await one(`SELECT fp.api_sms_reply($1,'DISPUTE',null) r`, [smsB.sms_id])).r);
ok(d2.duplicate && d2.tracking_ref === d1.tracking_ref, 'replying twice returns the same ticket');
const disp = (await asApp(() => q('SELECT * FROM fp.api_open_disputes($1)', [staff.admin])))[0];
const rev = (await asApp(() => one('SELECT fp.api_request_refund($1,$2,$3) r', [staff.admin, disp.dispute_id, 'Customer was double charged']))).r;
eq(await asApp(() => errOf('SELECT fp.api_decide_refund($1,$2,true,null)', [staff.admin, rev])), 'FP403', 'maker cannot approve their own refund');
eq(await asApp(() => errOf('SELECT fp.api_decide_refund($1,$2,true,null)', [staff.officer, rev])), 'FP403', 'branch officer cannot approve refunds');
await asApp(() => one('SELECT fp.api_decide_refund($1,$2,true,$3) r', [staff.manager, rev, 'Verified']));
eq(await bal(`customer_id='${bilal}'`), 450, 'refund restores Bilal to 450.00');

console.log('# referral bonus');
const hamza = randomUUID();
const hz = await enroll(staff.officer, hamza, 'Hamza R.', 'STUDENT_NON_PTA', '1000.00', 'bilal-fp100');
ok(hz.ok && /^FP-[0-9A-F]{8}$/.test(hz.referral_code), 'Hamza enrolls with referral code BILAL-FP100 and gets his own code');
r = await pay((await open('200.00')).charge_id, thumbOf(hamza));
eq(Number(r.cashback), 50, "Hamza's first tap earns PKR 50 (no stacking with student 2%)");
eq(await bal(`customer_id='${bilal}'`), 550, 'Bilal receives the PKR 100 referral bonus');

console.log('# high-volume rebate');
await q(`UPDATE fp.merchant_monthly_stats SET tx_count = 499 WHERE merchant_id=$1`, [merchant]);
const before = await bal(`merchant_id='${merchant}'`);
r = await pay((await open('60.00')).charge_id, thumbOf(bilal));
eq(r.outcome, 'SUCCESS', '500th monthly transaction settles');
eq((await bal(`merchant_id='${merchant}'`)) - before, 560, 'merchant gets 60 (no fee <= 100) + PKR 500 rebate');
r = await pay((await open('70.00')).charge_id, thumbOf(bilal));
eq((await one(`SELECT count(*) c FROM fp.journals WHERE kind='MERCHANT_REBATE'`)).c, 1, 'rebate paid only once per month');

console.log('# terminal freeze (Android "freeze card")');
const freeze = (actor, t, on) => asApp(() => one('SELECT fp.api_set_terminal_frozen($1,$2,$3) r', [actor, t, on]));
const waiting = await open('25.00', term2);
eq((await freeze(staff.cashier, term2, true)).r.frozen, true, 'cashier freezes a terminal');
eq((await one('SELECT status FROM fp.charge_sessions WHERE charge_id=$1', [waiting.charge_id])).status, 'CANCELLED', 'freezing cancels the charge it was waiting on');
eq(await asApp(() => errOf('SELECT * FROM fp.api_open_charge($1,$2,now(),$3,$4)', [term2, nonce(), staff.cashier, '10.00'])), 'FP423', 'a frozen terminal opens no charge');
eq(await asApp(() => errOf('SELECT fp.api_set_terminal_frozen($1,$2,false)', [staff.cashier, term2])), 'FP403', 'cashier cannot unfreeze');
eq(await asApp(() => errOf('SELECT fp.api_set_terminal_frozen($1,$2,true)', [staff.officer, term2])), 'FP403', 'branch officer cannot freeze a shop terminal');
eq(await asApp(() => errOf('SELECT fp.api_set_terminal_frozen($1,$2,true)', [staff.owner, randomUUID()])), 'FP404', 'unknown terminal is not found');
const st = await asApp(() => one('SELECT * FROM fp.api_terminal_status($1,$2,now())', [term2, nonce()]));
ok(st.frozen === true && st.label === 'Counter 2' && st.store_name === 'Rasheed Kiryana Store', 'signed status shows the terminal as frozen');
const listed = await asApp(() => q('SELECT * FROM fp.api_list_terminals($1)', [staff.owner]));
ok(listed.length === 2 && listed.some((t) => t.terminal_id === term2 && t.frozen), 'owner lists both terminals, one frozen');
eq(await asApp(() => errOf('SELECT * FROM fp.api_list_terminals($1)', [staff.cashier])), 'FP403', 'cashier cannot list terminals');
eq((await freeze(staff.owner, term2, false)).r.frozen, false, 'owner unfreezes');
ok((await open('10.00', term2)).charge_id, 'an unfrozen terminal charges again');
eq((await one(`SELECT count(*) c FROM fp.audit_log WHERE action IN ('terminal.frozen','terminal.unfrozen')`)).c, 2, 'freeze and unfreeze are audited');

console.log('# brute-force throttle');
for (let i = 0; i < 4; i++) { const cc = await open('30.00', term2, staff.owner); for (let k = 0; k < 3; k++) await pay(cc.charge_id, h32(), term2); }
eq((await pay((await open('30.00', term2, staff.owner)).charge_id, thumbOf(bilal), term2)).outcome, 'DECLINED_TERMINAL_THROTTLED', 'terminal paused after 10+ unknown thumbs in 10 min');

console.log('# ledger invariants & tamper evidence');
eq((await one('SELECT fp.verify_balances() n')).n, 0, 'every balance equals the sum of its ledger lines');
eq(Number((await one(`SELECT coalesce(sum(amount),0) s FROM fp.journal_entries`)).s), 0, 'whole ledger sums to zero');
eq(await errOf(`UPDATE fp.journal_entries SET amount = amount WHERE entry_id = 1`), '42501', 'ledger lines cannot be updated, even by the owner');
eq(await errOf(`DELETE FROM fp.payment_attempts`), '42501', 'payment attempts cannot be deleted');
eq(await errOf(`TRUNCATE fp.audit_log`), '42501', 'audit log cannot be truncated');
let unbalanced = null;
try { await db.transaction(async (tx) => {
  const j = (await tx.query(`INSERT INTO fp.journals(kind, idempotency_key, payload_sha256, actor) VALUES ('PAYMENT','evil-0001', sha256('x'::bytea), 'evil') RETURNING journal_id`)).rows[0].journal_id;
  await tx.query(`INSERT INTO fp.journal_entries(journal_id, account_id, amount, balance_after) VALUES ($1, (SELECT account_id FROM fp.accounts WHERE kind='MARKETING_POOL'), 1000, 0)`, [j]);
}); } catch (e) { unbalanced = e.code; }
eq(unbalanced, '23514', 'an unbalanced journal is rejected at COMMIT, even from the owner');
let chain = await one('SELECT * FROM fp.verify_audit_chain()');
ok(chain.ok && Number(chain.checked) > 20, `audit chain verifies (${chain.checked} rows)`);
const idem = await errOf(`SELECT fp.post_journal('PAYMENT', 'seed:pool', 'x', 'x', '[{"account_id":"00000000-0000-0000-0000-000000000000","amount":1},{"account_id":"00000000-0000-0000-0000-000000000000","amount":-1}]'::jsonb)`);
eq(idem, 'FP409', 'idempotency key reused with a different payload is rejected');
await db.exec(`ALTER TABLE fp.audit_log DISABLE TRIGGER audit_log_append_only;
  UPDATE fp.audit_log SET details = '{"tampered":true}' WHERE seq = 5;
  ALTER TABLE fp.audit_log ENABLE TRIGGER audit_log_append_only;`);
chain = await one('SELECT * FROM fp.verify_audit_chain()');
ok(!chain.ok && Number(chain.first_bad_seq) === 5, 'superuser tampering with audit row 5 is detected');
const integ = (await asApp(() => one('SELECT fp.api_verify_integrity($1) i', [staff.auditor]))).i;
ok(integ.audit_chain_ok === false && integ.first_bad_seq === 5, 'auditor integrity check reports the tampered row');

console.log(`\n${pass} passed, ${fail} failed`);
await db.close();
process.exit(fail ? 1 : 0);
