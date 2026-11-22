"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate } from "motion";
import { ease } from "../motion.ts";
import { useReducedMotion } from "../use-reduced.ts";
import s from "./partners.module.css";

type Partner = {
  id: string;
  name: string;
  code: string;
  layer: string;
  lead: string;
  rest: string;
  mark: ReactNode;
};

// Every partner emblem is drawn in the exact same -24 -24 48 48 coin geometry and 1.65 px stroke weight
// as FingerPay's own Ridge Coin (SYSTEM.md §7), so all marks read as one cohesive engraved series.
const PARTNERS: Partner[] = [
  {
    id: "abl",
    name: "Allied Bank",
    code: "ABL · CASA CUSTODY",
    layer: "Proposed Sponsor Bank",
    lead: "One-time branch enrollment and T+0 merchant accounts.",
    rest: "Branch officers verify the shopper’s CNIC, record biometric consent, and link existing salary or student accounts without moving custody out of the bank.",
    mark: (
      <svg viewBox="-24 -24 48 48" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle r="22" />
        <path d="M0 -15 L15 0 L0 15 L-15 0 Z" />
        <path d="M0 -7.5 L7.5 0 L0 7.5 L-7.5 0 Z" />
        <path d="M-15 0 H-7.5 M7.5 0 H15 M0 -15 V-7.5 M0 7.5 V15" />
      </svg>
    ),
  },
  {
    id: "raast",
    name: "SBP Raast",
    code: "RAAST · INSTANT RAIL",
    layer: "Proposed Settlement Rail",
    lead: "State Bank of Pakistan’s real-time retail payment rail.",
    rest: "Settles the exact net amount into the shopkeeper’s account in under three seconds and returns a verifiable Raast reference for the shopper’s SMS receipt.",
    mark: (
      <svg viewBox="-24 -24 48 48" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle r="22" />
        <path d="M-13 -5 C-7 -13, 7 -13, 13 -5" />
        <path d="M9 -10 L13.5 -4.8 L7.5 -3.5" />
        <path d="M13 5 C7 13, -7 13, -13 5" />
        <path d="M-9 10 L-13.5 4.8 L-7.5 3.5" />
        <circle r="2.5" />
      </svg>
    ),
  },
  {
    id: "nadra",
    name: "NADRA",
    code: "NADRA · PAK-ID",
    layer: "Proposed Identity Authority",
    lead: "13-digit CNIC verification at the enrollment desk.",
    rest: "Confirms identity once during branch setup. After enrollment, daily counter payments match against FingerPay’s keyed HMAC index without re-querying raw biometrics.",
    mark: (
      <svg viewBox="-24 -24 48 48" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle r="22" />
        <path d="M0 -15 L12 -9.5 V1.5 C12 9, 6.8 13.8, 0 16 C-6.8 13.8, -12 9, -12 1.5 V-9.5 Z" />
        <path d="M-6 -1.5 C-3 -5.5, 3 -5.5, 6 -1.5" />
        <path d="M-7.5 3 C-3.5 -1.5, 3.5 -1.5, 7.5 3" />
        <path d="M-5 7.5 C-2 4.5, 2 4.5, 5 7.5" />
      </svg>
    ),
  },
  {
    id: "onelink",
    name: "1LINK",
    code: "1LINK · INTERBANK GRID",
    layer: "Proposed National Switch",
    lead: "Interbank routing across member commercial banks.",
    rest: "Allows a shopper enrolled at any participating bank branch to pay by thumb at any FingerPay-paired kiryana counter across the national switch.",
    mark: (
      <svg viewBox="-24 -24 48 48" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle r="22" />
        <circle cx="-5.5" cy="0" r="8.5" />
        <circle cx="5.5" cy="0" r="8.5" />
        <path d="M0 -6.4 V6.4" />
      </svg>
    ),
  },
  {
    id: "jazz",
    name: "Jazz & JazzCash",
    code: "JAZZ · SMPP & WALLET",
    layer: "Proposed Telecom & Wallet Partner",
    lead: "Sub-second SMS receipts and micro-merchant settlement.",
    rest: "Delivers plain-SMS payment confirmations and routes inbound Reply LOCK and Reply DISPUTE commands from any keypad phone with no data plan required.",
    mark: (
      <svg viewBox="-24 -24 48 48" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle r="22" />
        <path d="M-13 6 C-8 6, -6 -8, 0 -8 C6 -8, 8 6, 13 6" />
        <path d="M-13 0 C-8 0, -6 -13, 0 -13 C6 -13, 8 0, 13 0" />
        <path d="M-13 12 C-8 12, -6 -2, 0 -2 C6 -2, 8 12, 13 12" />
      </svg>
    ),
  },
  {
    id: "telecom",
    name: "Telenor · Zong · Ufone",
    code: "SMPP · CARRIER GRID",
    layer: "Proposed SMS Carrier Mesh",
    lead: "Every mobile network in Pakistan, on any feature phone.",
    rest: "Direct short-code routing across all four cellular operators ensures a shopper can freeze their thumb nationwide in one second by replying LOCK to any receipt.",
    mark: (
      <svg viewBox="-24 -24 48 48" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle r="22" />
        <circle cx="0" cy="-9" r="3" />
        <circle cx="-9" cy="6" r="3" />
        <circle cx="9" cy="6" r="3" />
        <path d="M-1.8 -6.4 L-7.2 3.4 M1.8 -6.4 L7.2 3.4 M-6 6 H6" />
      </svg>
    ),
  },
  {
    id: "hardware",
    name: "SecuGen & Android Keystore",
    code: "FAP-20 · ECDSA P-256",
    layer: "Counter Hardware & Attestation",
    lead: "Optical thumb capture paired with hardware-signed requests.",
    rest: "The counter scanner emits a one-time token in memory while the Android Keystore signs every charge with an unexportable NIST P-256 private key.",
    mark: (
      <svg viewBox="-24 -24 48 48" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle r="22" />
        <rect x="-10" y="-12" width="20" height="24" rx="5" />
        <circle cx="0" cy="-1" r="5.5" />
        <path d="M-3.5 -1 C-1.5 -3.5, 1.5 -3.5, 3.5 -1" />
        <path d="M-3 7.5 H3" />
      </svg>
    ),
  },
];

export function Partners() {
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const list = listRef.current;
    if (!list || reduced) return;
    list.dataset.live = "";
    const rows = [...list.querySelectorAll<HTMLElement>("[data-partner-row]")];
    let batch = 0;
    let timer = 0;

    const play = (row: HTMLElement, delay: number) => {
      row.dataset.shown = "";
      animate(row.querySelector("[data-p-rule]")!, { transform: ["scaleX(0)", "scaleX(1)"] }, { duration: 0.8, ease: ease.out, delay });
      animate(row.querySelector("[data-p-lockup]")!, { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0px)"] }, { duration: 0.55, ease: ease.out, delay: delay + 0.08 });
      animate(row.querySelector("[data-p-copy]")!, { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0px)"] }, { duration: 0.55, ease: ease.out, delay: delay + 0.16 });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          play(e.target as HTMLElement, batch++ * 0.07);
          window.clearTimeout(timer);
          timer = window.setTimeout(() => (batch = 0), 90);
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );

    rows.forEach((r) => io.observe(r));
    return () => {
      io.disconnect();
      delete list.dataset.live;
      rows.forEach((r) => {
        delete r.dataset.shown;
        r.querySelectorAll<HTMLElement>("[style]").forEach((el) => el.removeAttribute("style"));
      });
    };
  }, [reduced]);

  return (
    <section id="partners" className={`${s.partners} page-grid`} aria-labelledby="partners-title">
      <div className={s.intro}>
        <h2 id="partners-title" className={`${s.title} t-display`}>Proposed partners. One rail.</h2>
        <p className={`${s.lead} two-tone t-lead`}>
          <strong>Every layer plugs into an institution Pakistan already uses.</strong> Allied Bank, SBP Raast, NADRA,
          1LINK, and the four mobile carriers are proposed partners for the pilot; all connections in this student
          prototype are simulated.
        </p>
        <div className={s.sealStrip} aria-hidden="true">
          {PARTNERS.map((p) => (
            <span key={p.id} className={s.miniSeal} title={p.name}>
              {p.mark}
            </span>
          ))}
        </div>
      </div>

      <div ref={listRef} className={s.rows}>
        {PARTNERS.map((p) => (
          <article key={p.id} className={s.row} data-partner-row>
            <span className={s.rule} data-p-rule aria-hidden="true" />
            <div className={s.lockup} data-p-lockup>
              <span className={s.seal}>{p.mark}</span>
              <div className={s.brandText}>
                <h3 className={s.brandName}>{p.name}</h3>
                <span className={`${s.brandCode} t-mono-s`}>{p.code}</span>
              </div>
            </div>
            <div className={s.copyCol} data-p-copy>
              <p className="two-tone t-lead">
                <strong>{p.lead}</strong> {p.rest}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
