import { createHash } from 'node:crypto';
import { sql, type Kysely } from 'kysely';
import type { DbOrTx } from '../../platform/db/tx.js';
import type { Database } from '../../platform/db/types.gen.js';

export interface RecordAuditInput {
  actorType: 'STAFF' | 'TERMINAL' | 'SHOPPER_SMS' | 'SYSTEM';
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
}

/**
 * Appends a tamper-evident audit event. The Postgres `BEFORE INSERT` trigger
 * `fp.trg_audit_compute_hash` links `prev_hash` and computes `row_hash = sha256(...)`.
 */
export async function recordAuditEvent(conn: DbOrTx, input: RecordAuditInput): Promise<void> {
  await conn
    .insertInto('fp.audit_events')
    .values({
      actor_type: input.actorType,
      actor_id: input.actorId,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId,
      details: input.details ?? {},
    })
    .execute();
}

/**
 * SPEC §3 T9 & §4.2: Verifies both the SHA-256 hash chain across `fp.audit_events`
 * and double-entry ledger balance invariants across `fp.journals` and `fp.accounts`.
 */
export async function verifyAuditAndLedgerIntegrity(db: Kysely<Database>) {
  const events = await db
    .selectFrom('fp.audit_events')
    .select([
      'id',
      'occurred_at',
      'actor_type',
      'actor_id',
      'action',
      'entity',
      'entity_id',
      sql<string>`details::text`.as('details_text'),
      'prev_hash',
      'row_hash',
    ])
    .orderBy('id', 'asc')
    .execute();

  let expectedPrev = '0'.repeat(64);
  let brokenAtId: string | null = null;

  for (const ev of events) {
    const canonical = [
      expectedPrev,
      ev.actor_type,
      ev.actor_id,
      ev.action,
      ev.entity,
      ev.entity_id,
      ev.details_text,
    ].join('|');
    const expectedHash = createHash('sha256').update(canonical, 'utf8').digest('hex');

    if (ev.prev_hash !== expectedPrev || ev.row_hash !== expectedHash) {
      brokenAtId = String(ev.id);
      break;
    }
    expectedPrev = ev.row_hash;
  }

  const headHash = events.length > 0 ? events.at(-1)!.row_hash : null;

  const totalJournalsRow = await db
    .selectFrom('fp.journals')
    .select(sql<number>`COUNT(*)::int`.as('cnt'))
    .executeTakeFirstOrThrow();

  const unbalancedRow = await sql<{ cnt: number }>`
    SELECT COUNT(*)::int AS cnt FROM (
      SELECT journal_id, book_institution_id
        FROM fp.journal_entries
       GROUP BY journal_id, book_institution_id
      HAVING SUM(amount) <> 0
    ) u
  `.execute(db);

  const mismatchedRow = await sql<{ cnt: number }>`
    SELECT COUNT(*)::int AS cnt
      FROM fp.accounts a
      LEFT JOIN (
        SELECT account_id, COALESCE(SUM(amount), 0.00) AS entry_sum
          FROM fp.journal_entries
         GROUP BY account_id
      ) e ON e.account_id = a.id
     WHERE a.balance <> COALESCE(e.entry_sum, 0.00)
  `.execute(db);

  const unbalancedJournals = unbalancedRow.rows[0]?.cnt ?? 0;
  const mismatchedAccounts = mismatchedRow.rows[0]?.cnt ?? 0;
  const auditOk = brokenAtId === null;
  const ledgerOk = unbalancedJournals === 0 && mismatchedAccounts === 0;

  return {
    ok: auditOk && ledgerOk,
    checkedAt: new Date().toISOString(),
    auditChain: {
      ok: auditOk,
      totalEvents: events.length,
      headHash,
      brokenAtId,
    },
    ledgerReconciliation: {
      ok: ledgerOk,
      totalJournals: totalJournalsRow.cnt,
      unbalancedJournals,
      mismatchedAccounts,
    },
  };
}
