"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { credentialsSchema, signupProfileSchema, type DemoWallet } from "@/lib/fp/signup";
import { InkField } from "@/site/ink/ink.tsx";
import { startGlobalLiquidGlass } from "@/site/glass/liquid-glass.ts";
import s from "./accounts.module.css";

const personalFields = [
  ["fullName", "Full name", "name", "e.g. Ayesha Khan"],
  ["phone", "Mobile number", "tel", "03001234567"],
  ["dateOfBirth", "Date of birth (YYYY-MM-DD)", "bday", "2000-01-31"],
  ["occupation", "Occupation", "organization-title", "e.g. Student"],
  ["address", "Home address", "street-address", "House, street and area"],
  ["city", "City", "address-level2", "e.g. Lahore"],
  ["postalCode", "Postal code", "postal-code", "54000"],
] as const;
const businessFields = [
  ["businessName", "Business name", "organization", "Your shop or company name"],
  ["businessType", "Business type", "off", "e.g. Grocery shop"],
  ["businessAddress", "Business address", "off", "Shop, street and area"],
  ["businessCity", "Business city", "off", "e.g. Lahore"],
  ["registrationNumber", "Business registration / NTN (optional)", "off", "If your business is registered"],
] as const;

type AccountResponse = { email: string; wallet: DemoWallet | null };
type AccountType = DemoWallet["profile"]["accountType"];

export function AccountApp({ accountType: initialType, signup, entry = false }: { accountType: AccountType; signup: boolean; entry?: boolean }) {
  const [stage, setStage] = useState<"auth" | "verify" | "details" | "wallet">("auth");
  const [accountType, setAccountType] = useState(initialType);
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({ registrationNumber: "" });
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState<DemoWallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("Wallet");
  const [hidden, setHidden] = useState(false);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const merchant = accountType === "merchant";
  const name = merchant ? "Merchant" : "Customer";

  useEffect(() => {
    return startGlobalLiquidGlass();
  }, []);

  const accept = useCallback((data: AccountResponse) => {
    if (entry && data.wallet) {
      window.location.replace(`/${data.wallet.profile.accountType}`);
      return;
    }
    setEmail(data.email);
    setWallet(data.wallet);
    setStage(data.wallet ? "wallet" : "details");
  }, [entry]);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/account", { cache: "no-store" }).then(async (res) => {
      const data = await res.json();
      if (!active) return;
      if (res.ok) accept(data);
      else if (res.status !== 401) setNotice(data.error?.message ?? "Could not load your account.");
    }).catch(() => { if (active) setNotice("Could not connect. Check your connection and try again."); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [accept]);

  useEffect(() => {
    if (stage === "details" || stage === "verify") stageHeading.current?.focus();
  }, [stage]);

  async function request(path: string, method: string, body?: unknown) {
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Something went wrong. Please try again.");
    return data;
  }

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setNotice("");
    try { await task(); } catch (error) { setNotice(error instanceof Error ? error.message : "Could not connect. Try again."); }
    finally { setBusy(false); }
  }

  function authenticate(e: FormEvent) {
    e.preventDefault();
    if (checking) return;
    const credentials = credentialsSchema.safeParse({ action: signup ? "signup" : "login", email: email.trim(), password });
    if (!credentials.success) { setNotice(credentials.error.issues[0].message); return; }
    if (signup && password !== confirm) { setNotice("Your passwords do not match."); return; }
    void run(async () => {
      const data = await request("/api/v1/session", "POST", credentials.data);
      setPassword(""); setConfirm(""); setShowPassword(false);
      if (!data.signedIn) { setStage("verify"); return; }
      accept(await request("/api/v1/account", "GET"));
    });
  }

  function complete(e: FormEvent) {
    e.preventDefault();
    const activeFields = [...personalFields, ...(merchant ? businessFields : [])];
    const input = { ...Object.fromEntries(activeFields.map(([key]) => [key, fields[key] ?? ""])), accountType, consent };
    const result = signupProfileSchema.safeParse(input);
    if (!result.success) {
      const key = result.error.issues[0].path[0];
      const field = [...personalFields, ...businessFields].find(([id]) => id === key);
      setNotice(key === "consent" ? "Confirm that we can store your demo profile." : field ? `Check the ${field[1].toLowerCase()} field.` : "Check your account details and try again.");
      if (field) document.getElementById(`account-${field[0]}`)?.focus();
      return;
    }
    void run(async () => accept(await request("/api/v1/account", "POST", result.data)));
  }

  const signOut = () => void run(async () => {
    await request("/api/v1/session", "DELETE"); setWallet(null); setFields({ registrationNumber: "" }); setConsent(false); setStage("auth");
  });
  const wrongApp = wallet && wallet.profile.accountType !== accountType;

  const roleQuery = merchant ? "?role=merchant" : "";
  const alternateHref = signup ? "/login" + roleQuery : "/signup" + roleQuery;
  const alternateLabel = signup ? "Sign in" : "Create an account";
  const rolePicker = <fieldset className={s.rolePicker} disabled={busy}>
    <legend className="visually-hidden">Account type</legend>
    <div>{(["customer", "merchant"] as const).map((role) => <label key={role}>
      <input type="radio" name="accountType" value={role} checked={accountType === role} onChange={() => setAccountType(role)} />
      <span>{role === "customer" ? "Customer" : "Merchant"}</span>
    </label>)}</div>
  </fieldset>;
  const error = notice && <p className={s.notice} role="alert">{notice}</p>;

  return <main className={s.shell}>
    <header className={s.header}>
      <Link href="/" className={s.brand}><Image src="/brand/fingerpay-wordmark.svg" alt="FingerPay home" width={112} height={25} priority /></Link>
      {stage === "wallet" || stage === "details"
        ? <Button label="Sign out" variant="ghost" isDisabled={busy} clickAction={signOut} />
        : <Link className={s.headerLink} href={alternateHref}>{alternateLabel}</Link>}
    </header>
    {stage !== "wallet" && <div className={`${s.access} ${stage === "details" ? s.accessWide : ""}`} data-liquid-surface>
      <section className={s.accessContent}>
        {stage === "auth" && <>
          <div className={s.formHeading}>
            <h1>{signup ? "Create an account." : "Sign in."}</h1>
            <p>
              <strong>{signup ? "PKR 200 demo credit included." : "Welcome back."}</strong>{" "}
              {signup ? "Choose an account type and enter your email." : "Enter the email and password you registered with."}
            </p>
          </div>
          <form className={s.form} onSubmit={authenticate} method="post" aria-busy={busy}>
            {signup && (entry ? rolePicker : <p className={s.step}>{name} account · <Link href={"/signup" + roleQuery}>Change</Link></p>)}
            <TextInput controlClassName={s.field} label="Email" htmlName="email" type="email" autoComplete="username" value={email} onChange={setEmail} isDisabled={busy} aria-required />
            <div className={s.passwordField}>
              <TextInput id="account-password" controlClassName={s.field} label="Password" htmlName="password" description={signup ? "12+ characters with upper, lower, number, and symbol." : undefined} type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={setPassword} hasSpellCheck={false} autoCapitalize="none" isDisabled={busy} aria-required />
              <button type="button" className={s.passwordToggle} aria-controls="account-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
            </div>
            {signup && <TextInput controlClassName={s.field} label="Confirm password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={setConfirm} hasSpellCheck={false} autoCapitalize="none" isDisabled={busy} aria-required />}
            {error}
            <Button type="submit" label={signup ? "Continue" : "Sign in"} variant="primary" isDisabled={checking} isLoading={busy} />
          </form>
          <p className={s.switchMode}>{signup ? "Already registered?" : "New to FingerPay?"} <Link href={alternateHref}>{alternateLabel}</Link></p>
        </>}
        {stage === "verify" && <div className={s.formHeading}>
          <h1 ref={stageHeading} tabIndex={-1}>Check your email.</h1>
          <p><strong>Confirmation sent to {email.trim()}.</strong> Open the link in your inbox, then sign in to continue.</p>
          <Link className={s.primaryLink} href={"/login" + roleQuery}>Sign in</Link>
          <p className={s.switchMode}><button type="button" onClick={() => setStage("auth")}>Use a different email</button></p>
        </div>}
        {stage === "details" && <>
          <div className={s.formHeading}>
            <h1 ref={stageHeading} tabIndex={-1}>Your profile.</h1>
            <p><strong>Signed in as {email}.</strong> Use sample details for this prototype; everything is encrypted before storage.</p>
          </div>
          <form className={s.form} method="post" onSubmit={complete} aria-busy={busy}>
            {entry && rolePicker}
            <fieldset className={s.fields}><legend>Personal</legend>
              {personalFields.map(([key, label, autoComplete, placeholder]) => <TextInput id={"account-" + key} controlClassName={s.field} key={key} label={label} autoComplete={autoComplete} placeholder={placeholder} type={key === "phone" ? "tel" : "text"} value={fields[key] ?? ""} onChange={(v) => setFields((previous) => ({ ...previous, [key]: v }))} isDisabled={busy} isRequired />)}
            </fieldset>
            {merchant && <fieldset className={s.fields}><legend>Business</legend>
              {businessFields.map(([key, label, autoComplete, placeholder]) => <TextInput id={"account-" + key} controlClassName={s.field} key={key} label={label} autoComplete={autoComplete} placeholder={placeholder} value={fields[key] ?? ""} onChange={(v) => setFields((previous) => ({ ...previous, [key]: v }))} isDisabled={busy} isRequired={key !== "registrationNumber"} />)}
            </fieldset>}
            <label className={s.consent}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={busy} required /><span>Store these encrypted details for my demo account. The PKR 200 credit has no cash value.</span></label>
            {error}
            <Button type="submit" label="Open wallet" variant="primary" isLoading={busy} />
          </form>
        </>}
      </section>
    </div>}
    {stage === "wallet" && error}
    {stage === "wallet" && wrongApp && <section className={s.intro}><h1>Your account is a {wallet.profile.accountType} account.</h1><p>Open the matching view to see your wallet.</p><Link className={s.choice} href={`/${wallet.profile.accountType}`}>Open FingerPay {wallet.profile.accountType} →</Link></section>}
    {stage === "wallet" && wallet && !wrongApp && <>
      <nav aria-label={`${name} app`} className={s.tabs}>{["Wallet", "Activity", "Profile"].map((t) => <Button key={t} label={t} variant={tab === t ? "primary" : "ghost"} aria-current={tab === t ? "page" : undefined} clickAction={() => setTab(t)} />)}</nav>
      {tab === "Wallet" && <section className={s.dashboard}><div><h1>{wallet.profile.accountType === "merchant" ? wallet.profile.businessName : `Hello, ${wallet.profile.fullName.split(" ")[0]}.`}</h1><p>{merchant ? "Your shop has its own home in FingerPay." : "Your demo wallet is active."}</p></div>
        <div className={s.balance} data-liquid-surface><div className={s.balanceTop}><span>Demo balance · PKR</span><Button label={hidden ? "Show" : "Hide"} variant="ghost" clickAction={() => setHidden(!hidden)} /></div><strong>{hidden ? "••••" : wallet.balance}</strong><p>Promotional signup credit · No cash value</p></div>
        <section className={s.next}><h2>{merchant ? "Counter setup" : "Ready"}</h2><p>{merchant ? "Your business profile is saved. Pair an Android terminal to accept thumb payments at the counter." : "Your signup credit is saved. Branch CNIC verification and thumb enrollment are simulated at the counter."}</p>{merchant && <Link href="/mobile">Open terminal simulator →</Link>}</section>
      </section>}
      {tab === "Activity" && <section className={s.intro}><h1>Activity.</h1>{wallet.activity.map((a) => <div className={s.receipt} key={a.createdAt}><div><h2>{a.label}</h2><p>{new Date(a.createdAt).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium" })} · Demo credit</p></div><strong>+ PKR {a.amount}</strong></div>)}<p>Counter payments run through paired terminals.</p></section>}
      {tab === "Profile" && <section className={s.intro}><h1>Details.</h1><dl className={s.profile}><div><dt>Email</dt><dd>{email}</dd></div>{[...personalFields, ...(merchant ? businessFields : [])].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{String((wallet.profile as unknown as Record<string, unknown>)[key] || "Not provided")}</dd></div>)}</dl></section>}
    </>}
    <footer className={s.foot}>Student prototype · Demo credit only · No real money or biometrics processed</footer>
    <InkField />
  </main>;
}
