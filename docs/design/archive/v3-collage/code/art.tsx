/* eslint-disable @next/next/no-img-element -- next/image adds an inline `style` that the nonce CSP blocks, and
   images are unoptimized here anyway (next.config.ts), so a plain <img> gives the same result without the violation. */

type ArtProps = { src: string; width: number; height: number; alt: string; className?: string; priority?: boolean; depth?: number; m?: string };

export function Art({ src, width, height, alt, className, priority, depth, m }: ArtProps) {
  return <img src={src} width={width} height={height} alt={alt} className={className} decoding="async" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} data-depth={depth} data-m={m} />;
}
