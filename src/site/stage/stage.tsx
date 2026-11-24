"use client";

import { useEffect, useRef } from "react";
import { preload } from "react-dom";
import { animate, scroll, stagger, cubicBezier } from "motion";
import { clamp01, segment, SEG } from "./segments.ts";
import { AIM, ridgeBase, ridgeY } from "./ridges.ts";
import { Coin } from "../coin.tsx";
import { Letters } from "../letters.tsx";
import { Words } from "./words.tsx";
import { ease, spring } from "../motion.ts";
import { useReducedMotion } from "../use-reduced.ts";
import { setStageScroll } from "../scroll/smooth-scroll.tsx";
import s from "./stage.module.css";

const inOut = cubicBezier(...ease.inOut);

export function Stage() {
  const rootRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  preload("/device/iphone.webp", { as: "image", fetchPriority: "high" });

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    return runStage(root);
  }, [reduced]);

  return (
    <section ref={rootRef} className={s.stage} aria-labelledby="stage-title" data-stage>
      <a className={s.skipInline} href="#sale">Skip the animation</a>
      <div className={s.frame} data-frame data-ground="paper">
        <div className={s.plateLayer} aria-hidden="true">
          <div className={s.plateWrap} data-plate-wrap>
            <figure className={s.plate} data-plate>
              <div className={s.phoneBody} data-phone-body />
              <div className={s.screen}>
                <div className={s.screenUi} data-screen-ui>
                  <p className={s.store}>Rasheed Kiryana Store</p>
                  <p className={s.amount}>PKR 180.00</p>
                  <p className={s.prompt} data-prompt>Place thumb on the reader</p>
                  <p className={s.paid} data-paid>Paid · settled in 1.8 s</p>
                </div>
                <div className={s.coinSlot} data-coin>
                  <span className={s.coinFace} data-ridges>
                    <Coin id="coin-screen" />
                  </span>
                  <svg className={s.check} data-check viewBox="-24 -24 48 48" aria-hidden="true" focusable="false">
                    <circle r="22" />
                    <path d="M-9 0.5 L-2.5 7 L10 -6" pathLength={1} />
                  </svg>
                  <span className={s.scan} data-scan />
                </div>
              </div>
            </figure>
          </div>
        </div>

        <div className={s.heroLayer}>
          <h1 className={s.heroTitle}>
            <span className={s.heroLeft} data-hero-side="-1">
              <Letters text="Pay with" />
            </span>{" "}
            <span className={s.heroRight} data-hero-side="1">
              <Letters text="nothing." />
            </span>
          </h1>
          <p className={`${s.heroLead} two-tone t-lead`} data-hero-fade>
            <strong>One thumb at the counter.</strong> No phone, no card, no cash. Settled in under three seconds.
          </p>
          <p className={`${s.cue} t-caption`} data-hero-fade aria-hidden="true">
            Scroll <span className={s.cueLine} />
          </p>
        </div>

        <div className={s.hairlines} aria-hidden="true">
          <span className={s.hairH} data-hair-h />
          <span className={s.hairRelease} data-hair-release>
            <span className={s.hairV} data-hair-v />
            <span className={s.cols} data-cols>
              {Array.from({ length: 12 }, (_, i) => <span key={i} />)}
            </span>
          </span>
        </div>

        <div className={s.inside} data-inside>
          <h2 id="stage-title" className="visually-hidden">How FingerPay works, in three words</h2>
          <div className={s.still} aria-hidden="true">
            <Coin id="coin-still" viewBox={`${AIM.ridge.x - 7} ${AIM.ridge.y - 3} 14 6`} slice />
          </div>
          <div className={s.insideContent} data-inside-content>
            <p className={`${s.index} t-mono-s`} aria-hidden="true">
              <span className={s.indexNum}><span data-index>01</span></span>
              <span>/ 03</span>
            </p>
            <Words />
          </div>
        </div>

        <span className={s.slitLine} data-slit-line aria-hidden="true" />
        <div className={s.slit} data-slit aria-hidden="true" />
      </div>
    </section>
  );
}

type Panel = { el: HTMLElement; letters: HTMLElement[]; lines: HTMLElement[]; state: "hidden" | "in" | "out" };

function runStage(root: HTMLElement): () => void {
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const qa = <T extends Element = HTMLElement>(sel: string) => [...root.querySelectorAll(sel)] as T[];
  const frameEl = q("[data-frame]");
  const plate = q("[data-plate]");
  const coinEl = q("[data-coin]");
  const ridgesEl = q("[data-ridges]");
  const checkEl = q("[data-check]");
  const checkPath = q("[data-check] path");
  const scanEl = q("[data-scan]");
  const promptEl = q("[data-prompt]");
  const paidEl = q("[data-paid]");
  const heroSides = qa("[data-hero-side]");
  const heroFades = qa("[data-hero-fade]");
  const inside = q("[data-inside]");
  const insideContent = q("[data-inside-content]");
  const hairH = q("[data-hair-h]");
  const hairV = q("[data-hair-v]");
  const cols = q("[data-cols]");
  const hairRelease = q("[data-hair-release]");
  const slit = q("[data-slit]");
  const slitLine = q("[data-slit-line]");
  const indexEl = q("[data-index]");
  const panels: Panel[] = qa("[data-panel]").map((el) => ({
    el,
    letters: [...el.querySelectorAll<HTMLElement>("[data-l]")],
    lines: [...el.querySelectorAll<HTMLElement>("[data-line]")],
    state: "hidden",
  }));
  const touched: HTMLElement[] = [insideContent, hairRelease, slit, slitLine];

  root.classList.add(s.live);

  const geo = { h: 0, pLen: 1, qLen: 1 };
  let p = 0;
  let qv = 0;
  let seg = -1;
  let paid = false; // the phone has paid and lifted away
  let busy = false; // the pay moment (or its return) is playing; scroll waits for it
  let started = false;

  const measure = () => {
    geo.h = frameEl.clientHeight;
    const total = Math.max(1, root.offsetHeight - geo.h);
    geo.qLen = 0.9 * geo.h;
    geo.pLen = Math.max(1, total - geo.qLen);
    render();
  };

  const setNav = () => {
    document.documentElement.dataset.nav = frameEl.dataset.ground === "ink" && qv < 0.5 ? "ink" : "paper";
  };

  // ── The pay moment (MOTION.md §2.3): scroll is the thumb. Press, scan, tick, "Paid", then the phone lifts away.
  // Every step is a WAAPI animation with explicit from/to keyframes and `fill: both`, kept in `seq`. Nothing relies on
  // reading a start value from the DOM, so steps can't desync, and cancelling `seq` is a complete reset.
  const seq: Animation[] = [];
  const cb = (c: readonly number[]) => `cubic-bezier(${c.join()})`;
  const play = (el: Element, keyframes: Keyframe[], o: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, { fill: "both", ...o });
    seq.push(a);
    return a;
  };
  const reset = () => {
    seq.splice(0).forEach((a) => a.cancel());
    frameEl.dataset.ground = "paper";
  };

  const pay = () => {
    const heroAway = [...heroSides, ...heroFades].map((el) => {
      const dx = Number(el.dataset.heroSide ?? 0) * 6;
      const dy = el.dataset.heroSide ? 0 : 12;
      return play(
        el,
        [
          { transform: "translate3d(0,0,0)", opacity: 1 },
          { transform: `translate3d(${dx}vw,${dy}px,0)`, opacity: 0 },
        ],
        { duration: el.dataset.heroSide ? 500 : 400, easing: cb(ease.out) },
      );
    });
    play(coinEl, [{ transform: "scale(1)" }, { transform: "scale(0.92)", offset: 0.25 }, { transform: "scale(1)" }], { duration: 480, easing: cb(ease.out) });
    // Position and opacity are separate so the sweep's easing doesn't warp the fade in/out.
    play(scanEl, [{ top: "0%" }, { top: "100%" }], { duration: 600, delay: 200, easing: cb(ease.inOut) });
    play(scanEl, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 600, delay: 200, easing: "linear" });
    // The screen swaps its idea of "waiting" for "paid": ridges + prompt out, tick + Paid in, all on explicit keyframes.
    for (const el of [ridgesEl, promptEl]) play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: 750 });
    play(checkEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: 750 });
    play(checkPath, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 380, delay: 820, easing: cb(ease.out) });
    play(paidEl, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 400, delay: 950, easing: cb(ease.out) }); // after the prompt has fully faded (750 + 200)
    // A beat on "Paid", then the phone leaves upward and the ground turns to ink for the words.
    const lift = play(plate, [{ transform: "none" }, { transform: "translateY(-115vh) rotate(-4deg)" }], { duration: 650, delay: 1350, easing: cb(ease.in) });
    return lift.finished.then(() => {
      frameEl.dataset.ground = "ink";
      return { lift, heroAway };
    });
  };

  // Back to the hero: the screen resets off-screen (the phone is out of view), then the lift and the hero type
  // rewind together, so the phone drops back in exactly along the path it left by.
  let lifted: { lift: Animation; heroAway: Animation[] } | null = null;
  const unpay = async () => {
    frameEl.dataset.ground = "paper";
    if (!lifted) return reset();
    const back = [lifted.lift, ...lifted.heroAway];
    seq.filter((a) => !back.includes(a)).forEach((a) => a.cancel());
    back.forEach((a) => {
      a.effect?.updateTiming({ delay: 0, endDelay: 0 });
      a.updatePlaybackRate(-1.5);
      a.play();
    });
    await Promise.all(back.map((a) => a.finished));
    reset();
    lifted = null;
  };

  const run = (job: () => Promise<unknown>, nowPaid: boolean) => {
    busy = true;
    job().then((res) => {
      if (nowPaid) lifted = res as typeof lifted;
      paid = nowPaid;
      busy = false;
      setNav();
      sync();
    });
  };

  // Words (MOTION.md §2.5–2.7) are time-based, triggered by thresholds; the pay moment plays in front of them.
  const sync = () => {
    if (busy) return;
    const next = segment(p, seg);
    if (next < 0 && paid) {
      if (seg >= 0) transition(seg, -1, -1);
      seg = -1;
      run(unpay, false);
    } else if (next >= 0 && !paid) {
      const first = !started;
      started = true;
      run(pay, true);
      if (first && p > SEG.thresholds[0] + 0.05) seq.forEach((a) => a.finish());
    } else if (next !== seg) {
      transition(seg, next, next > seg ? 1 : -1);
      seg = next;
    }
  };

  const render = () => {
    sync();

    // Release, then the slit (MOTION.md §2.8, §5.3)
    const rel = clamp01((p - SEG.releaseStart) / (1 - SEG.releaseStart));
    insideContent.style.opacity = String(1 - rel);
    hairRelease.style.opacity = String(1 - rel);
    slitLine.style.opacity = String(clamp01(qv / 0.15));
    const open = inOut(clamp01((qv - 0.15) / 0.85));
    slit.style.visibility = qv > 0.15 ? "visible" : "hidden";
    slit.style.clipPath = `inset(calc(${(1 - open) * 50}% - 0.5px) 0)`;

    setNav();
    document.documentElement.dataset.film = p > 0.01 && qv < 1 ? "on" : "off";
  };

  // ── Word choreography ──────────────────────────────────────────────────────────────────────────────
  const insideIn = () => {
    inside.dataset.on = "";
    animate(hairH, { transform: ["scaleX(0)", "scaleX(1)"] }, { duration: 0.8, ease: ease.out });
    animate(hairV, { transform: ["scaleY(0)", "scaleY(1)"] }, { duration: 0.8, ease: ease.out, delay: 0.12 });
    animate(cols, { opacity: [0, 1] }, { duration: 0.6, delay: 0.3 });
  };
  const insideOut = () => {
    animate(hairH, { transform: "scaleX(0)" }, { duration: 0.3, ease: ease.in });
    animate(hairV, { transform: "scaleY(0)" }, { duration: 0.3, ease: ease.in });
    animate(cols, { opacity: 0 }, { duration: 0.3 }).then(() => {
      if (seg < 0) delete inside.dataset.on;
    });
  };

  const wordIn = (i: number, dir: number, delay: number) => {
    const pn = panels[i];
    const from = pn.state === "hidden";
    pn.state = "in";
    pn.el.dataset.on = "";
    const letterDelay = stagger(0.03, { startDelay: delay });
    animate(
      pn.letters,
      { transform: from ? [`translateY(${dir > 0 ? 110 : -110}%)`, "translateY(0%)"] : "translateY(0%)", filter: "blur(0px)" },
      { duration: 0.9, ease: ease.expoOut, delay: letterDelay },
    );
    // Opacity reaches 1 within the first 40 % of each letter's rise (MOTION.md §2.6)
    animate(pn.letters, { opacity: from ? [0, 1] : 1 }, { duration: 0.36, ease: ease.out, delay: letterDelay });
    animate(
      pn.lines,
      { transform: ["translateY(12px)", "translateY(0px)"], opacity: [0, 1], filter: ["blur(6px)", "blur(0px)"] },
      { duration: 0.7, ease: ease.out, delay: stagger(0.07, { startDelay: delay + 0.25 }) },
    );
    visualIn(i, delay + 0.4);
    const n = String(i + 1).padStart(2, "0");
    if (indexEl.textContent !== n) {
      animate(indexEl, { transform: ["translateY(0%)", `translateY(${-100 * dir}%)`] }, { duration: 0.2, ease: ease.in }).then(() => {
        indexEl.textContent = n;
        animate(indexEl, { transform: [`translateY(${100 * dir}%)`, "translateY(0%)"] }, { duration: 0.5, ease: ease.expoOut });
      });
    }
  };

  const wordOut = (i: number, dir: number) => {
    const pn = panels[i];
    pn.state = "out";
    animate(pn.lines, { opacity: 0, transform: `translateY(${-8 * dir}px)` }, { duration: 0.3, ease: ease.in });
    visualOut(i);
    animate(
      pn.letters,
      { transform: `translateY(${-40 * dir}%)`, opacity: 0, filter: "blur(8px)" },
      { duration: 0.42, ease: ease.in, delay: stagger(0.015) },
    ).then(() => {
      if (pn.state !== "out") return;
      pn.state = "hidden";
      delete pn.el.dataset.on;
      pn.letters.forEach((l) => l.removeAttribute("style"));
      pn.lines.forEach((l) => l.removeAttribute("style"));
      visualReset(i);
    });
  };

  const transition = (from: number, to: number, dir: number) => {
    if (to >= 0 && from < 0) insideIn();
    if (to < 0 && from >= 0) insideOut();
    const hadWord = from >= 1;
    if (hadWord) wordOut(from - 1, dir);
    if (to >= 1) wordIn(to - 1, dir, hadWord ? 0.18 : 0);
  };

  // ── Visuals (MOTION.md §2.7) ───────────────────────────────────────────────────────────────────────
  const vq = (i: number, sel: string) => [...panels[i].el.querySelectorAll<HTMLElement>(sel)];
  const prState = { h: [1, 1, 1, 1, 1, 1], conv: 0 };
  const prPaths = vq(1, "[data-pr]") as unknown as SVGPathElement[];
  const drawPrivate = () => {
    prPaths.forEach((path, j) => {
      const base = 250 - j * 30;
      const y0 = base + (175 - base) * prState.conv; // converge onto one line
      let d = "";
      for (let sIdx = 0; sIdx <= 48; sIdx++) {
        const x = -24 + sIdx;
        const y = y0 + (ridgeY(j, x, prState.h[j]) - ridgeBase(j)) * 11; // the coin's ridge shape, stretched
        d += `${sIdx ? "L" : "M"}${((sIdx / 48) * 1000).toFixed(1)} ${y.toFixed(1)}`;
      }
      path.setAttribute("d", d);
    });
  };
  drawPrivate();

  const visualIn = (i: number, delay: number) => {
    if (i === 0) {
      const [line] = vq(0, "[data-rail]");
      const [covered] = vq(0, "[data-covered]");
      const [track] = vq(0, "[data-track]");
      const [label] = vq(0, "[data-marker-label]");
      animate(line, { transform: ["scaleX(0)", "scaleX(1)"] }, { duration: 0.8, ease: ease.out, delay });
      animate(vq(0, "[data-tick]"), { opacity: [0, 1] }, { duration: 0.4, delay: stagger(0.06, { startDelay: delay + 0.3 }) });
      animate(track, { transform: ["translateX(0%)", "translateX(86.67%)"] }, { ...spring.ui, visualDuration: 1.2, delay: delay + 0.5 });
      animate(covered, { transform: ["scaleX(0)", "scaleX(0.8667)"] }, { ...spring.ui, visualDuration: 1.2, delay: delay + 0.5 });
      animate(label, { opacity: [0, 1] }, { duration: 0.2, delay: delay + 1.7 });
      animate(covered, { opacity: [0.3, 1] }, { duration: 0.4, delay: delay + 1.7 });
    }
    if (i === 1) {
      const [svg] = vq(1, "[data-pr-svg]");
      const [hash] = vq(1, "[data-hash]");
      prState.h = [1, 1, 1, 1, 1, 1];
      prState.conv = 0;
      drawPrivate();
      animate(svg, { opacity: [0, 0.28], transform: "scaleX(1)" }, { duration: 0.5, delay });
      prPaths.forEach((_, j) =>
        animate(1, 0, { duration: 0.9, ease: ease.inOut, delay: delay + 0.4 + j * 0.09, onUpdate: (v) => ((prState.h[j] = v), drawPrivate()) }),
      );
      const tConv = delay + 0.4 + 5 * 0.09 + 0.9;
      animate(0, 1, { duration: 0.5, ease: ease.inOut, delay: tConv, onUpdate: (v) => ((prState.conv = v), drawPrivate()) });
      const ratio = () => Math.min(1, hash.offsetWidth / Math.max(1, svg.getBoundingClientRect().width));
      animate(svg, { transform: ["scaleX(1)", `scaleX(${ratio()})`] }, { duration: 0.5, ease: ease.inOut, delay: tConv + 0.5 });
      animate(svg, { opacity: 0 }, { duration: 0.3, delay: tConv + 1.0 });
      animate(hash, { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] }, { duration: 0.6, ease: ease.out, delay: tConv + 0.8 });
    }
    if (i === 2) {
      const [card] = vq(2, "[data-card]");
      animate(card, { opacity: [0, 1], transform: ["scale(0.96)", "scale(1)"] }, { duration: 0.45, ease: ease.out, delay });
      animate(vq(2, "[data-dot]"), { transform: ["scale(0)", "scale(1)"] }, { duration: 0.3, ease: ease.out, delay: delay + 0.15 });
      animate(vq(2, "[data-ring]"), { opacity: [0.5, 0], transform: ["scale(1)", "scale(2.6)"] }, { duration: 0.9, ease: ease.out, delay: delay + 0.45 });
      animate(vq(2, "[data-st]"), { opacity: [0, 1] }, { duration: 0.2, delay: delay + 0.45 });
      animate(vq(2, "[data-amt]"), { opacity: [0, 1] }, { duration: 0.3, delay: delay + 0.6 });
    }
  };
  const visualOut = (i: number) => {
    const [v] = vq(i, "[data-visual]");
    animate(v, { opacity: 0 }, { duration: 0.3 });
  };
  const visualReset = (i: number) => {
    panels[i].el.querySelectorAll<HTMLElement | SVGElement>("[data-visual], [data-visual] *").forEach((el) => el.removeAttribute("style"));
    if (i === 1) drawPrivate();
  };

  // ── Wiring ─────────────────────────────────────────────────────────────────────────────────────────
  const onProgress = (P: number) => {
    const scrolled = P * (geo.pLen + geo.qLen);
    p = clamp01(scrolled / geo.pLen);
    qv = clamp01((scrolled - geo.pLen) / geo.qLen);
    render();
  };
  const stopScroll = scroll(onProgress, { target: root, offset: ["start start", "end end"] });
  setStageScroll((part) => root.offsetTop + Math.min(part, 1) * geo.pLen);

  const ro = new ResizeObserver(() => measure());
  ro.observe(frameEl);
  document.fonts?.ready.then(measure);
  measure();

  return () => {
    stopScroll();
    ro.disconnect();
    setStageScroll(null);
    root.classList.remove(s.live);
    reset();
    [...touched, ...panels.flatMap((pn) => [pn.el, ...pn.letters, ...pn.lines])].forEach((el) => el.removeAttribute("style"));
    panels.forEach((pn) => delete pn.el.dataset.on);
    delete inside.dataset.on;
    frameEl.dataset.ground = "paper";
    delete document.documentElement.dataset.nav;
    delete document.documentElement.dataset.film;
  };
}
