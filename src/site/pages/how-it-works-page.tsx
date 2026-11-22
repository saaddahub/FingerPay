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
    title: "Branch enrollment, once.",
    lead: "Two minutes at any Allied Bank counter with a CNIC.",
    rest: "The officer checks NADRA, records biometric consent, and scans the thumb once to derive a keyed HMAC blind index. No fingerprint image is ever saved.",
    specs: [
      { k: "Stored digest", v: "HMAC-SHA256(K_lookup, token)" },
      { k: "Raw image stored", v: "0 bytes" },
    ],
  },
  {
    title: "A signed charge at the till.",
    lead: "Rasheed enters PKR 180.00 on the shop’s Android phone.",
    rest: "The paired terminal signs the charge with its hardware-backed ECDSA P-256 key, a fresh 16-byte nonce, and a timestamp.",
    specs: [
      { k: "Signature", v: "ECDSA P-256 IEEE-P1363" },
      { k: "Replay window", v: "±120 s · unique nonce" },
    ],
  },
  {
    title: "One thumb on the reader.",
    lead: "Ayesha rests her thumb. No phone, no card, no PIN.",
    rest: "The Risk Engine verifies the thumb is unlocked, checks the per-tap and daily limit, blocks 15-second duplicate taps, and posts a double-entry ledger journal.",
    specs: [
      { k: "Per-tap limit", v: "PKR 5,000 salary · PKR 2,000 student" },
      { k: "Duplicate guard", v: "15 s same shop & amount" },
    ],
  },
  {
    title: "Settled on screen, receipt by SMS.",
    lead: "The shop’s own screen confirms in under three seconds.",
    rest: "No transfer screenshots to inspect. Ayesha gets a plain SMS receipt on any keypad phone with Reply LOCK and Reply DISPUTE.",
    specs: [
      { k: "Net to merchant (PKR 180)", v: "PKR 179.19 · fee PKR 0.81" },
      { k: "Shopper controls", v: "Reply LOCK · Reply DISPUTE" },
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
            Three seconds at the counter. Nothing in your pocket.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>A shopper walks in empty-handed and leaves with a settled receipt.</strong> From one-time branch
            enrollment to live counter settlement and plain-SMS controls.
          </p>
          <div className={p.heroActions}>
            <Link href="/signup" className={p.ctaDark}>
              Create an account <Icon name="arrow-right" />
            </Link>
            <Link href="/security" className={p.ctaGlass}>
              Security
            </Link>
            <button type="button" className={p.ctaGlass} onClick={openContactModal}>
              Contact the team
            </button>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="steps-title">
          <div className={p.leftSticky}>
            <h2 id="steps-title" className={p.sectionTitle}>Four steps, start to finish.</h2>
            <p className={`${p.sectionSub} two-tone t-lead`}>
              <strong>Every step runs inside strict database functions.</strong> The application role holds zero direct
              table access.
            </p>
          </div>
          <div className={p.rightStream}>
            {STEPS.map((st) => (
              <article key={st.title} className={p.streamItem}>
                <h3 className={p.streamTitle}>{st.title}</h3>
                <p className={`${p.streamDesc} two-tone t-lead`}>
                  <strong>{st.lead}</strong> {st.rest}
                </p>
                <dl className={p.specList}>
                  {st.specs.map((sp) => (
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

        <Sale />

        <section className={`${p.section} page-grid`} aria-labelledby="edge-title">
          <div className={p.leftSticky}>
            <h2 id="edge-title" className={p.sectionTitle}>When the network drops.</h2>
            <p className={`${p.sectionSub} two-tone t-lead`}>
              <strong>Counters in Lahore and Karachi lose signal mid-rush.</strong> FingerPay fails closed every time.
            </p>
          </div>
          <div className={p.rightStream}>
            <article className={p.streamItem}>
              <h3 className={p.streamTitle}>Take cash. Never queue.</h3>
              <p className={`${p.streamDesc} two-tone t-lead`}>
                <strong>An offline biometric payment is a promise you cannot verify.</strong> When connectivity drops,
                the terminal immediately shows Take cash and never queues a deferred charge.
              </p>
            </article>
            <article className={p.streamItem}>
              <h3 className={p.streamTitle}>Same-day void &amp; maker-checker refunds.</h3>
              <p className={`${p.streamDesc} two-tone t-lead`}>
                <strong>Only the store owner can void a same-day sale.</strong> If a shopper replies DISPUTE to an SMS
                receipt, two distinct bank officers must sign off to reverse the journal.
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
