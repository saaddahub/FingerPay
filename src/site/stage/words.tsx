import { Letters } from "../letters.tsx";
import s from "./stage.module.css";

// The three words (PAGE.md §4.1). Copy is final; change it only with a reason from PRODUCT.md or SPEC.md.
export const WORDS = [
  {
    id: "instant",
    word: "Instant.",
    lead: "The cashier types the amount and the shopper rests a thumb.",
    rest: "The Risk Engine checks it and the money settles in under three seconds, before the change drawer would have opened.",
  },
  {
    id: "private",
    word: "Private.",
    lead: "The reader sends a token, never an image.",
    rest: "We keep only a keyed hash of that token, so there is no picture of your thumb anywhere to steal.",
  },
  {
    id: "certain",
    word: "Certain.",
    lead: "The shop sees “Settled” on its own screen.",
    rest: "No transfer screenshots, no “it’s on its way”. If the network drops, the terminal says Take cash and never queues a sale.",
  },
] as const;

export function InstantVisual() {
  return (
    <div className={s.rail} data-visual aria-hidden="true">
      <span className={s.railLine} data-rail />
      <span className={s.railCovered} data-covered />
      {[0, 1, 2, 3].map((t) => (
        <span key={t} className={s.tick} data-tick data-t={t}>
          <span className={`${s.tickLabel} t-mono-s`}>{t} s</span>
        </span>
      ))}
      <span className={s.track} data-track>
        <span className={s.marker}>
          <span className={`${s.markerLabel} t-mono-s`} data-marker-label>&lt; 3 s</span>
        </span>
      </span>
      <span className={`${s.railNote} t-mono-s`} data-tick>Target · prototype timing varies</span>
    </div>
  );
}

export function PrivateVisual() {
  return (
    <div className={s.private} data-visual aria-hidden="true">
      <svg className={s.privateRidges} viewBox="0 0 1000 300" preserveAspectRatio="none" data-pr-svg>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} data-pr vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <p className={s.hash} data-hash>
        <span className={s.hashText}>hmac-sha256 · 7c1e 04b9 … a90f</span>
        <span className="t-mono-s" data-hash-tag>Illustrative</span>
      </p>
    </div>
  );
}

export function CertainVisual() {
  return (
    <div className={s.card} data-visual data-card aria-hidden="true">
      <p className={s.cardStatus}>
        <span className={s.dot} data-dot>
          <span className={s.dotRing} data-ring />
        </span>
        <span data-st>Settled</span>
      </p>
      <p className={s.cardAmount} data-amt>PKR 180.00</p>
      <p className={s.cardMeta} data-amt>Rasheed Kiryana Store · 4:12 pm</p>
    </div>
  );
}

export function Words() {
  const visuals = [<InstantVisual key="i" />, <PrivateVisual key="p" />, <CertainVisual key="c" />];
  return (
    <>
      {WORDS.map((w, i) => (
        <article key={w.id} id={w.id} className={s.panel} data-panel aria-labelledby={`${w.id}-word`}>
          <h3 id={`${w.id}-word`} className={s.word}>
            <Letters text={w.word} />
          </h3>
          <p className={`${s.para} two-tone t-lead`}>
            <strong data-line>{w.lead}</strong> <span data-line>{w.rest}</span>
          </p>
          {visuals[i]}
        </article>
      ))}
    </>
  );
}
