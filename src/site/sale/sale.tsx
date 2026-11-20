"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion";
import { Coin } from "../coin.tsx";
import { ease, spring } from "../motion.ts";
import { useReducedMotion } from "../use-reduced.ts";
import s from "./sale.module.css";

// The sale as a message thread (PAGE.md §6). SMS bodies are the real templates in
// supabase/migrations/20261118000300_fp_api.sql (lines 395–398 and 632–633), filled with sample values.
type Msg =
  | { kind: "person"; who: string; role: string; initials: string; time: string; text?: string; thumb?: boolean; first?: boolean }
  | { kind: "terminal"; time: string; text?: string; settled?: boolean }
  | { kind: "sms"; time: string; text: string }
  | { kind: "divider"; text: string };

const THREAD: Msg[] = [
  { kind: "person", who: "Rasheed A.", role: "cashier", initials: "RA", time: "4:12:03 PM", text: "180.", first: true },
  { kind: "terminal", time: "4:12:03 PM", text: "PKR 180.00 · waiting for a thumb" },
  { kind: "person", who: "Ayesha K.", role: "shopper", initials: "AK", time: "4:12:04 PM", thumb: true, first: true },
  { kind: "terminal", time: "4:12:05 PM", settled: true },
  {
    kind: "sms",
    time: "4:12:05 PM",
    text: "Allied Bank FingerPay: PKR 180.00 paid at Rasheed Kiryana Store via Raast Ref #4F2K91. Available Balance: PKR 12,420.00. Not you? Reply DISPUTE. Reply LOCK to block thumb payments.",
  },
  { kind: "divider", text: "Later that evening" },
  { kind: "person", who: "Ayesha K.", role: "shopper", initials: "AK", time: "9:40:12 PM", text: "LOCK" },
  {
    kind: "sms",
    time: "9:40:13 PM",
    text: "Allied Bank FingerPay: Thumb payments are now LOCKED. Visit any Allied Bank branch with your CNIC to unlock.",
  },
];

function Message({ m, i }: { m: Msg; i: number }) {
  if (m.kind === "divider") {
    return (
      <li className={s.divider} data-msg data-kind="divider">
        <span className={s.dividerLine} data-anim />
        <span className="t-mono-s">{m.text}</span>
        <span className={s.dividerLine} data-anim />
      </li>
    );
  }
  if (m.kind === "sms") {
    return (
      <li className={s.sms} data-msg data-kind="sms">
        <p className={`${s.smsFrom} t-mono-s`} data-anim>FingerPay · SMS · {m.time}</p>
        <p className={s.smsBody} data-anim>{m.text}</p>
      </li>
    );
  }
  if (m.kind === "terminal") {
    return (
      <li className={s.terminal} data-msg data-kind="terminal">
        <p className={`${s.meta} t-mono-s`} data-anim>FingerPay terminal · {m.time}</p>
        <span className={s.typing} data-typing aria-hidden="true"><span /></span>
        <div className={s.bubbleInk} data-bubble>
          {m.settled ? (
            <>
              <p className={s.settled}>
                <span className={s.dot} data-dot /> <span data-settled>Settled</span>
              </p>
              <p className={s.fee} data-fee>Risk Engine: clear · shop fee PKR 0.81</p>
            </>
          ) : (
            <p>{m.text}</p>
          )}
        </div>
      </li>
    );
  }
  return (
    <li className={s.person} data-msg data-kind="person">
      {m.first ? (
        <p className={`${s.meta} t-mono-s`} data-anim>
          <span className={s.avatar} aria-hidden="true">{m.initials}</span>
          {m.who} · {m.role} · {m.time}
        </p>
      ) : (
        <p className={`${s.meta} t-mono-s`} data-anim>{m.who} · {m.time}</p>
      )}
      <div className={s.bubblePaper} data-bubble>
        {m.thumb ? (
          <span className={s.thumb} role="img" aria-label="Ayesha places her thumb on the reader" data-thumb>
            <Coin id={`coin-thumb-${i}`} />
          </span>
        ) : (
          <p>{m.text}</p>
        )}
      </div>
    </li>
  );
}

export function Sale() {
  const listRef = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const list = listRef.current;
    if (!list || reduced) return;
    list.dataset.live = "";
    const items = [...list.querySelectorAll<HTMLElement>("[data-msg]")];
    let chain = Promise.resolve();
    let lastStart = 0;
    const play = (li: HTMLElement) => {
      const kind = li.dataset.kind;
      const parts = [...li.querySelectorAll<HTMLElement>("[data-anim]")];
      const bubble = li.querySelector<HTMLElement>("[data-bubble]");
      li.dataset.shown = "";
      animate(parts, { opacity: [0, 1] }, { duration: 0.3, ease: ease.out });
      if (kind === "divider") {
        animate(li.querySelectorAll("[data-anim]"), { transform: ["scaleX(0)", "scaleX(1)"] }, { duration: 0.6, ease: ease.out });
        return Promise.resolve();
      }
      if (kind === "sms") {
        const [from, body] = parts;
        animate(from, { opacity: [0, 1] }, { duration: 0.25 });
        return animate(body, { opacity: [0, 1], transform: ["translateX(-16px)", "translateX(0px)"] }, { ...spring.ui, delay: 0.12 }).then(() => {});
      }
      if (!bubble) return Promise.resolve();
      const enter = (bounce: boolean) =>
        animate(bubble, { opacity: [0, 1], transform: ["translateY(8px) scale(0.92)", "translateY(0px) scale(1)"] }, bounce ? spring.sheet : spring.ui);
      if (kind === "terminal") {
        const typing = li.querySelector<HTMLElement>("[data-typing]")!;
        return animate(typing, { opacity: [0, 1] }, { duration: 0.15 })
          .then(() => new Promise((r) => setTimeout(r, 500)))
          .then(() => {
            animate(typing, { opacity: 0 }, { duration: 0.15 });
            return enter(false);
          })
          .then(() => {
            if (!li.querySelector("[data-dot]")) return;
            animate(li.querySelector("[data-dot]")!, { transform: ["scale(0)", "scale(1)"] }, { duration: 0.3, ease: ease.out });
            animate(li.querySelector("[data-settled]")!, { opacity: [0, 1] }, { duration: 0.2, delay: 0.2 });
            animate(li.querySelector("[data-fee]")!, { opacity: [0, 1] }, { duration: 0.2, delay: 0.35 });
          });
      }
      return enter(true).then(() => {
        const thumb = li.querySelector<HTMLElement>("[data-thumb]");
        if (!thumb) return;
        // A thumb is physical: the one place a coin may bounce (MOTION.md §6.4)
        return animate(thumb, { transform: "scale(0.86)" }, { duration: 0.12, ease: ease.out }).then(() => {
          thumb.dataset.pressed = "";
          return animate(thumb, { transform: "scale(1)" }, { type: "spring", bounce: 0.3, visualDuration: 0.35 }).then(() => {});
        });
      });
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const li = e.target as HTMLElement;
          // Messages stay once shown; fast scrolls queue them at least 120 ms apart (MOTION.md §6.1)
          chain = chain.then(async () => {
            const wait = Math.max(0, lastStart + 120 - performance.now());
            if (wait) await new Promise((r) => setTimeout(r, wait));
            lastStart = performance.now();
            const done = play(li);
            if (li.dataset.kind === "terminal") await done;
          });
        }
      },
      { rootMargin: "0px 0px -22% 0px" },
    );
    items.forEach((li) => io.observe(li));
    return () => {
      io.disconnect();
      delete list.dataset.live;
      items.forEach((li) => {
        delete li.dataset.shown;
        li.querySelectorAll<HTMLElement>("[style]").forEach((el) => el.removeAttribute("style"));
      });
    };
  }, [reduced]);

  return (
    <section id="sale" className={`${s.sale} page-grid`} aria-labelledby="sale-title">
      <div className={s.intro}>
        <h2 id="sale-title" className="t-display">A sale, start to finish.</h2>
        <p className={`${s.lead} two-tone t-lead`}>
          <strong>Five messages. Nobody opens an app.</strong> The shopper’s phone can be the oldest one in the drawer:
          receipts and controls arrive by plain SMS.
        </p>
      </div>
      <div className={s.threadCol}>
        <ol ref={listRef} className={s.thread} aria-label="A sample sale, as messages">
          {THREAD.map((m, i) => <Message key={i} m={m} i={i} />)}
        </ol>
        <p className={`${s.note} t-caption`}>
          Sample sale. Rasheed and Ayesha are demo personas; all bank and payment steps are simulated.
        </p>
      </div>
    </section>
  );
}
