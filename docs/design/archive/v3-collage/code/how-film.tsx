import { Text } from "@astryxdesign/core/Text";
import { Art } from "./art";
import s from "./landing.module.css";
import { ScannerArt } from "./scanner-art";

// The "How it works" sale film (MOTION.md §4.4, the one pin). Shown only on wide fine-pointer screens with motion
// on; landing-motion.tsx scrubs it with the scroll. The staircase list stays the accessible version, so the film
// is aria-hidden and repeats the same copy.

export const HOW_STEPS = [
  { title: "The cashier enters the amount", text: "Rasheed types PKR 180 on the FingerPay terminal and taps Charge." },
  { title: "The shopper taps a thumb", text: "No smartphone, mobile data, QR code, card or PIN. Just a thumb on the scanner." },
  { title: "The Risk Engine checks and settles", text: "The scan becomes a keyed code that finds the shopper's account. The Risk Engine checks Thumb Lock, the thumb-pay limit and the balance, then the payment settles over Raast (simulated)." },
  { title: "Both sides know at once", text: "The shop's screen says PAYMENT SUCCESSFUL — PKR 180 RECEIVED. PKR 179.19 reaches the shop after a PKR 0.81 fee, and the shopper's receipt arrives by SMS." },
] as const;

const FILM_CHECKS = ["Keyed code finds the account", "Thumb Lock is off", "Within the thumb-pay limit", "Balance covers PKR 180", "Settles over Raast (simulated)"];

export function HowFilm() {
  return (
    <section className={s.film} data-m="film" aria-hidden="true">
      <span className={s.filmSticky}>
        <span className={s.filmCopy}>
          <span className={s.filmNum}><span className={s.filmNumStrip} data-f="num"><span>1</span><span>2</span><span>3</span><span>4</span></span></span>
          <span className={s.filmSteps}>
            {HOW_STEPS.map((st) => (
              <span key={st.title} className={s.filmStep} data-f="step">
                <Text as="span" display="block" className={s.filmStepTitle}>{st.title}</Text>
                <Text as="span" display="block" className={s.body}>{st.text}</Text>
              </span>
            ))}
          </span>
          <span className={s.filmRail}>{HOW_STEPS.map((st) => <span key={st.title}><span data-f="fill" /></span>)}</span>
        </span>

        <span className={s.filmStage}>
          <svg className={s.filmWire} viewBox="0 0 100 100" preserveAspectRatio="none">
            <path data-f="wire" pathLength={1} d="M50 66 C42 88, 22 88, 15 60" />
          </svg>

          <span className={s.filmKeypad} data-f="keypad">
            <span className={s.filmScreen}>
              <span className={s.filmAmount}><small>PKR</small><span data-f="digits">180</span></span>
              <span className={s.filmBanner} data-f="banner">PAYMENT SUCCESSFUL — PKR 180 RECEIVED<small>Net PKR 179.19 · Fee PKR 0.81</small></span>
            </span>
            <span className={s.keys}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "00"].map((k) => <span key={k} data-f={`key${k}`}>{k}</span>)}</span>
            <span className={s.charge} data-f="charge">Charge PKR 180</span>
          </span>

          <span className={s.filmScannerSpot} data-f="scanner">
            {[0, 1, 2].map((i) => <span key={i} className={s.filmRipple} data-f="ripple" />)}
            <span className={s.scanner} data-f="sensor"><ScannerArt /></span>
            <span className={s.filmThumb} data-f="thumb" />
          </span>

          <span className={`${s.filmChecks} ${s.torn}`} data-f="checks">
            <span className={s.checksTitle}>Risk Engine checks</span>
            <span className={s.miniList}>
              {FILM_CHECKS.map((c) => <span key={c} className={s.filmCheck} data-f="check"><svg viewBox="0 0 16 16"><use href="#fp-check" /></svg>{c}</span>)}
            </span>
          </span>

          <span className={s.filmPhone} data-f="phone">
            <Art src="/art/phone-stand.webp" width={381} height={650} alt="" className={s.cutout} />
            <span className={s.phoneScreen}><span className={s.dim} data-f="phone-text">No messages</span></span>
          </span>
          <span className={`${s.filmSms} ${s.torn}`} data-f="sms">
            <span className={s.tag}>SMS receipt</span>
            <span className={s.smsText}>PKR 180.00 paid at Rasheed Kiryana Store. Not you? Reply DISPUTE.</span>
          </span>
        </span>
      </span>
    </section>
  );
}
