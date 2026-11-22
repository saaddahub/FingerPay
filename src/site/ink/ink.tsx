"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "../use-reduced.ts";
import { startInk } from "./ink-shader.ts";
import s from "./ink.module.css";

/** Ink in water: the cursor stirs a fluid simulation that spreads blue ink across the page. The canvas sits over
 *  the content with `pointer-events: none` and multiply blending, so it tints the paper without hiding type or
 *  catching clicks. Skipped entirely under prefers-reduced-motion or when WebGL2 float targets aren't available. */
export function InkField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    return startInk(canvas);
  }, [reduced]);

  return <canvas ref={ref} className={s.ink} aria-hidden="true" />;
}
