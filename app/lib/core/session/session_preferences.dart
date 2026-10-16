import 'package:shared_preferences/shared_preferences.dart';

/// First-session vs returning home tab — Retention plan §2.1.
abstract final class SessionPreferences {
  static const _firstInsightKey = 'muh_first_insight_complete';

  static Future<bool> isFirstInsightComplete() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_firstInsightKey) ?? false;
  }

  static Future<void> markFirstInsightComplete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_firstInsightKey, true);
  }

  /// Query param for `/home`: first activation → decode; returning → today.
  static Future<String> defaultHomeTabQuery() async {
    final done = await isFirstInsightComplete();
    return done ? 'today' : 'decode';
  }
}
