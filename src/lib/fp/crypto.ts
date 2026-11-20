// FingerPay server crypto (SPEC §4.3). Pure functions over Node's built-in crypto; keys are passed
// in (from env.ts in the app, from the env file in scripts) and never enter the database.
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

const FORMAT = 0x01;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

export type Keyring = { active: number; keys: Map<number, Buffer> };

// What a ciphertext is bound to: copying a blob to another row or column makes decryption fail.
// accounts rows are bound to their owner (customer_id / merchant_id): the account row id is only
// created inside fp.api_enroll_customer, after encryption.
export type Aad = { table: "customers" | "accounts"; column: string; rowId: string };

const aadBytes = ({ table, column, rowId }: Aad) => Buffer.from(`fp:v1:${table}:${column}:${rowId}`, "utf8");

function key32(b64: string, what: string): Buffer {
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error(`${what} must be 32 bytes of base64`);
  return k;
}

export function parseKeyring(json: string): Keyring {
  const raw = JSON.parse(json) as { active?: unknown; keys?: Record<string, unknown> };
  if (!Number.isInteger(raw.active) || !raw.keys || typeof raw.keys !== "object") throw new Error("FP_KEYRING is malformed");
  const keys = new Map<number, Buffer>();
  for (const [v, b64] of Object.entries(raw.keys)) {
    const version = Number(v);
    if (!Number.isInteger(version) || version < 1 || version > 0xffff || typeof b64 !== "string") throw new Error("FP_KEYRING is malformed");
    keys.set(version, key32(b64, `FP_KEYRING key ${version}`));
  }
  if (!keys.has(raw.active as number)) throw new Error("FP_KEYRING active key is missing");
  return { active: raw.active as number, keys };
}

export const parseKey32 = key32;

// 0x01 | key version (2 B, big-endian) | nonce (12 B) | ciphertext | tag (16 B)
export function encryptPii(keyring: Keyring, plaintext: string, aad: Aad): Buffer {
  if (!plaintext) throw new Error("refusing to encrypt an empty value");  // the DB requires >= 32-byte blobs
  const key = keyring.keys.get(keyring.active)!;
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce).setAAD(aadBytes(aad));
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const header = Buffer.alloc(3);
  header[0] = FORMAT;
  header.writeUInt16BE(keyring.active, 1);
  return Buffer.concat([header, nonce, body, cipher.getAuthTag()]);
}

export function decryptPii(keyring: Keyring, blob: Buffer, aad: Aad): string {
  if (blob.length < 3 + NONCE_BYTES + 1 + TAG_BYTES || blob[0] !== FORMAT) throw new Error("not a FingerPay ciphertext");
  const key = keyring.keys.get(blob.readUInt16BE(1));
  if (!key) throw new Error("ciphertext key version is not in the keyring");
  const nonce = blob.subarray(3, 3 + NONCE_BYTES);
  const tag = blob.subarray(blob.length - TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce).setAAD(aadBytes(aad)).setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(3 + NONCE_BYTES, blob.length - TAG_BYTES)), decipher.final()]).toString("utf8");
}

// One HKDF subkey per purpose, so the lookup key is never used for two things.
const subkey = (lookupKey: Buffer, label: string) => Buffer.from(hkdfSync("sha256", lookupKey, Buffer.alloc(0), `fingerpay:${label}`, 32));
const hmac = (key: Buffer, data: Buffer | string) => createHmac("sha256", key).update(data).digest();

export const THUMB_KEY_VERSION = 1;

export function normalizeCnic(cnic: string): string {
  const digits = cnic.replace(/-/g, "");
  if (!/^\d{13}$/.test(digits)) throw new Error("CNIC must be 13 digits");
  return digits;
}

export function normalizeAccountNo(accountNo: string): string {
  const v = accountNo.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9-]{6,34}$/.test(v)) throw new Error("account number is malformed");
  return v;
}

export const cnicIndex = (lookupKey: Buffer, cnic: string) => hmac(subkey(lookupKey, "cnic-idx-v1"), normalizeCnic(cnic));
export const accountIndex = (lookupKey: Buffer, accountNo: string) => hmac(subkey(lookupKey, "account-idx-v1"), normalizeAccountNo(accountNo));

// The database stores only HMAC(K_thumb, capture token); the token itself is never stored or logged.
export function thumbLookup(lookupKey: Buffer, token: Buffer): Buffer {
  if (token.length < 16) throw new Error("thumb token too short");
  return hmac(subkey(lookupKey, "thumb-v1"), token);
}

// Simulation only (FP_DEMO_MODE): the "finger" for a customer is derived from the demo key.
export const demoThumbToken = (demoKey: Buffer, customerId: string) => hmac(demoKey, "cust:" + customerId);

export const last4 = (value: string) => value.replace(/\D/g, "").slice(-4);
