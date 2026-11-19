import type { DbOrTx } from '../../platform/db/tx.js';
import type { AccountType } from '../../platform/db/types.gen.js';

export interface MatchedCustomer {
  id: string;
  institutionId: string;
  displayName: string;
  accountType: AccountType;
  casaAccountId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  thumbLockedAt: Date | null;
  phoneHmac: Buffer;
  phoneLast4: string;
  cnicLast4: string;
  firstPaymentAt: Date | null;
  referredBy: string | null;
}

export interface BiometricMatchInput {
  thumbLookup: Buffer;
  /** Optional 4-digit claim (last 4 digits of CNIC or phone) for 1:1 matching (SPEC §4.4 / Q7). */
  claim?: string | undefined;
  requireClaim: boolean;
}

export interface BiometricMatcher {
  matchCustomer(conn: DbOrTx, input: BiometricMatchInput): Promise<MatchedCustomer | null>;
}

export class SimulatedHmacMatcher implements BiometricMatcher {
  async matchCustomer(conn: DbOrTx, input: BiometricMatchInput): Promise<MatchedCustomer | null> {
    if (input.requireClaim && !input.claim) {
      return null;
    }

    const row = await conn
      .selectFrom('fp.customers')
      .selectAll()
      .where('thumb_lookup', '=', input.thumbLookup)
      .executeTakeFirst();

    if (!row) return null;

    if (input.claim && row.cnic_last4 !== input.claim && row.phone_last4 !== input.claim) {
      return null;
    }

    return {
      id: row.id,
      institutionId: row.institution_id,
      displayName: row.display_name,
      accountType: row.account_type,
      casaAccountId: row.casa_account_id,
      status: row.status,
      thumbLockedAt: row.thumb_locked_at ? new Date(row.thumb_locked_at) : null,
      phoneHmac: Buffer.isBuffer(row.phone_hmac) ? row.phone_hmac : Buffer.from(row.phone_hmac),
      phoneLast4: row.phone_last4,
      cnicLast4: row.cnic_last4,
      firstPaymentAt: row.first_payment_at ? new Date(row.first_payment_at) : null,
      referredBy: row.referred_by,
    };
  }
}
