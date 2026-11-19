import { randomBytes } from 'node:crypto';

export function generateRaastReference(now: Date = new Date()): string {
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = randomBytes(6).toString('hex').toUpperCase();
  return `RAAST-${ymd}-${rand}`;
}
