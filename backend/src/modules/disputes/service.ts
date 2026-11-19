import { randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { AppError } from '../../platform/errors/app-error.js';
import { pgNumericToPaisa } from '../../platform/db/money-codec.js';
import { withTransaction, type DbOrTx } from '../../platform/db/tx.js';
import type { Database } from '../../platform/db/types.gen.js';
import { recordAuditEvent } from '../audit/service.js';
import { postJournal, type JournalEntryDraft } from '../ledger/post-journal.js';
import { sendSms } from '../notifications/sms.js';
import { currentKarachiDateAndMonth } from '../payments/service.js';

export class DisputeAndReversalService {
  constructor(private readonly db: Kysely<Database>) {}

  /**
   * Posts an exact mirror journal of the original payment (and any referral bonus it triggered),
   * reversing all legs (on-us or 3-leg off-us) and paying back ONLY the original payer (SPEC T6).
   */
  private async postMirrorReversalJournal(
    tx: DbOrTx,
    attemptId: string,
    originalJournalId: string,
    kind: 'VOID' | 'REFUND',
    reversalId: string,
    memo: string,
  ): Promise<string> {
    const origEntries = await tx
      .selectFrom('fp.journal_entries')
      .selectAll()
      .where('journal_id', '=', originalJournalId)
      .execute();

    // Also include any referral bonus journal triggered by this attempt (SPEC §6.2 clawback)
    const referralJournals = await tx
      .selectFrom('fp.journals')
      .select('id')
      .where('kind', '=', 'REFERRAL')
      .where('ref_type', '=', 'PAYMENT_ATTEMPT')
      .where('ref_id', '=', attemptId)
      .execute();

    const refEntryRows =
      referralJournals.length > 0
        ? await tx
            .selectFrom('fp.journal_entries')
            .selectAll()
            .where(
              'journal_id',
              'in',
              referralJournals.map((j) => j.id),
            )
            .execute()
        : [];

    const allOriginal = [...origEntries, ...refEntryRows];
    const drafts: JournalEntryDraft[] = allOriginal.map((e) => ({
      bookInstitutionId: e.book_institution_id,
      accountId: e.account_id,
      amount: -pgNumericToPaisa(e.amount),
    }));

    return postJournal(tx, {
      kind,
      refType: 'REVERSAL',
      refId: reversalId,
      memo,
      entries: drafts,
    });
  }

  /**
   * SPEC §5 View B & T6: Same-day void by store owner only.
   */
  async voidSameDaySale(params: {
    attemptId: string;
    merchantId: string;
    ownerId: string;
    reason: string;
  }) {
    return withTransaction(this.db, async (tx) => {
      const attempt = await tx
        .selectFrom('fp.payment_attempts')
        .selectAll()
        .where('id', '=', params.attemptId)
        .forUpdate()
        .executeTakeFirst();

      if (!attempt || attempt.merchant_id !== params.merchantId) {
        throw new AppError('NOT_FOUND', 'Payment sale not found for this store');
      }
      if (attempt.outcome !== 'SUCCESS' || !attempt.journal_id || !attempt.customer_id) {
        throw new AppError('BAD_REQUEST', 'Only settled sales can be voided');
      }

      const saleDay = currentKarachiDateAndMonth(new Date(attempt.created_at)).dayPkt;
      const today = currentKarachiDateAndMonth(new Date()).dayPkt;
      if (saleDay !== today) {
        throw new AppError('BAD_REQUEST', 'Only same-day sales (Asia/Karachi) can be voided');
      }

      const existing = await tx
        .selectFrom('fp.reversals')
        .select('id')
        .where('attempt_id', '=', attempt.id)
        .where('status', 'in', ['PENDING_CHECKER', 'APPROVED'])
        .executeTakeFirst();

      if (existing) {
        throw new AppError('CONFLICT', 'A reversal already exists for this sale');
      }

      const reversalId = randomUUID();
      const journalId = await this.postMirrorReversalJournal(
        tx,
        attempt.id,
        attempt.journal_id,
        'VOID',
        reversalId,
        `Same-day owner void: ${params.reason}`,
      );

      await tx
        .insertInto('fp.reversals')
        .values({
          id: reversalId,
          attempt_id: attempt.id,
          kind: 'VOID',
          amount: attempt.gross,
          reason: params.reason,
          maker_id: params.ownerId,
          checker_id: null,
          status: 'APPROVED',
          journal_id: journalId,
          decision_reason: 'Same-day owner void',
          decided_at: new Date(),
        })
        .execute();

      const customer = await tx
        .selectFrom('fp.customers')
        .select(['id', 'phone_hmac', 'phone_last4'])
        .where('id', '=', attempt.customer_id)
        .executeTakeFirst();

      if (customer) {
        const phoneHmac = Buffer.isBuffer(customer.phone_hmac)
          ? customer.phone_hmac
          : Buffer.from(customer.phone_hmac);
        await sendSms(tx, {
          customerId: customer.id,
          phoneHmac,
          phoneLast4: customer.phone_last4,
          template: 'REFUND_DECISION',
          body: `FingerPay: Your PKR ${attempt.gross} sale was voided by the store and refunded to your account.`,
          relatedAttemptId: attempt.id,
        });
      }

      await recordAuditEvent(tx, {
        actorType: 'STAFF',
        actorId: params.ownerId,
        action: 'SALE_VOIDED',
        entity: 'reversal',
        entityId: reversalId,
        details: { attemptId: attempt.id, amount: attempt.gross, reason: params.reason },
      });

      return {
        reversalId,
        attemptId: attempt.id,
        journalId,
        amount: attempt.gross,
        status: 'APPROVED' as const,
      };
    });
  }

  async listDisputes(institutionId: string | null) {
    let q = this.db
      .selectFrom('fp.disputes as d')
      .innerJoin('fp.payment_attempts as a', 'a.id', 'd.attempt_id')
      .innerJoin('fp.customers as c', 'c.id', 'd.customer_id')
      .leftJoin('fp.reversals as r', 'r.id', 'd.reversal_id')
      .select([
        'd.id',
        'd.ticket',
        'd.attempt_id',
        'c.display_name',
        'c.phone_last4',
        'a.gross',
        'd.source',
        'd.reason',
        'd.status',
        'd.reversal_id',
        'r.maker_id',
        'r.checker_id',
        'd.created_at',
      ])
      .orderBy('d.created_at', 'desc');

    if (institutionId) {
      q = q.where('c.institution_id', '=', institutionId);
    }

    const rows = await q.execute();
    return rows.map((r) => ({
      id: r.id,
      ticket: r.ticket,
      attemptId: r.attempt_id,
      shopperDisplayName: r.display_name,
      phoneLast4: r.phone_last4,
      amount: r.gross,
      source: r.source,
      reason: r.reason,
      status: r.status,
      reversalId: r.reversal_id,
      makerId: r.maker_id ?? null,
      checkerId: r.checker_id ?? null,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * SPEC §4.1 & T6: Maker requests a refund on an open dispute.
   */
  async requestRefund(params: { disputeId: string; makerId: string; reason: string }) {
    return withTransaction(this.db, async (tx) => {
      const dispute = await tx
        .selectFrom('fp.disputes')
        .selectAll()
        .where('id', '=', params.disputeId)
        .forUpdate()
        .executeTakeFirst();

      if (!dispute) {
        throw new AppError('NOT_FOUND', 'Dispute ticket not found');
      }
      if (dispute.status !== 'OPEN') {
        throw new AppError('CONFLICT', `Dispute is already in state ${dispute.status}`);
      }

      const attempt = await tx
        .selectFrom('fp.payment_attempts')
        .selectAll()
        .where('id', '=', dispute.attempt_id)
        .executeTakeFirstOrThrow();

      const reversalId = randomUUID();
      await tx
        .insertInto('fp.reversals')
        .values({
          id: reversalId,
          attempt_id: attempt.id,
          kind: 'REFUND',
          amount: attempt.gross,
          reason: params.reason,
          maker_id: params.makerId,
          checker_id: null,
          status: 'PENDING_CHECKER',
          journal_id: null,
          decision_reason: null,
          decided_at: null,
        })
        .execute();

      await tx
        .updateTable('fp.disputes')
        .set({
          status: 'REFUND_REQUESTED',
          reversal_id: reversalId,
        })
        .where('id', '=', dispute.id)
        .execute();

      await recordAuditEvent(tx, {
        actorType: 'STAFF',
        actorId: params.makerId,
        action: 'REFUND_REQUESTED',
        entity: 'reversal',
        entityId: reversalId,
        details: { disputeId: dispute.id, ticket: dispute.ticket, amount: attempt.gross },
      });

      return {
        reversalId,
        disputeId: dispute.id,
        status: 'PENDING_CHECKER' as const,
      };
    });
  }

  /**
   * SPEC §4.1 & T6: Checker (must differ from maker) approves or rejects a pending refund.
   */
  async decideRefund(params: {
    reversalId: string;
    checkerId: string;
    decision: 'APPROVE' | 'REJECT';
    reason: string;
  }) {
    return withTransaction(this.db, async (tx) => {
      const reversal = await tx
        .selectFrom('fp.reversals')
        .selectAll()
        .where('id', '=', params.reversalId)
        .forUpdate()
        .executeTakeFirst();

      if (!reversal) {
        throw new AppError('NOT_FOUND', 'Refund request not found');
      }
      if (reversal.status !== 'PENDING_CHECKER') {
        throw new AppError('CONFLICT', `Refund already decided (${reversal.status})`);
      }
      if (reversal.maker_id === params.checkerId) {
        throw new AppError(
          'FORBIDDEN',
          'Maker-checker violation: maker cannot approve or reject their own refund request',
        );
      }

      const attempt = await tx
        .selectFrom('fp.payment_attempts')
        .selectAll()
        .where('id', '=', reversal.attempt_id)
        .executeTakeFirstOrThrow();

      const dispute = await tx
        .selectFrom('fp.disputes')
        .selectAll()
        .where('reversal_id', '=', reversal.id)
        .forUpdate()
        .executeTakeFirst();

      if (params.decision === 'REJECT') {
        await tx
          .updateTable('fp.reversals')
          .set({
            status: 'REJECTED',
            checker_id: params.checkerId,
            decision_reason: params.reason,
            decided_at: new Date(),
          })
          .where('id', '=', reversal.id)
          .execute();

        if (dispute) {
          await tx
            .updateTable('fp.disputes')
            .set({ status: 'OPEN', reversal_id: null })
            .where('id', '=', dispute.id)
            .execute();
        }

        await recordAuditEvent(tx, {
          actorType: 'STAFF',
          actorId: params.checkerId,
          action: 'REFUND_REJECTED',
          entity: 'reversal',
          entityId: reversal.id,
          details: { reason: params.reason },
        });

        return {
          reversalId: reversal.id,
          status: 'REJECTED' as const,
          journalId: null,
        };
      }

      // APPROVE: post mirror reversal journal
      const journalId = await this.postMirrorReversalJournal(
        tx,
        attempt.id,
        attempt.journal_id!,
        'REFUND',
        reversal.id,
        `Dispute refund approved: ${params.reason}`,
      );

      await tx
        .updateTable('fp.reversals')
        .set({
          status: 'APPROVED',
          checker_id: params.checkerId,
          journal_id: journalId,
          decision_reason: params.reason,
          decided_at: new Date(),
        })
        .where('id', '=', reversal.id)
        .execute();

      if (dispute) {
        await tx
          .updateTable('fp.disputes')
          .set({
            status: 'REFUNDED',
            resolved_at: new Date(),
          })
          .where('id', '=', dispute.id)
          .execute();
      }

      if (attempt.customer_id) {
        const customer = await tx
          .selectFrom('fp.customers')
          .select(['id', 'phone_hmac', 'phone_last4'])
          .where('id', '=', attempt.customer_id)
          .executeTakeFirst();

        if (customer) {
          const phoneHmac = Buffer.isBuffer(customer.phone_hmac)
            ? customer.phone_hmac
            : Buffer.from(customer.phone_hmac);
          await sendSms(tx, {
            customerId: customer.id,
            phoneHmac,
            phoneLast4: customer.phone_last4,
            template: 'REFUND_DECISION',
            body: `FingerPay: Your dispute refund of PKR ${attempt.gross} has been approved and credited to your account.`,
            relatedAttemptId: attempt.id,
          });
        }
      }

      await recordAuditEvent(tx, {
        actorType: 'STAFF',
        actorId: params.checkerId,
        action: 'REFUND_APPROVED',
        entity: 'reversal',
        entityId: reversal.id,
        details: { journalId, amount: attempt.gross, reason: params.reason },
      });

      return {
        reversalId: reversal.id,
        status: 'APPROVED' as const,
        journalId,
      };
    });
  }
}
