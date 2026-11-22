"use client";

import Link from "next/link";
import { Nav, HonestyPill } from "../nav/nav.tsx";
import { Footer } from "../close/close.tsx";
import { SmoothScroll } from "../scroll/smooth-scroll.tsx";
import { InkField } from "../ink/ink.tsx";
import { SiteWidgets } from "../widgets/site-widgets.tsx";
import { Icon } from "../icons.tsx";
import p from "./pages.module.css";

const PILLARS = [
  {
    num: "01",
    title: "Keyed HMAC thumb lookup — zero fingerprint images",
    desc: "The scanner derives a one-time capture token in memory. The server derives a purpose-isolated subkey via HKDF-SHA256 ('fingerpay:thumb-idx-v1') and computes a 32-byte HMAC-SHA256 digest. A database leak reveals no fingerprint minutiae or ridges.",
    specs: [
      { k: "KDF", v: "HKDF-SHA256 (32-byte subkey)" },
      { k: "Stored digest", v: "HMAC-SHA256 (32 bytes)" },
      { k: "Key versioning", v: "thumb_key_version smallint" },
    ],
  },
  {
    num: "02",
    title: "AES-256-GCM envelope encryption with row + column AAD",
    desc: "Every shopper name, CNIC, phone number, and bank account number is encrypted before touching Postgres. Each ciphertext binds to its exact table, column, and UUID rowId via Additional Authenticated Data (AAD), preventing cut-and-paste attacks across rows.",
    specs: [
      { k: "Cipher", v: "AES-256-GCM (96-bit nonce)" },
      { k: "AAD binding", v: "table | column | row_uuid" },
      { k: "Blind index", v: "HMAC(K_lookup, normalized)" },
    ],
  },
  {
    num: "03",
    title: "Hardware ECDSA P-256 terminal signing & freeze switch",
    desc: "Only a MERCHANT_OWNER can pair a counter terminal, registering its P-256 SPKI public key. Every charge and thumb request must be signed over method, path, terminalId, timestamp, nonce, and SHA-256 body hash. Any cashier can freeze a lost terminal in one tap.",
    specs: [
      { k: "Curve", v: "NIST P-256 (prime256v1)" },
      { k: "Clock skew max", v: "120 seconds" },
      { k: "Throttle pause", v: "10 unknown thumbs / 10 min" },
    ],
  },
  {
    num: "04",
    title: "Append-only double-entry ledger & SHA-256 audit hash chain",
    desc: "Money changes only inside fp.post_journal. Deferred constraint triggers verify at COMMIT that every journal has at least 2 lines summing to 0.00. Every audit row hashes the previous row’s SHA-256 digest so tampering with any historical row breaks the chain.",
    specs: [
      { k: "App DB role", v: "fp_app (0 table privileges)" },
      { k: "Mutation guard", v: "BEFORE UPDATE/DELETE/TRUNCATE" },
      { k: "Chain verifier", v: "fp.verify_audit_chain()" },
    ],
  },
] as const;

export function SecurityPage() {
  return (
    <>
      <a href="#sec-main" className="skip-link">Skip to content</a>
      <span id="top" />
      <Nav />
      <main id="sec-main" className={p.page}>
        <section className={`${p.hero} page-grid`} aria-labelledby="sec-title">
          <h1 id="sec-title" className={p.heroTitle}>
            No fingerprint image ever touches a disk.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>Biometric payment systems fail when they hoard raw prints or trust the client.</strong> FingerPay
            stores only keyed HMAC digests, encrypts every PII column with row-bound AES-256-GCM, and gives every
            shopper a one-second SMS kill switch.
          </p>
          <div className={p.heroActions}>
            <Link href="/how-it-works" className={p.ctaDark}>
              See the 3-second payment loop <Icon name="arrow-right" />
            </Link>
            <Link href="/numbers" className={p.ctaGlass}>
              Explore limits &amp; fee rules
            </Link>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="pillars-title">
          <div className={p.sectionHeader}>
            <h2 id="pillars-title" className={p.sectionTitle}>Four layers of defense in depth</h2>
            <p className={p.sectionSub}>
              Verified on every commit by 128 automated database attack and invariant tests running against the real
              migrations.
            </p>
          </div>
          <ol className={p.timeline}>
            {PILLARS.map((pl) => (
              <li key={pl.num} className={p.stepItem}>
                <span className={p.stepBadge}>{pl.num}</span>
                <div className={p.stepMain}>
                  <h3 className={p.stepTitle}>{pl.title}</h3>
                  <p className={p.stepDesc}>{pl.desc}</p>
                </div>
                <dl className={p.stepSpec}>
                  {pl.specs.map((sp) => (
                    <div key={sp.k} className={p.specLine}>
                      <dt className={p.specKey}>{sp.k}</dt>
                      <dd className={p.specVal}>{sp.v}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="sms-lock-title">
          <div className={p.sectionHeader}>
            <h2 id="sms-lock-title" className={p.sectionTitle}>SMS Thumb Lock &amp; merchant privacy</h2>
            <p className={p.sectionSub}>
              Inspired by real lessons from AePS cloned-fingerprint fraud: the shopper controls their biometric status
              from any basic phone.
            </p>
          </div>
          <div className={p.splitGrid}>
            <article className={p.glassPanel}>
              <h3 className={p.panelHeading}>Reply LOCK from any phone, any time</h3>
              <p className={p.panelBody}>
                Replying <code>LOCK</code> to any FingerPay SMS immediately sets <code>thumb_locked = true</code>. Any
                subsequent tap at any store is declined at PKR 0 cost and triggers an instant security alert SMS to the
                shopper. A merchant cannot unlock a thumb — unlocking requires an in-person Allied Bank branch visit.
              </p>
              <pre className={p.codeBlock}>{`SMS → "LOCK"
← Allied Bank FingerPay: Thumb payments are now LOCKED.
  Visit any Allied Bank branch with your CNIC to unlock.`}</pre>
            </article>
            <article className={p.glassPanel}>
              <h3 className={p.panelHeading}>Zero shopper leakage on merchant screens</h3>
              <p className={p.panelBody}>
                A merchant never sees a shopper’s account balance, CNIC, or phone number. On a settled sale, the
                merchant sees only first name and last initial (<code>Ayesha K.</code>). On any declined sale (low
                balance, limit exceeded, or locked thumb), the shopper’s name is completely redacted.
              </p>
              <pre className={p.codeBlock}>{`Canonical Terminal Signature Layout (SPEC §4.5):
METHOD + "\\n" + PATH + "\\n" + TERMINAL_UUID + "\\n"
+ ISO_TIMESTAMP + "\\n" + NONCE_B64 + "\\n" + SHA256_HEX(BODY)`}</pre>
            </article>
          </div>
        </section>
      </main>
      <Footer />
      <HonestyPill />
      <SmoothScroll />
      <InkField />
      <SiteWidgets />
    </>
  );
}
