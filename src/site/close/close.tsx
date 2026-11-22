"use client";

import { useEffect, useRef } from "react";
import { animate, inView, stagger } from "motion";
import { Letters } from "../letters.tsx";
import { Icon } from "../icons.tsx";
import { useGlass } from "../glass/use-glass.ts";
import { ease } from "../motion.ts";
import { useReducedMotion } from "../use-reduced.ts";
import { scrollToTarget } from "../scroll/smooth-scroll.tsx";
import g from "../glass/glass.module.css";
import s from "./close.module.css";

// Contact address is still to come from the client (DESIGN.md, "Waiting on the client"). Until then the
// button points at this section.
const CONTACT_HREF = "#contact";

export function Close() {
  const ref = useRef<HTMLElement>(null);
  const cta = useGlass<HTMLAnchorElement>(6);
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
      { amount: 0.6 },
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
    <section ref={ref} id="contact" className={`${s.close} page-grid`} aria-labelledby="close-title">
      <h2 id="close-title" className={s.title} data-close-title>
        <Letters text="Leave everything" by="word" />
        <br />
        <Letters text="at home." by="word" />
      </h2>
      <p className={`${s.lead} two-tone t-lead`} data-close-fade>
        <strong>FingerPay is a student prototype.</strong> We’re looking for a bank partner and a pilot shop. If that’s
        you, or you know who it is, write to us.
      </p>
      <div className={s.actions} data-close-fade>
        <a ref={cta} href={CONTACT_HREF} className={`${g.glass} ${s.cta}`}>
          <span className={g.inner}>Contact the team <Icon name="arrow-right" /></span>
        </a>
        <a href="#top" className={s.top} onClick={(e) => (e.preventDefault(), scrollToTarget(0))}>
          Back to top <Icon name="arrow-up" />
        </a>
      </div>
      <section id="download" className={s.download} aria-labelledby="download-title">
        <h3 id="download-title">Get FingerPay for Android</h3>
        <div className={s.actions}>
          <a className={`${s.cta} ${s.dark}`} href="/downloads/fingerpay-customer.apk" download>Download Customer app</a>
          <a className={`${s.cta} ${s.dark}`} href="/downloads/fingerpay-merchant.apk" download>Download Merchant app</a>
        </div>
        <p className="t-caption">Android 9 or later · Install from the downloaded APK.</p>
      </section>
    </section>
  );
}

export function Footer() {
  return (
    <footer className={`${s.footer} page-grid`}>
      <span className={s.footRule} aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, no optimisation needed */}
      <img className={s.lockup} src="/brand/fingerpay-lockup.svg" alt="FingerPay" width={160} height={42} />
      <p id="disclaimer" className={s.disclaimer}>
        FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and
        payment integrations shown are simulated. No real money or real biometric data is processed.
      </p>
      <ul className={`${s.footLinks} t-caption`}>
        <li><a href={CONTACT_HREF}>Contact</a></li>
        <li><a href="#top" onClick={(e) => (e.preventDefault(), scrollToTarget(0))}>Top</a></li>
        <li>© 2026 FingerPay</li>
      </ul>
    </footer>
  );
}
