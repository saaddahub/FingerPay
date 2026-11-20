import { test } from "node:test";
import assert from "node:assert/strict";
import { camera, endZoom, segment, SEG, type CameraInput } from "./camera.ts";
import { AIM, RIDGES, ridgeY } from "./ridges.ts";

type Aim = { x: number; y: number; band: number; curvature: number };
const input = (aim: Aim = AIM.ridge, w = 1440, h = 900): CameraInput => ({
  coinCentre: { x: 720, y: 560 },
  coinDiameter: 78,
  aim: { x: aim.x, y: aim.y },
  bandUnits: aim.band,
  curvature: aim.curvature,
  viewport: { w, h },
});
const at = (u: number) => SEG.settleEnd + u * (SEG.diveEnd - SEG.settleEnd);

test("aim points sit where the spec says", () => {
  assert.ok(Math.abs(AIM.ridge.y - -13.1) < 1e-9);
  assert.ok(Math.abs(AIM.gap.y - -10.15) < 1e-9);
  assert.ok(Math.abs(AIM.gap.band - 3.8) < 1e-9);
});

test("zoom starts at k0, ends at kEnd, and only grows", () => {
  const m = input();
  const k0 = 78 / 48;
  const kEnd = endZoom(m);
  assert.ok(kEnd > (1.15 * 900) / RIDGES.width); // curvature always asks for more than the flat estimate
  assert.ok(Math.abs(camera(0, m).k - k0) < 1e-9);
  assert.ok(Math.abs(camera(1, m).k - kEnd) < 1e-6);
  let prev = 0;
  for (let i = 0; i <= 200; i++) {
    const k = camera(i / 200, m).k;
    assert.ok(k >= prev - 1e-9);
    prev = k;
  }
});

test("log-space zoom: near-constant rate through the middle of the dive", () => {
  const m = input();
  const rate = (u: number) => (Math.log(camera(at(u + 1e-4), m).k) - Math.log(camera(at(u), m).k)) / 1e-4;
  const rates = [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65].map(rate);
  const max = Math.max(...rates);
  const min = Math.min(...rates);
  assert.ok((max - min) / max < 0.12, `rate varies ${((max - min) / max * 100).toFixed(1)} %`);
});

test("the aim point is centred from 35 % of the dive on, and the coin centre tracks it", () => {
  const m = input();
  for (const u of [0.35, 0.6, 1]) {
    const c = camera(at(u), m);
    assert.ok(Math.abs(c.Q.x - 720) < 1e-6 && Math.abs(c.Q.y - 450) < 1e-6);
    assert.ok(Math.abs(c.origin.x + c.k * m.aim.x - c.Q.x) < 1e-6);
  }
});

const SIZES = [[1440, 900], [390, 844], [844, 390], [2560, 1440], [3440, 1440]] as const;

test("at the end of the dive the ridge's ink covers the whole viewport, edge to edge", () => {
  for (const [w, h] of SIZES) {
    const m = input(AIM.ridge, w, h);
    const c = camera(1, m);
    for (let px = -w / 2; px <= w / 2; px += w / 40) {
      const x = AIM.ridge.x + px / c.k; // coin units under this screen column
      const centre = ridgeY(4, x);
      const top = (centre - RIDGES.width / 2 - AIM.ridge.y) * c.k; // screen px relative to the middle
      const bottom = (centre + RIDGES.width / 2 - AIM.ridge.y) * c.k;
      assert.ok(top <= -h / 2 && bottom >= h / 2, `uncovered at ${w}×${h}, column ${px.toFixed(0)}`);
    }
  }
});

test("on a dark screen the gap between ridges 4 and 5 covers the viewport instead", () => {
  for (const [w, h] of SIZES) {
    const m = input(AIM.gap, w, h);
    const c = camera(1, m);
    for (let px = -w / 2; px <= w / 2; px += w / 40) {
      const x = AIM.gap.x + px / c.k;
      const top = (ridgeY(4, x) + RIDGES.width / 2 - AIM.gap.y) * c.k; // ridge 5's lower edge
      const bottom = (ridgeY(3, x) - RIDGES.width / 2 - AIM.gap.y) * c.k; // ridge 4's upper edge
      assert.ok(top <= -h / 2 && bottom >= h / 2, `gap uncovered at ${w}×${h}, column ${px.toFixed(0)}`);
    }
  }
});

test("segment hysteresis keeps a word on screen while hovering on its boundary", () => {
  let s = segment(0.3, -1);
  assert.equal(s, -1);
  s = segment(0.47, s);
  assert.equal(s, 0);
  s = segment(0.5, s);
  assert.equal(s, 1);
  s = segment(0.495, s); // just under the threshold: stay on Instant
  assert.equal(s, 1);
  s = segment(0.491, s); // past the hysteresis band: back to inside
  assert.equal(s, 0);
  assert.equal(segment(0.9, 0), 3);
  assert.equal(segment(0.1, 3), -1);
});
