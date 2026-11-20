import { test } from "node:test";
import assert from "node:assert/strict";
import { formatStep, toUnits } from "./count.ts";

test("counts through hundredths only and lands exactly", () => {
  const { units, decimals } = toUnits("0.45");
  assert.deepEqual([units, decimals], [45, 2]);
  for (let u = 0; u <= units; u++) assert.match(formatStep(u, decimals), /^0\.\d{2}$/);
  assert.equal(formatStep(units, decimals), "0.45");
});

test("thousands keep their separator and no decimals", () => {
  const { units, decimals } = toUnits("5,000");
  assert.equal(formatStep(units, decimals), "5,000");
  assert.equal(formatStep(units * 0.5, decimals), "2,500");
  assert.equal(formatStep(3.4, 0), "3");
});
