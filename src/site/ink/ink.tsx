"use client";

import { useEffect, useRef } from "react";
import { startInk } from "./ink-shader.ts";
import s from "./ink.module.css";

/** Ink in water: the cursor stirs a fluid simulation that spreads blue ink across the page. The canvas sits over
 *  the content with `pointer-events: none` and multiply blending, so it tints the paper without hiding type or
 *  catching clicks. */
export function InkField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return startInk(canvas);
  }, []);

  return <canvas ref={ref} className={s.ink} aria-hidden="true" />;
}
