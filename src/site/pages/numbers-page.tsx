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

// SPEC §6.1 exact half-up fee math in integer paisas
function computeMdr(grossPkr: number) {
  const grossPaisa = Math.round(grossPkr * 100);
  let feePaisa = 0;
  if (grossPaisa > 10000) {
    // round(gross * 0.0045, 2) half-up
    feePaisa = Math.min(2500, Math.floor((grossPaisa * 45 + 5000) / 10000));
  }
  const fpSharePaisa = Math.floor((feePaisa * 70 + 50) / 100);
  const bankSharePaisa = feePaisa - fpSharePaisa;
  const netPaisa = grossPaisa - feePaisa;
  const cardFeePaisa = Math.floor((grossPaisa * 250 + 5000) / 10000); // 2.5% card POS
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
            Kiryana-grade economics. Exact to the paisa.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>Small shops reject card POS terminals because 2.5% eats their margin on milk and bread.</strong>{" "}
            FingerPay charges PKR 0 on micro-sales up to PKR 100, and 0.45% above PKR 100 — capped at PKR 25.
          </p>
          <div className={p.heroActions}>
            <Link href="/signup" className={p.ctaDark}>
              Open a demo merchant account <Icon name="arrow-right" />
            </Link>
            <Link href="/how-it-works" className={p.ctaGlass}>
              See the checkout flow
            </Link>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="calc-title">
          <div className={p.sectionHeader}>
            <h2 id="calc-title" className={p.sectionTitle}>Interactive MDR &amp; savings calculator</h2>
            <p className={p.sectionSub}>
              Slide or pick a preset to inspect the exact database half-up fee split (70% FingerPay, 30% Allied Bank)
              and compare against a 2.5% card POS terminal.
            </p>
          </div>

          <div className={p.calcWrap}>
            <div className={p.calcControls}>
              <div>
                <span className="t-mono-s">Sale amount at the counter</span>
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
            </div>

            <dl className={p.calcResults}>
              <div className={p.calcRow}>
                <dt>Gross sale</dt>
                <dd><strong>{math.gross}</strong></dd>
              </div>
              <div className={p.calcRow}>
                <dt>FingerPay total MDR fee (0.45%, cap PKR 25)</dt>
                <dd>{math.fee}</dd>
              </div>
              <div className={p.calcRow}>
                <dt>↳ FingerPay revenue (70%)</dt>
                <dd>{math.fpShare}</dd>
              </div>
              <div className={p.calcRow}>
                <dt>↳ Allied Bank revenue (30%)</dt>
                <dd>{math.bankShare}</dd>
              </div>
              <div className={p.calcRow}>
                <dt>Net settled to merchant</dt>
                <dd><strong>{math.net}</strong></dd>
              </div>
              <div className={p.calcRow}>
                <dt>Traditional 2.5% card POS fee</dt>
                <dd>{math.cardFee}</dd>
              </div>
              <div className={p.calcRow}>
                <dt>Merchant saves per sale with FingerPay</dt>
                <dd className={p.calcHighlight}>{math.saved}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="tiers-title">
          <div className={p.sectionHeader}>
            <h2 id="tiers-title" className={p.sectionTitle}>Account limits, cashback &amp; rebates</h2>
            <p className={p.sectionSub}>
              Enforced inside <code>fp.api_thumb_pay</code> and funded from the dedicated Marketing Pool ledger
              account.
            </p>
          </div>
          <div className={p.tableWrap}>
            <table className={p.specTable}>
              <thead>
                <tr>
                  <th>Rule / Tier</th>
                  <th>Per-Tap Limit</th>
                  <th>Daily Limit</th>
                  <th>Incentive / Cashback</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Shopper Salary Account</strong> (<code>SHOPPER_SALARY</code>)</td>
                  <td>PKR 5,000.00</td>
                  <td>PKR 15,000.00</td>
                  <td>PKR 50.00 first-tap bonus (on sales ≥ PKR 150)</td>
                </tr>
                <tr>
                  <td><strong>Student Account</strong> (<code>STUDENT_NON_PTA</code>)</td>
                  <td>PKR 2,000.00</td>
                  <td>PKR 5,000.00</td>
                  <td>PKR 50.00 first tap, then 2% student cashback + PKR 100 referral bonus</td>
                </tr>
                <tr>
                  <td><strong>Merchant Store CASA</strong> (<code>MERCHANT_CASA</code>)</td>
                  <td>—</td>
                  <td>Unlimited</td>
                  <td>PKR 500.00 automatic monthly rebate upon reaching 500 settled sales</td>
                </tr>
                <tr>
                  <td><strong>Self-Service Demo Wallet</strong> (<code>/signup</code>)</td>
                  <td>PKR 200.00 credit</td>
                  <td>Sandbox</td>
                  <td>Instant PKR 200.00 promotional demo balance on account creation</td>
                </tr>
              </tbody>
            </table>
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
