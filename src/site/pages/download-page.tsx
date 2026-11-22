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
            Get FingerPay for Android.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>Two builds. One counter loop.</strong> Install the APKs on any Android 9+ phone with a fingerprint
            sensor, or open the simulator in your browser.
          </p>
          <div className={p.heroActions}>
            <a className={p.ctaDark} href="/downloads/fingerpay-customer.apk" download>
              Download Customer app <Icon name="arrow-right" />
            </a>
            <a className={p.ctaDark} href="/downloads/fingerpay-merchant.apk" download>
              Download Merchant app <Icon name="arrow-right" />
            </a>
            <Link href="/mobile" className={p.ctaGlass}>
              Web simulator
            </Link>
          </div>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="builds-title">
          <div className={p.leftSticky}>
            <h2 id="builds-title" className={p.sectionTitle}>Counter and companion.</h2>
            <p className={`${p.sectionSub} two-tone t-lead`}>
              <strong>Native Jetpack Compose with hardware keystore signing.</strong> Shoppers at the counter still need
              only a thumb.
            </p>
          </div>
          <div className={p.rightStream}>
            <article className={p.streamItem}>
              <h3 className={p.streamTitle}>Customer app</h3>
              <p className={`${p.streamDesc} two-tone t-lead`}>
                <strong>An optional companion for smartphone users.</strong> Check your live demo balance, read Raast
                receipts, share your student referral code, and claim the PKR 200 signup credit.
              </p>
              <dl className={p.specList}>
                <div className={p.specLine}>
                  <dt className={p.specKey}>Package</dt>
                  <dd className={p.specVal}>fingerpay-customer.apk · Android 9+</dd>
                </div>
              </dl>
              <div>
                <a className={p.ctaDark} href="/downloads/fingerpay-customer.apk" download>
                  Download Customer APK <Icon name="arrow-right" />
                </a>
              </div>
            </article>

            <article className={p.streamItem}>
              <h3 className={p.streamTitle}>Merchant terminal</h3>
              <p className={`${p.streamDesc} two-tone t-lead`}>
                <strong>Turns the shopkeeper’s phone into a paired counter till.</strong> Hardware ECDSA P-256 request
                signing, BiometricPrompt thumb capture, instant Settled screen, and one-tap terminal freeze.
              </p>
              <dl className={p.specList}>
                <div className={p.specLine}>
                  <dt className={p.specKey}>Package</dt>
                  <dd className={p.specVal}>fingerpay-merchant.apk · Keystore P-256</dd>
                </div>
              </dl>
              <div>
                <a className={p.ctaDark} href="/downloads/fingerpay-merchant.apk" download>
                  Download Merchant APK <Icon name="arrow-right" />
                </a>
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
