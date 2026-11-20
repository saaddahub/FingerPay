# FingerPay terminal (Android)

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
.\gradlew.bat testDebugUnitTest assembleDebug
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
```

Emulator: `fp_pixel` (Pixel 8, Android 36). Start it with
`& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd fp_pixel`.

A side-loadable release APK (signed with the debug key; fine for the prototype, not for the Play Store):
`.\gradlew.bat assembleRelease` → `app\build\outputs\apk\release\app-release.apk`.

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
