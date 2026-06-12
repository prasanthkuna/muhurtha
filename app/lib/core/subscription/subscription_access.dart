import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/muhurtha_engine_api.dart';
import 'subscription_constants.dart';
import 'subscription_state.dart';

class SubscriptionAccess {
  const SubscriptionAccess({
    required this.isPlus,
    required this.isPro,
    required this.planCode,
    this.fromRevenueCat = false,
  });

  final bool isPlus;
  final bool isPro;
  final String planCode;
  final bool fromRevenueCat;

  static const free = SubscriptionAccess(
    isPlus: false,
    isPro: false,
    planCode: 'free',
  );
}

final subscriptionAccessProvider = Provider<SubscriptionAccess>((ref) {
  final rc = ref.watch(subscriptionStateProvider);
  final pack = ref.watch(birthPackProvider).valueOrNull;

  final rcPro = rc.hasProEntitlement;
  final serverPro = pack?.isPro ?? false;
  final serverPlus = pack?.isPlus ?? false;
  final isPro = rcPro || serverPro;
  final isPlus = isPro || serverPlus;

  if (isPro) {
    return SubscriptionAccess(
      isPlus: true,
      isPro: true,
      planCode: SubscriptionConstants.serverPlanPro,
      fromRevenueCat: rcPro,
    );
  }
  if (isPlus) {
    return SubscriptionAccess(
      isPlus: true,
      isPro: false,
      planCode: pack?.planCode ?? 'plus',
    );
  }
  return SubscriptionAccess.free;
});
