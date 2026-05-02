import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/muh_app.dart';
import 'core/config/env.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Env.hasSupabase) {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
      // Prints supabase/gotrue INFO+ to console in debug; set Env.verboseLogs for more.
      debug: kDebugMode || Env.verboseLogs,
    );
  }

  runApp(const ProviderScope(child: MuhApp()));
}
