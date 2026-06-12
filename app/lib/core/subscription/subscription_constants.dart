/// RevenueCat identifiers — must match the RevenueCat dashboard exactly.
abstract final class SubscriptionConstants {
  /// Entitlement created in RevenueCat (Products → Entitlements).
  static const entitlementPro = 'muhurtha Pro';

  /// Default offering identifier in RevenueCat.
  static const defaultOffering = 'default';

  /// Package identifiers inside the offering (monthly / yearly).
  static const packageMonthly = 'monthly';
  static const packageYearly = 'yearly';

  /// Maps to `subscriptions.plan_code` on the server.
  static const serverPlanPro = 'pro';
}
