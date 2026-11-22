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
    title: "Keyed HMAC, never an image.",
    lead: "The reader discards the ridge picture in memory.",
    rest: "The server derives a purpose-isolated subkey via HKDF-SHA256 and stores only a 32-byte HMAC digest. There is no print in the database to steal.",
    specs: [
      { k: "Key derivation", v: "HKDF-SHA256 · fingerpay:thumb-idx-v1" },
      { k: "Stored value", v: "32-byte HMAC-SHA256" },
    ],
  },
  {
    title: "Row-bound AES-256-GCM.",
    lead: "Every name, CNIC, phone, and account number is encrypted.",
    rest: "Each ciphertext binds its exact table, column, and row UUID in Additional Authenticated Data, so a value copied between rows fails decryption.",
    specs: [
      { k: "Cipher", v: "AES-256-GCM · 96-bit nonce" },
      { k: "Additional data", v: "table | column | row_uuid" },
    ],
  },
  {
    title: "Hardware-signed terminals.",
    lead: "Only a store owner can pair a counter device.",
    rest: "Every request is signed with the terminal’s ECDSA P-256 private key over method, path, terminal UUID, timestamp, nonce, and body hash. Any cashier can freeze a lost terminal in one tap.",
    specs: [
      { k: "Curve", v: "NIST P-256 · SPKI" },
      { k: "Brute-force pause", v: "10 unknown thumbs in 10 min" },
    ],
  },
  {
    title: "Append-only ledger & hash chain.",
    lead: "Balances move only through fp.post_journal.",
    rest: "Deferred triggers verify at COMMIT that every journal sums to zero. Every audit row hashes the previous digest so historical tampering is detected immediately.",
    specs: [
      { k: "Database role", v: "fp_app · 0 table privileges" },
      { k: "Integrity check", v: "fp.verify_audit_chain()" },
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
            <strong>Trust comes from the mechanism, not a promise.</strong> Keyed HMAC digests, row-bound AES-256-GCM
            encryption, and a one-second SMS kill switch on any keypad phone.
          </p>
          <div className={p.heroActions}>
            <Link href="/how-it-works" className={p.ctaDark}>
              How it works <Icon name="arrow-right" />
            </Link>
            <Link href="/numbers" className={p.ctaGlass}>
              Numbers
            </Link>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="pillars-title">
          <div className={p.leftSticky}>
            <h2 id="pillars-title" className={p.sectionTitle}>Four layers of control.</h2>
            <p className={`${p.sectionSub} two-tone t-lead`}>
              <strong>Tested on every commit.</strong> 128 automated database invariant and attack checks verify the
              schema.
            </p>
          </div>
          <div className={p.rightStream}>
            {PILLARS.map((pl) => (
              <article key={pl.title} className={p.streamItem}>
                <h3 className={p.streamTitle}>{pl.title}</h3>
                <p className={`${p.streamDesc} two-tone t-lead`}>
                  <strong>{pl.lead}</strong> {pl.rest}
                </p>
                <dl className={p.specList}>
                  {pl.specs.map((sp) => (
                    <div key={sp.k} className={p.specLine}>
                      <dt className={p.specKey}>{sp.k}</dt>
                      <dd className={p.specVal}>{sp.v}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="sms-lock-title">
          <div className={p.leftSticky}>
            <h2 id="sms-lock-title" className={p.sectionTitle}>Reply LOCK from any phone.</h2>
            <p className={`${p.sectionSub} two-tone t-lead`}>
              <strong>Inspired by real lessons from cloned-print fraud.</strong> The shopper owns the kill switch.
            </p>
          </div>
          <div className={p.rightStream}>
            <article className={p.streamItem}>
              <h3 className={p.streamTitle}>Locked in one second, unlocked at a branch.</h3>
              <p className={`${p.streamDesc} two-tone t-lead`}>
                <strong>Replying LOCK to any receipt blocks thumb payments immediately.</strong> Every subsequent attempt
                is declined at PKR 0 and sends an alert SMS. Unlocking requires an in-person Allied Bank branch visit.
              </p>
              <p className={p.codeLine}>Allied Bank FingerPay: Thumb payments are now LOCKED. Visit any Allied Bank branch with your CNIC to unlock.</p>
            </article>
            <article className={p.streamItem}>
              <h3 className={p.streamTitle}>Nothing leaks to the merchant counter.</h3>
              <p className={`${p.streamDesc} two-tone t-lead`}>
                <strong>A shop never sees a shopper’s balance, CNIC, or phone number.</strong> Settled sales show only
                first name and initial; declined attempts hide the name completely.
              </p>
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
