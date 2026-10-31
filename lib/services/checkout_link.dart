export 'checkout_link_stub.dart'
    if (dart.library.io) 'checkout_link_native.dart'
    if (dart.library.html) 'checkout_link_web.dart';
