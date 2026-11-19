import { divRoundHalfUp, formatAmount, paisa, type LedgerRow } from '@fingerpay/contracts';
import type { Kysely } from 'kysely';
import { AppError } from '../../platform/errors/app-error.js';
import { pgNumericToPaisa } from '../../platform/db/money-codec.js';
import type { Database } from '../../platform/db/types.gen.js';
import { currentKarachiDateAndMonth } from '../payments/service.js';

/**
 * SPEC T19 & §4.6: CSV formula injection protection.
 * Every cell is quoted; cells starting with `= + - @ TAB CR` are prefixed with `'`.
 */
export function escapeCsvCell(raw: string | number | null | undefined): string {
  const str = raw === null || raw === undefined ? '' : String(raw);
  const needsPrefix = /^[=+\-@\t\r]/.test(str);
  const safe = needsPrefix ? `'${str}` : str;
  const escaped = safe.replace(/"/g, '""');
  return `"${escaped}"`;
}

export class ReportingService {
  constructor(private readonly db: Kysely<Database>) {}

  async getMerchantLedger(merchantId: string, requestedDay?: string) {
    const day = requestedDay ?? currentKarachiDateAndMonth().dayPkt;
    const merchant = await this.db
      .selectFrom('fp.merchants')
      .select(['id', 'name'])
      .where('id', '=', merchantId)
      .executeTakeFirst();

    if (!merchant) {
      throw new AppError('NOT_FOUND', 'Merchant store not found');
    }

    const attempts = await this.db
      .selectFrom('fp.payment_attempts as a')
      .leftJoin('fp.customers as c', 'c.id', 'a.customer_id')
      .leftJoin('fp.reversals as r', (join) =>
        join.onRef('r.attempt_id', '=', 'a.id').on('r.status', '=', 'APPROVED'),
      )
      .select([
        'a.id',
        'a.created_at',
        'a.outcome',
        'a.routing',
        'a.gross',
        'a.fee',
        'a.net',
        'a.raast_ref',
        'c.display_name',
        'r.id as reversal_id',
      ])
      .where('a.merchant_id', '=', merchantId)
      .orderBy('a.created_at', 'desc')
      .execute();

    const offlineEvents = await this.db
      .selectFrom('fp.offline_events')
      .selectAll()
      .where('merchant_id', '=', merchantId)
      .orderBy('occurred_at', 'desc')
      .execute();

    const rows: LedgerRow[] = [];

    for (const a of attempts) {
      const attemptDay = currentKarachiDateAndMonth(new Date(a.created_at)).dayPkt;
      if (attemptDay !== day) continue;

      const isSettled = a.outcome === 'SUCCESS';
      const isReversed = isSettled && a.reversal_id !== null;

      rows.push({
        id: a.id,
        time: new Date(a.created_at).toISOString(),
        // SPEC T17 & §0 #18: Shopper name shown ONLY on settled/reversed rows, NEVER on declines!
        shopper: isSettled ? (a.display_name ?? 'Shopper') : null,
        routing: a.routing,
        gross: a.gross,
        fee: a.fee,
        net: a.net,
        raastRef: a.raast_ref,
        status: isReversed ? 'REVERSED' : isSettled ? 'SETTLED' : 'DECLINED',
        outcome: a.outcome,
      });
    }

    for (const o of offlineEvents) {
      const evDay = currentKarachiDateAndMonth(new Date(o.occurred_at)).dayPkt;
      if (evDay !== day) continue;

      const grossStr = o.amount ?? '0.00';
      rows.push({
        id: o.id,
        time: new Date(o.occurred_at).toISOString(),
        shopper: null,
        routing: null,
        gross: grossStr,
        fee: '0.00',
        net: grossStr,
        raastRef: null,
        status: 'OFFLINE_CASH',
        outcome: 'OFFLINE_FALLBACK',
      });
    }

    rows.sort((a, b) => (a.time < b.time ? 1 : -1));

    return {
      day,
      merchantName: merchant.name,
      rows,
    };
  }

  async getMerchantSummary(merchantId: string, requestedDay?: string) {
    const ledger = await this.getMerchantLedger(merchantId, requestedDay);
    const merchant = await this.db
      .selectFrom('fp.merchants')
      .select(['id', 'name', 'settlement_account_id'])
      .where('id', '=', merchantId)
      .executeTakeFirstOrThrow();

    let totalGross = paisa(0n);
    let totalFees = paisa(0n);
    let totalNet = paisa(0n);
    let screenshotsAvoided = 0;

    for (const row of ledger.rows) {
      if (row.status === 'SETTLED') {
        totalGross = paisa(totalGross + pgNumericToPaisa(row.gross));
        totalFees = paisa(totalFees + pgNumericToPaisa(row.fee));
        totalNet = paisa(totalNet + pgNumericToPaisa(row.net));
        screenshotsAvoided += 1;
      }
    }

    // Compare against a 2.5% card POS fee (SPEC §5 View B)
    const cardPosFee = divRoundHalfUp(totalGross * 250n, 10_000n);
    const saved = cardPosFee > totalFees ? paisa(cardPosFee - totalFees) : paisa(0n);

    let merchantBalance = '0.00';
    if (merchant.settlement_account_id) {
      const acct = await this.db
        .selectFrom('fp.accounts')
        .select('balance')
        .where('id', '=', merchant.settlement_account_id)
        .executeTakeFirst();
      if (acct) merchantBalance = acct.balance;
    }

    const { monthPkt } = currentKarachiDateAndMonth();
    const monthly = await this.db
      .selectFrom('fp.merchant_monthly_stats')
      .select(['settled_count', 'rebate_journal_id'])
      .where('merchant_id', '=', merchantId)
      .where('month_pkt', '=', monthPkt)
      .executeTakeFirst();

    return {
      day: ledger.day,
      merchantName: merchant.name,
      totalGross: formatAmount(totalGross),
      totalFees: formatAmount(totalFees),
      totalNet: formatAmount(totalNet),
      mdrSavedVsCardPos: formatAmount(saved),
      merchantBalance,
      screenshotsAvoided,
      monthlySettledCount: monthly?.settled_count ?? 0,
      rebateEarned: Boolean(monthly?.rebate_journal_id),
    };
  }

  async exportLedgerCsv(merchantId: string, requestedDay?: string): Promise<string> {
    const ledger = await this.getMerchantLedger(merchantId, requestedDay);
    const header = [
      'Time (UTC)',
      'Shopper',
      'Routing',
      'Gross (PKR)',
      'MDR Fee (PKR)',
      'Net Settled (PKR)',
      'Raast Ref',
      'Status',
      'Outcome',
    ]
      .map(escapeCsvCell)
      .join(',');

    const lines = ledger.rows.map((r) =>
      [
        r.time,
        r.shopper ?? '',
        r.routing ?? '',
        r.gross,
        r.fee,
        r.net,
        r.raastRef ?? '',
        r.status,
        r.outcome,
      ]
        .map(escapeCsvCell)
        .join(','),
    );

    return [header, ...lines].join('\r\n') + '\r\n';
  }
}
