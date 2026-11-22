"use client";

import Link from "next/link";
import { Nav, HonestyPill } from "../nav/nav.tsx";
import { Footer } from "../close/close.tsx";
import { SmoothScroll } from "../scroll/smooth-scroll.tsx";
import { InkField } from "../ink/ink.tsx";
import { SiteWidgets } from "../widgets/site-widgets.tsx";
import { Icon } from "../icons.tsx";
import p from "./pages.module.css";

export function DownloadPage() {
  return (
    <>
      <a href="#dl-main" className="skip-link">Skip to content</a>
      <span id="top" />
      <Nav />
      <main id="dl-main" className={p.page}>
        <section className={`${p.hero} page-grid`} aria-labelledby="dl-title">
          <h1 id="dl-title" className={p.heroTitle}>
            Get FingerPay for Android — or launch the web simulator.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>Two dedicated builds for the counter and the shopper.</strong> Install the APKs directly on any
            Android 9+ device with a fingerprint sensor, or test the full wallet and merchant portal right in your
            browser.
          </p>
          <div className={p.heroActions}>
            <a className={p.ctaDark} href="/downloads/fingerpay-customer.apk" download>
              <Icon name="download" /> Download Customer APK
            </a>
            <a className={p.ctaDark} href="/downloads/fingerpay-merchant.apk" download>
              <Icon name="download" /> Download Merchant APK
            </a>
            <Link href="/mobile" className={p.ctaGlass}>
              Open Web Mobile Simulator <Icon name="arrow-right" />
            </Link>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="builds-title">
          <div className={p.sectionHeader}>
            <h2 id="builds-title" className={p.sectionTitle}>Choose your FingerPay build</h2>
            <p className={p.sectionSub}>
              Both Android packages use native Jetpack Compose, Android Keystore ECDSA P-256 keys, and BiometricPrompt.
            </p>
          </div>
          <div className={p.splitGrid}>
            <article className={p.glassPanel}>
              <span className="t-mono-s">Android APK · Shopper Companion</span>
              <h3 className={p.panelHeading}>FingerPay Customer App</h3>
              <p className={p.panelBody}>
                While shoppers at the counter need only their thumb and a basic SMS phone, smartphone users can install
                the companion app to inspect their live Allied Bank FingerPay balance, view Raast receipts, share their
                student referral code, and claim the PKR 200 demo bonus.
              </p>
              <dl className={p.stepSpec}>
                <div className={p.specLine}>
                  <dt className={p.specKey}>Package</dt>
                  <dd className={p.specVal}>fingerpay-customer.apk</dd>
                </div>
                <div className={p.specLine}>
                  <dt className={p.specKey}>Minimum OS</dt>
                  <dd className={p.specVal}>Android 9.0 (API 28+)</dd>
                </div>
                <div className={p.specLine}>
                  <dt className={p.specKey}>Demo bonus</dt>
                  <dd className={p.specVal}>PKR 200.00 instant credit</dd>
                </div>
              </dl>
              <div>
                <a className={p.ctaDark} href="/downloads/fingerpay-customer.apk" download>
                  <Icon name="download" /> Download Customer app
                </a>
              </div>
            </article>

            <article className={p.glassPanel}>
              <span className="t-mono-s">Android APK · Counter Point-of-Sale</span>
              <h3 className={p.panelHeading}>FingerPay Merchant Terminal</h3>
              <p className={p.panelBody}>
                Turns a shopkeeper’s Android phone into a hardware-paired counter terminal. Features a fast keypad for
                opening charges, BiometricPrompt thumb capture + demo finger-tray selector, instant Settled/Declined
                cards, one-tap terminal freeze, and daily fee savings vs 2.5% card POS.
              </p>
              <dl className={p.stepSpec}>
                <div className={p.specLine}>
                  <dt className={p.specKey}>Package</dt>
                  <dd className={p.specVal}>fingerpay-merchant.apk</dd>
                </div>
                <div className={p.specLine}>
                  <dt className={p.specKey}>Hardware signing</dt>
                  <dd className={p.specVal}>Android Keystore P-256</dd>
                </div>
                <div className={p.specLine}>
                  <dt className={p.specKey}>Offline behavior</dt>
                  <dd className={p.specVal}>TAKE CASH (never queues)</dd>
                </div>
              </dl>
              <div>
                <a className={p.ctaDark} href="/downloads/fingerpay-merchant.apk" download>
                  <Icon name="download" /> Download Merchant app
                </a>
              </div>
            </article>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="web-sim-title">
          <div className={p.sectionHeader}>
            <h2 id="web-sim-title" className={p.sectionTitle}>No Android phone on hand? Test in your browser</h2>
            <p className={p.sectionSub}>
              Every role in the FingerPay ecosystem has an interactive web route ready to explore.
            </p>
          </div>
          <div className={p.splitGrid}>
            <article className={p.glassPanel}>
              <h3 className={p.panelHeading}>Create a Demo Account (PKR 200 credit)</h3>
              <p className={p.panelBody}>
                Sign up as a Customer or Merchant in 15 seconds and receive an immediate PKR 200.00 promotional balance
                in your sandbox wallet.
              </p>
              <div>
                <Link href="/signup" className={p.ctaDark}>
                  Create an account <Icon name="arrow-right" />
                </Link>
              </div>
            </article>
            <article className={p.glassPanel}>
              <h3 className={p.panelHeading}>Interactive Mobile Wallet Preview</h3>
              <p className={p.panelBody}>
                Launch the web-based mobile simulator to test biometric enrollment, thumb tap animations, and receipt
                history without installing an APK.
              </p>
              <div>
                <Link href="/mobile" className={p.ctaGlass}>
                  Launch /mobile simulator <Icon name="arrow-right" />
                </Link>
              </div>
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
