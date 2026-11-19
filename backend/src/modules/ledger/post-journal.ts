import { randomUUID } from 'node:crypto';
import type { Paisa } from '@fingerpay/contracts';
import { AppError } from '../../platform/errors/app-error.js';
import { paisaToPgNumeric, pgNumericToPaisa } from '../../platform/db/money-codec.js';
import type { DbOrTx } from '../../platform/db/tx.js';
import type { AccountKind, JournalKind } from '../../platform/db/types.gen.js';

export interface JournalEntryDraft {
  bookInstitutionId: string;
  accountId: string;
  /** Signed exact amount in paisa (negative = debit/outflow, positive = credit/inflow). */
  amount: Paisa | bigint;
}

export interface PostJournalInput {
  kind: JournalKind;
  refType: string;
  refId: string;
  memo?: string;
  entries: JournalEntryDraft[];
}

/**
 * SPEC §3 T8 & §4.2: Double-entry ledger poster.
 * 1. Verifies entries are non-empty and sum to zero per bookInstitutionId before hitting the DB.
 * 2. Locks all touched SYNC accounts in deterministic ascending UUID order (`FOR UPDATE`) to prevent deadlocks.
 * 3. Inserts the journal and entries; the database's own `AFTER INSERT` trigger updates `accounts.balance`
 *    and the deferred constraint trigger re-verifies zero-sum balance at `COMMIT`.
 */
export async function postJournal(conn: DbOrTx, input: PostJournalInput): Promise<string> {
  const nonZero = input.entries.filter((e) => e.amount !== 0n);
  if (nonZero.length < 2) {
    throw new AppError('BAD_REQUEST', 'Journal requires at least two non-zero entries');
  }

  const byBook = new Map<string, bigint>();
  for (const entry of nonZero) {
    byBook.set(
      entry.bookInstitutionId,
      (byBook.get(entry.bookInstitutionId) ?? 0n) + entry.amount,
    );
  }
  for (const [bookId, sum] of byBook.entries()) {
    if (sum !== 0n) {
      throw new AppError('BAD_REQUEST', `Unbalanced journal leg for book ${bookId}: net ${sum}`);
    }
  }

  // Deterministic lock order on touched accounts to prevent AB/BA deadlocks under concurrency.
  const uniqueAccountIds = [...new Set(nonZero.map((e) => e.accountId))].sort();
  await conn
    .selectFrom('fp.accounts')
    .select(['id', 'balance', 'status'])
    .where('id', 'in', uniqueAccountIds)
    .orderBy('id', 'asc')
    .forUpdate()
    .execute();

  const journalId = randomUUID();
  await conn
    .insertInto('fp.journals')
    .values({
      id: journalId,
      kind: input.kind,
      ref_type: input.refType,
      ref_id: input.refId,
      memo: input.memo ?? null,
    })
    .execute();

  await conn
    .insertInto('fp.journal_entries')
    .values(
      nonZero.map((e) => ({
        id: randomUUID(),
        journal_id: journalId,
        book_institution_id: e.bookInstitutionId,
        account_id: e.accountId,
        amount: paisaToPgNumeric(e.amount),
      })),
    )
    .execute();

  return journalId;
}

export async function getOrCreateSystemAccount(
  conn: DbOrTx,
  bookInstitutionId: string,
  kind: Exclude<AccountKind, 'CUSTOMER_CASA' | 'MERCHANT_CASA'>,
  bucket = 0,
): Promise<{ id: string; balance: Paisa }> {
  const existing = await conn
    .selectFrom('fp.accounts')
    .select(['id', 'balance'])
    .where('book_institution_id', '=', bookInstitutionId)
    .where('owner_type', '=', 'SYSTEM')
    .where('kind', '=', kind)
    .where('bucket', '=', bucket)
    .executeTakeFirst();

  if (existing) {
    return { id: existing.id, balance: pgNumericToPaisa(existing.balance) };
  }

  const id = randomUUID();
  const balanceMode =
    kind === 'MARKETING_POOL' || kind === 'OPENING_EQUITY' ? 'SYNC' : 'ASYNC';

  await conn
    .insertInto('fp.accounts')
    .values({
      id,
      book_institution_id: bookInstitutionId,
      owner_type: 'SYSTEM',
      owner_id: null,
      kind,
      bucket,
      account_no_enc: null,
      account_no_hmac: null,
      balance_mode: balanceMode,
      status: 'ACTIVE',
    })
    .execute();

  return { id, balance: pgNumericToPaisa('0.00') };
}
