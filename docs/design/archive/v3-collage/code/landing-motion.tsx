"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { animate, cancelFrame, frame, inView, scroll, stagger, type AnimationSequence } from "motion";

// One shared ticker (MOTION.md §4.1): Motion's frame loop drives Lenis. Every effect here is scroll-linked or
// fires once on entering view. In reduced motion, or while "Pause animations" is on, none of it is created and the
// page shows its finished layout (MOTION.md §6).

const settle = { type: "spring", visualDuration: 0.333, bounce: 0 } as const; // --motion-settle
const glide = { type: "spring", visualDuration: 0.458, bounce: 0 } as const; // --motion-glide
const press = { type: "spring", visualDuration: 0.208, bounce: 0 } as const; // --motion-press

type Stop = () => void;
const all = (root: ParentNode, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

function setup(root: HTMLElement): Stop {
  const stops: Stop[] = [];
  const add = (s: Stop | { stop?: () => void; cancel?: () => void }) =>
    stops.push(typeof s === "function" ? s : () => (s.cancel ?? s.stop)?.call(s));
  // Hide what will enter later, without touching anything already on screen.
  const prime = (els: Element[], from: Record<string, number | string>) => { if (els.length) add(animate(els, from, { duration: 0 })); };

  // Smooth wheel scrolling on Motion's ticker.
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false, anchors: true });
  const raf = ({ timestamp }: { timestamp: number }) => lenis.raf(timestamp);
  frame.read(raf, true);
  add(() => { cancelFrame(raf); lenis.destroy(); });

  // Nav hides while reading down, returns on any scroll up (WEBSITE.md §4.0).
  const nav = root.querySelector<HTMLElement>("[data-m=nav]");
  let last = 0;
  const onScroll = ({ scroll: y }: { scroll: number }) => {
    if (nav) nav.dataset.hidden = String(y > last && y > 160);
    last = y;
  };
  lenis.on("scroll", onScroll);

  // Depth: every layer with data-depth drifts by that many px while its section scrolls past.
  const pinned = window.matchMedia("(min-width: 64rem) and (pointer: fine)").matches;
  for (const el of all(root, "[data-depth]")) {
    if (pinned && el.closest("#hero")) continue;
    const target = el.closest("section, footer") ?? el;
    add(scroll(animate(el, { y: [0, Number(el.dataset.depth)] }, { ease: "linear" }), { target, offset: ["start end", "end start"] }));
  }

  // Problem: each figure is pasted down as it arrives, tilting in from alternate sides.
  all(root, "[data-m=paste]").forEach((el, i) => {
    const tilt = i % 2 ? 7 : -7;
    add(scroll(animate(el, { y: [90, 0], rotate: [tilt, 0], opacity: [0, 1] }, { ease: "linear" }), { target: el, offset: ["start end", "start 0.55"] }));
  });
  // Labels are slapped on once the figure is down.
  const labels = all(root, "[data-m=slap]");
  prime(labels, { scale: 1.25, rotate: -5, opacity: 0 });
  for (const el of labels) add(inView(el, () => { animate(el, { scale: 1, rotate: -1, opacity: 1 }, { ...press, delay: 0.15 }); }, { amount: 0.6 }));
  const strip = root.querySelector("[data-m=strip]");
  if (strip) add(scroll(animate(strip, { x: ["-12%", "0%"], rotate: [-2.4, 0] }, { ease: "linear" }), { target: strip, offset: ["start end", "center 0.6"] }));

  // How it works: the staircase builds step by step as you scroll down it.
  for (const step of all(root, "[data-m=step]")) {
    const rule = step.querySelector("[data-m=rule]");
    const parts = all(step, "[data-m=part]");
    if (rule) add(scroll(animate(rule, { scaleX: [0, 1] }, { ease: "linear" }), { target: step, offset: ["start 0.95", "start 0.6"] }));
    parts.forEach((p, i) => add(scroll(animate(p, { y: [48 + i * 16, 0], opacity: [0, 1] }, { ease: "linear" }), { target: step, offset: ["start 0.9", "start 0.5"] })));
  }
  const sensor = root.querySelector<HTMLElement>("[data-m=sensor]");
  if (sensor) {
    sensor.dataset.glow = "false";
    add(inView(sensor, () => { const t = window.setTimeout(() => (sensor.dataset.glow = "true"), 350); return () => { clearTimeout(t); sensor.dataset.glow = "false"; }; }, { amount: 0.6 }));
    add(() => delete sensor.dataset.glow);
  }
  const banner = root.querySelector("[data-m=banner]");
  if (banner) {
    prime([banner], { scale: 0.9, y: 16, opacity: 0 });
    add(inView(banner, () => { animate(banner, { scale: 1, y: 0, opacity: 1 }, { ...settle, delay: 0.2 }); }, { amount: 0.6 })); // money never bounces
  }

  // For shops: the terminal is set down on the counter, rotating into place with the scroll.
  const terminal = root.querySelector("[data-m=terminal]");
  if (terminal) add(scroll(animate(terminal, { rotate: [-14, 0], y: [140, 0], x: [-40, 0] }, { ease: "linear" }), { target: terminal, offset: ["start end", "center 0.55"] }));
  const rows = all(root, "[data-m=row]");
  prime(rows, { opacity: 0, x: -16 });
  if (rows[0]) add(inView(rows[0], () => { animate(rows, { opacity: 1, x: 0 }, { ...settle, delay: stagger(0.12, { startDelay: 0.25 }) }); }, { amount: 0.6 }));

  // Plain lists rise row by row as each one reaches the reader.
  const risers = all(root, "[data-m=rise]");
  prime(risers, { opacity: 0, y: 28 });
  for (const el of risers) add(inView(el, () => { animate(el, { opacity: 1, y: 0 }, glide); }, { amount: 0.6 }));

  // Safety: "LOCK" pops out of her mouth, then the reply prints out beneath it.
  const said = root.querySelector("[data-m=say]");
  const reply = root.querySelector("[data-m=print]");
  if (said && reply) {
    prime([said], { scale: 0.4, opacity: 0 });
    prime([reply], { clipPath: "inset(0 0 100% 0)", y: -24 });
    add(inView(said, () => {
      animate(said, { scale: 1, opacity: 1 }, { type: "spring", visualDuration: 0.3, bounce: 0.35 }); // earned: she just spoke
      animate(reply, { clipPath: "inset(0 0 0% 0)", y: 0 }, { duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.45 });
    }, { amount: 0.6 }));
  }

  // Every phone: the SMS feeds out of the phone as you scroll.
  const sms = root.querySelector("[data-m=sms]");
  if (sms) add(scroll(animate(sms, { clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"], y: [120, 0], rotate: [-6, 0] }, { ease: "linear" }), { target: sms, offset: ["start end", "start 0.35"] }));

  // Numbers: the cash memo prints line by line while it scrolls up.
  const receipt = root.querySelector("[data-m=receipt]");
  if (receipt) add(scroll(animate(receipt, { clipPath: ["inset(0 0 92% 0)", "inset(0 0 0% 0)"] }, { ease: "linear" }), { target: receipt, offset: ["start 0.8", "end 0.95"] }));


  const fine = window.matchMedia("(pointer: fine)").matches;

  // Hero paper theatre: layers move by depth with the pointer, the scene tilts, the lamp follows (CSS reads --px/--py).
  const scene = root.querySelector<HTMLElement>("[data-m=scene]");
  const hero = scene?.closest("section");
  if (scene && hero && fine) {
    const goal = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      goal.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      goal.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => { goal.x = 0; goal.y = 0; };
    const tick = ({ delta }: { delta: number }) => {
      const dx = goal.x - cur.x, dy = goal.y - cur.y;
      if (Math.abs(dx) < 0.0005 && Math.abs(dy) < 0.0005) return;
      const k = 1 - Math.exp(-delta / 140); // frame-rate independent ease toward the pointer
      cur.x += dx * k; cur.y += dy * k;
      scene.style.setProperty("--px", cur.x.toFixed(4));
      scene.style.setProperty("--py", cur.y.toFixed(4));
      scene.style.transform = `rotateY(${(cur.x * 3.5).toFixed(3)}deg) rotateX(${(-cur.y * 2.5).toFixed(3)}deg)`;
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    frame.update(tick, true);
    add(() => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      cancelFrame(tick);
      scene.style.removeProperty("--px");
      scene.style.removeProperty("--py");
      scene.style.transform = "";
    });
  }

  // Letter splitting: every text node becomes word wrappers (so words never break) holding one span per letter.
  // The heading keeps its real text as aria-label; the exact original markup comes back on teardown.
  const splitLetters = (h: HTMLElement) => {
    const original = h.innerHTML;
    const label = (h.textContent ?? "").replace(/\s+/g, " ").trim();
    const letters: HTMLElement[] = [];
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const parts = (node.textContent ?? "").split(/(\s+)/);
      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(" "); continue; }
        const word = document.createElement("span");
        word.dataset.kw = "";
        word.setAttribute("aria-hidden", "true");
        for (const c of part) {
          const ch = document.createElement("span");
          ch.dataset.ch = "";
          ch.textContent = c;
          letters.push(ch);
          word.append(ch);
        }
        frag.append(word);
      }
      node.replaceWith(frag);
    }
    h.setAttribute("aria-label", label);
    add(() => { h.innerHTML = original; h.removeAttribute("aria-label"); });
    return letters;
  };
  const rand = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

  // Section headings: each one arrives its own way, picked to match what it says. All are scrubbed by the scroll.
  type Effect = (h: HTMLElement, letters: HTMLElement[], words: HTMLElement[]) => void;
  const enter = { offset: ["start 0.98", "start 0.42"] as ["start 0.98", "start 0.42"] };
  const scrub = (h: HTMLElement, seq: unknown[]) => add(scroll(animate(seq as AnimationSequence), { target: h, ...enter }));
  const GLYPHS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%*";
  const effects: Record<string, Effect> = {
    // Problem: cut-paper letters dropped on the counter, each tumbling in on its own path
    "problem-title": (h, letters) => scrub(h, letters.map((ch, i) => [ch, {
      y: [`${-(0.7 + rand(i, 1) * 1.6).toFixed(2)}em`, "0em"], x: [`${((rand(i, 2) - 0.5) * 1.2).toFixed(2)}em`, "0em"],
      rotate: [(rand(i, 3) - 0.5) * 110, 0], scale: [1.4 - rand(i, 4) * 0.5, 1], opacity: [0, 1],
    }, { at: i * 0.022, duration: 0.42, ease: "linear" }])),
    // How it works: words race in from alternate sides, like steps sliding into place
    "how-title": (h, _l, words) => scrub(h, words.map((w, i) => [w, {
      x: [i % 2 ? "-60vw" : "60vw", "0vw"], skewX: [i % 2 ? 18 : -18, 0], opacity: [0, 1],
    }, { at: i * 0.14, duration: 0.6, ease: "linear" }])),
    // For shops: each word is stamped down hard, like a shop's rubber stamp on a receipt
    "shops-title": (h, _l, words) => scrub(h, words.map((w, i) => [w, {
      scale: [2.6, 1], rotate: [(rand(i, 8) - 0.5) * 24, (rand(i, 9) - 0.5) * 3], opacity: [0, 1],
    }, { at: i * 0.16, duration: 0.3, ease: "linear" }])),
    // Safety: the letters are scrambled code that decrypts into the heading
    "safety-title": (h, letters) => {
      const truth = letters.map((l) => l.textContent ?? "");
      for (const l of letters) l.style.minInlineSize = `${l.getBoundingClientRect().width}px`;
      let last = -1;
      add(scroll((p: number) => {
        const step = Math.floor(p * 48);
        if (step === last) return;
        last = step;
        for (let i = 0; i < letters.length; i++) {
          const solvedAt = 0.15 + (i / letters.length) * 0.7;
          letters[i].textContent = p >= solvedAt ? truth[i] : GLYPHS[Math.floor(rand(i, step) * GLYPHS.length)];
          letters[i].style.opacity = p >= solvedAt ? "1" : "0.55";
        }
      }, { target: h, ...enter }));
    },
    // Every phone: typed out letter by letter like an SMS, with a blinking caret
    "phones-title": (h, letters) => {
      let shown = -1;
      add(scroll((p: number) => {
        const n = Math.min(letters.length, Math.floor(p * 1.15 * letters.length));
        if (n === shown) return;
        shown = n;
        for (let i = 0; i < letters.length; i++) {
          letters[i].style.opacity = i < n ? "1" : "0";
          if (i === n - 1 && n < letters.length) letters[i].dataset.caret = ""; else delete letters[i].dataset.caret;
        }
      }, { target: h, ...enter }));
    },
    // Numbers: a split-flap board, each letter flipping down into place
    "numbers-title": (h, letters) => scrub(h, letters.map((ch, i) => [ch, {
      rotateX: [-100, 0], opacity: [0, 1], transformPerspective: [400, 400],
    }, { at: i * 0.03, duration: 0.35, ease: "linear" }])),
    // Footer: the words come down like a shop shutter, slat by slat
    signoff: (h, letters, words) => {
      for (const w of words) w.style.overflow = "hidden";
      scrub(h, words.flatMap((w, i) => Array.from(w.children).map((ch) => [ch, { y: ["-110%", "0%"] }, { at: i * 0.18, duration: 0.5, ease: "linear" }])));
    },
  };
  for (const h of all(root, "h2, [data-m=signoff]")) {
    const letters = splitLetters(h);
    const words = all(h, "[data-kw]");
    (effects[h.id || h.dataset.m || ""] ?? effects["problem-title"])(h, letters, words);
  }

  // Hero headline letters dodge the cursor.
  const heroTitle = root.querySelector<HTMLElement>("[data-m=hero-title]");
  const heroLetters = heroTitle ? splitLetters(heroTitle) : [];
  if (fine && heroLetters.length) {
    const goal = heroLetters.map(() => ({ x: 0, y: 0 })), cur = heroLetters.map(() => ({ x: 0, y: 0 }));
    const R = 170, PUSH = 70;
    const onMove = (e: PointerEvent) => {
      for (let i = 0; i < heroLetters.length; i++) {
        const r = heroLetters[i].getBoundingClientRect();
        const dx = r.left + r.width / 2 - e.clientX, dy = r.top + r.height / 2 - e.clientY;
        const d = Math.hypot(dx, dy) || 1;
        const f = d < R ? (1 - d / R) ** 2 * PUSH : 0;
        goal[i].x = (dx / d) * f; goal[i].y = (dy / d) * f;
      }
    };
    const onLeave = () => { for (const g of goal) { g.x = 0; g.y = 0; } };
    const tick = ({ delta }: { delta: number }) => {
      const k = 1 - Math.exp(-delta / 90);
      for (let i = 0; i < heroLetters.length; i++) {
        const c = cur[i], g = goal[i];
        if (Math.abs(g.x - c.x) < 0.05 && Math.abs(g.y - c.y) < 0.05) continue;
        c.x += (g.x - c.x) * k; c.y += (g.y - c.y) * k;
        heroLetters[i].style.translate = `${c.x.toFixed(1)}px ${c.y.toFixed(1)}px`;
      }
    };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    frame.update(tick, true);
    add(() => { window.removeEventListener("pointermove", onMove); document.documentElement.removeEventListener("pointerleave", onLeave); cancelFrame(tick); });
  }

  const heroSection = root.querySelector<HTMLElement>("#hero");
  const stage = root.querySelector<HTMLElement>("[data-m=hero-stage]");
  const cine = window.matchMedia("(min-width: 64rem) and (pointer: fine)").matches;
  if (cine && heroSection && stage) {
    root.dataset.cine = "on";
    add(() => { delete root.dataset.cine; });
    // The first scroll pays: the headline parts like curtains, the camera dollies in, the shopper leans in and the
    // reader tilts up until her thumb meets the glass; the sale lights, rings out and settles.
    const scene = stage.querySelector<HTMLElement>("[data-m=scene]")!;
    const copy = root.querySelector("[data-m=hero-head] > section");
    const lines = all(stage, "[data-m=hero-line]");
    const ladies = all(scene, "[data-m=lady]");
    const spot = scene.querySelector<HTMLElement>("[data-m=scanner-spot]")!;
    const reader = spot.querySelector<HTMLElement>("[data-m=reader]")!;
    const bubble = scene.querySelector("[data-m=bubble]");
    const result = root.querySelector("[data-m=hero-result]");
    // Contact geometry from layout boxes (ignores transforms): her thumb tip vs the centre of the glass.
    const tap = ladies[0];
    const thumb = { x: tap.offsetLeft + tap.offsetWidth * 0.95, y: tap.offsetTop + tap.offsetHeight * 0.22 };
    const glass = { x: spot.offsetLeft + reader.offsetLeft + reader.offsetWidth * 0.5, y: spot.offsetTop + reader.offsetTop + reader.offsetHeight * 0.39 };
    const dx = glass.x - thumb.x, dy = glass.y - thumb.y;
    const lean = { x: dx * 0.45, y: dy * 0.3 }, tilt = { x: -dx * 0.55, y: -dy * 0.7 };
    const smooth = [0.4, 0, 0.2, 1];
    const seq = [
      // 0-4: the headline parts to both sides, the copy and the bubble clear, the camera dollies in
      ...lines.map((l, i) => [l, { x: [0, i ? "75vw" : "-75vw"], opacity: [1, 0] }, { at: i * 0.15, duration: 3, ease: [0.6, 0, 0.8, 0.5] }]),
      ...(copy ? [[copy, { opacity: [1, 0], y: [0, -60] }, { at: 0, duration: 1.2, ease: "linear" }]] : []),
      ...(bubble ? [[bubble, { opacity: [1, 0], scale: [1, 0.85] }, { at: 0.4, duration: 1 }]] : []),
      [stage, { scale: [1, 1.5], y: [0, -24] }, { at: 0, duration: 4.2, ease: smooth }],
      // 2.8-5: she leans in and the reader tilts up to meet her thumb
      [ladies, { x: [0, lean.x], y: [0, lean.y], rotate: [0, 3] }, { at: 2.8, duration: 2.2, ease: smooth }],
      [spot, { x: [0, tilt.x], y: [0, tilt.y], rotate: [0, -6] }, { at: 2.8, duration: 2.2, ease: smooth }],
      // 6.6-8.6: paid; she steps back, the reader settles, the camera eases out and the line lands
      [ladies, { x: [lean.x, 0], y: [lean.y, 0], rotate: [3, 0] }, { at: 6.6, duration: 1.6, ease: smooth }],
      [spot, { x: [tilt.x, 0], y: [tilt.y, 0], rotate: [-6, 0] }, { at: 6.6, duration: 1.6, ease: smooth }],
      [stage, { scale: [1.5, 1.12], y: [-24, 40] }, { at: 6.6, duration: 2, ease: smooth }],
      ...(result ? [[result, { opacity: [0, 1], y: [48, 0] }, { at: 6.9, duration: 1.3, ease: smooth }]] : []),
    ] as unknown as AnimationSequence;
    add(scroll(animate(seq), { target: heroSection, offset: ["start start", "end end"] }));
    // The same pay states the hold button uses: contact at 5.0 lights and checks, 6.6 is paid.
    add(scroll((p: number) => { scene.dataset.sphase = p < 0.5 ? "idle" : p < 0.66 ? "checking" : "paid"; }, { target: heroSection, offset: ["start start", "end end"] }));
    add(() => { delete scene.dataset.sphase; });
  } else {
    // No pin: the headline simply lifts away as the counter scene takes over.
    const heroHead = root.querySelector("[data-m=hero-head]");
    if (heroHead && heroSection) add(scroll(animate(heroHead, { y: [0, -80], opacity: [1, 0.35] }, { ease: "linear" }), { target: heroSection, offset: ["start start", "end start"] }));
  }

  // Marquee: two rows of giant type slide past each other.
  const marquee = root.querySelector("[data-m=marquee]");
  if (marquee) {
    add(scroll(animate(root.querySelector("[data-m=marquee-a]")!, { x: ["0%", "-38%"] }, { ease: "linear" }), { target: marquee, offset: ["start end", "end start"] }));
    add(scroll(animate(root.querySelector("[data-m=marquee-b]")!, { x: ["-38%", "0%"] }, { ease: "linear" }), { target: marquee, offset: ["start end", "end start"] }));
  }

  // Bilal walks into his scene: a paper-puppet hop on 12 fps steps, driven by the scroll.
  const walker = root.querySelector<HTMLElement>("[data-m=walk]");
  if (walker) {
    add(scroll((p: number) => {
      const t = Math.min(1, p / 0.5); // walks for the first half, then stands still to read the SMS
      const step = Math.floor(t * 18);
      const moving = t < 1;
      walker.style.translate = `${((t - 1) * 70).toFixed(1)}% ${moving && step % 2 ? -10 : 0}px`;
      walker.style.rotate = moving ? `${step % 2 ? 3 : -3}deg` : "0deg";
    }, { target: walker, offset: ["start end", "end start"] }));
    add(() => { walker.style.translate = ""; walker.style.rotate = ""; });
  }

  // Torn reveals: the ink bands tear open upward as they arrive (CSS clip-path reads --t, 1 = closed, 0 = open).
  for (const band of all(root, "[data-m=tear]")) {
    band.dataset.tearing = "";
    add(scroll((p: number) => band.style.setProperty("--t", (1 - p).toFixed(4)), { target: band, offset: ["start end", "start 0.3"] }));
    add(() => { delete band.dataset.tearing; band.style.removeProperty("--t"); });
  }

  // Problem figures tilt toward the pointer like a paper card held up to the light.
  if (fine) for (const card of all(root, "[data-m=tilt]")) {
    const move = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      animate(card, { rotateY: nx * 12, rotateX: -ny * 9, transformPerspective: 900 }, press);
    };
    const leave = () => animate(card, { rotateY: 0, rotateX: 0 }, settle);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    add(() => { card.removeEventListener("pointermove", move); card.removeEventListener("pointerleave", leave); animate(card, { rotateY: 0, rotateX: 0 }, { duration: 0 }); });
  }

  // How it works: the pinned sale film. Scroll scrubs one timeline (10 units: steps at 0, 2, 4.5 and 7).
  const film = root.querySelector<HTMLElement>("[data-m=film]");
  if (film && window.matchMedia("(min-width: 64rem) and (pointer: fine)").matches) {
    root.dataset.film = "on";
    add(() => { delete root.dataset.film; });
    const f = (n: string) => film.querySelector<HTMLElement>(`[data-f="${n}"]`)!;
    const fa = (n: string) => all(film, `[data-f="${n}"]`);
    const steps = fa("step"), fills = fa("fill"), ripples = fa("ripple"), checks = fa("check");
    const marks = [0, 2, 4.5, 7, 10];
    const lin = { ease: "linear" } as const;
    const seq = [
      // copy column: the big numeral rolls, the step text swaps, the rail fills
      [f("num"), { y: ["0%", "-25%"] }, { at: 2, duration: 0.35 }],
      [f("num"), { y: ["-25%", "-50%"] }, { at: 4.5, duration: 0.35 }],
      [f("num"), { y: ["-50%", "-75%"] }, { at: 7, duration: 0.35 }],
      ...steps.flatMap((st, i) => [
        ...(i > 0 ? [[st, { opacity: [0, 1], y: [28, 0] }, { at: marks[i] + 0.1, duration: 0.35 }]] : []),
        ...(i < 3 ? [[st, { opacity: [1, 0], y: [0, -28] }, { at: marks[i + 1] - 0.15, duration: 0.3 }]] : []),
      ]),
      ...fills.map((el, i) => [el, { scaleX: [0, 1] }, { at: marks[i], duration: marks[i + 1] - marks[i], ...lin }]),
      // 1. the cashier types 1-8-0 and taps Charge
      [f("keypad"), { y: [90, 0], opacity: [0, 1] }, { at: 0, duration: 0.6 }],
      [f("charge"), { scale: [1, 0.92, 1] }, { at: 1.45, duration: 0.35 }],
      [f("keypad"), { scale: [1, 0.8], x: [0, -12] }, { at: 2, duration: 0.7 }],
      // 2. the scanner rises, a thumb comes down, light rings out
      [f("scanner"), { y: [160, 0], opacity: [0, 1] }, { at: 2.05, duration: 0.7 }],
      [f("thumb"), { y: ["-24rem", "0rem"], rotate: [-14, 0], opacity: [0, 1] }, { at: 2.6, duration: 1.1 }],
      ...ripples.map((r, i) => [r, { scale: [0.4, 3.2], opacity: [0.8, 0] }, { at: 3.7 + i * 0.2, duration: 1 }]),
      [f("thumb"), { y: ["0rem", "-7rem"], opacity: [1, 0] }, { at: 4.3, duration: 0.6 }],
      // 3. a wire draws back to the terminal and the Risk Engine ticks through its checks
      [f("wire"), { strokeDashoffset: [1, 0] }, { at: 4.55, duration: 1, ...lin }],
      [f("checks"), { opacity: [0, 1], y: [50, 0], rotate: [7, 1.5] }, { at: 4.6, duration: 0.6 }],
      ...checks.map((c, i) => [c, { opacity: [0.2, 1], x: [-10, 0] }, { at: 5.1 + i * 0.32, duration: 0.25 }]),
      // 4. the money moment lands, then the receipt flies to the shopper's keypad phone
      [f("banner"), { opacity: [0, 1], scale: [0.82, 1], y: [18, 0] }, { at: 7.15, duration: 0.5 }],
      [f("checks"), { opacity: [1, 0.3] }, { at: 7.3, duration: 0.4 }],
      [f("scanner"), { opacity: [1, 0.45] }, { at: 7.3, duration: 0.4 }],
      [f("wire"), { opacity: [1, 0.2] }, { at: 7.3, duration: 0.4 }],
      [f("phone"), { opacity: [0, 1], y: [80, 0] }, { at: 7.6, duration: 0.6 }],
      [f("sms"), { opacity: [0, 1], x: ["-26rem", "0rem"], y: ["-16rem", "0rem"], rotate: [-32, 4], scale: [0.55, 1] }, { at: 8.2, duration: 1.1 }],
    ] as unknown as AnimationSequence;
    add(scroll(animate(seq), { target: film, offset: ["start start", "end end"] }));

    const digits = f("digits"), sensor = f("sensor"), phoneText = f("phone-text");
    const pressAt: [HTMLElement, number][] = [[f("key1"), 0.03], [f("key8"), 0.065], [f("key0"), 0.1]];
    let shown = "";
    add(scroll((p: number) => {
      const d = p < 0.035 ? "0" : p < 0.07 ? "1" : p < 0.105 ? "18" : "180";
      if (d !== shown) { digits.textContent = d; shown = d; }
      for (const [key, at] of pressAt) key.dataset.pressed = String(p >= at && p < at + 0.025);
      sensor.dataset.glow = String(p >= 0.37 && p < 0.72);
      phoneText.textContent = p >= 0.92 ? "1 new message" : "No messages";
    }, { target: film, offset: ["start start", "end end"] }));
    add(() => { digits.textContent = "180"; sensor.dataset.glow = "false"; });
  }

  return () => { lenis.off("scroll", onScroll); for (let i = stops.length - 1; i >= 0; i--) stops[i](); };
}

export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-m=page]");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop: Stop | null = null;
    const sync = () => {
      const off = reduce.matches || document.documentElement.dataset.paused === "true";
      if (off && stop) { stop(); stop = null; }
      if (!off && !stop) stop = setup(root);
    };
    sync();
    reduce.addEventListener("change", sync);
    const watch = new MutationObserver(sync);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-paused"] });
    return () => { reduce.removeEventListener("change", sync); watch.disconnect(); stop?.(); };
  }, []);
  return null;
}
