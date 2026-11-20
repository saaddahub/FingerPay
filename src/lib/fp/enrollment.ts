// Encrypt + index a shopper's PII and call fp.api_enroll_customer. Shared by the demo seed and the
// branch enrollment route (M3) so both bind ciphertexts to rows the same way.
import type { Sql } from "postgres";
import {
  accountIndex, cnicIndex, encryptPii, last4, normalizeAccountNo, normalizeCnic, thumbLookup, THUMB_KEY_VERSION, type Keyring,
} from "./crypto.ts";

export type EnrollmentInput = {
  actor: string;  // auth user id of the branch officer / manager
  customerId: string;  // chosen by the server before the thumb scan; part of every ciphertext's AAD
  fullName: string;
  displayName: string;  // "Ayesha K."
  cnic: string;
  phone: string;
  accountNo: string;
  accountType: "SHOPPER_SALARY" | "STUDENT_NON_PTA";
  openingBalance: string;  // exact decimal, e.g. "15000.00"
  thumbToken: Buffer;  // capture token; only its HMAC reaches the database
  nadraRef: string;
  consentVersion: string;
  referralCode: string | null;
};

export type EnrollmentResult = { ok: true; customer_id: string; referral_code: string | null } | { ok: false; error: string };

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!/^\d{10,13}$/.test(digits)) throw new Error("phone number is malformed");
  return digits;
}

export async function enrollCustomer(sql: Sql, keys: { keyring: Keyring; lookupKey: Buffer }, input: EnrollmentInput): Promise<EnrollmentResult> {
  const { customerId } = input;
  const enc = (table: "customers" | "accounts", column: string, value: string) => encryptPii(keys.keyring, value, { table, column, rowId: customerId });
  const cnic = normalizeCnic(input.cnic), phone = normalizePhone(input.phone), accountNo = normalizeAccountNo(input.accountNo);
  const [row] = await sql`select fp.api_enroll_customer(
    ${input.actor}::uuid, ${customerId}::uuid, ${input.displayName}, ${input.accountType},
    ${enc("customers", "full_name_enc", input.fullName)}::bytea,
    ${enc("customers", "cnic_enc", cnic)}::bytea, ${cnicIndex(keys.lookupKey, cnic)}::bytea, ${last4(cnic)},
    ${enc("customers", "phone_enc", phone)}::bytea, ${last4(phone)},
    ${enc("accounts", "account_no_enc", accountNo)}::bytea, ${accountIndex(keys.lookupKey, accountNo)}::bytea, ${last4(accountNo)},
    ${input.openingBalance}::numeric, ${thumbLookup(keys.lookupKey, input.thumbToken)}::bytea, ${THUMB_KEY_VERSION}::smallint,
    ${input.nadraRef}, ${input.consentVersion}, ${input.referralCode}) as result`;
  return row.result as EnrollmentResult;
}
