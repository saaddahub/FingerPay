import type { Kysely, Transaction } from 'kysely';
import type { Database } from './types.gen.js';

export type DbOrTx = Kysely<Database> | Transaction<Database>;

/**
 * Runs `fn` inside a database transaction. If `conn` is already a `Transaction`, reuses it so
 * multi-module use cases execute atomically in a single round of locks.
 */
export async function withTransaction<T>(
  conn: DbOrTx,
  fn: (tx: Transaction<Database>) => Promise<T>,
): Promise<T> {
  if (conn.isTransaction) {
    return fn(conn as Transaction<Database>);
  }
  return (conn as Kysely<Database>).transaction().execute(fn);
}
