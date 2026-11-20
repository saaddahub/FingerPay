import type { ReactNode } from "react";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";

// Product UI keeps Astryx (moved here from the root layout when / became a hand-built page).
export default function MobileLayout({ children }: { children: ReactNode }) {
  return children;
}
