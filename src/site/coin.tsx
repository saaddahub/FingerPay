import { CLIP_R, RING, RIDGES, ridgePoints } from "./stage/ridges.ts";

// The Ridge Coin as inline SVG, generated from the same geometry the dive canvas draws (SYSTEM.md §7).
const ridgePath = RIDGES.h
  .map((_, i) => "M" + ridgePoints(i).map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L"))
  .join("");

export function Coin({ className, viewBox = "-24 -24 48 48", slice = false, id }: {
  className?: string;
  viewBox?: string;
  slice?: boolean;
  id: string; // unique per page: the clip path needs its own id
}) {
  return (
    <svg className={className} viewBox={viewBox} preserveAspectRatio={slice ? "xMidYMid slice" : undefined} aria-hidden="true" focusable="false">
      <clipPath id={id}>
        <circle r={CLIP_R} />
      </clipPath>
      <circle r={RING.r} fill="none" stroke="currentColor" strokeWidth={RING.width} />
      <path d={ridgePath} clipPath={`url(#${id})`} fill="none" stroke="currentColor" strokeWidth={RIDGES.width} />
    </svg>
  );
}
