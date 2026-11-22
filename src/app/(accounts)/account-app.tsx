"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { credentialsSchema, signupProfileSchema, type DemoWallet } from "@/lib/fp/signup";
import { InkField } from "@/site/ink/ink.tsx";
import s from "./accounts.module.css";

const personalFields = [
  ["fullName", "Full name", "name", "Ayesha Khan", "full"],
  ["phone", "Mobile number", "tel", "03001234567", "half"],
  ["dateOfBirth", "Date of birth", "bday", "2000-01-31", "half"],
  ["occupation", "Occupation", "organization-title", "Student / Shop owner", "half"],
  ["city", "City", "address-level2", "Lahore", "half"],
  ["address", "Street address", "street-address", "House 14, Block G-3, Johar Town", "full"],
  ["postalCode", "Postal code", "postal-code", "54000", "half"],
] as const;

const businessFields = [
  ["businessName", "Business name", "organization", "Rasheed Kiryana Store", "half"],
  ["businessType", "Business category", "off", "Grocery & Kiryana", "half"],
  ["businessAddress", "Shop address", "off", "Shop 8, Main Boulevard, Johar Town", "full"],
  ["businessCity", "Shop city", "off", "Lahore", "half"],
  ["registrationNumber", "NTN / Registration (optional)", "off", "NTN-4192837-4", "half"],
] as const;

const SAMPLE_CUSTOMER: Record<string, string> = {
  fullName: "Ayesha Khan",
  phone: "03001234567",
  dateOfBirth: "2001-04-18",
  occupation: "University Student",
  address: "House 14, Block G-3, Johar Town",
  city: "Lahore",
  postalCode: "54000",
  registrationNumber: "",
};

const SAMPLE_MERCHANT: Record<string, string> = {
  fullName: "Rasheed Ahmed",
  phone: "03219876543",
  dateOfBirth: "1984-09-12",
  occupation: "Merchant Owner",
  address: "House 42, Canal View Society",
  city: "Lahore",
  postalCode: "54000",
  businessName: "Rasheed Kiryana Store",
  businessType: "Grocery & Kiryana",
  businessAddress: "Shop 8, Main Boulevard, Johar Town",
  businessCity: "Lahore",
  registrationNumber: "NTN-4192837-4",
};

type AccountResponse = { email: string; wallet: DemoWallet | null };
type AccountType = DemoWallet["profile"]["accountType"];

function RoleSeal({ role }: { role: AccountType }) {
  return (
    <svg className={s.sealSvg} viewBox="-24 -24 48 48" aria-hidden="true">
      <circle r="20" />
      <circle r="16.5" className={s.sealThread} />
      {role === "merchant" ? (
        <>
          {/* Architectural counter & Raast settlement ledger seal */}
          <path d="M -10 -5 L 0 -12 L 10 -5" />
          <path d="M -11 -5 L 11 -5" />
          <path d="M -7 -5 L -7 8 M 0 -5 L 0 8 M 7 -5 L 7 8" />
          <path d="M -11 8 L 11 8" />
          <circle cx="0" cy="-8" r="1.4" className={s.sealDot} />
        </>
      ) : (
        <>
          {/* Personal wallet & instant clearing seal */}
          <circle r="8.5" />
          <path d="M -5 0 L 4 0 M 1 -3.5 L 4.5 0 L 1 3.5" />
          <circle cx="-5" cy="0" r="1.4" className={s.sealDot} />
        </>
      )}
    </svg>
  );
}

export function AccountApp({
  accountType: initialType,
  signup,
  entry = false,
}: {
  accountType: AccountType;
  signup: boolean;
  entry?: boolean;
}) {
  const [stage, setStage] = useState<"auth" | "verify" | "details" | "wallet">("auth");
  const [accountType, setAccountType] = useState<AccountType>(initialType);
  const [profileStep, setProfileStep] = useState<1 | 2>(1);
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resending, setResending] = useState(false);
  const [infoNote, setInfoNote] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({ registrationNumber: "" });
  const [consent, setConsent] = useState(false);
  const [wallet, setWallet] = useState<DemoWallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"Wallet" | "Activity" | "Profile">("Wallet");
  const [hidden, setHidden] = useState(false);

  const stageHeading = useRef<HTMLHeadingElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const merchant = accountType === "merchant";
  const name = merchant ? "Merchant" : "Customer";
  const otpCode = otpDigits.join("");

  const accept = useCallback(
    (data: AccountResponse) => {
      if (entry && data.wallet) {
        window.location.replace(`/${data.wallet.profile.accountType}`);
        return;
      }
      setEmail(data.email);
      setWallet(data.wallet);
      setStage(data.wallet ? "wallet" : "details");
    },
    [entry],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/v1/account", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (res.ok) accept(data);
        else if (res.status !== 401) setNotice(data.error?.message ?? "Could not load your account.");
      })
      .catch(() => {
        if (active) setNotice("Could not connect. Check your connection and try again.");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [accept]);

  useEffect(() => {
    if (stage === "verify") {
      window.setTimeout(() => otpRefs.current[0]?.focus(), 40);
    } else if (stage === "details") {
      stageHeading.current?.focus();
    }
  }, [stage]);

  async function request(path: string, method: string, body?: unknown) {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Something went wrong. Please try again.");
    return data;
  }

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    setInfoNote("");
    try {
      await task();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not connect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function authenticate(e: FormEvent) {
    e.preventDefault();
    if (checking) return;
    const credentials = credentialsSchema.safeParse({
      action: signup ? "signup" : "login",
      email: email.trim(),
      password,
    });
    if (!credentials.success) {
      setNotice(credentials.error.issues[0].message);
      return;
    }
    if (signup && password !== confirm) {
      setNotice("Your passwords do not match.");
      return;
    }
    void run(async () => {
      const data = await request("/api/v1/session", "POST", credentials.data);
      setShowPassword(false);
      if (!data.signedIn) {
        setOtpDigits(["", "", "", "", "", ""]);
        setStage("verify");
        return;
      }
      setPassword("");
      setConfirm("");
      accept(await request("/api/v1/account", "GET"));
    });
  }

  function verifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      setNotice("Enter the 6-digit verification code sent to your email.");
      return;
    }
    void run(async () => {
      const data = await request("/api/v1/session", "POST", {
        action: "verify",
        email: email.trim(),
        password,
        code: otpCode,
      });
      if (!data.signedIn) {
        setNotice("Could not verify your code. Request a fresh code and try again.");
        return;
      }
      setPassword("");
      setConfirm("");
      setOtpDigits(["", "", "", "", "", ""]);
      accept(await request("/api/v1/account", "GET"));
    });
  }

  async function resendOtp() {
    if (busy || resending) return;
    setResending(true);
    setNotice("");
    setInfoNote("");
    try {
      await request("/api/v1/session", "POST", {
        action: "resend",
        email: email.trim(),
        password,
      });
      setOtpDigits(["", "", "", "", "", ""]);
      setInfoNote(`Sent a fresh 6-digit verification code to ${email.trim()}.`);
      otpRefs.current[0]?.focus();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not resend verification code.");
    } finally {
      setResending(false);
    }
  }

  function handleOtpChange(index: number, raw: string) {
    const digitsOnly = raw.replace(/\D/g, "");
    if (!digitsOnly) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }
    if (digitsOnly.length > 1) {
      const slice = digitsOnly.slice(0, 6).split("");
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < 6; i++) next[i] = slice[i] ?? "";
      setOtpDigits(next);
      const focusIdx = Math.min(5, slice.length);
      otpRefs.current[focusIdx]?.focus();
      return;
    }
    const next = [...otpDigits];
    next[index] = digitsOnly;
    setOtpDigits(next);
    if (index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const next = [...otpDigits];
      next[index - 1] = "";
      setOtpDigits(next);
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpDigits(next);
    otpRefs.current[Math.min(5, pasted.length - 1)]?.focus();
  }

  function validatePersonalStep(): boolean {
    const v = (k: string) => (fields[k] ?? "").trim();
    if (v("fullName").length < 2) {
      setNotice("Enter your full name.");
      document.getElementById("account-fullName")?.focus();
      return false;
    }
    if (!/^(?:\+92|0)3\d{9}$/.test(v("phone"))) {
      setNotice("Enter a Pakistani mobile number, e.g. 03001234567.");
      document.getElementById("account-phone")?.focus();
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v("dateOfBirth"))) {
      setNotice("Enter your date of birth as YYYY-MM-DD.");
      document.getElementById("account-dateOfBirth")?.focus();
      return false;
    }
    if (v("occupation").length < 2) {
      setNotice("Enter your occupation.");
      document.getElementById("account-occupation")?.focus();
      return false;
    }
    if (v("city").length < 2) {
      setNotice("Enter your city.");
      document.getElementById("account-city")?.focus();
      return false;
    }
    if (v("address").length < 5) {
      setNotice("Enter your street address.");
      document.getElementById("account-address")?.focus();
      return false;
    }
    if (!/^\d{5}$/.test(v("postalCode"))) {
      setNotice("Enter a five-digit postal code, e.g. 54000.");
      document.getElementById("account-postalCode")?.focus();
      return false;
    }
    setNotice("");
    return true;
  }

  function complete(e: FormEvent) {
    e.preventDefault();
    if (merchant && profileStep === 1) {
      if (validatePersonalStep()) setProfileStep(2);
      return;
    }
    const activeFields = [...personalFields, ...(merchant ? businessFields : [])];
    const input = {
      ...Object.fromEntries(activeFields.map(([key]) => [key, fields[key] ?? ""])),
      accountType,
      consent,
    };
    const result = signupProfileSchema.safeParse(input);
    if (!result.success) {
      const key = result.error.issues[0].path[0];
      const field = [...personalFields, ...businessFields].find(([id]) => id === key);
      setNotice(
        key === "consent"
          ? "Confirm that we can store your encrypted demo profile."
          : field
            ? `Check the ${field[1].toLowerCase()} field: ${result.error.issues[0].message}`
            : "Check your account details and try again.",
      );
      if (field) document.getElementById(`account-${field[0]}`)?.focus();
      return;
    }
    void run(async () => accept(await request("/api/v1/account", "POST", result.data)));
  }

  const fillSample = () => {
    const sample = merchant ? SAMPLE_MERCHANT : SAMPLE_CUSTOMER;
    setFields((prev) => ({ ...prev, ...sample }));
    setConsent(true);
    setNotice("");
  };

  const signOut = () =>
    void run(async () => {
      await request("/api/v1/session", "DELETE");
      setWallet(null);
      setFields({ registrationNumber: "" });
      setConsent(false);
      setProfileStep(1);
      setStage("auth");
    });

  const wrongApp = wallet && wallet.profile.accountType !== accountType;
  const roleQuery = merchant ? "?role=merchant" : "";
  const alternateHref = signup ? "/login" + roleQuery : "/signup" + roleQuery;
  const alternateLabel = signup ? "Sign in" : "Create an account";

  const pwRules = [
    { label: "12+ chars", ok: password.length >= 12 },
    { label: "Upper & lower", ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const currentStepIndex =
    stage === "auth" ? 1 : stage === "verify" ? 2 : stage === "details" && merchant && profileStep === 2 ? 4 : 3;

  const steps = [
    { num: "01", title: "Account credentials", sub: "Email address & 12-character key" },
    { num: "02", title: "Email verification code", sub: "6-digit code dispatched via Resend" },
    { num: "03", title: "Personal & home address", sub: "Encrypted with AES-256-GCM before storage" },
    ...(merchant
      ? [{ num: "04", title: "Storefront & counter", sub: "Shop name, category, and settlement city" }]
      : []),
  ];

  const showSplitStudio = signup || stage === "verify" || stage === "details";
  const errorNode = notice ? (
    <p className={s.notice} role="alert">
      {notice}
    </p>
  ) : null;
  const infoNode = infoNote ? (
    <p className={s.infoNotice} role="status">
      {infoNote}
    </p>
  ) : null;

  return (
    <main className={s.shell}>
      <InkField />
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          <Image src="/brand/fingerpay-wordmark.svg" alt="FingerPay home" width={112} height={25} priority />
        </Link>
        {stage === "wallet" || stage === "details" ? (
          <button type="button" className={s.ghostBtn} disabled={busy} onClick={signOut}>
            Sign out
          </button>
        ) : (
          <Link className={s.headerLink} href={alternateHref}>
            {alternateLabel}
          </Link>
        )}
      </header>

      {stage !== "wallet" && (
        <div className={`${s.access} ${showSplitStudio ? s.studio : ""}`}>
          {showSplitStudio && (
            <aside className={s.aside} aria-label={`${name} onboarding specification`}>
              <div className={s.asideTop}>
                <div className={s.sealHeader}>
                  <div className={s.sealFrame}>
                    <RoleSeal role={accountType} />
                  </div>
                  <div>
                    <span className={s.asideCode}>{merchant ? "MERCHANT · TILL" : "CUSTOMER · WALLET"}</span>
                    <h2 className={s.asideTitle}>
                      {merchant ? "Counter settlement till." : "Personal Raast wallet."}
                    </h2>
                  </div>
                </div>
                <p className={s.asideLead}>
                  {merchant
                    ? "Accept thumb payments on Android with hardware P-256 request signing and instant Raast settlement."
                    : "Pay at any FingerPay shop counter in under three seconds. No phone, card, or cash required."}
                </p>
              </div>

              <ol className={s.stepRail} aria-label="Signup progress">
                {steps.map((st, idx) => {
                  const stepNum = idx + 1;
                  const state =
                    stepNum === currentStepIndex ? "active" : stepNum < currentStepIndex ? "done" : "upcoming";
                  return (
                    <li key={st.num} className={s.stepItem} data-state={state}>
                      <span className={s.stepNum}>{state === "done" ? "✓" : st.num}</span>
                      <div className={s.stepCopy}>
                        <strong>{st.title}</strong>
                        <span>{st.sub}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <dl className={s.specLedger}>
                <div>
                  <dt>Opening demo credit</dt>
                  <dd>PKR 200.00</dd>
                </div>
                <div>
                  <dt>{merchant ? "Merchant fee (MDR)" : "Counter tap fee"}</dt>
                  <dd>{merchant ? "0% ≤ 100 · 0.45% cap 25" : "PKR 0.00"}</dd>
                </div>
                <div>
                  <dt>Proposed rail</dt>
                  <dd>Allied Bank · Raast</dd>
                </div>
                <div>
                  <dt>Profile cipher</dt>
                  <dd>AES-256-GCM v1</dd>
                </div>
              </dl>
            </aside>
          )}

          <section className={s.accessContent}>
            {stage === "auth" && (
              <>
                <div className={s.formHeading}>
                  <h1>{signup ? "Create your account." : "Sign in."}</h1>
                  <p>
                    <strong>{signup ? "PKR 200.00 demo credit included." : "Welcome back."}</strong>{" "}
                    {signup
                      ? "Choose your account role and enter your email to receive a 6-digit verification code."
                      : "Enter the email and password you registered with."}
                  </p>
                </div>

                <form className={s.form} onSubmit={authenticate} method="post" aria-busy={busy}>
                  {signup && (
                    <fieldset className={s.rolePicker} disabled={busy}>
                      <legend className={s.fieldLabel}>Account role</legend>
                      <div className={s.roleGrid}>
                        {(["customer", "merchant"] as const).map((role) => (
                          <label key={role} className={s.roleOption}>
                            <input
                              type="radio"
                              name="accountType"
                              value={role}
                              checked={accountType === role}
                              onChange={() => setAccountType(role)}
                            />
                            <span className={s.roleCard}>
                              <strong>{role === "customer" ? "Customer" : "Merchant"}</strong>
                              <small>{role === "customer" ? "Personal wallet" : "Shop counter till"}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  <div className={s.inputGroup}>
                    <label htmlFor="account-email" className={s.fieldLabel}>
                      Email address
                    </label>
                    <input
                      id="account-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                      required
                      className={s.textInput}
                    />
                  </div>

                  <div className={s.inputGroup}>
                    <label htmlFor="account-password" className={s.fieldLabel}>
                      Password
                    </label>
                    <div className={s.passwordWrap}>
                      <input
                        id="account-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={signup ? "new-password" : "current-password"}
                        placeholder={signup ? "12+ characters, mixed case, digit & symbol" : "Your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        spellCheck={false}
                        autoCapitalize="none"
                        disabled={busy}
                        required
                        className={`${s.textInput} ${s.passwordInput}`}
                      />
                      <button
                        type="button"
                        className={s.passwordToggle}
                        aria-controls="account-password"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    {signup && (
                      <ul className={s.pwChecklist} aria-label="Password requirements">
                        {pwRules.map((r) => (
                          <li key={r.label} data-met={r.ok}>
                            <span>{r.ok ? "✓" : "·"}</span> {r.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {signup && (
                    <div className={s.inputGroup}>
                      <label htmlFor="account-confirm" className={s.fieldLabel}>
                        Confirm password
                      </label>
                      <input
                        id="account-confirm"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        spellCheck={false}
                        autoCapitalize="none"
                        disabled={busy}
                        required
                        className={s.textInput}
                      />
                    </div>
                  )}

                  {errorNode}

                  <button type="submit" className={s.submitBtn} disabled={checking || busy}>
                    {busy ? "Please wait…" : signup ? "Send 6-digit verification code" : "Sign in"}
                  </button>
                </form>

                <p className={s.switchMode}>
                  {signup ? "Already have an account?" : "New to FingerPay?"}{" "}
                  <Link href={alternateHref}>{alternateLabel}</Link>
                </p>
              </>
            )}

            {stage === "verify" && (
              <>
                <div className={s.formHeading}>
                  <span className={s.stepBadge}>STEP 02 · EMAIL VERIFICATION</span>
                  <h1 ref={stageHeading} tabIndex={-1}>
                    Enter your 6-digit code.
                  </h1>
                  <p>
                    <strong>We sent a 6-digit code to {email.trim()}.</strong> Check your Inbox, Spam, or Junk folder
                    for mail from <strong>noreply@fingerpay.app</strong>, then enter the 6 digits below.
                  </p>
                </div>

                <form className={s.form} onSubmit={verifyOtp} aria-busy={busy}>
                  <div className={s.inputGroup}>
                    <label htmlFor="otp-digit-0" className={s.fieldLabel}>
                      6-digit verification code
                    </label>
                    <div className={s.otpGrid} role="group" aria-label="6-digit verification code">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-digit-${idx}`}
                          ref={(el) => {
                            otpRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={idx === 0 ? "one-time-code" : "off"}
                          maxLength={6}
                          value={digit}
                          placeholder="·"
                          disabled={busy}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className={s.otpBox}
                          aria-label={`Digit ${idx + 1} of 6`}
                        />
                      ))}
                    </div>
                  </div>

                  {errorNode}
                  {infoNode}

                  <button type="submit" className={s.submitBtn} disabled={busy || otpCode.length !== 6}>
                    {busy ? "Verifying code…" : "Verify & continue"}
                  </button>

                  <div className={s.verifyActions}>
                    <button
                      type="button"
                      className={s.textActionBtn}
                      disabled={busy || resending}
                      onClick={resendOtp}
                    >
                      {resending ? "Sending new code…" : "Resend 6-digit code"}
                    </button>
                    <button
                      type="button"
                      className={s.textActionBtn}
                      disabled={busy}
                      onClick={() => {
                        setNotice("");
                        setInfoNote("");
                        setStage("auth");
                      }}
                    >
                      Use a different email
                    </button>
                  </div>
                </form>
              </>
            )}

            {stage === "details" && (
              <>
                <div className={s.formHeading}>
                  <div className={s.headingRow}>
                    <span className={s.stepBadge}>
                      {merchant && profileStep === 2
                        ? "STEP 04 · STOREFRONT & COUNTER"
                        : "STEP 03 · IDENTITY & ADDRESS"}
                    </span>
                    <button type="button" className={s.sampleBtn} onClick={fillSample} disabled={busy}>
                      Fill sample details
                    </button>
                  </div>
                  <h1 ref={stageHeading} tabIndex={-1}>
                    {merchant && profileStep === 2 ? "Your shop details." : "Your profile."}
                  </h1>
                  <p>
                    <strong>Signed in as {email}.</strong>{" "}
                    {merchant && profileStep === 2
                      ? "Add your storefront details so paired Android terminals can settle sales to your merchant ledger."
                      : "Use sample details for this prototype; every field is encrypted with AES-256-GCM before storage."}
                  </p>
                </div>

                <form className={s.form} method="post" onSubmit={complete} aria-busy={busy}>
                  {entry && profileStep === 1 && (
                    <fieldset className={s.rolePicker} disabled={busy}>
                      <legend className={s.fieldLabel}>Account role</legend>
                      <div className={s.roleGrid}>
                        {(["customer", "merchant"] as const).map((role) => (
                          <label key={role} className={s.roleOption}>
                            <input
                              type="radio"
                              name="accountType"
                              value={role}
                              checked={accountType === role}
                              onChange={() => setAccountType(role)}
                            />
                            <span className={s.roleCard}>
                              <strong>{role === "customer" ? "Customer" : "Merchant"}</strong>
                              <small>{role === "customer" ? "Personal wallet" : "Shop counter till"}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {profileStep === 1 && (
                    <div className={s.fieldGrid}>
                      {personalFields.map(([key, label, autoComplete, placeholder, span]) => (
                        <div
                          key={key}
                          className={`${s.inputGroup} ${span === "full" ? s.spanFull : ""}`}
                        >
                          <label htmlFor={`account-${key}`} className={s.fieldLabel}>
                            {label}
                          </label>
                          <input
                            id={`account-${key}`}
                            type={key === "phone" ? "tel" : "text"}
                            autoComplete={autoComplete}
                            placeholder={placeholder}
                            value={fields[key] ?? ""}
                            onChange={(e) =>
                              setFields((previous) => ({ ...previous, [key]: e.target.value }))
                            }
                            disabled={busy}
                            required
                            className={s.textInput}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {merchant && profileStep === 2 && (
                    <div className={s.fieldGrid}>
                      {businessFields.map(([key, label, autoComplete, placeholder, span]) => (
                        <div
                          key={key}
                          className={`${s.inputGroup} ${span === "full" ? s.spanFull : ""}`}
                        >
                          <label htmlFor={`account-${key}`} className={s.fieldLabel}>
                            {label}
                          </label>
                          <input
                            id={`account-${key}`}
                            type="text"
                            autoComplete={autoComplete}
                            placeholder={placeholder}
                            value={fields[key] ?? ""}
                            onChange={(e) =>
                              setFields((previous) => ({ ...previous, [key]: e.target.value }))
                            }
                            disabled={busy}
                            required={key !== "registrationNumber"}
                            className={s.textInput}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {(!merchant || profileStep === 2) && (
                    <label className={s.consent}>
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        disabled={busy}
                        required
                      />
                      <span>
                        Store these encrypted details for my demo account. I understand the PKR 200.00 credit has no
                        cash value.
                      </span>
                    </label>
                  )}

                  {errorNode}

                  <div className={s.stepButtons}>
                    {merchant && profileStep === 2 && (
                      <button
                        type="button"
                        className={s.secondaryBtn}
                        disabled={busy}
                        onClick={() => {
                          setNotice("");
                          setProfileStep(1);
                        }}
                      >
                        ← Back
                      </button>
                    )}
                    <button type="submit" className={s.submitBtn} disabled={busy}>
                      {busy
                        ? "Saving encrypted profile…"
                        : merchant && profileStep === 1
                          ? "Continue to shop details →"
                          : `Open ${name.toLowerCase()} wallet`}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {stage === "wallet" && (
        <div className={s.walletPanel}>
          {errorNode}
          {wrongApp && (
            <section className={s.intro}>
              <h1>Your account is a {wallet.profile.accountType} account.</h1>
              <p>Open the matching view to see your wallet.</p>
              <Link className={s.choice} href={`/${wallet.profile.accountType}`}>
                Open FingerPay {wallet.profile.accountType} →
              </Link>
            </section>
          )}
          {wallet && !wrongApp && (
            <>
              <nav aria-label={`${name} app`} className={s.tabs}>
                {(["Wallet", "Activity", "Profile"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={s.tabBtn}
                    data-active={tab === t}
                    aria-current={tab === t ? "page" : undefined}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </nav>

              {tab === "Wallet" && (
                <section className={s.dashboard}>
                  <div>
                    <h1>
                      {wallet.profile.accountType === "merchant"
                        ? wallet.profile.businessName
                        : `Hello, ${wallet.profile.fullName.split(" ")[0]}.`}
                    </h1>
                    <p>
                      {merchant
                        ? "Your shop has its own home in FingerPay."
                        : "Your demo wallet is active."}
                    </p>
                  </div>
                  <div className={s.balance}>
                    <div className={s.balanceTop}>
                      <span>Demo balance · PKR</span>
                      <button
                        type="button"
                        className={s.ghostBtn}
                        onClick={() => setHidden(!hidden)}
                      >
                        {hidden ? "Show" : "Hide"}
                      </button>
                    </div>
                    <strong>{hidden ? "••••" : wallet.balance}</strong>
                    <p>Promotional signup credit · No cash value</p>
                  </div>
                  <section className={s.next}>
                    <h2>{merchant ? "Counter setup" : "Ready"}</h2>
                    <p>
                      {merchant
                        ? "Your business profile is saved. Pair an Android terminal to accept thumb payments at the counter."
                        : "Your signup credit is saved. Branch CNIC verification and thumb enrollment are simulated at the counter."}
                    </p>
                    {merchant && <Link href="/mobile">Open terminal simulator →</Link>}
                  </section>
                </section>
              )}

              {tab === "Activity" && (
                <section className={s.intro}>
                  <h1>Activity.</h1>
                  {wallet.activity.map((a) => (
                    <div className={s.receipt} key={a.createdAt}>
                      <div>
                        <h2>{a.label}</h2>
                        <p>
                          {new Date(a.createdAt).toLocaleDateString("en-PK", {
                            timeZone: "Asia/Karachi",
                            dateStyle: "medium",
                          })}{" "}
                          · Demo credit
                        </p>
                      </div>
                      <strong>+ PKR {a.amount}</strong>
                    </div>
                  ))}
                  <p>Counter payments run through paired terminals.</p>
                </section>
              )}

              {tab === "Profile" && (
                <section className={s.intro}>
                  <h1>Details.</h1>
                  <dl className={s.profile}>
                    <div>
                      <dt>Email</dt>
                      <dd>{email}</dd>
                    </div>
                    {[...personalFields, ...(merchant ? businessFields : [])].map(([key, label]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>
                          {String(
                            (wallet.profile as unknown as Record<string, unknown>)[key] ||
                              "Not provided",
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </>
          )}
        </div>
      )}

      <footer className={s.foot}>
        Student prototype · Demo credit only · No real money or biometrics processed
      </footer>
    </main>
  );
}
