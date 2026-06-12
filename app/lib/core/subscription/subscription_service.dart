import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

import '../config/env.dart';
import '../data/muhurtha_engine_api.dart';
import 'subscription_constants.dart';
import 'subscription_state.dart';

/// Legacy alias used by a few call sites; Pro is the only paid tier in RevenueCat.
enum PaywallPlan { plus, pro }

final subscriptionServiceProvider = Provider<SubscriptionService>((ref) {
  return SubscriptionService(ref);
});

class SubscriptionException implements Exception {
  SubscriptionException(this.message, {this.code});

  final String message;
  final String? code;

  @override
  String toString() => message;
}

class SubscriptionService {
  SubscriptionService(this._ref);

  final Ref _ref;
  var _configured = false;
  var _listenerAttached = false;

  String? get _apiKey {
    if (Env.revenueCatApiKey.isNotEmpty) return Env.revenueCatApiKey;
    if (Platform.isAndroid && Env.revenueCatAndroidKey.isNotEmpty) {
      return Env.revenueCatAndroidKey;
    }
    if (Platform.isIOS && Env.revenueCatIosKey.isNotEmpty) {
      return Env.revenueCatIosKey;
    }
    return null;
  }

  bool get isAvailable => _apiKey != null;

  static bool isProEntitled(CustomerInfo info) {
    final active = info.entitlements.active;
    if (active.containsKey(SubscriptionConstants.entitlementPro)) {
      return active[SubscriptionConstants.entitlementPro]?.isActive == true;
    }
    for (final entry in active.entries) {
      final key = entry.key.toLowerCase();
      if (key == 'muhurtha pro' || key == 'muhurtha_pro') {
        return entry.value.isActive;
      }
    }
    return false;
  }

  Future<void> configureForProfile(String profileId) async {
    final key = _apiKey;
    if (key == null) return;

    await Purchases.setLogLevel(kDebugMode ? LogLevel.debug : LogLevel.warn);

    if (!_configured) {
      final config = PurchasesConfiguration(key);
      await Purchases.configure(config);
      _configured = true;
      _attachCustomerInfoListener();
    }

    try {
      final result = await Purchases.logIn(profileId);
      _ref
          .read(subscriptionStateProvider.notifier)
          .setCustomerInfo(result.customerInfo);
      await _syncCustomerInfoToServer(result.customerInfo);
    } catch (e) {
      _handleError(e, rethrowError: false);
      final info = await fetchCustomerInfo();
      await _syncCustomerInfoToServer(info);
    }

    _ref.read(subscriptionStateProvider.notifier).setConfigured(true);
  }

  void _attachCustomerInfoListener() {
    if (_listenerAttached) return;
    _listenerAttached = true;
    Purchases.addCustomerInfoUpdateListener((info) async {
      _ref.read(subscriptionStateProvider.notifier).setCustomerInfo(info);
      await _syncCustomerInfoToServer(info);
    });
  }

  Future<CustomerInfo> fetchCustomerInfo() async {
    _requireConfigured();
    return Purchases.getCustomerInfo();
  }

  Future<Offerings?> fetchOfferings() async {
    _requireConfigured();
    return Purchases.getOfferings();
  }

  Future<Package?> packageForBillingPeriod({
    required bool yearly,
  }) async {
    final offerings = await fetchOfferings();
    final offering = offerings?.current ??
        offerings?.getOffering(SubscriptionConstants.defaultOffering);
    if (offering == null) return null;

    final wantedId = yearly
        ? SubscriptionConstants.packageYearly
        : SubscriptionConstants.packageMonthly;
    for (final pkg in offering.availablePackages) {
      if (pkg.identifier.toLowerCase() == wantedId) return pkg;
    }

    final wantedType = yearly ? PackageType.annual : PackageType.monthly;
    for (final pkg in offering.availablePackages) {
      if (pkg.packageType == wantedType) return pkg;
    }
    return offering.availablePackages.isNotEmpty
        ? offering.availablePackages.first
        : null;
  }

  /// Presents the RevenueCat-hosted paywall (monthly + yearly from dashboard).
  Future<PaywallResult> presentPaywall({bool onlyIfNeeded = false}) async {
    _requireConfigured();
    _ref.read(subscriptionStateProvider.notifier).setLoading(true);
    try {
      final PaywallResult result;
      if (onlyIfNeeded) {
        result = await RevenueCatUI.presentPaywallIfNeeded(
          SubscriptionConstants.entitlementPro,
          displayCloseButton: true,
        );
      } else {
        result = await RevenueCatUI.presentPaywall(
          displayCloseButton: true,
        );
      }
      if (result == PaywallResult.purchased ||
          result == PaywallResult.restored) {
        final info = await fetchCustomerInfo();
        await _syncCustomerInfoToServer(info);
      }
      return result;
    } catch (e) {
      throw _handleError(e);
    } finally {
      _ref.read(subscriptionStateProvider.notifier).setLoading(false);
    }
  }

  Future<void> presentCustomerCenter() async {
    _requireConfigured();
    try {
      await RevenueCatUI.presentCustomerCenter();
      final info = await fetchCustomerInfo();
      _ref.read(subscriptionStateProvider.notifier).setCustomerInfo(info);
      await _syncCustomerInfoToServer(info);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> purchaseMonthly() => _purchasePackage(yearly: false);

  Future<void> purchaseYearly() => _purchasePackage(yearly: true);

  Future<void> purchase(PaywallPlan plan) async {
    // Single Pro tier: monthly is the default programmatic purchase path.
    await purchaseMonthly();
  }

  Future<void> _purchasePackage({required bool yearly}) async {
    _requireConfigured();
    final pkg = await packageForBillingPeriod(yearly: yearly);
    if (pkg == null) {
      throw SubscriptionException(
        'No ${yearly ? 'yearly' : 'monthly'} package found. '
        'Check RevenueCat offering "${SubscriptionConstants.defaultOffering}".',
      );
    }
    try {
      final info = await Purchases.purchasePackage(pkg);
      _ref.read(subscriptionStateProvider.notifier).setCustomerInfo(info);
      await _syncCustomerInfoToServer(info);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> restore() async {
    _requireConfigured();
    try {
      final info = await Purchases.restorePurchases();
      _ref.read(subscriptionStateProvider.notifier).setCustomerInfo(info);
      await _syncCustomerInfoToServer(info);
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> _syncCustomerInfoToServer(CustomerInfo info) async {
    final api = _ref.read(muhurthaEngineApiProvider);
    if (api == null) return;

    final planCode = isProEntitled(info)
        ? SubscriptionConstants.serverPlanPro
        : 'free';

    await api.subscriptionSync(
      planCode: planCode,
      productId: info.activeSubscriptions.isNotEmpty
          ? info.activeSubscriptions.first
          : null,
      currentPeriodEnd: info.latestExpirationDate,
      providerSubscriptionId: 'revenuecat_active',
    );

    _ref.invalidate(birthPackProvider);
    _ref.invalidate(todayPayloadProvider);
    _ref.invalidate(remedyListProvider);
  }

  void _requireConfigured() {
    if (!_configured || !isAvailable) {
      throw SubscriptionException(
        'RevenueCat is not configured. Add REVENUECAT_API_KEY to dart_defines.json.',
      );
    }
  }

  SubscriptionException _handleError(
    Object error, {
    bool rethrowError = true,
  }) {
    if (error is PlatformException) {
      final code = PurchasesErrorHelper.getErrorCode(error);
      if (code == PurchasesErrorCode.purchaseCancelledError) {
        final ex = SubscriptionException('Purchase cancelled', code: code.name);
        if (rethrowError) throw ex;
        _ref.read(subscriptionStateProvider.notifier).setError(ex.message);
        return ex;
      }
      final ex = SubscriptionException(
        error.message ?? 'Purchase failed',
        code: code.name,
      );
      if (rethrowError) throw ex;
      _ref.read(subscriptionStateProvider.notifier).setError(ex.message);
      return ex;
    }

    final ex = SubscriptionException(error.toString());
    if (rethrowError) throw ex;
    _ref.read(subscriptionStateProvider.notifier).setError(ex.message);
    return ex;
  }
}
