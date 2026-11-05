# SANAD standalone Flutter Android

This builds the existing Flutter customer, worker and admin screens into a real
Android package (`com.salamoon.sanad`), not a website launcher. Camera capture
uses Android image_picker; native email/password sign-in uses Firebase Auth
directly. Marketplace calls share a validated HTTPS mobile API origin.

## Required owner configuration

Reuse Firebase project `salamoon-services`. Authentication to its management CLI
is required to register the Android package and download its real SDK config.
Do not invent an Android App ID or reuse the Web App ID.

```sh
npx -y firebase-tools@latest login
node scripts/configure-sanad-android.mjs --api-url https://YOUR-MOBILE-API-ORIGIN
```

The helper reuses an existing Android registration for `com.salamoon.sanad`, or
creates that registration once, then retrieves SDK config using the CLI. It
does not change billing, auth providers, rules or user data. It writes the
three public client build settings to `config/android.json` and saves the
original SDK client file locally. No server secret belongs in these files.

The separate server bridge in `mobile-api/` must be reachable by Android without
the private website's browser sign-in gate. Every marketplace operation still
requires the correct Firebase identity and existing upstream authorization.
Preserve the website's audience; obtain explicit owner instruction before making
a new bridge Site publicly reachable. Its upstream service token is server-only.

## Validate and build

```sh
flutter pub get
flutter analyze --no-fatal-infos
flutter test
node --test worker/test/*.test.mjs mobile-api/test/*.test.mjs scripts/test/android-config.test.mjs
node scripts/check-sanad-android.mjs config/android.json
flutter build apk --profile --target-platform android-arm64 --build-name 1.0.1 --build-number 2 --dart-define-from-file=config/android.json
```

The optimized profile APK is for personal ARM64 device testing and uses Android's
development signing configuration. The production release keystore guard is
unchanged. This APK contains libflutter.so and libapp.so, and opens the Flutter
app directly. A Play Store release and physical camera/GPS acceptance are
separate steps. Existing live-payment limitations remain unchanged.

CI can compile the native package before owner configuration exists, but it
deliberately does not upload that unconfigured APK as an installable deliverable.
After real configuration and API checks pass, CI signs, verifies and uploads the
actual native APK. A successful compile alone is not a working online app.
