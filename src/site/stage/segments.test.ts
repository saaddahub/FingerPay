import { test } from "node:test";
import assert from "node:assert/strict";
import { segment } from "./segments.ts";
import { AIM } from "./ridges.ts";

test("aim points sit where the spec says", () => {
  assert.ok(Math.abs(AIM.ridge.y - -13.1) < 1e-9);
  assert.ok(Math.abs(AIM.gap.y - -10.15) < 1e-9);
  assert.ok(Math.abs(AIM.gap.band - 3.8) < 1e-9);
});

test("leaving the hero lands straight on Instant, never on an empty inside", () => {
  assert.equal(segment(0.02, -1), -1);
  assert.equal(segment(0.03, -1), 1);
  assert.equal(segment(0.5, -1), 2);
});

test("segment hysteresis keeps a word on screen while hovering on its boundary", () => {
  let s = segment(0.36, 1);
  assert.equal(s, 2);
  s = segment(0.355, s); // just under the threshold: stay on Private
  assert.equal(s, 2);
  s = segment(0.351, s); // past the hysteresis band: back to Instant
  assert.equal(s, 1);
  assert.equal(segment(0.9, 1), 3);
  assert.equal(segment(0.025, 1), 1); // inside the band above the hero: hold
  assert.equal(segment(0.02, 1), -1); // below it: back to the hero
});
