import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { formatAmount, type Paisa } from '@fingerpay/contracts';
import type { Kysely } from 'kysely';
import { AppError } from '../../platform/errors/app-error.js';
import { encryptField } from '../../platform/crypto/aead.js';
import {
  computeBlindIndex,
  computeThumbLookup,
  normalizeAccountNo,
  normalizeCnic,
  normalizePhone,
} from '../../platform/crypto/blind-index.js';
import { deriveSubkey } from '../../platform/crypto/hkdf.js';
import type { Keyring } from '../../platform/crypto/keyring.js';
import { withTransaction } from '../../platform/db/tx.js';
import type { AccountType, Database } from '../../platform/db/types.gen.js';
import { recordAuditEvent } from '../audit/service.js';
import { getOrCreateSystemAccount, postJournal } from '../ledger/post-journal.js';
import { sendSms } from '../notifications/sms.js';

/**
 * SPEC §0 #18 & PRODUCT.md: Shoppers are displayed as first name + initial only ("Ayesha K.").
 */
export function formatDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Shopper';
  const first = parts[0]!;
  if (parts.length === 1) return first;
  const lastInitial = parts.at(-1)![0]!.toUpperCase();
  return `${first} ${lastInitial}.`;
}

export interface CustomerServiceDeps {
  db: Kysely<Database>;
  keyring: Keyring;
  lookupRootKey: Buffer;
  demoKey: Buffer;
}

export interface EnrollCustomerParams {
  actorId: string;
  institutionId: string;
  fullName: string;
  cnic: string;
  accountNumber: string;
  accountType: AccountType;
  phone: string;
  openingBalance: Paisa;
  nadraRef: string;
  consentVersion: string;
  thumbCaptureToken?: string | undefined;
  referralCodeUsed?: string | undefined;
  customReferralCode?: string | undefined;
  markFirstPaymentCompleted?: boolean | undefined;
}

export class CustomerService {
  private readonly cnicSubkey: Buffer;
  private readonly phoneSubkey: Buffer;
  private readonly accountSubkey: Buffer;
  private readonly thumbSubkey: Buffer;

  constructor(private readonly deps: CustomerServiceDeps) {
    this.cnicSubkey = deriveSubkey(deps.lookupRootKey, 'fp:v1:cnic');
    this.phoneSubkey = deriveSubkey(deps.lookupRootKey, 'fp:v1:phone');
    this.accountSubkey = deriveSubkey(deps.lookupRootKey, 'fp:v1:account');
    this.thumbSubkey = deriveSubkey(deps.lookupRootKey, 'fp:v1:thumb-v1');
  }

  public computeThumbLookupFromToken(captureToken: string): Buffer {
    return computeThumbLookup(captureToken, this.thumbSubkey);
  }

  public generateDemoThumbToken(customerId: string): string {
    return createHmac('sha256', this.deps.demoKey)
      .update(`cust:${customerId}`, 'utf8')
      .digest('hex');
  }

  async enrollCustomer(params: EnrollCustomerParams) {
    const normCnic = normalizeCnic(params.cnic);
    const normPhone = normalizePhone(params.phone.startsWith('+') ? params.phone : `+${params.phone}`);
    const normAccount = normalizeAccountNo(params.accountNumber);

    const customerId = randomUUID();
    const casaAccountId = randomUUID();
    const captureToken = params.thumbCaptureToken ?? this.generateDemoThumbToken(customerId);

    const cnicHmac = computeBlindIndex(normCnic, this.cnicSubkey);
    const phoneHmac = computeBlindIndex(normPhone, this.phoneSubkey);
    const accountHmac = computeBlindIndex(normAccount, this.accountSubkey);
    const thumbLookup = this.computeThumbLookupFromToken(captureToken);

    const cnicLast4 = normCnic.slice(-4);
    const phoneLast4 = normPhone.slice(-4);
    const displayName = formatDisplayName(params.fullName);

    return withTransaction(this.deps.db, async (tx) => {
      // SPEC §4.9: Duplicate thumb, CNIC or account on a second customer -> refused and audited.
      const dupCustomer = await tx
        .selectFrom('fp.customers')
        .select(['id', 'cnic_hmac', 'thumb_lookup'])
        .where((eb) =>
          eb.or([
            eb('cnic_hmac', '=', cnicHmac),
            eb('thumb_lookup', '=', thumbLookup),
          ]),
        )
        .executeTakeFirst();

      const dupAccount = await tx
        .selectFrom('fp.accounts')
        .select('id')
        .where('account_no_hmac', '=', accountHmac)
        .executeTakeFirst();

      if (dupCustomer || dupAccount) {
        await recordAuditEvent(tx, {
          actorType: 'STAFF',
          actorId: params.actorId,
          action: 'ENROLLMENT_DUPLICATE_REFUSED',
          entity: 'customer',
          entityId: dupCustomer?.id ?? dupAccount?.id ?? 'unknown',
          details: {
            cnicLast4,
            duplicateCustomer: Boolean(dupCustomer),
            duplicateAccount: Boolean(dupAccount),
          },
        });
        throw new AppError(
          'CONFLICT',
          'Duplicate enrollment refused: CNIC, thumbprint, or bank account is already enrolled',
        );
      }

      let referredById: string | null = null;
      if (params.referralCodeUsed) {
        const refRow = await tx
          .selectFrom('fp.customers')
          .select('id')
          .where('referral_code', '=', params.referralCodeUsed.trim().toUpperCase())
          .executeTakeFirst();
        if (!refRow) {
          throw new AppError('BAD_REQUEST', 'Invalid student referral code');
        }
        referredById = refRow.id;
      }

      // 1. Create shopper CASA account
      const accountNoEnc = encryptField(normAccount, this.deps.keyring, {
        table: 'accounts',
        column: 'account_no_enc',
        rowId: casaAccountId,
      });

      await tx
        .insertInto('fp.accounts')
        .values({
          id: casaAccountId,
          book_institution_id: params.institutionId,
          owner_type: 'CUSTOMER',
          owner_id: customerId,
          kind: 'CUSTOMER_CASA',
          bucket: 0,
          account_no_enc: accountNoEnc,
          account_no_hmac: accountHmac,
          balance_mode: 'SYNC',
          status: 'ACTIVE',
        })
        .execute();

      // 2. Insert customer record with encrypted PII
      const fullNameEnc = encryptField(params.fullName.trim(), this.deps.keyring, {
        table: 'customers',
        column: 'full_name_enc',
        rowId: customerId,
      });
      const cnicEnc = encryptField(normCnic, this.deps.keyring, {
        table: 'customers',
        column: 'cnic_enc',
        rowId: customerId,
      });
      const phoneEnc = encryptField(normPhone, this.deps.keyring, {
        table: 'customers',
        column: 'phone_enc',
        rowId: customerId,
      });

      const firstPrefix =
        params.fullName
          .trim()
          .split(/\s+/)[0]
          ?.replace(/[^A-Za-z]/g, '')
          .toUpperCase()
          .slice(0, 6) || 'FPUSER';
      const referralCode =
        params.customReferralCode ??
        `${firstPrefix}-FP${randomBytes(2).toString('hex').toUpperCase()}`;

      await tx
        .insertInto('fp.customers')
        .values({
          id: customerId,
          institution_id: params.institutionId,
          display_name: displayName,
          full_name_enc: fullNameEnc,
          cnic_enc: cnicEnc,
          cnic_hmac: cnicHmac,
          cnic_last4: cnicLast4,
          phone_enc: phoneEnc,
          phone_hmac: phoneHmac,
          phone_last4: phoneLast4,
          thumb_lookup: thumbLookup,
          thumb_key_version: 1,
          account_type: params.accountType,
          casa_account_id: casaAccountId,
          status: 'ACTIVE',
          thumb_locked_at: null,
          consent_version: params.consentVersion,
          consent_at: new Date(),
          nadra_ref: params.nadraRef,
          nadra_verified_at: new Date(),
          referral_code: referralCode,
          referred_by: referredById,
          first_payment_at: params.markFirstPaymentCompleted ? new Date() : null,
          demo_token: captureToken,
        })
        .execute();

      // 3. Fund opening balance via double-entry ledger (OPENING_EQUITY -> CUSTOMER_CASA)
      if (params.openingBalance > 0n) {
        const equity = await getOrCreateSystemAccount(tx, params.institutionId, 'OPENING_EQUITY');
        await postJournal(tx, {
          kind: 'PAYMENT',
          refType: 'ENROLLMENT_OPENING',
          refId: customerId,
          memo: `Opening balance for ${displayName}`,
          entries: [
            {
              bookInstitutionId: params.institutionId,
              accountId: equity.id,
              amount: -params.openingBalance,
            },
            {
              bookInstitutionId: params.institutionId,
              accountId: casaAccountId,
              amount: params.openingBalance,
            },
          ],
        });
      }

      // 4. Send enrollment SMS & audit event
      await sendSms(tx, {
        customerId,
        phoneHmac,
        phoneLast4,
        template: 'ENROLLMENT_WELCOME',
        body: `FingerPay: Welcome ${displayName}! Your thumb is active (NADRA ref ${params.nadraRef}). Reply LOCK anytime to freeze thumb payments.`,
      });

      await recordAuditEvent(tx, {
        actorType: 'STAFF',
        actorId: params.actorId,
        action: 'CUSTOMER_ENROLLED',
        entity: 'customer',
        entityId: customerId,
        details: {
          displayName,
          accountType: params.accountType,
          cnicLast4,
          phoneLast4,
          nadraRef: params.nadraRef,
          consentVersion: params.consentVersion,
        },
      });

      return {
        customerId,
        casaAccountId,
        displayName,
        accountType: params.accountType,
        cnicLast4,
        phoneLast4,
        nadraRef: params.nadraRef,
        referralCode,
        openingBalance: formatAmount(params.openingBalance),
        demoToken: captureToken,
      };
    });
  }

  async lookupByCnic(institutionId: string | null, rawCnic: string) {
    const normCnic = normalizeCnic(rawCnic);
    const cnicHmac = computeBlindIndex(normCnic, this.cnicSubkey);

    let q = this.deps.db
      .selectFrom('fp.customers')
      .selectAll()
      .where('cnic_hmac', '=', cnicHmac);

    if (institutionId) {
      q = q.where('institution_id', '=', institutionId);
    }

    const row = await q.executeTakeFirst();
    if (!row) {
      throw new AppError('NOT_FOUND', 'Customer not found');
    }

    return {
      customerId: row.id,
      displayName: row.display_name,
      accountType: row.account_type,
      cnicLast4: row.cnic_last4,
      phoneLast4: row.phone_last4,
      status: row.status,
      thumbLocked: row.thumb_locked_at !== null,
      thumbLockedAt: row.thumb_locked_at ? new Date(row.thumb_locked_at).toISOString() : null,
      nadraRef: row.nadra_ref,
    };
  }

  async setThumbLock(params: {
    actorId: string;
    institutionId: string | null;
    customerId: string;
    locked: boolean;
    reason?: string | undefined;
  }) {
    return withTransaction(this.deps.db, async (tx) => {
      let q = tx
        .selectFrom('fp.customers')
        .selectAll()
        .where('id', '=', params.customerId)
        .forUpdate();

      if (params.institutionId) {
        q = q.where('institution_id', '=', params.institutionId);
      }

      const row = await q.executeTakeFirst();
      if (!row) {
        throw new AppError('NOT_FOUND', 'Customer not found');
      }

      const lockedAt = params.locked ? new Date() : null;
      await tx
        .updateTable('fp.customers')
        .set({ thumb_locked_at: lockedAt })
        .where('id', '=', row.id)
        .execute();

      const phoneHmac = Buffer.isBuffer(row.phone_hmac)
        ? row.phone_hmac
        : Buffer.from(row.phone_hmac);

      await sendSms(tx, {
        customerId: row.id,
        phoneHmac,
        phoneLast4: row.phone_last4,
        template: params.locked ? 'THUMB_LOCKED_CONFIRM' : 'THUMB_UNLOCKED_CONFIRM',
        body: params.locked
          ? 'FingerPay: Your thumb payments have been LOCKED by bank staff.'
          : 'FingerPay: Your thumb payments have been UNLOCKED at your bank branch.',
      });

      await recordAuditEvent(tx, {
        actorType: 'STAFF',
        actorId: params.actorId,
        action: params.locked ? 'THUMB_LOCKED_BY_BRANCH' : 'THUMB_UNLOCKED_BY_BRANCH',
        entity: 'customer',
        entityId: row.id,
        details: { reason: params.reason ?? null },
      });

      return {
        customerId: row.id,
        displayName: row.display_name,
        accountType: row.account_type,
        cnicLast4: row.cnic_last4,
        phoneLast4: row.phone_last4,
        status: row.status,
        thumbLocked: lockedAt !== null,
        thumbLockedAt: lockedAt ? lockedAt.toISOString() : null,
        nadraRef: row.nadra_ref,
      };
    });
  }
}
