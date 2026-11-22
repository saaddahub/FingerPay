"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion";
import { ease } from "../motion.ts";
import { useReducedMotion } from "../use-reduced.ts";
import { formatStep, toUnits } from "./count.ts";
import s from "./ledger.module.css";

// The fine print (PAGE.md §7). Every figure is a SPEC/PRODUCT.md rule of the prototype.
// `count` marks the numeric part that counts up; the rest of the value is static text.
const ROWS = [
  { label: "Time at the counter", pre: "under ", count: "3", post: " s", note: "target" },
  { label: "Fee for the shop", pre: "", count: "0.45", post: " %", note: "sales above PKR 100, capped at PKR 25" },
  { label: "A declined sale costs", pre: "PKR 0", note: "for shop and shopper" },
  { label: "Per-tap limit", pre: "PKR ", count: "5,000", post: "", note: "salary accounts · PKR 2,000 for students" },
  { label: "Fingerprint images stored", pre: "0", note: "only a keyed hash of a one-time token" },
  { label: "What the shopper needs", pre: "a thumb", note: "and any phone with SMS, for receipts" },
  { label: "If the internet drops", pre: "Take cash", note: "the terminal never queues a sale" },
  { label: "Lost or copied thumb?", pre: "Reply LOCK", note: "from any phone, any time" },
] as const;

export function Ledger() {
  const listRef = useRef<HTMLDListElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const list = listRef.current;
    if (!list || reduced) return;
    list.dataset.live = "";
    const rows = [...list.querySelectorAll<HTMLElement>("[data-row]")];
    let batch = 0;
    let batchTimer = 0;
    const play = (row: HTMLElement, delay: number) => {
      row.dataset.shown = "";
      animate(row.querySelector("[data-rule]")!, { transform: ["scaleX(0)", "scaleX(1)"] }, { duration: 0.8, ease: ease.out, delay });
      animate(row.querySelector("[data-label]")!, { opacity: [0, 1] }, { duration: 0.4, delay: delay + 0.1 });
      const value = row.querySelector<HTMLElement>("[data-value]")!;
      const num = row.querySelector<HTMLElement>("[data-count]");
      const note = row.querySelector<HTMLElement>("[data-note]")!;
      if (num) {
        const final = num.dataset.count!;
        const { units, decimals } = toUnits(final);
        animate(value, { opacity: [0, 1] }, { duration: 0.2, delay: delay + 0.1 });
        animate(0, units, {
          duration: 0.9,
          ease: ease.out, // no overshoot: these are money and time (MOTION.md §1, rule 4)
          delay: delay + 0.1,
          onUpdate: (u) => (num.textContent = formatStep(u, decimals)),
        }).then(() => {
          num.textContent = final;
          animate(note, { opacity: [0, 1] }, { duration: 0.2 });
        });
      } else {
        animate(value, { opacity: [0, 1], transform: ["translateY(6px)", "translateY(0px)"] }, { duration: 0.5, ease: ease.out, delay: delay + 0.1 });
        animate(note, { opacity: [0, 1] }, { duration: 0.2, delay: delay + 0.6 });
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          play(e.target as HTMLElement, batch++ * 0.07); // rows entering together stagger 70 ms
          window.clearTimeout(batchTimer);
          batchTimer = window.setTimeout(() => (batch = 0), 80);
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
        const num = r.querySelector<HTMLElement>("[data-count]");
        if (num) num.textContent = num.dataset.count!;
      });
    };
  }, [reduced]);

  return (
    <section id="fine-print" className={`${s.ledger} page-grid`} aria-labelledby="fine-print-title">
      <div className={s.intro}>
        <h2 id="fine-print-title" className={`${s.title} t-display`}>The fine print, in large print.</h2>
        <p className={`${s.lead} two-tone t-lead`}>
          <strong>Everything a shop or a judge would ask, on one page.</strong> These are the prototype’s rules, from
          the project spec.
        </p>
      </div>
      <dl ref={listRef} className={s.rows}>
        {ROWS.map((r) => (
          <div key={r.label} className={s.row} data-row>
            <span className={s.rule} data-rule aria-hidden="true" />
            <dt className={s.label} data-label>{r.label}</dt>
            <dd className={s.valueCell}>
              <span className={s.value} data-value>
                {r.pre}
                {"count" in r ? <span data-count={r.count}>{r.count}</span> : null}
                {"post" in r ? r.post : null}
              </span>
              <span className={`${s.note} t-caption`} data-note>{r.note}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
