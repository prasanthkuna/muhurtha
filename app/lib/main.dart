import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/muh_app.dart';
import 'core/config/env.dart';

import 'core/data/muhurtha_engine_api.dart';
import 'core/engagement/ask_conversation_store.dart';
import 'core/engagement/user_engagement_store.dart';

Future<void> main() async {
  final binding = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: binding);
  await UserEngagementStore.ensureInitialized();
  await AskConversationStore.ensureInitialized();

  // Maestro / accessibility drivers need an explicit semantics tree in release.
  if (const bool.fromEnvironment('MAESTRO_SEMANTICS', defaultValue: false)) {
    SemanticsBinding.instance.ensureSemantics();
  }

  if (Env.hasSupabase) {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
      debug: kDebugMode || Env.verboseLogs,
    );
  }

  final container = ProviderContainer();

  // 1. Capture Flutter framework errors
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    final api = container.read(muhurthaEngineApiProvider);
    api?.logEvent(
      level: 'error',
      message: 'FlutterError: ${details.exceptionAsString()}',
      stackTrace: details.stack?.toString(),
      context: {'library': 'flutter_framework'},
    );
  };

  // 2. Capture platform/async errors
  PlatformDispatcher.instance.onError = (error, stack) {
    final api = container.read(muhurthaEngineApiProvider);
    api?.logEvent(
      level: 'error',
      message: 'PlatformError: $error',
      stackTrace: stack.toString(),
      context: {'library': 'dart_async'},
    );
    return true; // Still show in console
  };

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const MuhApp(),
    ),
  );
}
