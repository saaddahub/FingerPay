import { randomBytes } from 'node:crypto';

export interface Keyring {
  activeVersion: number;
  keys: Map<number, Buffer>;
}

export interface RawKeyringJson {
  active: number;
  keys: Record<string, string>; // version -> base64
}

/**
 * Parses a versioned keyring JSON string (e.g. `{"active":1,"keys":{"1":"<base64 32B>"}}`)
 * or a single raw 32-byte base64 string.
 */
export function parseKeyring(input: string): Keyring {
  const trimmed = input.trim();
  const keys = new Map<number, Buffer>();

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as RawKeyringJson;
    if (typeof parsed.active !== 'number' || !parsed.keys || typeof parsed.keys !== 'object') {
      throw new Error('Invalid keyring JSON format');
    }

    for (const [verStr, b64] of Object.entries(parsed.keys)) {
      const ver = parseInt(verStr, 10);
      if (isNaN(ver) || ver < 1 || ver > 65535) {
        throw new Error(`Keyring version must be between 1 and 65535, got: ${verStr}`);
      }
      const buf = Buffer.from(b64, 'base64');
      if (buf.length !== 32) {
        throw new Error(`Key version ${ver} must be exactly 32 bytes, got ${buf.length}`);
      }
      keys.set(ver, buf);
    }

    if (!keys.has(parsed.active)) {
      throw new Error(`Active key version ${parsed.active} not found in keyring`);
    }

    return { activeVersion: parsed.active, keys };
  }

  // Single base64 key
  const buf = Buffer.from(trimmed, 'base64');
  if (buf.length !== 32) {
    throw new Error(`Single key must be 32 bytes base64, got ${buf.length}`);
  }
  keys.set(1, buf);
  return { activeVersion: 1, keys };
}

/**
 * Generates an ephemeral 32-byte dev keyring (useful for unit tests).
 */
export function createDevKeyring(): Keyring {
  const key = randomBytes(32);
  const keys = new Map<number, Buffer>();
  keys.set(1, key);
  return { activeVersion: 1, keys };
}
