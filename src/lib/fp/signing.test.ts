import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign, verify } from "node:crypto";
import { signedString } from "./signing.ts";

// The Android app signs exactly this string with its Keystore key (SPEC §4.5); a mismatch is a 401.
test("signed string matches the SPEC §4.5 layout", () => {
  const s = signedString("post", "/api/v1/pos/charges?x=1", "0f8c6c2e-7b1d-4c39-9d7e-0a1b2c3d4e5f", "2026-11-20T10:00:00.000Z", "AAAAAAAAAAAAAAAAAAAAAA", '{"amount":"180.00"}');
  const lines = s.split("\n");
  assert.equal(lines.length, 7);
  assert.deepEqual(lines.slice(0, 6), ["FPv1", "POST", "/api/v1/pos/charges?x=1", "0f8c6c2e-7b1d-4c39-9d7e-0a1b2c3d4e5f", "2026-11-20T10:00:00.000Z", "AAAAAAAAAAAAAAAAAAAAAA"]);
  assert.match(lines[6], /^[A-Za-z0-9_-]{43}$/); // base64url SHA-256, no padding
});

test("empty body hashes like the app's empty body", () => {
  const a = signedString("GET", "/api/v1/terminals/self", "t", "ts", "n", "");
  assert.ok(a.endsWith("47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU"));
});

test("P-256 IEEE-P1363 signatures verify, tampering fails", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const msg = Buffer.from(signedString("POST", "/api/v1/pos/charges", "t", "ts", randomBytes(16).toString("base64url"), '{"amount":"1"}'));
  const sig = sign("sha256", msg, { key: privateKey, dsaEncoding: "ieee-p1363" });
  assert.equal(sig.length, 64);
  assert.ok(verify("sha256", msg, { key: publicKey, dsaEncoding: "ieee-p1363" }, sig));
  msg[msg.length - 1] ^= 1;
  assert.ok(!verify("sha256", msg, { key: publicKey, dsaEncoding: "ieee-p1363" }, sig));
  // The DB accepts exactly this SPKI shape: 91 bytes with the fixed P-256 prefix.
  const spki = publicKey.export({ type: "spki", format: "der" });
  assert.equal(spki.length, 91);
  assert.equal(spki.subarray(0, 27).toString("hex"), "3059301306072a8648ce3d020106082a8648ce3d03010703420004");
});
