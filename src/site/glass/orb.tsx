"use client";

import { useEffect, useRef } from "react";
import { Coin } from "../coin.tsx";
import { useReducedMotion } from "../use-reduced.ts";
import { startOrbShader } from "./orb-shader.ts";
import s from "./orb.module.css";

/** The glass orb: the nav's home button (SYSTEM.md §6.3). The CSS glass is the fallback; the WebGL shader adds
 *  refraction with chromatic edges on top when WebGL2 is available and motion/transparency aren't reduced. */
export function Orb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced || window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    return startOrbShader(canvas);
  }, [reduced]);

  return (
    <span className={s.orb} aria-hidden="true">
      <canvas ref={canvasRef} className={s.canvas} />
      <Coin id="coin-nav" className={s.coin} />
    </span>
  );
}
