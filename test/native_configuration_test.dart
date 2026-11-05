import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app_project/firebase_options.dart';
import 'package:mobile_app_project/services/backend_config.dart';

void main() {
  test('Android refuses a web app ID and missing configuration', () {
    expect(
      () => DefaultFirebaseOptions.androidOptions(appId: '', apiKey: ''),
      throwsStateError,
    );
    expect(
      () => DefaultFirebaseOptions.androidOptions(
        appId: DefaultFirebaseOptions.web.appId,
        apiKey: DefaultFirebaseOptions.web.apiKey,
      ),
      throwsStateError,
    );
  });

  test('Android configuration must belong to the existing SANAD project', () {
    expect(
      () => DefaultFirebaseOptions.androidOptions(
        appId: '1:999:android:abcdef',
        apiKey: 'AIza${'a' * 35}',
      ),
      throwsStateError,
    );
    final options = DefaultFirebaseOptions.androidOptions(
      appId: '1:859176819205:android:abcdef',
      apiKey: 'AIza${'a' * 35}',
    );
    expect(options.projectId, 'salamoon-services');
    expect(options.appId, contains(':android:'));
  });

  test(
    'backend accepts only an HTTPS origin without credentials or a path',
    () {
      expect(
        BackendConfig.parseOrigin('https://api.example.com').host,
        'api.example.com',
      );
      for (final value in [
        'http://api.example.com',
        'https://secret@api.example.com',
        'https://api.example.com/api',
        'https://api.example.com?token=secret',
        'https://api.example.com#fragment',
        '',
      ]) {
        expect(() => BackendConfig.parseOrigin(value), throwsFormatException);
      }
    },
  );
}
