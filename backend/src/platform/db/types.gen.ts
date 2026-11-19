import type { ColumnType, Generated } from 'kysely';

/**
 * Kysely database schema types for the `fp` private schema.
 * Extended in lockstep with `backend/db/migrations/*.sql`.
 */

export interface FpSchemaMigrationsTable {
  version: string;
}

export interface FpInstitutionsTable {
  id: Generated<string>;
  code: string;
  name: string;
  kind: 'BANK' | 'CENTRAL' | 'FINGERPAY';
  raast_participant_code: string | null;
  raast_available: Generated<boolean>;
  dispute_prefix: string;
  created_at: Generated<Date>;
}

export interface FpBranchesTable {
  id: Generated<string>;
  institution_id: string;
  code: string;
  name: string;
  created_at: Generated<Date>;
}

export interface FpMerchantsTable {
  id: Generated<string>;
  institution_id: string;
  name: string;
  settlement_account_id: string | null;
  status: Generated<'ACTIVE' | 'SUSPENDED' | 'CLOSED'>;
  require_claim: Generated<boolean>;
  terminal_trial_ends_at: Generated<Date>;
  created_at: Generated<Date>;
}

export interface FpStaffUsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  role:
    | 'MERCHANT_CASHIER'
    | 'MERCHANT_OWNER'
    | 'BRANCH_OFFICER'
    | 'BRANCH_MANAGER'
    | 'BANK_ADMIN'
    | 'AUDITOR'
    | 'DEMO_OBSERVER';
  institution_id: string | null;
  branch_id: string | null;
  merchant_id: string | null;
  totp_secret_enc: Buffer | Uint8Array | null;
  mfa_enrolled_at: Date | null;
  status: Generated<'ACTIVE' | 'LOCKED' | 'SUSPENDED'>;
  failed_logins: Generated<number>;
  locked_until: Date | null;
  created_at: Generated<Date>;
}

export interface FpRefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  family_id: string;
  token_hash: string;
  aal: 1 | 2;
  expires_at: Date;
  rotated_at: Date | null;
  revoked_at: Date | null;
  created_at: Generated<Date>;
}

export interface FpTerminalsTable {
  id: Generated<string>;
  merchant_id: string;
  label: Generated<string>;
  public_key_spki: string;
  key_sha256: string;
  status: Generated<'ACTIVE' | 'REVOKED'>;
  throttled_until: Date | null;
  paired_by: string;
  revoked_by: string | null;
  revoked_at: Date | null;
  last_seen_at: Date | null;
  created_at: Generated<Date>;
}

export interface FpRequestNoncesTable {
  terminal_id: string;
  nonce: string;
  seen_at: Generated<Date>;
}

export type AccountKind =
  | 'CUSTOMER_CASA'
  | 'MERCHANT_CASA'
  | 'FP_FEE_RECEIVABLE'
  | 'BANK_FEE_INCOME'
  | 'MARKETING_POOL'
  | 'RAAST_OUTWARD_CLEARING'
  | 'RAAST_INWARD_CLEARING'
  | 'SBP_SETTLEMENT'
  | 'OPENING_EQUITY';

export interface FpAccountsTable {
  id: Generated<string>;
  book_institution_id: string;
  owner_type: 'CUSTOMER' | 'MERCHANT' | 'SYSTEM';
  owner_id: string | null;
  kind: AccountKind;
  bucket: Generated<number>;
  account_no_enc: Buffer | Uint8Array | null;
  account_no_hmac: Buffer | Uint8Array | null;
  balance: ColumnType<string, string | undefined, never>;
  balance_mode: Generated<'SYNC' | 'ASYNC'>;
  status: Generated<'ACTIVE' | 'FROZEN' | 'CLOSED'>;
  created_at: Generated<Date>;
}

export type AccountType = 'SHOPPER_SALARY' | 'STUDENT_NON_PTA';

export interface FpCustomersTable {
  id: Generated<string>;
  institution_id: string;
  display_name: string;
  full_name_enc: Buffer | Uint8Array;
  cnic_enc: Buffer | Uint8Array;
  cnic_hmac: Buffer | Uint8Array;
  cnic_last4: string;
  phone_enc: Buffer | Uint8Array;
  phone_hmac: Buffer | Uint8Array;
  phone_last4: string;
  thumb_lookup: Buffer | Uint8Array;
  thumb_key_version: Generated<number>;
  account_type: AccountType;
  casa_account_id: string;
  status: Generated<'ACTIVE' | 'SUSPENDED' | 'CLOSED'>;
  thumb_locked_at: Date | null;
  consent_version: string;
  consent_at: Date;
  nadra_ref: string;
  nadra_verified_at: Date;
  referral_code: string | null;
  referred_by: string | null;
  first_payment_at: Date | null;
  demo_token: string | null;
  created_at: Generated<Date>;
}

export type JournalKind = 'PAYMENT' | 'VOID' | 'REFUND' | 'REFERRAL' | 'REBATE' | 'FUNDING';

export interface FpJournalsTable {
  id: Generated<string>;
  kind: JournalKind;
  ref_type: string;
  ref_id: string;
  memo: string | null;
  created_at: Generated<Date>;
}

export interface FpJournalEntriesTable {
  id: Generated<string>;
  journal_id: string;
  book_institution_id: string;
  account_id: string;
  amount: string;
  created_at: Generated<Date>;
}

export interface FpRiskLimitsTable {
  account_type: AccountType;
  per_tap: string;
  daily_amount: string;
  daily_count: number;
}

export interface FpAccountDailyUsageTable {
  account_id: string;
  day_pkt: string;
  amount: string;
  tap_count: number;
}

export interface FpChargeSessionsTable {
  id: Generated<string>;
  terminal_id: string;
  merchant_id: string;
  opened_by: string;
  amount: string;
  status: Generated<'OPEN' | 'PAID' | 'LOCKED' | 'EXPIRED' | 'CANCELLED'>;
  failed_attempts: Generated<number>;
  expires_at: Date;
  paid_attempt_id: string | null;
  created_at: Generated<Date>;
}

export interface FpRaastTransfersTable {
  id: Generated<string>;
  raast_ref: string;
  from_institution_id: string;
  to_institution_id: string;
  amount: string;
  status: 'SETTLED' | 'REJECTED';
  created_at: Generated<Date>;
}

export interface FpPaymentAttemptsTable {
  id: Generated<string>;
  charge_id: string;
  terminal_id: string;
  merchant_id: string;
  customer_id: string | null;
  outcome: string;
  routing: 'ON_US' | 'OFF_US';
  gross: string;
  fee: Generated<string>;
  fp_share: Generated<string>;
  bank_share: Generated<string>;
  net: Generated<string>;
  cashback: Generated<string>;
  journal_id: string | null;
  raast_ref: string | null;
  processing_ms: number;
  created_at: Generated<Date>;
}

export interface FpOfflineEventsTable {
  id: Generated<string>;
  terminal_id: string;
  merchant_id: string;
  amount: string | null;
  occurred_at: Date;
  uploaded_at: Generated<Date>;
}

export interface FpMerchantMonthlyStatsTable {
  merchant_id: string;
  month_pkt: string;
  settled_count: number;
  rebate_journal_id: string | null;
}

export interface FpReversalsTable {
  id: Generated<string>;
  attempt_id: string;
  kind: 'VOID' | 'REFUND';
  amount: string;
  reason: string;
  maker_id: string;
  checker_id: string | null;
  status: Generated<'PENDING_CHECKER' | 'APPROVED' | 'REJECTED'>;
  journal_id: string | null;
  decision_reason: string | null;
  created_at: Generated<Date>;
  decided_at: Date | null;
}

export interface FpDisputesTable {
  id: Generated<string>;
  ticket: string;
  attempt_id: string;
  customer_id: string;
  source: 'SMS' | 'BRANCH';
  reason: string;
  status: Generated<'OPEN' | 'REFUND_REQUESTED' | 'REFUNDED' | 'REJECTED'>;
  reversal_id: string | null;
  created_at: Generated<Date>;
  resolved_at: Date | null;
}

export interface FpSmsMessagesTable {
  id: Generated<string>;
  direction: 'OUT' | 'IN';
  customer_id: string | null;
  phone_hmac: Buffer | Uint8Array;
  phone_last4: string;
  template: string;
  body: string;
  related_attempt_id: string | null;
  created_at: Generated<Date>;
}

export interface FpAuditEventsTable {
  id: Generated<string>;
  occurred_at: Generated<Date>;
  actor_type: 'STAFF' | 'TERMINAL' | 'SHOPPER_SMS' | 'SYSTEM';
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown>;
  prev_hash: Generated<string>;
  row_hash: Generated<string>;
}

export interface Database {
  'fp.schema_migrations': FpSchemaMigrationsTable;
  'fp.institutions': FpInstitutionsTable;
  'fp.branches': FpBranchesTable;
  'fp.merchants': FpMerchantsTable;
  'fp.staff_users': FpStaffUsersTable;
  'fp.refresh_tokens': FpRefreshTokensTable;
  'fp.terminals': FpTerminalsTable;
  'fp.request_nonces': FpRequestNoncesTable;
  'fp.accounts': FpAccountsTable;
  'fp.customers': FpCustomersTable;
  'fp.journals': FpJournalsTable;
  'fp.journal_entries': FpJournalEntriesTable;
  'fp.risk_limits': FpRiskLimitsTable;
  'fp.account_daily_usage': FpAccountDailyUsageTable;
  'fp.charge_sessions': FpChargeSessionsTable;
  'fp.raast_transfers': FpRaastTransfersTable;
  'fp.payment_attempts': FpPaymentAttemptsTable;
  'fp.offline_events': FpOfflineEventsTable;
  'fp.merchant_monthly_stats': FpMerchantMonthlyStatsTable;
  'fp.reversals': FpReversalsTable;
  'fp.disputes': FpDisputesTable;
  'fp.sms_messages': FpSmsMessagesTable;
  'fp.audit_events': FpAuditEventsTable;
}
