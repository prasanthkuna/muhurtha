import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../locale/locale_provider.dart';
import 'muhurtha_engine_api.dart';
import 'profile_repository.dart';

/// Call after profile / birth data changes so home tabs refetch (client-side cache).
void invalidateAllEngineCaches(WidgetRef ref) {
  ref.invalidate(birthPackProvider);
  ref.invalidate(todayPayloadProvider);
  ref.invalidate(remedyListProvider);
}

/// Switch app + engine locale, persist to profile, and force fresh pack/today fetches.
Future<void> applyAppLanguage(WidgetRef ref, String languageCode) async {
  ref.read(localeProvider.notifier).setLanguageCode(languageCode);
  invalidateAllEngineCaches(ref);
  final repo = ref.read(profileRepositoryProvider);
  if (repo == null) return;
  try {
    await repo.updateLanguageCode(languageCode);
  } catch (_) {}
}
