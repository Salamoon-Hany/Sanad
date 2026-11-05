import 'package:url_launcher/url_launcher.dart';
import 'secure_api.dart';

Future<bool> openCheckoutLink(String url) async {
  if (!isTrustedCheckout(url)) return false;
  try {
    return await launchUrl(
      Uri.parse(url),
      mode: LaunchMode.externalApplication,
    );
  } catch (_) {
    return false;
  }
}
