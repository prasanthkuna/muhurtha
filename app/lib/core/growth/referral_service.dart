import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/muhurtha_engine_api.dart';

const _prefReferrerKey = 'pending_referrer_profile_id';

final referralServiceProvider = Provider<ReferralService>((ref) {
  return ReferralService(ref);
});

/// Captures `?ref=` from share links and attributes after sign-in.
class ReferralService {
  ReferralService(this._ref);

  final Ref _ref;

  static Future<void> captureFromUri(Uri? uri) async {
    if (uri == null) return;
    final ref = uri.queryParameters['ref']?.trim();
    if (ref == null || ref.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefReferrerKey, ref);
    if (kDebugMode) {
      debugPrint('[referral] captured referrer=$ref from ${uri.path}');
    }
  }

  Future<void> syncPendingAttribution() async {
    final prefs = await SharedPreferences.getInstance();
    final referrerId = prefs.getString(_prefReferrerKey)?.trim();
    if (referrerId == null || referrerId.isEmpty) return;

    final api = _ref.read(muhurthaEngineApiProvider);
    if (api == null) return;

    try {
      await api.referralAttribution(referrerProfileId: referrerId);
      await prefs.remove(_prefReferrerKey);
    } catch (e) {
      if (kDebugMode) debugPrint('[referral] attribution failed: $e');
    }
  }

  Future<String?> pendingReferrerId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefReferrerKey);
  }
}
