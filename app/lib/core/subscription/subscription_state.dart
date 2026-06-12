import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import 'subscription_service.dart';

class SubscriptionState {
  const SubscriptionState({
    this.customerInfo,
    this.isConfigured = false,
    this.isLoading = false,
    this.lastError,
  });

  final CustomerInfo? customerInfo;
  final bool isConfigured;
  final bool isLoading;
  final String? lastError;

  bool get hasProEntitlement {
    final info = customerInfo;
    if (info == null) return false;
    return SubscriptionService.isProEntitled(info);
  }

  String? get activeProductId {
    final subs = customerInfo?.activeSubscriptions ?? const [];
    if (subs.isEmpty) return null;
    return subs.first;
  }

  SubscriptionState copyWith({
    CustomerInfo? customerInfo,
    bool? isConfigured,
    bool? isLoading,
    String? lastError,
    bool clearError = false,
  }) {
    return SubscriptionState(
      customerInfo: customerInfo ?? this.customerInfo,
      isConfigured: isConfigured ?? this.isConfigured,
      isLoading: isLoading ?? this.isLoading,
      lastError: clearError ? null : (lastError ?? this.lastError),
    );
  }
}

final subscriptionStateProvider =
    StateNotifierProvider<SubscriptionStateNotifier, SubscriptionState>((ref) {
  return SubscriptionStateNotifier(ref);
});

class SubscriptionStateNotifier extends StateNotifier<SubscriptionState> {
  SubscriptionStateNotifier(this._ref) : super(const SubscriptionState());

  final Ref _ref;

  void setCustomerInfo(CustomerInfo info) {
    state = state.copyWith(customerInfo: info, clearError: true);
  }

  void setConfigured(bool value) {
    state = state.copyWith(isConfigured: value);
  }

  void setLoading(bool value) {
    state = state.copyWith(isLoading: value);
  }

  void setError(String? message) {
    state = state.copyWith(lastError: message);
  }

  Future<void> refresh() async {
    final service = _ref.read(subscriptionServiceProvider);
    if (!service.isAvailable) return;
    setLoading(true);
    try {
      final info = await service.fetchCustomerInfo();
      setCustomerInfo(info);
    } catch (e) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }
}
