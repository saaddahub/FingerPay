"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav, HonestyPill } from "../nav/nav.tsx";
import { Footer } from "../close/close.tsx";
import { Ledger } from "../ledger/ledger.tsx";
import { SmoothScroll } from "../scroll/smooth-scroll.tsx";
import { InkField } from "../ink/ink.tsx";
import { SiteWidgets } from "../widgets/site-widgets.tsx";
import { Icon } from "../icons.tsx";
import p from "./pages.module.css";

const PRESETS = [50, 100, 180, 500, 2500, 10000] as const;

function computeMdr(grossPkr: number) {
  const grossPaisa = Math.round(grossPkr * 100);
  let feePaisa = 0;
  if (grossPaisa > 10000) {
    feePaisa = Math.min(2500, Math.floor((grossPaisa * 45 + 5000) / 10000));
  }
  const fpSharePaisa = Math.floor((feePaisa * 70 + 50) / 100);
  const bankSharePaisa = feePaisa - fpSharePaisa;
  const netPaisa = grossPaisa - feePaisa;
  const cardFeePaisa = Math.floor((grossPaisa * 250 + 5000) / 10000);
  const savedPaisa = cardFeePaisa - feePaisa;
  const fmt = (paisa: number) => "PKR " + (paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    gross: fmt(grossPaisa),
    fee: fmt(feePaisa),
    fpShare: fmt(fpSharePaisa),
    bankShare: fmt(bankSharePaisa),
    net: fmt(netPaisa),
    cardFee: fmt(cardFeePaisa),
    saved: fmt(savedPaisa),
  };
}

export function NumbersPage() {
  const [amount, setAmount] = useState(180);
  const math = computeMdr(amount);

  return (
    <>
      <a href="#num-main" className="skip-link">Skip to content</a>
      <span id="top" />
      <Nav />
      <main id="num-main" className={p.page}>
        <section className={`${p.hero} page-grid`} aria-labelledby="num-title">
          <h1 id="num-title" className={p.heroTitle}>
            Kiryana economics. Exact to the paisa.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>Small shops refuse card terminals because 2.5% eats their margin.</strong> FingerPay charges PKR 0
            up to PKR 100, and 0.45% above PKR 100 — capped at PKR 25.
          </p>
          <div className={p.heroActions}>
            <Link href="/signup" className={p.ctaDark}>
              Create an account <Icon name="arrow-right" />
            </Link>
            <Link href="/how-it-works" className={p.ctaGlass}>
              How it works
            </Link>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="calc-title">
          <div className={p.leftSticky}>
            <h2 id="calc-title" className={p.sectionTitle}>Fee math, live.</h2>
            <p className={`${p.sectionSub} two-tone t-lead`}>
              <strong>Half-up rounding in the database.</strong> Slide any counter amount to see the 70 / 30 revenue
              split and savings against a 2.5% card POS.
            </p>
          </div>

          <div className={p.calcStream}>
            <div>
              <p className={p.amountDisplay}>{math.gross}</p>
            </div>
            <label htmlFor="fp-amount-slider" className="visually-hidden">Sale amount in PKR</label>
            <input
              id="fp-amount-slider"
              type="range"
              min={20}
              max={10000}
              step={10}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={p.rangeInput}
            />
            <div className={p.presetRow}>
              {PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  data-active={amount === val}
                  className={p.presetBtn}
                  onClick={() => setAmount(val)}
                >
                  PKR {val.toLocaleString()}
                </button>
              ))}
            </div>

            <dl className={p.calcRows}>
              <div className={p.calcRow}>
                <dt className={p.specKey}>Merchant fee (0.45%, cap PKR 25)</dt>
                <dd>{math.fee}</dd>
              </div>
              <div className={p.calcRow}>
                <dt className={p.specKey}>FingerPay share (70%)</dt>
                <dd>{math.fpShare}</dd>
              </div>
              <div className={p.calcRow}>
                <dt className={p.specKey}>Allied Bank share (30%)</dt>
                <dd>{math.bankShare}</dd>
              </div>
              <div className={p.calcRow}>
                <dt className={p.specKey}>Net settled to shop</dt>
                <dd>{math.net}</dd>
              </div>
              <div className={p.calcRow}>
                <dt className={p.specKey}>2.5% card POS fee</dt>
                <dd>{math.cardFee}</dd>
              </div>
              <div className={p.calcRow}>
                <dt className={p.specKey}>Saved per sale</dt>
                <dd className={p.calcHighlight}>{math.saved}</dd>
              </div>
            </dl>
          </div>
        </section>

        <Ledger />
      </main>
      <Footer />
      <HonestyPill />
      <SmoothScroll />
      <InkField />
      <SiteWidgets />
    </>
  );
}
