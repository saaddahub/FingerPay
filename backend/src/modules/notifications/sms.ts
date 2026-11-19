import { randomBytes, randomUUID } from 'node:crypto';
import type { Kysely } from 'kysely';
import { AppError } from '../../platform/errors/app-error.js';
import { withTransaction, type DbOrTx } from '../../platform/db/tx.js';
import type { Database } from '../../platform/db/types.gen.js';
import { recordAuditEvent } from '../audit/service.js';

export interface SendSmsInput {
  customerId: string | null;
  phoneHmac: Buffer;
  phoneLast4: string;
  template:
    | 'PAYMENT_RECEIPT'
    | 'DECLINE_ALERT'
    | 'LOCKED_THUMB_ALERT'
    | 'ENROLLMENT_WELCOME'
    | 'THUMB_LOCKED_CONFIRM'
    | 'THUMB_UNLOCKED_CONFIRM'
    | 'DISPUTE_OPENED'
    | 'REFUND_DECISION'
    | 'HELP';
  body: string;
  relatedAttemptId?: string | null;
}

export async function sendSms(conn: DbOrTx, input: SendSmsInput): Promise<string> {
  const id = randomUUID();
  await conn
    .insertInto('fp.sms_messages')
    .values({
      id,
      direction: 'OUT',
      customer_id: input.customerId,
      phone_hmac: input.phoneHmac,
      phone_last4: input.phoneLast4,
      template: input.template,
      body: input.body,
      related_attempt_id: input.relatedAttemptId ?? null,
    })
    .execute();
  return id;
}

/**
 * SPEC §5 View D & §4.9: Shopper replies LOCK or DISPUTE to any FingerPay SMS.
 * Works on plain feature phones / non-PTA phones with no app or data plan.
 */
export async function handleSmsReply(
  db: Kysely<Database>,
  params: { smsId: string; text: string },
): Promise<{
  action: 'THUMB_LOCKED' | 'DISPUTE_OPENED' | 'HELP_SENT';
  ticket: string | null;
  replySmsId: string;
  replyBody: string;
}> {
  return withTransaction(db, async (tx) => {
    const originalSms = await tx
      .selectFrom('fp.sms_messages')
      .selectAll()
      .where('id', '=', params.smsId)
      .executeTakeFirst();

    if (!originalSms || !originalSms.customer_id) {
      throw new AppError('NOT_FOUND', 'Original SMS message not found');
    }

    const customer = await tx
      .selectFrom('fp.customers')
      .selectAll()
      .where('id', '=', originalSms.customer_id)
      .forUpdate()
      .executeTakeFirst();

    if (!customer) {
      throw new AppError('NOT_FOUND', 'Customer not found');
    }

    const phoneHmac = Buffer.isBuffer(customer.phone_hmac)
      ? customer.phone_hmac
      : Buffer.from(customer.phone_hmac);

    const normalized = params.text.trim().toUpperCase();

    // Log inbound SMS
    await tx
      .insertInto('fp.sms_messages')
      .values({
        id: randomUUID(),
        direction: 'IN',
        customer_id: customer.id,
        phone_hmac: phoneHmac,
        phone_last4: customer.phone_last4,
        template: 'INBOUND_REPLY',
        body: params.text.trim(),
        related_attempt_id: originalSms.related_attempt_id,
      })
      .execute();

    if (normalized === 'LOCK') {
      await tx
        .updateTable('fp.customers')
        .set({ thumb_locked_at: new Date() })
        .where('id', '=', customer.id)
        .execute();

      await recordAuditEvent(tx, {
        actorType: 'SHOPPER_SMS',
        actorId: customer.id,
        action: 'THUMB_LOCKED_BY_SMS',
        entity: 'customer',
        entityId: customer.id,
        details: { sourceSmsId: originalSms.id },
      });

      const replyBody =
        'FingerPay: Your thumb payments are now LOCKED. Visit your bank branch with your CNIC to unlock.';
      const replySmsId = await sendSms(tx, {
        customerId: customer.id,
        phoneHmac,
        phoneLast4: customer.phone_last4,
        template: 'THUMB_LOCKED_CONFIRM',
        body: replyBody,
        relatedAttemptId: originalSms.related_attempt_id,
      });

      return {
        action: 'THUMB_LOCKED',
        ticket: null,
        replySmsId,
        replyBody,
      };
    }

    if (normalized.startsWith('DISPUTE')) {
      if (!originalSms.related_attempt_id) {
        throw new AppError('BAD_REQUEST', 'This SMS is not linked to a payment attempt');
      }

      const attempt = await tx
        .selectFrom('fp.payment_attempts')
        .selectAll()
        .where('id', '=', originalSms.related_attempt_id)
        .executeTakeFirst();

      if (!attempt || attempt.outcome !== 'SUCCESS') {
        throw new AppError('BAD_REQUEST', 'Only settled payments can be disputed');
      }

      const existing = await tx
        .selectFrom('fp.disputes')
        .select('id')
        .where('attempt_id', '=', attempt.id)
        .where('status', 'in', ['OPEN', 'REFUND_REQUESTED'])
        .executeTakeFirst();

      if (existing) {
        throw new AppError('CONFLICT', 'An open dispute already exists for this payment');
      }

      const inst = await tx
        .selectFrom('fp.institutions')
        .select('dispute_prefix')
        .where('id', '=', customer.institution_id)
        .executeTakeFirstOrThrow();

      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = randomBytes(6).toString('hex').toUpperCase();
      const ticket = `${inst.dispute_prefix}-DSP-${ymd}-${rand}`;
      const disputeId = randomUUID();

      await tx
        .insertInto('fp.disputes')
        .values({
          id: disputeId,
          ticket,
          attempt_id: attempt.id,
          customer_id: customer.id,
          source: 'SMS',
          reason: params.text.trim(),
          status: 'OPEN',
        })
        .execute();

      await recordAuditEvent(tx, {
        actorType: 'SHOPPER_SMS',
        actorId: customer.id,
        action: 'DISPUTE_OPENED',
        entity: 'dispute',
        entityId: disputeId,
        details: { ticket, attemptId: attempt.id },
      });

      const replyBody = `FingerPay: Dispute opened for PKR ${attempt.gross}. Tracking ID: ${ticket}.`;
      const replySmsId = await sendSms(tx, {
        customerId: customer.id,
        phoneHmac,
        phoneLast4: customer.phone_last4,
        template: 'DISPUTE_OPENED',
        body: replyBody,
        relatedAttemptId: attempt.id,
      });

      return {
        action: 'DISPUTE_OPENED',
        ticket,
        replySmsId,
        replyBody,
      };
    }

    const replyBody =
      'FingerPay Help: Reply LOCK to freeze thumb payments immediately, or reply DISPUTE to flag a payment receipt.';
    const replySmsId = await sendSms(tx, {
      customerId: customer.id,
      phoneHmac,
      phoneLast4: customer.phone_last4,
      template: 'HELP',
      body: replyBody,
      relatedAttemptId: originalSms.related_attempt_id,
    });

    return {
      action: 'HELP_SENT',
      ticket: null,
      replySmsId,
      replyBody,
    };
  });
}
