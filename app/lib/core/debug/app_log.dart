import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';

import '../config/env.dart';

/// Debug / optional verbose logging. Shows in **Debug console**, **Flutter DevTools → Logging**,
/// and `adb logcat` (filter `flutter` or the [name] you pass).
void appLog(
  String message, {
  String name = 'muhurta',
  Object? error,
  StackTrace? stackTrace,
}) {
  if (kDebugMode || Env.verboseLogs) {
    developer.log(message, name: name, error: error, stackTrace: stackTrace);
  }
}
