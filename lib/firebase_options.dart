import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

/// Public client configuration. Android values come from the registered app's
/// SDK configuration; server keys must never be passed as Dart defines.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    if (defaultTargetPlatform == TargetPlatform.android) return android;
    throw UnsupportedError(
      'Firebase is not configured for this platform.',
    );
  }

  static FirebaseOptions get android => androidOptions(
    appId: const String.fromEnvironment('FIREBASE_ANDROID_APP_ID'),
    apiKey: const String.fromEnvironment('FIREBASE_ANDROID_API_KEY'),
  );

  @visibleForTesting
  static FirebaseOptions androidOptions({
    required String appId,
    required String apiKey,
  }) {
    if (!RegExp(r'^1:859176819205:android:[0-9a-f]+$').hasMatch(appId) ||
        !RegExp(r'^AIza[0-9A-Za-z_-]{35}$').hasMatch(apiKey)) {
      throw StateError('The registered SANAD Android configuration is missing.');
    }
    return FirebaseOptions(
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: web.messagingSenderId,
      projectId: web.projectId,
      storageBucket: web.storageBucket,
    );
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDErM-SGwWQ76_YTj_AIiZbD8ODBdh9d0g',
    appId: '1:859176819205:web:03ac89a6396d877e3e9a6c',
    messagingSenderId: '859176819205',
    projectId: 'salamoon-services',
    authDomain: 'salamoon-services.firebaseapp.com',
    storageBucket: 'salamoon-services.firebasestorage.app',
    measurementId: 'G-4L75VEQPDY',
  );
}
