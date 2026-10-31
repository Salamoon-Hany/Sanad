import 'package:flutter/foundation.dart';
import 'secure_api.dart';

/// One HTTPS origin for mobile marketplace requests. No website session or
/// shared service credential belongs in a native client.
abstract final class BackendConfig {
  static const mobileOrigin = String.fromEnvironment('MARKETPLACE_API_URL');

  static Uri get origin => parseOrigin(kIsWeb ? Uri.base.origin : mobileOrigin);

  @visibleForTesting
  static Uri parseOrigin(String value) {
    final uri = secureEndpoint(Uri.parse(value));
    if (uri.hasQuery || (uri.path.isNotEmpty && uri.path != '/')) {
      throw const FormatException('A secure connection is required.');
    }
    return uri;
  }

  static Uri marketplace(String path) =>
      origin.resolve('/api/marketplace/$path');
}
