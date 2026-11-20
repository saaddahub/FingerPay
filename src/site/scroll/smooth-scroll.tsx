"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { frame, cancelFrame } from "motion";
import { useReducedMotion } from "../use-reduced.ts";

// One clock: Lenis is driven by Motion's frame loop (MOTION.md §10). Off under reduced motion.
let lenis: Lenis | null = null;
let stageTarget: ((part: number) => number) | null = null;

/** The stage registers how to turn a stage progress value into a page scroll position. */
export function setStageScroll(fn: ((part: number) => number) | null) {
  stageTarget = fn;
}

export function scrollToTarget(target: string | number) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4 });
  else if (typeof target === "number") window.scrollTo({ top: target });
  else document.querySelector(target)?.scrollIntoView();
}

/** Scroll to a point inside the pinned stage (the nav's "Security" goes to Private, BUILD.md §4.2). */
export function scrollToStage(part: number, fallbackSelector: string) {
  if (stageTarget) scrollToTarget(stageTarget(part));
  else scrollToTarget(fallbackSelector);
}

export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    const markScrolled = () => {
      document.documentElement.dataset.scrolled = "";
      window.removeEventListener("scroll", markScrolled);
    };
    window.addEventListener("scroll", markScrolled, { passive: true });
    if (reduced) return () => window.removeEventListener("scroll", markScrolled);

    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, syncTouch: false, autoRaf: false, anchors: true });
    const tick = ({ timestamp }: { timestamp: number }) => lenis?.raf(timestamp);
    frame.update(tick, true);
    return () => {
      cancelFrame(tick);
      lenis?.destroy();
      lenis = null;
      window.removeEventListener("scroll", markScrolled);
    };
  }, [reduced]);

  return null;
}
