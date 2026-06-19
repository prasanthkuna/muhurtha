import 'dart:async';
import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';

/// Auth funnel logging — always visible in logcat (`adb logcat -s flutter`).
/// Also inserts into `app_logs` (anon RLS allows insert before sign-in).
void authLog(
  String step, {
  String level = 'info',
  Object? error,
  StackTrace? stackTrace,
  Map<String, dynamic>? context,
}) {
  final ctx = <String, dynamic>{
    'step': step,
    'platform': defaultTargetPlatform.name,
    if (context != null) ...context,
  };

  developer.log(
    'auth:$step',
    name: 'auth',
    error: error,
    stackTrace: stackTrace,
  );
  debugPrint('[auth] $step $ctx');

  if (!Env.hasSupabase) return;
  unawaited(_insertRemote(step, level, error, stackTrace, ctx));
}

Future<void> _insertRemote(
  String step,
  String level,
  Object? error,
  StackTrace? stackTrace,
  Map<String, dynamic> context,
) async {
  try {
    final row = <String, dynamic>{
      'service': 'auth',
      'level': level,
      'message': step,
      'context': {
        ...context,
        if (error != null) 'error': error.toString(),
      },
    };
    if (stackTrace != null) {
      row['stack_trace'] = stackTrace.toString();
    }
    await Supabase.instance.client.from('app_logs').insert(row);
  } catch (_) {
    // Never block auth on telemetry.
  }
}
