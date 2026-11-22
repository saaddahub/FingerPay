"use client";

import Link from "next/link";
import { Nav, HonestyPill } from "../nav/nav.tsx";
import { Footer } from "../close/close.tsx";
import { Sale } from "../sale/sale.tsx";
import { SmoothScroll } from "../scroll/smooth-scroll.tsx";
import { InkField } from "../ink/ink.tsx";
import { SiteWidgets, openContactModal } from "../widgets/site-widgets.tsx";
import { Icon } from "../icons.tsx";
import p from "./pages.module.css";

const STEPS = [
  {
    num: "01",
    title: "One-time branch enrollment",
    desc: "A shopper visits any Allied Bank branch once with their CNIC. The branch officer verifies identity via NADRA, records biometric consent, and scans the shopper’s thumb once to link their existing CASA or student account.",
    specs: [
      { k: "Actor role", v: "BRANCH_OFFICER / MANAGER" },
      { k: "Stored biometric", v: "HMAC-SHA256(K_lookup, token)" },
      { k: "Raw image stored", v: "0 bytes (discarded)" },
      { k: "Setup time", v: "~2 minutes, once" },
    ],
  },
  {
    num: "02",
    title: "Cashier opens a signed charge",
    desc: "At the kiryana counter, Rasheed types PKR 180.00 into the paired Android terminal. The terminal signs the payload with its hardware-backed ECDSA P-256 private key, a 16-byte random nonce, and an ISO timestamp.",
    specs: [
      { k: "Endpoint", v: "POST /api/v1/pos/charges" },
      { k: "Signature", v: "ECDSA P-256 IEEE-P1363" },
      { k: "Replay window", v: "±120s + unique nonce" },
      { k: "Charge expiry", v: "90 seconds" },
    ],
  },
  {
    num: "03",
    title: "Thumb tap & Risk Engine check",
    desc: "Ayesha places her thumb on the counter reader. No phone, no card, no PIN. The Risk Engine verifies the thumb isn’t locked, checks per-tap and daily limits, blocks 15-second duplicate taps, and posts a double-entry ledger journal.",
    specs: [
      { k: "Salary per-tap limit", v: "PKR 5,000.00" },
      { k: "Student per-tap limit", v: "PKR 2,000.00" },
      { k: "Duplicate guard", v: "15s same store/amount" },
      { k: "Brute-force lock", v: "3 failed thumbs / charge" },
    ],
  },
  {
    num: "04",
    title: "Counter settles & plain-SMS receipt arrives",
    desc: "The merchant’s own screen turns green in under 3 seconds — no fake transfer screenshots to inspect. Simultaneously, Ayesha receives a plain SMS receipt on any keypad phone with instant LOCK and DISPUTE reply commands.",
    specs: [
      { k: "Target latency", v: "< 3.0 seconds" },
      { k: "Net to merchant (PKR 180)", v: "PKR 179.19 (fee 0.81)" },
      { k: "First-tap cashback", v: "PKR 50.00 (on ≥ PKR 150)" },
      { k: "Self-defense commands", v: "Reply LOCK · Reply DISPUTE" },
    ],
  },
] as const;

export function HowItWorksPage() {
  return (
    <>
      <a href="#hiw-main" className="skip-link">Skip to content</a>
      <span id="top" />
      <Nav />
      <main id="hiw-main" className={p.page}>
        <section className={`${p.hero} page-grid`} aria-labelledby="hiw-title">
          <h1 id="hiw-title" className={p.heroTitle}>
            Three seconds at the counter. Zero devices in your pocket.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>A shopper walks into a kiryana store with empty hands and leaves with a settled receipt.</strong>{" "}
            Here is the complete technical loop from one-time branch enrollment to live counter settlement and SMS
            self-defense.
          </p>
          <div className={p.heroActions}>
            <Link href="/signup" className={p.ctaDark}>
              Try with PKR 200 demo credit <Icon name="arrow-right" />
            </Link>
            <Link href="/security" className={p.ctaGlass}>
              Inspect the cryptography <Icon name="shield" />
            </Link>
            <button type="button" className={p.ctaGlass} onClick={openContactModal}>
              Ask the team a question
            </button>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="steps-title">
          <div className={p.sectionHeader}>
            <h2 id="steps-title" className={p.sectionTitle}>The four-stage payment loop</h2>
            <p className={p.sectionSub}>
              Every step runs through strict database functions under role <code>fp_app</code> with zero direct table
              access.
            </p>
          </div>
          <ol className={p.timeline}>
            {STEPS.map((st) => (
              <li key={st.num} className={p.stepItem}>
                <span className={p.stepBadge}>{st.num}</span>
                <div className={p.stepMain}>
                  <h3 className={p.stepTitle}>{st.title}</h3>
                  <p className={p.stepDesc}>{st.desc}</p>
                </div>
                <dl className={p.stepSpec}>
                  {st.specs.map((sp) => (
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

        <Sale />

        <section className={`${p.section} page-grid`} aria-labelledby="edge-title">
          <div className={p.sectionHeader}>
            <h2 id="edge-title" className={p.sectionTitle}>What happens when things go wrong</h2>
            <p className={p.sectionSub}>
              Counters in Lahore and Karachi face dropped data, rush-hour double taps, and shared family phones.
              FingerPay fails closed every time.
            </p>
          </div>
          <div className={p.splitGrid}>
            <article className={p.glassPanel}>
              <h3 className={p.panelHeading}>If the shop’s internet drops: TAKE CASH</h3>
              <p className={p.panelBody}>
                FingerPay never queues an offline biometric payment. Deferred settlement risks overdrafts and replay
                attacks. When connectivity drops, the terminal immediately displays <strong>TAKE CASH</strong> and logs
                an <code>OFFLINE_CASH</code> telemetry event once back online without moving a single paisa.
              </p>
            </article>
            <article className={p.glassPanel}>
              <h3 className={p.panelHeading}>Same-day void &amp; Maker-Checker refunds</h3>
              <p className={p.panelBody}>
                A store owner (never a cashier) can void a settled sale on the same Karachi calendar day, automatically
                clawing back any cashback and returning the exact MDR fee. If a shopper replies <code>DISPUTE</code> to
                their SMS receipt, a ticket opens and requires two distinct bank officers (maker + checker) to approve
                the reversal.
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
