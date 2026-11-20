"use client";

import { Art } from "./art";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./landing.module.css";
import { ScannerArt } from "./scanner-art";

// Illustrated demo of the PKR 180 sale (WEBSITE.md §3). Timings are illustrated, never measured, and nothing
// here talks to the server: the real sale runs through fp.api_* in the terminal.
const HOLD_MS = 600;
const CHECK_STEP_MS = 150;
const SETTLE_MS = 1500;
const RING = 289; // circumference of the r=46 progress ring

const CHECKS = [
  "Terminal signature",
  "Fresh one-time nonce",
  "Thumb lookup (keyed code)",
  "Thumb Lock is off",
  "Within PKR 5,000 limit",
  "Balance covers PKR 180",
] as const;

type Phase = "idle" | "holding" | "checking" | "paid";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const paused = () => document.documentElement.dataset.paused === "true";

export function HoldToPay() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [ticked, setTicked] = useState(0);
  const [hint, setHint] = useState(false);
  const [message, setMessage] = useState("");
  const ring = useRef<SVGCircleElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const hold = useRef<HTMLButtonElement>(null);
  const raf = useRef(0);
  const timers = useRef<number[]>([]);

  const setRing = (p: number) => ring.current?.setAttribute("stroke-dashoffset", String(RING * (1 - p)));
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; cancelAnimationFrame(raf.current); };

  const reset = useCallback((msg = "") => {
    clearTimers();
    setRing(0);
    setTicked(0);
    setPhase("idle");
    setMessage(msg);
  }, []);

  const settle = useCallback(() => {
    clearTimers();
    const reduce = reducedMotion();
    setRing(1);
    setPhase("checking");
    setMessage("Checking…");
    CHECKS.forEach((_, i) => timers.current.push(window.setTimeout(() => setTicked(i + 1), reduce ? 0 : CHECK_STEP_MS * (i + 1))));
    timers.current.push(window.setTimeout(() => { setPhase("paid"); setMessage("PAYMENT SUCCESSFUL — PKR 180 RECEIVED."); }, reduce ? 200 : SETTLE_MS));
  }, []);

  // One sensor glow 1.2 s after load says "this is pressable"; no loop, and none when paused or reduced.
  useEffect(() => {
    if (reducedMotion() || paused()) return;
    const on = window.setTimeout(() => setHint(true), 1200);
    const off = window.setTimeout(() => setHint(false), 1700);
    return () => { clearTimeout(on); clearTimeout(off); clearTimers(); };
  }, []);

  const start = () => {
    if (phase !== "idle") return;
    const t0 = performance.now();
    const duration = reducedMotion() ? 1 : HOLD_MS;
    setPhase("holding");
    setMessage("Checking…");
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / duration);
      setRing(p);
      if (p >= 1) settle();
      else raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const release = () => { if (phase === "holding") reset("Hold a little longer. Scanners need a steady thumb."); };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture(e.pointerId); start(); };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); start(); } };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => { if (e.key === " " || e.key === "Enter") release(); };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse" || !cursor.current) return;
    cursor.current.style.translate = `calc(${e.clientX}px - 50%) calc(${e.clientY}px - 50%)`; // CSSOM, allowed by the CSP
    cursor.current.style.opacity = "1";
  };
  const hideCursor = () => { if (cursor.current) cursor.current.style.opacity = "0"; };

  const checking = phase === "checking";
  const paid = phase === "paid";

  return (
    <figure className={styles.scene} data-m="scene" data-phase={phase} aria-label="Demo sale: PKR 180 at Rasheed's counter">
      <span ref={cursor} className={styles.thumbCursor} aria-hidden="true" />
      <Art className={styles.wash} src="/art/wash.webp" width={1400} height={542} alt="" priority depth={140} />
      <Art className={`${styles.sceneShelf} ${styles.cutout}`} src="/art/shelf.webp" width={779} height={700} alt="" depth={70} />
      {/* Rasheed's poses: hands on the counter, then looking down at his phone to check the sale, then a nod */}
      <Art className={`${styles.sceneGrocer} ${styles.poseWait} ${styles.cutout}`} src="/art/grocer-wait.webp" width={281} height={900} alt="Rasheed waits behind his counter." priority depth={36} />
      <Art className={`${styles.sceneGrocer} ${styles.poseLean} ${styles.cutout}`} src="/art/grocer-lean.webp" width={268} height={900} alt="" depth={36} />
      <span className={`${styles.counter} ${styles.torn} ${styles.tornTop} ${styles.kraft}`} aria-hidden="true" />

      <span className={styles.phone}>
        <Art className={styles.cutout} src="/art/phone-stand.webp" width={381} height={650} alt="" />
        <span className={`${styles.phoneScreen} ${styles.phoneScroll}`} aria-hidden="true">
          <svg viewBox="0 0 16 16"><use href="#fp-check" /></svg>
          <span className={styles.big}>PKR 180</span>
          <span className={styles.ok}>RECEIVED</span>
        </span>
        <span className={styles.phoneScreen} aria-hidden="true">
          {paid ? (
            <>
              <svg viewBox="0 0 16 16"><use href="#fp-check" /></svg>
              <span className={styles.big}>PKR 180</span>
              <span className={styles.ok}>RECEIVED</span>
            </>
          ) : checking ? (
            <span className={styles.dim}>Checking…</span>
          ) : (
            <>
              <span className={styles.dim}>PKR</span>
              <span className={styles.big}>180</span>
              <span className={styles.dim}>Ready</span>
            </>
          )}
        </span>
      </span>

      <span className={styles.bubble} aria-hidden="true" data-m="bubble">
        <svg viewBox="0 0 200 90" preserveAspectRatio="none"><path d="M18 8 C70 2 140 1 186 9 C197 14 198 52 189 62 C160 70 128 69 92 70 L40 98 L56 71 C40 72 26 70 12 63 C3 52 4 16 18 8Z" /></svg>
        <span>Hold a thumb here</span>
      </span>

      <span className={styles.scannerSpot} data-m="scanner-spot">
        {[0, 1, 2].map((i) => <span key={i} className={styles.ripple} aria-hidden="true" />)}
        <span className={styles.scanner} data-m="reader" data-glow={hint || checking || phase === "paid"}>
          <ScannerArt />
          <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
            <circle className={styles.ringTrack} cx="50" cy="50" r="46" />
            <circle ref={ring} className={styles.ringFill} cx="50" cy="50" r="46" strokeDashoffset={RING} />
          </svg>
          <button
            ref={hold}
            className={styles.holdButton}
            type="button"
            aria-label="Pay PKR 180 with a thumb tap"
            aria-describedby="hold-help"
            onPointerDown={onPointerDown}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerMove={onPointerMove}
            onPointerLeave={hideCursor}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onContextMenu={(e) => e.preventDefault()}
          />
        </span>
      </span>

      <Art className={`${styles.sceneLady} ${styles.poseTap} ${styles.cutout}`} src="/art/lady-tap.webp" width={413} height={749} alt="Ayesha reaches her thumb toward the scanner. She holds no wallet, phone or cash." priority depth={-50} m="lady" />
      <Art className={`${styles.sceneLady} ${styles.poseDone} ${styles.cutout}`} src="/art/lady-idle.webp" width={301} height={748} alt="" depth={-50} m="lady" />

      <span className={`${styles.checks} ${styles.torn}`} data-on={checking || paid} aria-hidden="true">
        <span className={styles.checksTitle}>Risk Engine checks</span>
        <ol>
          {CHECKS.map((c, i) => (
            <li key={c} data-ok={i < ticked}><svg viewBox="0 0 16 16"><use href="#fp-check" /></svg>{c}</li>
          ))}
        </ol>
      </span>

      <figcaption className={styles.status}>
        <span id="hold-help" className={styles.statusNote}>Press and hold the scanner, or</span>
        <button className={styles.textButton} type="button" onClick={() => { reset(); settle(); }} disabled={checking}>Pay without holding</button>
        <span role="status" className={styles.result}>{message}</span>
        {paid && <button className={styles.textButton} type="button" onClick={() => { reset(); hold.current?.focus(); }}>Pay again</button>}
      </figcaption>
    </figure>
  );
}

export function PauseToggle() {
  const [isPaused, setPaused] = useState(false);
  const toggle = () => {
    const next = !isPaused;
    document.documentElement.dataset.paused = String(next);
    setPaused(next);
  };
  return (
    <button className={styles.pause} type="button" aria-pressed={isPaused} onClick={toggle}>
      <svg viewBox="0 0 14 14" aria-hidden="true">
        {isPaused ? <path d="M4 2.5v9l7-4.5z" fill="currentColor" /> : <path d="M4 2v10M10 2v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
      </svg>
      <span>{isPaused ? "Play animations" : "Pause animations"}</span>
    </button>
  );
}
