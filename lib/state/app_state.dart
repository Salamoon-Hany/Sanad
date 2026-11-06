import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../services/marketplace_service.dart';
import '../services/local_account_store.dart';
import '../services/account_service.dart';
import '../services/phone_login_service.dart';
import '../services/verification_service.dart';
import '../models/wallet.dart';
import '../models/selected_location.dart';
import '../screens/dashboard.dart';

/// Central application state manager holding account, theme, profile, orders, and notification state.
class AppState {
  static String _userPhoneNumber = '';
  static String _userName = '';
  static String _userEmail = '';
  static String _userGender = '';

  static void clearAccount() {
    Marketplace.shared.stop();
    setPhoneNumber('');
    setUserEmail('');
    setUserName('');
    setUserGender('');
    BookingState.reset();
    LocalAccountStore.save();
    AccountService.activeUid = null;
    setUserProfileImageBytes(null);
    WalletState.shared.clear();
    OrdersManager.clear();
    NotificationManager.clear();
  }

  static void loadAccount(User user, Map<String, dynamic> data) {
    final switching = AccountService.activeUid != user.uid;
    if (switching) clearAccount();
    AccountService.activeUid = user.uid;
    WalletState.shared.attach(user.uid);
    if (switching) LocalAccountStore.restore(user.uid);
    setPhoneNumber(user.phoneNumber ?? '');
    setUserEmail(user.email ?? '');
    setUserName(data['name'] as String? ?? '');
    setUserGender(data['gender'] as String? ?? '');
    if (VerificationService.configured && (user.phoneNumber ?? '').isNotEmpty) {
      unawaited(
        PhoneLoginService.syncVerifiedPhone().catchError((Object _) {}),
      );
    }
  }

  static void setPhoneNumber(String phone) => _userPhoneNumber = phone;
  static String getPhoneNumber() => _userPhoneNumber;

  static void setUserName(String name) => _userName = name;
  static String getUserName() => _userName;

  static void setUserEmail(String email) => _userEmail = email;
  static String getUserEmail() => _userEmail;

  static void setUserGender(String gender) => _userGender = gender;
  static String getUserGender() => _userGender;

  static final profileImage = ValueNotifier<Uint8List?>(null);
  static void setUserProfileImageBytes(Uint8List? bytes) {
    profileImage.value = bytes;
    LocalAccountStore.save();
  }

  static Uint8List? getUserProfileImageBytes() => profileImage.value;
  static final ValueNotifier<bool> darkMode = ValueNotifier(false);
  static void setDarkMode(bool value) => darkMode.value = value;
  static void toggleDarkMode() => setDarkMode(!darkMode.value);
}

// Global Notifications Manager
class NotificationManager {
  static final List<NotificationModel> _notifications = [];

  static List<NotificationModel> getNotifications() => _notifications;

  static void addNotification(NotificationModel notification) {
    _notifications.insert(0, notification);
  }

  static void clear() {
    _notifications.clear();
  }
}

// Global Orders Manager
class OrdersManager {
  static final ValueNotifier<List<OrderModel>> _orders =
      ValueNotifier<List<OrderModel>>([]);

  static ValueNotifier<List<OrderModel>> get notifier => _orders;
  static List<OrderModel> getOrders() => _orders.value;

  static void restore(List<OrderModel> orders) {
    _orders.value = List.unmodifiable(orders);
  }

  static void clear() {
    _orders.value = [];
  }

  static void addOrder({
    required String service,
    required String description,
    required String icon,
    SelectedLocation? location,
  }) {
    final now = DateTime.now();
    final newOrder = OrderModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      service: service,
      description: description,
      location: location,
      status: 'pending',
      icon: icon,
      createdAt: now,
      statusChangedAt: now,
    );
    final updated = List<OrderModel>.from(_orders.value)..insert(0, newOrder);
    _orders.value = updated;

    LocalAccountStore.save();
  }
}
