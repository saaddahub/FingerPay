import { randomUUID } from 'node:crypto';
import {
  formatAmount,
  mdrBreakdown,
  paisa,
  type OutcomeCode,
  type Paisa,
} from '@fingerpay/contracts';
import { sql, type Kysely } from 'kysely';
import { generateRaastReference } from '../../integrations/sim/raast.js';
import { AppError } from '../../platform/errors/app-error.js';
import { paisaToPgNumeric, pgNumericToPaisa } from '../../platform/db/money-codec.js';
import { withTransaction, type DbOrTx } from '../../platform/db/tx.js';
import type { Database } from '../../platform/db/types.gen.js';
import { recordAuditEvent } from '../audit/service.js';
import type { BiometricMatcher } from '../biometrics/matcher.js';
import type { CustomerService } from '../customers/service.js';
import {
  getOrCreateSystemAccount,
  postJournal,
  type JournalEntryDraft,
} from '../ledger/post-journal.js';
import { sendSms } from '../notifications/sms.js';
import { CASHBACK_RULES, computeCashback } from '../pricing/cashback.js';

const CHARGE_TTL_MS = 120_000;
const DUPLICATE_WINDOW_MS = 15_000;
const THROTTLE_WINDOW_MS = 10 * 60_000;
const THROTTLE_MAX_UNKNOWN = 10;

/** Returns current date and YYYY-MM in Asia/Karachi timezone (UTC+5). */
export function currentKarachiDateAndMonth(now: Date = new Date()): {
  dayPkt: string;
  monthPkt: string;
} {
  const pktMs = now.getTime() + 5 * 3600_000;
  const iso = new Date(pktMs).toISOString();
  return {
    dayPkt: iso.slice(0, 10),
    monthPkt: iso.slice(0, 7),
  };
}

export interface PaymentServiceDeps {
  db: Kysely<Database>;
  matcher: BiometricMatcher;
  customerService: CustomerService;
}

export class PaymentService {
  constructor(private readonly deps: PaymentServiceDeps) {}

  async openCharge(params: {
    terminalId: string;
    merchantId: string;
    openedBy: string;
    amount: Paisa;
  }) {
    if (params.amount <= 0n) {
      throw new AppError('BAD_REQUEST', 'Charge amount must be positive');
    }

    return withTransaction(this.deps.db, async (tx) => {
      // Cancel any existing OPEN charge on this terminal so the cashier can start a fresh sale cleanly.
      await tx
        .updateTable('fp.charge_sessions')
        .set({ status: 'CANCELLED' })
        .where('terminal_id', '=', params.terminalId)
        .where('status', '=', 'OPEN')
        .execute();

      const chargeId = randomUUID();
      const expiresAt = new Date(Date.now() + CHARGE_TTL_MS);

      await tx
        .insertInto('fp.charge_sessions')
        .values({
          id: chargeId,
          terminal_id: params.terminalId,
          merchant_id: params.merchantId,
          opened_by: params.openedBy,
          amount: paisaToPgNumeric(params.amount),
          status: 'OPEN',
          failed_attempts: 0,
          expires_at: expiresAt,
          paid_attempt_id: null,
        })
        .execute();

      await recordAuditEvent(tx, {
        actorType: 'STAFF',
        actorId: params.openedBy,
        action: 'CHARGE_OPENED',
        entity: 'charge_session',
        entityId: chargeId,
        details: {
          terminalId: params.terminalId,
          merchantId: params.merchantId,
          amount: formatAmount(params.amount),
        },
      });

      return {
        chargeId,
        merchantId: params.merchantId,
        terminalId: params.terminalId,
        amount: formatAmount(params.amount),
        status: 'OPEN' as const,
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  async cancelCharge(params: { chargeId: string; terminalId: string; actorId: string }) {
    return withTransaction(this.deps.db, async (tx) => {
      const charge = await tx
        .selectFrom('fp.charge_sessions')
        .selectAll()
        .where('id', '=', params.chargeId)
        .where('terminal_id', '=', params.terminalId)
        .forUpdate()
        .executeTakeFirst();

      if (!charge) {
        throw new AppError('NOT_FOUND', 'Charge session not found');
      }
      if (charge.status === 'PAID') {
        throw new AppError('CONFLICT', 'Cannot cancel a charge that has already been paid');
      }

      await tx
        .updateTable('fp.charge_sessions')
        .set({ status: 'CANCELLED' })
        .where('id', '=', charge.id)
        .execute();

      await recordAuditEvent(tx, {
        actorType: 'STAFF',
        actorId: params.actorId,
        action: 'CHARGE_CANCELLED',
        entity: 'charge_session',
        entityId: charge.id,
      });

      return {
        chargeId: charge.id,
        status: 'CANCELLED' as const,
      };
    });
  }

  async recordOfflineEvent(params: {
    terminalId: string;
    merchantId: string;
    occurredAt: string;
    amount?: Paisa | undefined;
  }) {
    const eventId = randomUUID();
    await this.deps.db
      .insertInto('fp.offline_events')
      .values({
        id: eventId,
        terminal_id: params.terminalId,
        merchant_id: params.merchantId,
        amount: params.amount !== undefined ? paisaToPgNumeric(params.amount) : null,
        occurred_at: new Date(params.occurredAt),
      })
      .execute();

    return {
      eventId,
      status: 'RECORDED' as const,
    };
  }

  /**
   * SPEC §6.3: The 3-second thumb payment pipeline.
   */
  async thumbPay(params: {
    chargeId: string;
    terminalId: string;
    merchantId: string;
    token: string;
    claim?: string | undefined;
  }) {
    const t0 = performance.now();
    const elapsedMs = () => Math.max(1, Math.round(performance.now() - t0));

    return withTransaction(this.deps.db, async (tx) => {
      // 1. Lock the charge session
      const charge = await tx
        .selectFrom('fp.charge_sessions')
        .selectAll()
        .where('id', '=', params.chargeId)
        .where('terminal_id', '=', params.terminalId)
        .forUpdate()
        .executeTakeFirst();

      if (!charge) {
        throw new AppError('NOT_FOUND', 'Charge session not found for this terminal');
      }

      // Idempotent replay of an already-paid charge (SPEC T7 & §4.9)
      if (charge.status === 'PAID' && charge.paid_attempt_id) {
        const paidAttempt = await tx
          .selectFrom('fp.payment_attempts')
          .selectAll()
          .where('id', '=', charge.paid_attempt_id)
          .executeTakeFirstOrThrow();

        const shopper = paidAttempt.customer_id
          ? await tx
              .selectFrom('fp.customers')
              .select('display_name')
              .where('id', '=', paidAttempt.customer_id)
              .executeTakeFirst()
          : null;

        return {
          outcome: 'SUCCESS' as const,
          chargeId: charge.id,
          attemptId: paidAttempt.id,
          processingMs: paidAttempt.processing_ms,
          replayed: true,
          receipt: {
            attemptId: paidAttempt.id,
            chargeId: charge.id,
            shopperDisplayName: shopper?.display_name ?? 'Shopper',
            routing: paidAttempt.routing,
            gross: paidAttempt.gross,
            fee: paidAttempt.fee,
            fingerpayShare: paidAttempt.fp_share,
            bankShare: paidAttempt.bank_share,
            net: paidAttempt.net,
            cashback: paidAttempt.cashback,
            raastRef: paidAttempt.raast_ref ?? '',
            settledAt: new Date(paidAttempt.created_at).toISOString(),
          },
        };
      }

      if (charge.status === 'LOCKED') {
        return {
          outcome: 'CHARGE_LOCKED' as const,
          chargeId: charge.id,
          attemptId: null,
          processingMs: elapsedMs(),
          replayed: false,
          receipt: null,
        };
      }

      if (charge.status === 'CANCELLED') {
        return {
          outcome: 'CHARGE_CANCELLED' as const,
          chargeId: charge.id,
          attemptId: null,
          processingMs: elapsedMs(),
          replayed: false,
          receipt: null,
        };
      }

      const now = new Date();
      if (charge.status === 'EXPIRED' || new Date(charge.expires_at) < now) {
        await tx
          .updateTable('fp.charge_sessions')
          .set({ status: 'EXPIRED' })
          .where('id', '=', charge.id)
          .execute();
        return {
          outcome: 'CHARGE_EXPIRED' as const,
          chargeId: charge.id,
          attemptId: null,
          processingMs: elapsedMs(),
          replayed: false,
          receipt: null,
        };
      }

      const gross = pgNumericToPaisa(charge.amount);

      // 2. Check terminal throttle status
      const terminal = await tx
        .selectFrom('fp.terminals')
        .select(['id', 'throttled_until'])
        .where('id', '=', params.terminalId)
        .forUpdate()
        .executeTakeFirstOrThrow();

      if (terminal.throttled_until && new Date(terminal.throttled_until) > now) {
        const attemptId = randomUUID();
        const ms = elapsedMs();
        await tx
          .insertInto('fp.payment_attempts')
          .values({
            id: attemptId,
            charge_id: charge.id,
            terminal_id: params.terminalId,
            merchant_id: params.merchantId,
            customer_id: null,
            outcome: 'DECLINED_TERMINAL_THROTTLED',
            routing: 'ON_US',
            gross: charge.amount,
            processing_ms: ms,
          })
          .execute();

        return {
          outcome: 'DECLINED_TERMINAL_THROTTLED' as const,
          chargeId: charge.id,
          attemptId,
          processingMs: ms,
          replayed: false,
          receipt: null,
        };
      }

      // 3. Load merchant & acquirer bank
      const merchant = await tx
        .selectFrom('fp.merchants')
        .selectAll()
        .where('id', '=', params.merchantId)
        .executeTakeFirstOrThrow();

      if (!merchant.settlement_account_id || merchant.status !== 'ACTIVE') {
        throw new AppError('FORBIDDEN', 'Merchant settlement account is not active');
      }

      // 4. Match shopper thumbprint (token never stored or logged)
      const thumbLookup = this.deps.customerService.computeThumbLookupFromToken(params.token);
      const customer = await this.deps.matcher.matchCustomer(tx, {
        thumbLookup,
        claim: params.claim,
        requireClaim: merchant.require_claim,
      });

      const bumpFailedAttempt = async () => {
        const nextFailed = charge.failed_attempts + 1;
        const nextStatus = nextFailed >= 3 ? 'LOCKED' : 'OPEN';
        await tx
          .updateTable('fp.charge_sessions')
          .set({
            failed_attempts: nextFailed,
            status: nextStatus,
          })
          .where('id', '=', charge.id)
          .execute();
      };

      if (!customer) {
        await bumpFailedAttempt();

        const attemptId = randomUUID();
        const ms = elapsedMs();

        // Check how many unknown-thumb attempts occurred on this terminal in the last 10 minutes
        const tenMinAgo = new Date(now.getTime() - THROTTLE_WINDOW_MS);
        const recentUnknown = await tx
          .selectFrom('fp.payment_attempts')
          .select(sql<number>`COUNT(*)::int`.as('cnt'))
          .where('terminal_id', '=', params.terminalId)
          .where('outcome', '=', 'DECLINED_UNREGISTERED_THUMB')
          .where('created_at', '>=', tenMinAgo)
          .executeTakeFirstOrThrow();

        const willThrottle = recentUnknown.cnt + 1 >= THROTTLE_MAX_UNKNOWN;
        const outcome: OutcomeCode = willThrottle
          ? 'DECLINED_TERMINAL_THROTTLED'
          : 'DECLINED_UNREGISTERED_THUMB';

        await tx
          .insertInto('fp.payment_attempts')
          .values({
            id: attemptId,
            charge_id: charge.id,
            terminal_id: params.terminalId,
            merchant_id: params.merchantId,
            customer_id: null,
            outcome: 'DECLINED_UNREGISTERED_THUMB',
            routing: 'ON_US',
            gross: charge.amount,
            processing_ms: ms,
          })
          .execute();

        if (willThrottle) {
          await tx
            .updateTable('fp.terminals')
            .set({ throttled_until: new Date(now.getTime() + THROTTLE_WINDOW_MS) })
            .where('id', '=', params.terminalId)
            .execute();

          await recordAuditEvent(tx, {
            actorType: 'TERMINAL',
            actorId: params.terminalId,
            action: 'TERMINAL_THROTTLED_UNKNOWN_THUMBS',
            entity: 'terminal',
            entityId: params.terminalId,
            details: { unknownAttemptsIn10Min: recentUnknown.cnt + 1 },
          });
        }

        return {
          outcome,
          chargeId: charge.id,
          attemptId,
          processingMs: ms,
          replayed: false,
          receipt: null,
        };
      }

      const routing: 'ON_US' | 'OFF_US' =
        customer.institutionId === merchant.institution_id ? 'ON_US' : 'OFF_US';

      // Helper for matched declines: logs attempt (fee=0), bumps charge failures, alerts owner via SMS.
      const recordMatchedDecline = async (
        outcome: OutcomeCode,
        smsTemplate: 'DECLINE_ALERT' | 'LOCKED_THUMB_ALERT',
        smsBody: string,
      ) => {
        await bumpFailedAttempt();
        const attemptId = randomUUID();
        const ms = elapsedMs();

        await tx
          .insertInto('fp.payment_attempts')
          .values({
            id: attemptId,
            charge_id: charge.id,
            terminal_id: params.terminalId,
            merchant_id: params.merchantId,
            customer_id: customer.id,
            outcome,
            routing,
            gross: charge.amount,
            processing_ms: ms,
          })
          .execute();

        await sendSms(tx, {
          customerId: customer.id,
          phoneHmac: customer.phoneHmac,
          phoneLast4: customer.phoneLast4,
          template: smsTemplate,
          body: smsBody,
          relatedAttemptId: attemptId,
        });

        await recordAuditEvent(tx, {
          actorType: 'TERMINAL',
          actorId: params.terminalId,
          action: 'PAYMENT_DECLINED',
          entity: 'payment_attempt',
          entityId: attemptId,
          details: { outcome, gross: charge.amount, merchantId: params.merchantId },
        });

        return {
          outcome,
          chargeId: charge.id,
          attemptId,
          processingMs: ms,
          replayed: false,
          receipt: null,
        };
      };

      // 5a. Account active check
      if (customer.status !== 'ACTIVE') {
        return recordMatchedDecline(
          'DECLINED_ACCOUNT_INACTIVE',
          'DECLINE_ALERT',
          `FingerPay: Tap for PKR ${charge.amount} at ${merchant.name} declined (account not active). PKR 0 fee.`,
        );
      }

      // 5b. Thumb Lock check (SPEC T11 & §4.9)
      if (customer.thumbLockedAt !== null) {
        return recordMatchedDecline(
          'DECLINED_THUMB_LOCKED',
          'LOCKED_THUMB_ALERT',
          `FingerPay Security Alert: A PKR ${charge.amount} tap at ${merchant.name} was blocked because your thumb is LOCKED. PKR 0 fee.`,
        );
      }

      // 5c. Duplicate tap within 15s (SPEC T7 & §4.9)
      const dupWindowStart = new Date(now.getTime() - DUPLICATE_WINDOW_MS);
      const recentSame = await tx
        .selectFrom('fp.payment_attempts')
        .select('id')
        .where('customer_id', '=', customer.id)
        .where('merchant_id', '=', params.merchantId)
        .where('gross', '=', charge.amount)
        .where('outcome', '=', 'SUCCESS')
        .where('created_at', '>=', dupWindowStart)
        .executeTakeFirst();

      if (recentSame) {
        return recordMatchedDecline(
          'DECLINED_DUPLICATE_TAP',
          'DECLINE_ALERT',
          `FingerPay: Duplicate tap for PKR ${charge.amount} at ${merchant.name} blocked within 15s (PKR 0 fee).`,
        );
      }

      // 5d. Risk Engine per-tap and daily caps (Asia/Karachi day)
      const limits = await tx
        .selectFrom('fp.risk_limits')
        .selectAll()
        .where('account_type', '=', customer.accountType)
        .executeTakeFirstOrThrow();

      const perTapLimit = pgNumericToPaisa(limits.per_tap);
      const dailyAmountLimit = pgNumericToPaisa(limits.daily_amount);
      const { dayPkt, monthPkt } = currentKarachiDateAndMonth(now);

      const usageRow = await tx
        .selectFrom('fp.account_daily_usage')
        .selectAll()
        .where('account_id', '=', customer.casaAccountId)
        .where('day_pkt', '=', dayPkt)
        .forUpdate()
        .executeTakeFirst();

      const usedToday = usageRow ? pgNumericToPaisa(usageRow.amount) : paisa(0n);
      const tapsToday = usageRow?.tap_count ?? 0;

      if (
        gross > perTapLimit ||
        usedToday + gross > dailyAmountLimit ||
        tapsToday + 1 > limits.daily_count
      ) {
        return recordMatchedDecline(
          'DECLINED_LIMIT',
          'DECLINE_ALERT',
          `FingerPay: Tap for PKR ${charge.amount} at ${merchant.name} exceeds your thumb-pay limit (PKR 0 fee).`,
        );
      }

      // 5e. Off-us Raast availability check
      if (routing === 'OFF_US') {
        const instRows = await tx
          .selectFrom('fp.institutions')
          .select(['id', 'raast_available'])
          .where('id', 'in', [customer.institutionId, merchant.institution_id])
          .execute();
        const allAvailable = instRows.every((r) => r.raast_available);
        if (!allAvailable) {
          return recordMatchedDecline(
            'DECLINED_SETTLEMENT_UNAVAILABLE',
            'DECLINE_ALERT',
            `FingerPay: Tap for PKR ${charge.amount} at ${merchant.name} declined (receiving bank unavailable on Raast). PKR 0 fee.`,
          );
        }
      }

      // 5f. Lock shopper CASA account and verify balance
      const shopperCasa = await tx
        .selectFrom('fp.accounts')
        .select(['id', 'balance', 'status'])
        .where('id', '=', customer.casaAccountId)
        .forUpdate()
        .executeTakeFirstOrThrow();

      const shopperBalance = pgNumericToPaisa(shopperCasa.balance);
      if (shopperBalance < gross) {
        return recordMatchedDecline(
          'DECLINED_LOW_BALANCE',
          'DECLINE_ALERT',
          `FingerPay: Tap for PKR ${charge.amount} at ${merchant.name} declined due to insufficient balance (PKR 0 fee charged).`,
        );
      }

      // 6. Pricing: MDR fee split & cashback (SPEC §6.1 & §6.2)
      const mdr = mdrBreakdown(gross);
      const issuerPool = await getOrCreateSystemAccount(
        tx,
        customer.institutionId,
        'MARKETING_POOL',
      );
      const lockedPool = await tx
        .selectFrom('fp.accounts')
        .select(['id', 'balance'])
        .where('id', '=', issuerPool.id)
        .forUpdate()
        .executeTakeFirstOrThrow();

      const isFirstPayment = customer.firstPaymentAt === null;
      const cashback = computeCashback({
        gross,
        accountType: customer.accountType,
        isFirstPayment,
        marketingPoolBalance: pgNumericToPaisa(lockedPool.balance),
      });

      // 7. Build double-entry journal legs (1 leg for ON-US, 3 legs for OFF-US)
      const attemptId = randomUUID();
      const raastRef = generateRaastReference(now);
      const entries: JournalEntryDraft[] = [];

      const acquirerFpFee = await getOrCreateSystemAccount(
        tx,
        merchant.institution_id,
        'FP_FEE_RECEIVABLE',
      );
      const acquirerBankFee = await getOrCreateSystemAccount(
        tx,
        merchant.institution_id,
        'BANK_FEE_INCOME',
      );

      if (routing === 'ON_US') {
        const book = customer.institutionId;
        entries.push(
          { bookInstitutionId: book, accountId: customer.casaAccountId, amount: -gross },
          { bookInstitutionId: book, accountId: merchant.settlement_account_id, amount: mdr.net },
        );
        if (mdr.fingerpayShare > 0n) {
          entries.push({
            bookInstitutionId: book,
            accountId: acquirerFpFee.id,
            amount: mdr.fingerpayShare,
          });
        }
        if (mdr.bankShare > 0n) {
          entries.push({
            bookInstitutionId: book,
            accountId: acquirerBankFee.id,
            amount: mdr.bankShare,
          });
        }
      } else {
        // OFF-US: 3 balanced legs across Issuer book, SBP central book, and Acquirer book
        const issuerOutward = await getOrCreateSystemAccount(
          tx,
          customer.institutionId,
          'RAAST_OUTWARD_CLEARING',
        );
        const acquirerInward = await getOrCreateSystemAccount(
          tx,
          merchant.institution_id,
          'RAAST_INWARD_CLEARING',
        );

        let sbpInst = await tx
          .selectFrom('fp.institutions')
          .select('id')
          .where('kind', '=', 'CENTRAL')
          .executeTakeFirst();
        if (!sbpInst) {
          const sbpId = randomUUID();
          await tx
            .insertInto('fp.institutions')
            .values({
              id: sbpId,
              code: 'SBP',
              name: 'SBP Raast Switch (Simulated)',
              kind: 'CENTRAL',
              raast_participant_code: 'SBPPKKA',
              raast_available: true,
              dispute_prefix: 'SBP',
            })
            .execute();
          sbpInst = { id: sbpId };
        }

        const sbpFrom = await getOrCreateSystemAccount(tx, sbpInst.id, 'SBP_SETTLEMENT', 0);
        const sbpTo = await getOrCreateSystemAccount(tx, sbpInst.id, 'SBP_SETTLEMENT', 1);

        // Leg 1: Issuer book
        entries.push(
          {
            bookInstitutionId: customer.institutionId,
            accountId: customer.casaAccountId,
            amount: -gross,
          },
          {
            bookInstitutionId: customer.institutionId,
            accountId: issuerOutward.id,
            amount: gross,
          },
        );
        // Leg 2: SBP switch book
        entries.push(
          { bookInstitutionId: sbpInst.id, accountId: sbpFrom.id, amount: -gross },
          { bookInstitutionId: sbpInst.id, accountId: sbpTo.id, amount: gross },
        );
        // Leg 3: Acquirer book
        entries.push(
          {
            bookInstitutionId: merchant.institution_id,
            accountId: acquirerInward.id,
            amount: -gross,
          },
          {
            bookInstitutionId: merchant.institution_id,
            accountId: merchant.settlement_account_id,
            amount: mdr.net,
          },
        );
        if (mdr.fingerpayShare > 0n) {
          entries.push({
            bookInstitutionId: merchant.institution_id,
            accountId: acquirerFpFee.id,
            amount: mdr.fingerpayShare,
          });
        }
        if (mdr.bankShare > 0n) {
          entries.push({
            bookInstitutionId: merchant.institution_id,
            accountId: acquirerBankFee.id,
            amount: mdr.bankShare,
          });
        }

        await tx
          .insertInto('fp.raast_transfers')
          .values({
            id: randomUUID(),
            raast_ref: raastRef,
            from_institution_id: customer.institutionId,
            to_institution_id: merchant.institution_id,
            amount: charge.amount,
            status: 'SETTLED',
          })
          .execute();
      }

      if (cashback > 0n) {
        entries.push(
          {
            bookInstitutionId: customer.institutionId,
            accountId: lockedPool.id,
            amount: -cashback,
          },
          {
            bookInstitutionId: customer.institutionId,
            accountId: customer.casaAccountId,
            amount: cashback,
          },
        );
      }

      const journalId = await postJournal(tx, {
        kind: 'PAYMENT',
        refType: 'PAYMENT_ATTEMPT',
        refId: attemptId,
        memo: `Thumb payment at ${merchant.name} (${raastRef})`,
        entries,
      });

      const ms = elapsedMs();

      // 8. Write payment_attempts row & update charge
      await tx
        .insertInto('fp.payment_attempts')
        .values({
          id: attemptId,
          charge_id: charge.id,
          terminal_id: params.terminalId,
          merchant_id: params.merchantId,
          customer_id: customer.id,
          outcome: 'SUCCESS',
          routing,
          gross: paisaToPgNumeric(mdr.gross),
          fee: paisaToPgNumeric(mdr.fee),
          fp_share: paisaToPgNumeric(mdr.fingerpayShare),
          bank_share: paisaToPgNumeric(mdr.bankShare),
          net: paisaToPgNumeric(mdr.net),
          cashback: paisaToPgNumeric(cashback),
          journal_id: journalId,
          raast_ref: raastRef,
          processing_ms: ms,
        })
        .execute();

      await tx
        .updateTable('fp.charge_sessions')
        .set({
          status: 'PAID',
          paid_attempt_id: attemptId,
        })
        .where('id', '=', charge.id)
        .execute();

      // Update daily usage
      if (usageRow) {
        await tx
          .updateTable('fp.account_daily_usage')
          .set({
            amount: paisaToPgNumeric(usedToday + gross),
            tap_count: tapsToday + 1,
          })
          .where('account_id', '=', customer.casaAccountId)
          .where('day_pkt', '=', dayPkt)
          .execute();
      } else {
        await tx
          .insertInto('fp.account_daily_usage')
          .values({
            account_id: customer.casaAccountId,
            day_pkt: dayPkt,
            amount: paisaToPgNumeric(gross),
            tap_count: 1,
          })
          .execute();
      }

      // First payment flag & student referral bonus (SPEC §6.2)
      if (isFirstPayment) {
        await tx
          .updateTable('fp.customers')
          .set({ first_payment_at: now })
          .where('id', '=', customer.id)
          .execute();

        if (customer.referredBy) {
          await this.awardReferralBonusIfEligible(tx, customer.referredBy, attemptId);
        }
      }

      // Monthly merchant stats & PKR 500 high-volume rebate at 500 tx (SPEC §6.2)
      await this.bumpMerchantMonthlyStats(
        tx,
        merchant.id,
        merchant.institution_id,
        merchant.settlement_account_id,
        monthPkt,
      );

      // 9. SMS receipt & audit log
      const cashbackNote =
        cashback > 0n ? ` Cashback credited: PKR ${formatAmount(cashback)}.` : '';
      await sendSms(tx, {
        customerId: customer.id,
        phoneHmac: customer.phoneHmac,
        phoneLast4: customer.phoneLast4,
        template: 'PAYMENT_RECEIPT',
        body: `FingerPay Receipt: PKR ${formatAmount(gross)} paid to ${merchant.name} (Ref ${raastRef}).${cashbackNote} Reply DISPUTE to flag or LOCK to freeze thumb.`,
        relatedAttemptId: attemptId,
      });

      await recordAuditEvent(tx, {
        actorType: 'TERMINAL',
        actorId: params.terminalId,
        action: 'PAYMENT_SETTLED',
        entity: 'payment_attempt',
        entityId: attemptId,
        details: {
          routing,
          gross: formatAmount(gross),
          fee: formatAmount(mdr.fee),
          net: formatAmount(mdr.net),
          cashback: formatAmount(cashback),
          raastRef,
          processingMs: ms,
        },
      });

      return {
        outcome: 'SUCCESS' as const,
        chargeId: charge.id,
        attemptId,
        processingMs: ms,
        replayed: false,
        receipt: {
          attemptId,
          chargeId: charge.id,
          shopperDisplayName: customer.displayName,
          routing,
          gross: formatAmount(mdr.gross),
          fee: formatAmount(mdr.fee),
          fingerpayShare: formatAmount(mdr.fingerpayShare),
          bankShare: formatAmount(mdr.bankShare),
          net: formatAmount(mdr.net),
          cashback: formatAmount(cashback),
          raastRef,
          settledAt: now.toISOString(),
        },
      };
    });
  }

  private async awardReferralBonusIfEligible(
    tx: DbOrTx,
    referrerCustomerId: string,
    triggerAttemptId: string,
  ): Promise<void> {
    const referrer = await tx
      .selectFrom('fp.customers')
      .select(['id', 'institution_id', 'casa_account_id', 'status'])
      .where('id', '=', referrerCustomerId)
      .executeTakeFirst();

    if (!referrer || referrer.status !== 'ACTIVE') return;

    const pool = await getOrCreateSystemAccount(tx, referrer.institution_id, 'MARKETING_POOL');
    const lockedPool = await tx
      .selectFrom('fp.accounts')
      .select(['id', 'balance'])
      .where('id', '=', pool.id)
      .forUpdate()
      .executeTakeFirstOrThrow();

    if (pgNumericToPaisa(lockedPool.balance) < CASHBACK_RULES.referralBonus) return;

    await postJournal(tx, {
      kind: 'REFERRAL',
      refType: 'PAYMENT_ATTEMPT',
      refId: triggerAttemptId,
      memo: 'Student referral bonus (PKR 100)',
      entries: [
        {
          bookInstitutionId: referrer.institution_id,
          accountId: lockedPool.id,
          amount: -CASHBACK_RULES.referralBonus,
        },
        {
          bookInstitutionId: referrer.institution_id,
          accountId: referrer.casa_account_id,
          amount: CASHBACK_RULES.referralBonus,
        },
      ],
    });
  }

  private async bumpMerchantMonthlyStats(
    tx: DbOrTx,
    merchantId: string,
    institutionId: string,
    merchantCasaId: string,
    monthPkt: string,
  ): Promise<void> {
    const row = await tx
      .selectFrom('fp.merchant_monthly_stats')
      .selectAll()
      .where('merchant_id', '=', merchantId)
      .where('month_pkt', '=', monthPkt)
      .forUpdate()
      .executeTakeFirst();

    const nextCount = (row?.settled_count ?? 0) + 1;
    let rebateJournalId = row?.rebate_journal_id ?? null;

    if (nextCount >= CASHBACK_RULES.highVolumeThreshold && !rebateJournalId) {
      const pool = await getOrCreateSystemAccount(tx, institutionId, 'MARKETING_POOL');
      const lockedPool = await tx
        .selectFrom('fp.accounts')
        .select(['id', 'balance'])
        .where('id', '=', pool.id)
        .forUpdate()
        .executeTakeFirstOrThrow();

      if (pgNumericToPaisa(lockedPool.balance) >= CASHBACK_RULES.highVolumeRebate) {
        rebateJournalId = await postJournal(tx, {
          kind: 'REBATE',
          refType: 'MERCHANT',
          refId: merchantId,
          memo: `High-volume monthly rebate (${monthPkt})`,
          entries: [
            {
              bookInstitutionId: institutionId,
              accountId: lockedPool.id,
              amount: -CASHBACK_RULES.highVolumeRebate,
            },
            {
              bookInstitutionId: institutionId,
              accountId: merchantCasaId,
              amount: CASHBACK_RULES.highVolumeRebate,
            },
          ],
        });
      }
    }

    if (row) {
      await tx
        .updateTable('fp.merchant_monthly_stats')
        .set({
          settled_count: nextCount,
          rebate_journal_id: rebateJournalId,
        })
        .where('merchant_id', '=', merchantId)
        .where('month_pkt', '=', monthPkt)
        .execute();
    } else {
      await tx
        .insertInto('fp.merchant_monthly_stats')
        .values({
          merchant_id: merchantId,
          month_pkt: monthPkt,
          settled_count: nextCount,
          rebate_journal_id: rebateJournalId,
        })
        .execute();
    }
  }
}
