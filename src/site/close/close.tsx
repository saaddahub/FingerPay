"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { animate, inView, stagger } from "motion";
import { Letters } from "../letters.tsx";
import { Icon } from "../icons.tsx";
import { useGlass } from "../glass/use-glass.ts";
import { ease } from "../motion.ts";
import { useReducedMotion } from "../use-reduced.ts";
import { scrollToTarget } from "../scroll/smooth-scroll.tsx";
import { EmailBriefBar, openContactModal, openCookiePanel, openReviewPopup } from "../widgets/site-widgets.tsx";
import g from "../glass/glass.module.css";
import s from "./close.module.css";

export function Close() {
  const ref = useRef<HTMLElement>(null);
  const cta = useGlass<HTMLButtonElement>(6);
  const reviewBtn = useGlass<HTMLButtonElement>(6);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    el.dataset.live = "";
    const stop = inView(
      el.querySelector("[data-close-title]")!,
      () => {
        animate(el.querySelectorAll("[data-close-title] [data-l]"), { transform: ["translateY(110%)", "translateY(0%)"] }, {
          duration: 0.9,
          ease: ease.expoOut,
          delay: stagger(0.06),
        });
        animate(el.querySelectorAll("[data-close-fade]"), { opacity: [0, 1], transform: ["translateY(12px)", "translateY(0px)"] }, {
          duration: 0.6,
          ease: ease.out,
          delay: stagger(0.07, { startDelay: 0.35 }),
        });
      },
      { amount: 0.5 },
    );
    return () => {
      stop();
      delete el.dataset.live;
      el.querySelectorAll<HTMLElement>("[style]").forEach((n) => {
        if (!n.matches(`.${g.glass}`)) n.removeAttribute("style");
      });
    };
  }, [reduced]);

  return (
    <>
      {/* Standalone full-viewport Section: Leave everything at home. */}
      <section ref={ref} id="contact" className={`${s.close} page-grid`} aria-labelledby="close-title">
        <h2 id="close-title" className={s.title} data-close-title>
          <Letters text="Leave everything" by="word" />
          <br />
          <Letters text="at home." by="word" />
        </h2>
        <p className={`${s.lead} two-tone t-lead`} data-close-fade>
          <strong>FingerPay is a student prototype.</strong> We’re looking for a bank partner and a pilot shop. If
          that’s you, or you know who it is, write to us.
        </p>
        <div className={s.actions} data-close-fade>
          <button ref={cta} type="button" className={`${g.glass} ${s.cta}`} onClick={openContactModal}>
            <span className={g.inner}>Contact the team <Icon name="arrow-right" /></span>
          </button>
          <button ref={reviewBtn} type="button" className={`${g.glass} ${s.cta}`} onClick={openReviewPopup}>
            <span className={g.inner}>Leave a review <Icon name="star" /></span>
          </button>
          <Link href="/contact" className={s.top}>
            Full contact page <Icon name="arrow-right" />
          </Link>
        </div>
      </section>

      {/* Standalone full-viewport Section: Get FingerPay for Android */}
      <section id="download" className={`${s.downloadSection} page-grid`} aria-labelledby="download-title">
        <div className={s.downloadIntro}>
          <h2 id="download-title" className="t-display">Get FingerPay for Android.</h2>
          <p className={`${s.lead} two-tone t-lead`}>
            <strong>Two dedicated builds for the counter and the shopper.</strong> Android 9 or later · Install directly
            from the downloaded APK, or test in your browser.
          </p>
        </div>
        <div className={s.downloadCards}>
          <article className={`${g.glass} ${s.downloadCard}`} data-liquid-surface>
            <span className="t-mono-s">Android APK · Shopper Companion</span>
            <h3 className={s.downloadCardTitle}>FingerPay Customer App</h3>
            <p className={s.downloadCardDesc}>
              Inspect your live Allied Bank FingerPay balance, view Raast thumb receipts, share your student referral
              code, and test the PKR 200 demo bonus.
            </p>
            <div className={s.actions}>
              <a className={`${s.cta} ${s.dark}`} href="/downloads/fingerpay-customer.apk" download>
                <Icon name="download" /> Download Customer app
              </a>
            </div>
          </article>

          <article className={`${g.glass} ${s.downloadCard}`} data-liquid-surface>
            <span className="t-mono-s">Android APK · Counter Point-of-Sale</span>
            <h3 className={s.downloadCardTitle}>FingerPay Merchant Terminal</h3>
            <p className={s.downloadCardDesc}>
              Hardware-signed ECDSA P-256 counter till, live thumb charge prompt, instant Settled confirmation, one-tap
              terminal freeze, and daily fee savings vs 2.5% card POS.
            </p>
            <div className={s.actions}>
              <a className={`${s.cta} ${s.dark}`} href="/downloads/fingerpay-merchant.apk" download>
                <Icon name="download" /> Download Merchant app
              </a>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

export function Footer() {
  return (
    <footer className={`${s.footer} page-grid`}>
      <EmailBriefBar />
      <div className={s.footerBottom}>
        <span className={s.footRule} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no optimisation needed */}
        <img className={s.lockup} src="/brand/fingerpay-lockup.svg" alt="FingerPay" width={160} height={42} />
        <p id="disclaimer" className={s.disclaimer}>
          FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity
          and payment integrations shown are simulated. No real money or real biometric data is processed.
        </p>
        <ul className={`${s.footLinks} t-caption`}>
          <li><Link href="/how-it-works">How it works</Link></li>
          <li><Link href="/security">Security</Link></li>
          <li><Link href="/numbers">Numbers</Link></li>
          <li><Link href="/download">Download</Link></li>
          <li><Link href="/contact">Contact</Link></li>
          <li><button type="button" onClick={openReviewPopup}>Leave a review</button></li>
          <li><button type="button" onClick={openCookiePanel}>Cookie preferences</button></li>
          <li><a href="#top" onClick={(e) => (e.preventDefault(), scrollToTarget(0))}>Back to top ↑</a></li>
          <li>© 2026 FingerPay</li>
        </ul>
      </div>
    </footer>
  );
}
