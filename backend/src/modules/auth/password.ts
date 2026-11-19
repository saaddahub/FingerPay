import { hash, verify } from '@node-rs/argon2';

/**
 * SPEC §4.1: Passwords hashed with Argon2id.
 */
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, {
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}
