import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import {
  accountIndex, cnicIndex, decryptPii, demoThumbToken, encryptPii, parseKeyring, thumbLookup, type Aad,
} from "./crypto.ts";

const k = () => randomBytes(32).toString("base64");
const ring = parseKeyring(JSON.stringify({ active: 1, keys: { 1: k() } }));
const aad: Aad = { table: "customers", column: "cnic_enc", rowId: randomUUID() };

test("encrypt/decrypt round trip, DB format", () => {
  const blob = encryptPii(ring, "35202-1122334-6", aad);
  assert.equal(blob[0], 1);
  assert.equal(blob.readUInt16BE(1), 1);
  assert.ok(blob.length >= 32 && blob.length <= 2048);  // fp.customers CHECK
  assert.equal(decryptPii(ring, blob, aad), "35202-1122334-6");
  assert.ok(encryptPii(ring, "x", aad).length >= 32);
});

test("ciphertext is bound to its row and column", () => {
  const blob = encryptPii(ring, "secret", aad);
  assert.throws(() => decryptPii(ring, blob, { ...aad, rowId: randomUUID() }));
  assert.throws(() => decryptPii(ring, blob, { ...aad, column: "phone_enc" }));
});

test("tampering is detected", () => {
  const blob = encryptPii(ring, "secret", aad);
  blob[blob.length - 20] ^= 1;
  assert.throws(() => decryptPii(ring, blob, aad));
});

test("rotation: old blobs still decrypt after a new active key", () => {
  const v1 = k();
  const old = parseKeyring(JSON.stringify({ active: 1, keys: { 1: v1 } }));
  const blob = encryptPii(old, "secret", aad);
  const rotated = parseKeyring(JSON.stringify({ active: 2, keys: { 1: v1, 2: k() } }));
  assert.equal(decryptPii(rotated, blob, aad), "secret");
  assert.equal(encryptPii(rotated, "secret", aad).readUInt16BE(1), 2);
});

test("keyring and input validation fail closed", () => {
  assert.throws(() => parseKeyring(JSON.stringify({ active: 2, keys: { 1: k() } })));
  assert.throws(() => parseKeyring(JSON.stringify({ active: 1, keys: { 1: "c2hvcnQ=" } })));
  assert.throws(() => encryptPii(ring, "", aad));
  assert.throws(() => cnicIndex(randomBytes(32), "12345"));
});

test("blind indexes normalize and are purpose-separated", () => {
  const lk = randomBytes(32);
  assert.deepEqual(cnicIndex(lk, "35202-1122334-6"), cnicIndex(lk, "3520211223346"));
  assert.deepEqual(accountIndex(lk, " abl-sal-998877665 "), accountIndex(lk, "ABL-SAL-998877665"));
  assert.equal(cnicIndex(lk, "3520211223346").length, 32);
  const token = Buffer.from("3520211223346");
  assert.notDeepEqual(thumbLookup(lk, Buffer.concat([token, token])), cnicIndex(lk, "3520211223346"));
});

test("demo thumb derivation matches supabase/tests/fp_db.test.mjs", () => {
  const demo = randomBytes(32), lk = randomBytes(32), id = randomUUID();
  const token = createHmac("sha256", demo).update("cust:" + id).digest();
  assert.deepEqual(demoThumbToken(demo, id), token);
  assert.equal(thumbLookup(lk, token).length, 32);
});
