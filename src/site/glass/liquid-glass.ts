"use client";

// Optical Liquid Glass engine (after saadsalam.dev & Apple iOS 26 Liquid Glass).
// Builds a physical Snell's-law refraction displacement map + grazing-angle specular caustic rim map
// for each glass surface's exact geometry, then attaches an SVG backdrop-filter with R/G/B chromatic
// dispersion so characters, rules, and ink visibly bend behind the glass bevel.

const SVG_NS = "http://www.w3.org/2000/svg";
const IOR = 1.5; // Crown glass index of refraction
const LIGHT_DIR: [number, number] = [-0.6, -0.8];

// Signed distance to a rounded rectangle centered in a w × h box with corner radius r.
function roundedRectSdf(x: number, y: number, w: number, h: number, r: number): number {
  const dx = Math.abs(x - w / 2) - (w / 2 - r);
  const dy = Math.abs(y - h / 2) - (h / 2 - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

// Snell's law deflection angle tan(theta_i - theta_r) across the curved glass bevel profile.
function snellDeflection(depthRatio: number, thickness: number, bevel: number): number {
  const r = 1 - Math.min(Math.max(depthRatio, 0.001), 1);
  const slope = (r ** 3 / (1 - r ** 4) ** 0.75) * (thickness / bevel);
  const thetaI = Math.atan(slope);
  const thetaR = Math.asin(Math.sin(thetaI) / IOR);
  return Math.tan(thetaI - thetaR);
}

function buildDisplacementMap(w: number, h: number, radius: number, bevel: number, thickness: number, minDepth = 0.001): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  const maxDeflect = snellDeflection(minDepth, thickness, bevel);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = roundedRectSdf(px, py, w, h, radius);
      const idx = (y * w + x) * 4;
      let nx = 0;
      let ny = 0;
      if (d < 0 && -d < bevel) {
        const gx = roundedRectSdf(px + 1, py, w, h, radius) - roundedRectSdf(px - 1, py, w, h, radius);
        const gy = roundedRectSdf(px, py + 1, w, h, radius) - roundedRectSdf(px, py - 1, w, h, radius);
        const gLen = Math.hypot(gx, gy) || 1;
        const mag = Math.min(1, snellDeflection(-d / bevel, thickness, bevel) / maxDeflect);
        nx = (-gx / gLen) * mag;
        ny = (-gy / gLen) * mag;
      }
      out[idx] = Math.round(128 + nx * 127);
      out[idx + 1] = Math.round(128 + ny * 127);
      out[idx + 2] = 128;
      out[idx + 3] = 255;
    }
  }
  return out;
}

function buildSpecularMap(w: number, h: number, radius: number, bevel: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  const rimWidth = bevel * 0.62;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = roundedRectSdf(px, py, w, h, radius);
      const idx = (y * w + x) * 4;
      if (d >= 0) continue;
      let alpha = py < h / 2 ? 0.08 * (1 - py / (h / 2)) ** 2 : 0;
      const distIn = -d;
      if (distIn < rimWidth) {
        const gx = roundedRectSdf(px + 1, py, w, h, radius) - roundedRectSdf(px - 1, py, w, h, radius);
        const gy = roundedRectSdf(px, py + 1, w, h, radius) - roundedRectSdf(px, py - 1, w, h, radius);
        const gLen = Math.hypot(gx, gy) || 1;
        const dot = (gx / gLen) * LIGHT_DIR[0] + (gy / gLen) * LIGHT_DIR[1];
        const falloff = 1 - distIn / rimWidth;
        alpha +=
          Math.max(0, dot) ** 1.5 * falloff ** 2 * 0.92 +
          Math.max(0, -dot) ** 2 * falloff ** 3 * 0.42 +
          (distIn < 1.5 ? 0.24 : 0);
      }
      out[idx] = 255;
      out[idx + 1] = 250;
      out[idx + 2] = 255;
      out[idx + 3] = Math.round(Math.min(1, alpha) * 255);
    }
  }
  return out;
}

type CachedMaps = { mapUrl: string; specUrl: string; bevel: number };
const mapCache = new Map<string, CachedMaps>();
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;
let svgDefs: SVGDefsElement | null = null;
let filterSeq = 0;

function supportsSvgBackdrop(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return false;
  const uaData = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  if (uaData?.brands?.some((b) => b.brand === "Chromium" || b.brand === "Google Chrome" || b.brand === "Microsoft Edge")) {
    return true;
  }
  return /Chrome|Chromium|Edg|OPR/i.test(navigator.userAgent) && !/Firefox|FxiOS/i.test(navigator.userAgent);
}

function ensureDefs(): SVGDefsElement {
  if (svgDefs && svgDefs.isConnected) return svgDefs;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  const defs = document.createElementNS(SVG_NS, "defs");
  svg.append(defs);
  document.body.append(svg);
  svgDefs = defs;
  return defs;
}

function createLiquidFilter(): SVGFilterElement {
  const defs = ensureDefs();
  const id = `fp-liquid-${++filterSeq}`;
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.id = id;
  filter.setAttribute("color-interpolation-filters", "sRGB");
  filter.setAttribute("x", "0%");
  filter.setAttribute("y", "0%");
  filter.setAttribute("width", "100%");
  filter.setAttribute("height", "100%");

  const channelPass = (ch: number, k: number) => {
    const matrices = [
      "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
      "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
      "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
    ];
    return `<feDisplacementMap in="frost" in2="map" scale="0" data-k="${k}" xChannelSelector="R" yChannelSelector="G" result="d${ch}"/>
      <feColorMatrix in="d${ch}" type="matrix" values="${matrices[ch]}" result="c${ch}"/>`;
  };

  filter.innerHTML = `
    <feImage result="map" preserveAspectRatio="none" x="0" y="0"/>
    <feImage result="spec" preserveAspectRatio="none" x="0" y="0"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="0.85" result="frost"/>
    ${channelPass(0, 1.12)}
    ${channelPass(1, 0.92)}
    ${channelPass(2, 0.72)}
    <feBlend in="c0" in2="c1" mode="screen" result="c01"/>
    <feBlend in="c01" in2="c2" mode="screen" result="rgb"/>
    <feColorMatrix in="rgb" type="saturate" values="1.48" result="glass"/>
    <feBlend in="spec" in2="glass" mode="screen"/>
  `;
  defs.append(filter);
  return filter;
}

function getMaps(w: number, h: number, radius: number): CachedMaps {
  // Downsample internal normal-map generation for very large panels so computation takes < 1.5ms.
  const maxDim = Math.max(w, h);
  const scale = maxDim > 420 ? 420 / maxDim : 1;
  const cw = Math.max(8, Math.round(w * scale));
  const ch = Math.max(8, Math.round(h * scale));
  const cr = Math.min(Math.round(radius * scale), Math.floor(cw / 2), Math.floor(ch / 2));
  const key = `${cw}x${ch}x${cr}`;

  const hit = mapCache.get(key);
  if (hit) {
    return { ...hit, bevel: hit.bevel / scale };
  }

  if (!sharedCanvas) {
    sharedCanvas = document.createElement("canvas");
    sharedCtx = sharedCanvas.getContext("2d");
  }
  const ctx = sharedCtx!;
  sharedCanvas.width = cw;
  sharedCanvas.height = ch;

  const bevel = Math.max(6 * scale, Math.min(cr * 1.28, ch * 0.44, 48 * scale));
  const thickness = bevel * 2.15;

  const dispBytes = buildDisplacementMap(cw, ch, cr, bevel, thickness);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(dispBytes), cw, ch), 0, 0);
  const mapUrl = sharedCanvas.toDataURL();

  const specBytes = buildSpecularMap(cw, ch, cr, bevel);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(specBytes), cw, ch), 0, 0);
  const specUrl = sharedCanvas.toDataURL();

  const entry: CachedMaps = { mapUrl, specUrl, bevel };
  if (mapCache.size > 64) {
    const oldest = mapCache.keys().next().value;
    if (oldest) mapCache.delete(oldest);
  }
  mapCache.set(key, entry);
  return { mapUrl, specUrl, bevel: bevel / scale };
}

/** Attaches real Snell's-law SVG refraction + chromatic edge dispersion to a glass element. */
export function attachLiquidGlass(el: HTMLElement): () => void {
  if (!supportsSvgBackdrop()) return () => {};
  // Skip solid dark CTA buttons that opt out of glass transparency.
  if (el.dataset.noLiquid !== undefined) return () => {};

  const filter = createLiquidFilter();
  const feImages = filter.querySelectorAll("feImage");
  const mapImg = feImages[0];
  const specImg = feImages[1];
  const displacements = filter.querySelectorAll("feDisplacementMap");

  let lastKey = "";
  let timer = 0;

  const update = (w: number, h: number) => {
    if (w < 12 || h < 12) return;
    const rawRadius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24;
    const radius = Math.min(rawRadius, w / 2, h / 2);
    const key = `${w}x${h}x${Math.round(radius)}`;
    if (key === lastKey) return;
    lastKey = key;

    const { mapUrl, specUrl, bevel } = getMaps(w, h, radius);
    mapImg.setAttribute("href", mapUrl);
    specImg.setAttribute("href", specUrl);
    displacements.forEach((d) => {
      const k = parseFloat(d.getAttribute("data-k") || "1");
      d.setAttribute("scale", (bevel * 1.85 * k).toFixed(1));
    });
  };

  const ro = new ResizeObserver(() => {
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (w < 12 || h < 12) return;
    mapImg.setAttribute("width", String(w));
    mapImg.setAttribute("height", String(h));
    specImg.setAttribute("width", String(w));
    specImg.setAttribute("height", String(h));
    window.clearTimeout(timer);
    timer = window.setTimeout(() => update(w, h), lastKey ? 120 : 0);
  });

  ro.observe(el);
  el.dataset.liquid = "";
  const filterUrl = `url(#${filter.id})`;
  el.style.backdropFilter = filterUrl;
  el.style.setProperty("-webkit-backdrop-filter", filterUrl);

  return () => {
    ro.disconnect();
    window.clearTimeout(timer);
    filter.remove();
    el.style.backdropFilter = "";
    el.style.removeProperty("-webkit-backdrop-filter");
    delete el.dataset.liquid;
  };
}

/** Watches the document for `[data-liquid-surface]` elements and upgrades them with Snell's-law refraction. */
export function startGlobalLiquidGlass(): () => void {
  if (!supportsSvgBackdrop()) return () => {};
  const active = new Map<HTMLElement, () => void>();
  const scan = () => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-liquid-surface], [data-card]");
    for (const el of nodes) {
      if (!active.has(el)) active.set(el, attachLiquidGlass(el));
    }
    for (const [el, cleanup] of active) {
      if (!el.isConnected) {
        cleanup();
        active.delete(el);
      }
    }
  };
  let raf = 0;
  const mo = new MutationObserver(() => {
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  scan();
  return () => {
    if (raf) cancelAnimationFrame(raf);
    mo.disconnect();
    for (const cleanup of active.values()) cleanup();
    active.clear();
  };
}
