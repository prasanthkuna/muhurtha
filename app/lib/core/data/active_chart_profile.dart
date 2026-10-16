import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'muhurtha_engine_api.dart';

/// `null` = viewing your own chart; otherwise a saved [chart_profiles] id.
final activeChartProfileIdProvider = StateProvider<String?>((ref) => null);

final activeChartLabelProvider = StateProvider<String?>((ref) => null);

/// Name shown on home tabs — active friend label or pack display name.
final chartDisplayNameProvider = Provider<String>((ref) {
  final activeLabel = ref.watch(activeChartLabelProvider);
  if (activeLabel != null && activeLabel.trim().isNotEmpty) {
    return activeLabel.trim();
  }
  final packName = ref.watch(birthPackProvider).valueOrNull?.displayName.trim();
  if (packName != null && packName.isNotEmpty) return packName;
  return '';
});
