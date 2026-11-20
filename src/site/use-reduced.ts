"use client";

import { useSyncExternalStore } from "react";

// Live prefers-reduced-motion (MOTION.md §9): a change switches modes without a reload.
const query = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function useReducedMotion(): boolean {
  // Server snapshot is `true`, so nothing animates until the client knows the visitor's preference.
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
}
