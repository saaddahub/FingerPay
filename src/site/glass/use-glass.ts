"use client";

import { useEffect, useRef } from "react";
import { animate, motionValue } from "motion";
import { ease, spring } from "../motion.ts";
import { attachLiquidGlass } from "./liquid-glass.ts";

/** Glass physics (MOTION.md §3) + optical Snell's-law liquid refraction (saadsalam.dev / Apple iOS 26):
 *  press on touch-down, magnetic pull, specular highlight, and real background bending around the bevel. */
export function useGlass<T extends HTMLElement>(maxPull = 6, field = 24) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const detachLiquid = attachLiquidGlass(el);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const ox = motionValue(0);
    const oy = motionValue(0);
    const sc = motionValue(1);
    let w = 0;
    let h = 0;

    const apply = () => {
      el.style.setProperty("--ox", `${ox.get().toFixed(2)}px`);
      el.style.setProperty("--oy", `${oy.get().toFixed(2)}px`);
      el.style.setProperty("--press", sc.get().toFixed(4));
      // The light sits where the pointer is, reconstructed from the spring (offset ÷ 0.3), so both move together.
      el.style.setProperty("--mx", `${(w / 2 + ox.get() / 0.3).toFixed(1)}px`);
      el.style.setProperty("--my", `${(h / 2 + oy.get() / 0.3).toFixed(1)}px`);
    };
    const unsub = [ox.on("change", apply), oy.on("change", apply), sc.on("change", apply)];

    const down = () => {
      if (reduced) el.dataset.pressed = "";
      else animate(sc, 0.97, { duration: 0.1, ease: ease.out });
    };
    const up = () => {
      delete el.dataset.pressed;
      if (!reduced) animate(sc, 1, spring.release);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      down();
      window.setTimeout(up, 100);
    };
    el.addEventListener("keydown", key);

    let inside = false;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dx = e.clientX - (r.left + w / 2);
      const dy = e.clientY - (r.top + h / 2);
      const within = Math.abs(dx) <= w / 2 + field && Math.abs(dy) <= h / 2 + field;
      if (within) {
        const cx = Math.max(-maxPull, Math.min(maxPull, dx * 0.3));
        const cy = Math.max(-maxPull, Math.min(maxPull, dy * 0.3));
        animate(ox, cx, spring.magnetic);
        animate(oy, cy, spring.magnetic);
        if (!inside) el.dataset.hover = "";
      } else if (inside) {
        animate(ox, 0, spring.magnetic);
        animate(oy, 0, spring.magnetic);
        delete el.dataset.hover;
      }
      inside = within;
    };
    if (fine && !reduced) window.addEventListener("pointermove", move, { passive: true });

    return () => {
      detachLiquid();
      unsub.forEach((u) => u());
      window.removeEventListener("pointermove", move);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", up);
      el.removeEventListener("keydown", key);
    };
  }, [maxPull, field]);

  return ref;
}
