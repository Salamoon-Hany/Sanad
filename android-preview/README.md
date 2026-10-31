# SANAD Android online preview

This installable Android APK launches the existing SANAD website in an Android
Custom Tab, with a normal-browser fallback. It is a browser-backed preview,
not a standalone native Flutter build. It uses the browser's existing sign-in
session and keeps the private Site's access policy intact. No Site bypass token,
Firebase server key, password, or embedded authentication cookie is included.

Requires Android 6.0 or newer, an installed browser, internet access, and an
account authorized to visit the private SANAD Site. Sign in with that ChatGPT
account first, then sign in to SANAD normally. Camera/location permissions and
email verification continue to be handled by the website and browser.

The existing Flutter Android project is unchanged. A standalone native Flutter
APK still requires registered Android Firebase client configuration and an
authorized mobile route to the marketplace API. Do not embed a Site bypass
credential in a distributed APK or publish the private Site to work around it.

Build this preview with JDK 17, Android SDK 36, Gradle 8.14.3:

```sh
gradle -p android-preview :app:assembleDebug :app:lintDebug
```

The CI APK is debug-signed for sideload testing, not a Play Store release. Its
package is `com.salamoon.sanad.preview`, separate from the future production app.
