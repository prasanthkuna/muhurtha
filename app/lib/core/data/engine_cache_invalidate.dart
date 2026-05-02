import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'muhurtha_engine_api.dart';

/// Call after profile / birth data changes so home tabs refetch (client-side cache).
void invalidateAllEngineCaches(WidgetRef ref) {
  ref.invalidate(todayPayloadProvider);
  ref.invalidate(journeyPhasesProvider);
  ref.invalidate(remedyListProvider);
}
