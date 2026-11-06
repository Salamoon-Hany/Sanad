import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:device_preview/device_preview.dart';
import 'package:firebase_core/firebase_core.dart';

import 'firebase_options.dart';
import 'l10n/app_language.dart';
import 'services/local_account_store.dart';
import 'screens/dashboard.dart';

Future<void> main() async {
  // Catch synchronous Flutter framework errors
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('Uncaught Flutter Error: ${details.exceptionAsString()}');
  };

  // Catch asynchronous errors across root isolates
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    debugPrint('Uncaught Async Error: $error\n$stack');
    return true;
  };

  WidgetsFlutterBinding.ensureInitialized();

  // Configure transparent edge-to-edge system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
    ),
  );

  // Parallelize independent local store initializations
  await Future.wait([
    AppLanguage.initialize(),
    LocalAccountStore.initialize(),
  ]);

  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (error, stackTrace) {
    // Fail closed: the account gate blocks services until setup is complete.
    debugPrint('Firebase is not ready ($error). StackTrace:\n$stackTrace\nSee docs/SETUP.md.');
  }

  runApp(
    DevicePreview(
      enabled: kDebugMode && const bool.fromEnvironment('DEVICE_PREVIEW'),
      builder: (context) => const MyApp(),
    ),
  );
}
