import { type Paisa, formatAmount, paisa, parseAmount } from '@fingerpay/contracts';

/**
 * Converts a Postgres `numeric(14,2)` column string (which may be signed for journal entries)
 * into an exact `Paisa` bigint without ever passing through a JavaScript number.
 */
export function pgNumericToPaisa(raw: string): Paisa {
  const trimmed = raw.trim();
  if (trimmed.startsWith('-')) {
    const abs = parseAmount(trimmed.slice(1));
    return paisa(-abs);
  }
  return parseAmount(trimmed);
}

/**
 * Formats an exact `Paisa` bigint back into a Postgres `numeric(14,2)` literal ("180.00").
 */
export function paisaToPgNumeric(value: Paisa | bigint): string {
  return formatAmount(value);
}
