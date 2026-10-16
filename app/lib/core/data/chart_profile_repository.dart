import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'active_chart_profile.dart';
import 'chart_profile_models.dart';
import 'muhurtha_engine_api.dart';

class ChartProfileRepository {
  ChartProfileRepository(this._api);

  final MuhurthaEngineApi _api;

  Future<List<ChartProfileSummary>> list() async {
    final rows = await _api.chartProfileList();
    return rows;
  }

  Future<ChartProfileSummary> save({
    String? chartProfileId,
    required String label,
    required String dateOfBirth,
    required String birthPlace,
    required String birthInputMode,
    String? exactBirthTime,
    String? timeBucket,
    String? janmaNakshatra,
    int? nakshatraPada,
    double? birthLat,
    double? birthLng,
    String? birthTimezone,
  }) async {
    return _api.chartProfileSave(
      chartProfileId: chartProfileId,
      label: label,
      dateOfBirth: dateOfBirth,
      birthPlace: birthPlace,
      birthInputMode: birthInputMode,
      exactBirthTime: exactBirthTime,
      timeBucket: timeBucket,
      janmaNakshatra: janmaNakshatra,
      nakshatraPada: nakshatraPada,
      birthLat: birthLat,
      birthLng: birthLng,
      birthTimezone: birthTimezone,
    );
  }

  Future<void> delete(String chartProfileId) =>
      _api.chartProfileDelete(chartProfileId);
}

final chartProfileRepositoryProvider = Provider<ChartProfileRepository?>((ref) {
  final api = ref.watch(muhurthaEngineApiProvider);
  if (api == null) return null;
  return ChartProfileRepository(api);
});

final chartProfileListProvider =
    FutureProvider.autoDispose<List<ChartProfileSummary>>((ref) async {
  ref.watch(activeChartProfileIdProvider);
  final repo = ref.watch(chartProfileRepositoryProvider);
  if (repo == null) return const [];
  return repo.list();
});

void selectOwnChart(WidgetRef ref) {
  ref.read(activeChartProfileIdProvider.notifier).state = null;
  ref.read(activeChartLabelProvider.notifier).state = null;
  invalidateChartScopedCaches(ref);
}

void selectChartProfile(WidgetRef ref, ChartProfileSummary profile) {
  ref.read(activeChartProfileIdProvider.notifier).state = profile.id;
  ref.read(activeChartLabelProvider.notifier).state = profile.label;
  invalidateChartScopedCaches(ref);
}

void invalidateChartScopedCaches(WidgetRef ref) {
  ref.invalidate(birthPackProvider);
  ref.invalidate(todayPayloadProvider);
  ref.invalidate(remedyListProvider);
  ref.invalidate(chartProfileListProvider);
}
