import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/active_chart_profile.dart';

/// Namespaces local engagement data per active chart profile.
String engagementScope(WidgetRef ref) {
  final chartId = ref.read(activeChartProfileIdProvider);
  return chartId ?? 'own';
}
