/// Supabase and other config from **compile time** (`--dart-define` or
/// `--dart-define-from-file`). Not read from the phone filesystem at runtime.
///
/// Same APK/AAB you install via ADB or Play Store already contains whatever
/// values were passed when you ran `flutter build` / `flutter run`. There is
/// no separate `.env` on the device unless you add a package and bundle one
/// (the anon/publishable key still ends up inside the app binary either way).
abstract final class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: '',
  );
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static bool get hasSupabase =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// Extra console/logcat output (`appLog`, and Supabase client `debug`). Optional in release.
  static const verboseLogs = bool.fromEnvironment(
    'VERBOSE_LOGS',
    defaultValue: false,
  );
}
