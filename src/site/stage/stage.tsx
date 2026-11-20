"use client";

import { useEffect, useRef } from "react";
import { animate, scroll, stagger, cubicBezier } from "motion";
import { camera, clamp01, segment, smoothstep, SEG } from "./camera.ts";
import { AIM, CLIP_R, RING, RIDGES, ridgeBase, ridgeY } from "./ridges.ts";
import { Coin } from "../coin.tsx";
import { Letters } from "../letters.tsx";
import { Words } from "./words.tsx";
import { ease, spring } from "../motion.ts";
import { useReducedMotion } from "../use-reduced.ts";
import { setStageScroll } from "../scroll/smooth-scroll.tsx";
import s from "./stage.module.css";

// Placeholder screen is light, so we fly into ridge 5's ink. A dark client screen switches this to "gap"
// (MOTION.md §2.4, BUILD.md §5).
const AIM_MODE: keyof typeof AIM = "ridge";

const inOut = cubicBezier(...ease.inOut);

export function Stage() {
  const rootRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

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
              <div className={s.phoneBody} data-phone-body>
                <span className={s.island} />
              </div>
              <div className={s.screen}>
                <div className={s.screenUi} data-screen-ui>
                  <p className={s.store}>Rasheed Kiryana Store</p>
                  <p className={s.amount}>PKR 180.00</p>
                  <p className={s.prompt}>Place thumb on the reader</p>
                </div>
                <div className={s.coinSlot} data-coin>
                  <Coin id="coin-screen" />
                </div>
              </div>
            </figure>
          </div>
        </div>

        <canvas className={s.canvas} data-canvas aria-hidden="true" />

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
  const canvas = q<HTMLCanvasElement>("[data-canvas]");
  const ctx = canvas.getContext("2d");
  const plate = q("[data-plate]");
  const plateWrap = q("[data-plate-wrap]");
  const coinEl = q("[data-coin]");
  const phoneBody = q("[data-phone-body]");
  const screenUi = q("[data-screen-ui]");
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
  const touched: HTMLElement[] = [plate, plateWrap, phoneBody, screenUi, ...heroSides, ...heroFades, insideContent, hairRelease, slit, slitLine];
  if (!ctx) return () => {};

  root.classList.add(s.live);
  const aim = AIM[AIM_MODE];
  const ink = getComputedStyle(root).getPropertyValue("--ink").trim() || "#0a0a0b";

  // Coin paths, built once in coin units (MOTION.md §10).
  const ringPath = new Path2D();
  ringPath.arc(0, 0, RING.r, 0, Math.PI * 2);
  const clipPath = new Path2D();
  clipPath.arc(0, 0, CLIP_R, 0, Math.PI * 2);
  // Dense samples joined with quadratic curves through the midpoints: no visible facets even at ~500× zoom.
  const ridgePath = new Path2D();
  RIDGES.h.forEach((_, i) => {
    const pts = Array.from({ length: 385 }, (_, j) => {
      const x = -24 + (48 * j) / 384;
      return [x, ridgeY(i, x)] as const;
    });
    ridgePath.moveTo(pts[0][0], pts[0][1]);
    for (let j = 1; j < pts.length - 1; j++) {
      ridgePath.quadraticCurveTo(pts[j][0], pts[j][1], (pts[j][0] + pts[j + 1][0]) / 2, (pts[j][1] + pts[j + 1][1]) / 2);
    }
    ridgePath.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  });

  const geo = { w: 0, h: 0, dpr: 1, coinCentre: { x: 0, y: 0 }, coinD: 0, plateBox: { x: 0, y: 0 }, pLen: 1, qLen: 1 };
  let p = 0;
  let qv = 0;
  let press = 1;
  let seg = -1;
  let lastP = 0;

  const measure = () => {
    plate.style.transform = "none";
    const fr = frameEl.getBoundingClientRect();
    const cr = coinEl.getBoundingClientRect();
    const pr = plate.getBoundingClientRect();
    geo.w = frameEl.clientWidth;
    geo.h = frameEl.clientHeight;
    geo.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(geo.w * geo.dpr);
    canvas.height = Math.round(geo.h * geo.dpr);
    geo.coinCentre = { x: cr.left - fr.left + cr.width / 2, y: cr.top - fr.top + cr.height / 2 };
    geo.coinD = cr.width;
    geo.plateBox = { x: pr.left - fr.left, y: pr.top - fr.top };
    const total = Math.max(1, root.offsetHeight - geo.h);
    geo.qLen = 0.9 * geo.h;
    geo.pLen = Math.max(1, total - geo.qLen);
    render();
  };

  const draw = (k: number, ox: number, oy: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (k <= 0) return;
    const d = geo.dpr;
    ctx.setTransform(d * k, 0, 0, d * k, d * ox, d * oy);
    ctx.strokeStyle = ink;
    ctx.lineJoin = "round";
    ctx.lineWidth = RING.width;
    ctx.stroke(ringPath);
    ctx.save();
    ctx.clip(clipPath);
    ctx.lineWidth = RIDGES.width;
    ctx.stroke(ridgePath);
    ctx.restore();
  };

  const render = () => {
    // Settle (MOTION.md §2.3)
    const st = inOut(clamp01(p / SEG.settleEnd));
    heroSides.forEach((el) => {
      el.style.transform = `translate3d(${Number(el.dataset.heroSide) * 6 * st}vw,0,0)`;
      el.style.opacity = String(1 - st);
    });
    heroFades.forEach((el) => {
      el.style.transform = `translate3d(0,${12 * st}px,0)`;
      el.style.opacity = String(1 - st);
    });

    // The dive (MOTION.md §2.4)
    const cam = camera(p, {
      coinCentre: geo.coinCentre,
      coinDiameter: geo.coinD,
      aim,
      bandUnits: aim.band,
      curvature: aim.curvature,
      viewport: { w: geo.w, h: geo.h },
    });
    plate.style.transformOrigin = `${cam.Q0.x - geo.plateBox.x}px ${cam.Q0.y - geo.plateBox.y}px`;
    plate.style.transform = `translate3d(${cam.Q.x - cam.Q0.x}px,${cam.Q.y - cam.Q0.y}px,0) scale(${cam.z})`;
    screenUi.style.opacity = String(1 - smoothstep(1.6, 2.6, cam.z));
    phoneBody.style.opacity = String(1 - smoothstep(2.2, 3.2, cam.z));
    plateWrap.style.visibility = cam.z > 3.4 ? "hidden" : "";
    if (cam.done) draw(0, 0, 0);
    else draw(cam.k * press, cam.origin.x, cam.origin.y);
    frameEl.dataset.ground = cam.done ? "ink" : "paper";

    // Words (MOTION.md §2.5–2.7): time-based, triggered by thresholds
    const next = segment(p, seg);
    if (next !== seg) {
      transition(seg, next, p >= lastP ? 1 : -1);
      seg = next;
    }

    // Release, then the slit (MOTION.md §2.8, §5.3)
    const rel = clamp01((p - SEG.releaseStart) / (1 - SEG.releaseStart));
    insideContent.style.opacity = String(1 - rel);
    hairRelease.style.opacity = String(1 - rel);
    slitLine.style.opacity = String(clamp01(qv / 0.15));
    const open = inOut(clamp01((qv - 0.15) / 0.85));
    slit.style.visibility = qv > 0.15 ? "visible" : "hidden";
    slit.style.clipPath = `inset(calc(${(1 - open) * 50}% - 0.5px) 0)`;

    const html = document.documentElement;
    html.dataset.nav = cam.done && qv < 0.5 ? "ink" : "paper";
    html.dataset.film = p > 0.01 && qv < 1 ? "on" : "off";
    lastP = p;
  };

  // Press: the visitor's scroll is the thumb (MOTION.md §2.3)
  let pressed = false;
  const pressCoin = () =>
    animate(1, 0.94, { duration: 0.12, ease: ease.out, onUpdate: (v) => ((press = v), render()) }).then(() =>
      animate(0.94, 1, { ...spring.release, onUpdate: (v) => ((press = v), render()) }),
    );

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
    if (!pressed && p >= 0.02 && p >= lastP) {
      pressed = true;
      pressCoin();
    }
    if (p < 0.005) pressed = false;
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
    [...touched, ...panels.flatMap((pn) => [pn.el, ...pn.letters, ...pn.lines])].forEach((el) => el.removeAttribute("style"));
    panels.forEach((pn) => delete pn.el.dataset.on);
    delete inside.dataset.on;
    frameEl.dataset.ground = "paper";
    delete document.documentElement.dataset.nav;
    delete document.documentElement.dataset.film;
    draw(0, 0, 0);
  };
}
