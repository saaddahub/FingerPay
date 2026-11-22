# Customer and merchant demo accounts

The website exposes `/signup`, `/customer` and `/merchant`. The marketing navigation and `/mobile` terminal demo both link to account creation. Android builds two apps, FingerPay Customer and FingerPay Merchant, with different application IDs and isolated session storage.

Signup has two steps: Supabase email/password registration, then an authenticated profile form. If email confirmation is enabled, confirm the email and sign in to finish the second step. Unfinished users can sign in later and resume setup. No personal profile is stored in browser local storage or Auth metadata.

Both roles provide full name, Pakistani mobile number, date of birth, occupation, home address, city and postal code. Merchants additionally provide business name, business type, business address and city, with an optional registration number/NTN. The user acknowledges that the stored profile and credit are for the demo. The form asks for sample details, not real bank credentials, CNIC scans or fingerprints. It does not perform identity verification.

## Backend rollout

1. Apply `supabase/migrations/20261121000100_fp_signup.sql` to the target demo database through the normal migration workflow. It adds private profile and signup-credit tables; it does not modify existing bank accounts or payments.
2. Enable email/password signup in that demo project's Supabase Auth settings. `supabase/config.toml` enables it for local stacks only; it does not change a hosted project. Keep hosted email confirmation and provider rate limits enabled. The UI handles confirmation by asking the user to confirm and then sign in.
3. Run the web server with the existing database role and encryption keys. Set `FP_DEMO_SIGNUP=true` to enable the demo wallets independently of simulated fingerprint checkout. Local setups that omit the flag inherit `FP_DEMO_MODE`.
4. Build both Android variants using the commands in `android/README.md`, pointing them at that same backend.

No hosted migration or Auth setting is applied automatically by this code change. Existing accounts and encryption keys must be retained.

## Credit and access rules

- Profile completion credits PKR 200 once per Supabase Auth account, for either role. One account has one role; switching apps does not create a second credit.
- The database transaction writes the encrypted profile and immutable bonus entry together. Primary keys serialize duplicate/concurrent requests. Retrying preserves the original details and credit.
- Demo credit is not spendable, transferable or withdrawable. It never enters `fp.accounts` or `fp.journal_entries`. The wallet displays the persisted credit and its creation date, without invented payment history.
- Personal/business details are AES-GCM encrypted with the existing server keyring, bound to the profile's Auth user ID. The server verifies the Supabase session on each read/write. Clients cannot supply an owner ID, balance or staff role.
- Self-service merchants do not become `fp.staff`; terminal access still requires the existing provisioning process. Existing merchant staff retain their Android terminal screens.
- This is a per-account demo promotion, not verified-person uniqueness. A real-money promotion would require identity verification and an abuse/funding policy before implementation.

## Verification

`npm run test:unit` covers profile/credential validation. `npm run test:db` covers retries, fixed credit, profile immutability on retries, restricted access and separation from the bank ledger. `npm run test:http` includes local-stack signup tests using both cookie and bearer sessions, including concurrent completion; it deliberately skips creating test users on hosted Supabase projects. Android unit tests check customer request serialization and separate application identities.
