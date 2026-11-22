# FingerPay Customer & Merchant (Android)

Two separately installable apps are built from the same native codebase:

| App | Application ID (release) | Entry experience |
|---|---|---|
| FingerPay Customer | `pk.fingerpay.customer` | Signup/sign-in, personal details, personal demo wallet, activity and profile. |
| FingerPay Merchant | `pk.fingerpay.terminal` | Signup/sign-in, personal and business details, business demo wallet. Existing provisioned staff retain the terminal flow below. |

Debug IDs end in `.debug`. Merchant keeps the existing application ID so installed merchant terminals can upgrade. Sessions and device storage are isolated between the two apps.

New accounts receive **PKR 200 demo credit once**, on completing their profile. The server persists the credit; reinstalling, signing in again and retrying signup do not award another bonus. Demo credit has no cash value and is separate from the bank ledger. Self-service merchant signup does not grant staff privileges or pair a terminal. See [account setup](../docs/ACCOUNTS.md) for the required backend migration and Auth settings.

The shop's FingerPay terminal as a native Android app: Kotlin + Jetpack Compose, minSdk 28, targetSdk 36. Rasheed's counter app, in the v4 "Paper & Ink" design (`docs/design/SYSTEM.md`).

## What it does

| Screen | What's real |
|---|---|
| Sign in | Supabase Auth (email + password) against the project in `local.properties`. Only owners and cashiers get in. |
| Pair | Creates an ECDSA P-256 key in the Android Keystore (StrongBox when the phone has it) and sends only the public key to `POST /api/v1/terminals/pair`. Owner only. |
| Home | Live figures from `/api/v1/merchant/summary`. Three cards (Today · This terminal · This month): swipe to cycle, tap to flip. |
| Freeze | "Freeze card" freezes **this terminal**: `POST /api/v1/terminals/{id}/freeze`. A frozen terminal opens no charges (database rule). Owners and cashiers freeze; unfreezing needs the owner **and** this phone's fingerprint or screen lock. The card frosts over (AGSL shader on Android 13+, blur on 12, tint below). |
| Sell | Keypad → `POST /api/v1/pos/charges` (signed) → 120 s wait → thumb → `POST /api/v1/pos/charges/{id}/thumb` (signed) → result banner. |
| Thumb | Simulated for now: the demo shopper tray (`/api/v1/demo/finger-tray`, demo mode only). The USB fingerprint reader (R307 over OTG) comes later; the API already accepts `{"source":"reader","token":…}`. |
| Offline | No network → "Take cash", nothing is queued or charged later. The cash sale is recorded for the ledger on reconnect. |
| Activity | Today's ledger. Shopper names only on settled sales. |

Every terminal request is signed (SPEC §4.5): `X-FP-Terminal`, `X-FP-Timestamp`, `X-FP-Nonce`, `X-FP-Signature` over `FPv1\nMETHOD\npath\nterminal\ntimestamp\nnonce\nbase64url(sha256(body))`. The format is unit-tested on both sides (`app/src/test/.../SigningTest.kt`, `src/lib/fp/signing.test.ts`).

Security notes: the session and terminal id are AES-GCM sealed with a Keystore key; backups and device transfer are off; release builds allow HTTPS only; debug builds allow plain HTTP to `10.0.2.2` (the PC, seen from the emulator) and nothing else. There is no HTTP logging.

## Build and run

Toolchain (installed per-user, no admin): JDK 21 at `%LOCALAPPDATA%\Programs\Temurin\jdk-21.0.13+9`, Android SDK at `%LOCALAPPDATA%\Android\Sdk`.

```powershell
$env:JAVA_HOME = "$env:LOCALAPPDATA\Programs\Temurin\jdk-21.0.13+9"
cd android
.\gradlew.bat testMerchantDebugUnitTest testCustomerDebugUnitTest assembleMerchantDebug assembleCustomerDebug
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\merchant\debug\app-merchant-debug.apk
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\customer\debug\app-customer-debug.apk
```

Emulator: `fp_pixel` (Pixel 8, Android 36). Start it with
`& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd fp_pixel`.

A side-loadable release APK (signed with the debug key; fine for the prototype, not for the Play Store):
`.\gradlew.bat assembleMerchantRelease assembleCustomerRelease` → `app\build\outputs\apk\merchant\release\app-merchant-release.apk` and `app\build\outputs\apk\customer\release\app-customer-release.apk`.

For the landing page, build these release variants with `-Pfp.apiBaseUrl=https://fingerpayy.vercel.app` and the hosted Supabase URL and public key in `local.properties`. Copy the resulting files to `public/downloads/fingerpay-merchant.apk` and `public/downloads/fingerpay-customer.apk` at the repository root before deploying the site.

## Pointing it at a backend

`android/local.properties` (never committed):

```properties
sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
fp.apiBaseUrl=http://10.0.2.2:3000        # the Next.js app on your PC, from the emulator
fp.supabaseUrl=http://10.0.2.2:54321      # local Supabase; or https://<ref>.supabase.co
fp.supabaseAnonKey=<the project's anon/publishable key>
```

For a real phone on the same Wi-Fi, use the PC's LAN address over HTTPS, or deploy the web app and use its HTTPS URL.

The backend needs the API routes from `src/app/api/v1/` running with `FP_DEMO_MODE=true` and the demo seed applied (`npm run seed:demo`), so the owner, cashier and demo shoppers exist.
