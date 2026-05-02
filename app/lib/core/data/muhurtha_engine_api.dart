import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';
import '../locale/locale_provider.dart';

/// Typed access to `muhurtha-api` Edge Function (POST JSON body `{ action, ... }`).
final muhurthaEngineApiProvider = Provider<MuhurthaEngineApi?>((ref) {
  if (!Env.hasSupabase) return null;
  return MuhurthaEngineApi(Supabase.instance.client);
});

class ChartInitializeResult {
  const ChartInitializeResult({
    required this.chartRunId,
    required this.engineMode,
    required this.canShowQuickProof,
  });

  final String chartRunId;
  final String engineMode;
  final bool canShowQuickProof;

  factory ChartInitializeResult.fromJson(Map<String, dynamic> j) {
    return ChartInitializeResult(
      chartRunId: j['chartRunId'] as String? ?? '',
      engineMode: j['engineMode'] as String? ?? '',
      canShowQuickProof: j['canShowQuickProof'] as bool? ?? false,
    );
  }
}

class QuickProofCard {
  const QuickProofCard({
    required this.phaseSegmentId,
    required this.periodLabel,
    required this.title,
    required this.sentences,
    required this.confidenceLabel,
  });

  final String phaseSegmentId;
  final String periodLabel;
  final String title;
  final List<String> sentences;
  final String confidenceLabel;

  factory QuickProofCard.fromJson(Map<String, dynamic> j) {
    final s = j['sentences'];
    return QuickProofCard(
      phaseSegmentId: j['phaseSegmentId'] as String? ?? '',
      periodLabel: j['periodLabel']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      sentences: s is List
          ? s.map((e) => e.toString()).toList()
          : const <String>[],
      confidenceLabel: j['confidenceLabel']?.toString() ?? 'medium',
    );
  }
}

class MoonSignInfo {
  const MoonSignInfo({
    required this.key,
    required this.label,
    required this.symbol,
  });

  final String key;
  final String label;
  final String symbol;

  factory MoonSignInfo.fromJson(Object? raw) {
    final j = raw is Map ? Map<String, dynamic>.from(raw) : null;
    if (j == null) {
      return const MoonSignInfo(key: '', label: '', symbol: '☽');
    }
    return MoonSignInfo(
      key: j['key']?.toString() ?? '',
      label: j['label']?.toString() ?? '',
      symbol: j['symbol']?.toString() ?? '☽',
    );
  }
}

class TodayPayload {
  const TodayPayload({
    required this.date,
    required this.locationLabel,
    required this.engineMode,
    required this.betterFor,
    required this.beCarefulWith,
    required this.goodWindows,
    required this.cautionWindows,
    this.displayName,
    this.moonSign,
    this.moonNakshatra,
    this.currentLifePeriodLabel,
    this.currentLifePeriodSummary,
  });

  final String date;
  final String locationLabel;
  final String engineMode;
  final List<String> betterFor;
  final List<String> beCarefulWith;
  final List<TimingWindow> goodWindows;
  final List<TimingWindow> cautionWindows;
  final String? displayName;
  final MoonSignInfo? moonSign;
  final String? moonNakshatra;
  final String? currentLifePeriodLabel;
  final String? currentLifePeriodSummary;

  factory TodayPayload.fromJson(Map<String, dynamic> j) {
    return TodayPayload(
      date: j['date']?.toString() ?? '',
      locationLabel: j['locationLabel']?.toString() ?? '',
      engineMode: j['engineMode']?.toString() ?? '',
      betterFor: _stringList(j['betterFor']),
      beCarefulWith: _stringList(j['beCarefulWith']),
      goodWindows: _windows(j['goodWindows']),
      cautionWindows: _windows(j['cautionWindows']),
      displayName: j['displayName']?.toString(),
      moonSign: j['moonSign'] != null
          ? MoonSignInfo.fromJson(j['moonSign'])
          : null,
      moonNakshatra: j['moonNakshatra']?.toString(),
      currentLifePeriodLabel:
          (j['currentLifePeriod'] as Map?)?['label']?.toString(),
      currentLifePeriodSummary:
          (j['currentLifePeriod'] as Map?)?['summary']?.toString(),
    );
  }
}

class TimingWindow {
  const TimingWindow({
    required this.start,
    required this.end,
    required this.label,
  });

  final String start;
  final String end;
  final String label;

  factory TimingWindow.fromJson(Map<String, dynamic> j) {
    return TimingWindow(
      start: j['start']?.toString() ?? '',
      end: j['end']?.toString() ?? '',
      label: j['label']?.toString() ?? '',
    );
  }
}

class PurposeCheckResult {
  const PurposeCheckResult({
    required this.id,
    required this.status,
    required this.summary,
    required this.actionLine,
    required this.bestWindows,
    required this.cautionWindows,
    required this.betterOptions,
  });

  final String id;
  final String status;
  final String summary;
  final String actionLine;
  final List<TimingWindow> bestWindows;
  final List<TimingWindow> cautionWindows;
  final List<Map<String, String>> betterOptions;

  factory PurposeCheckResult.fromJson(Map<String, dynamic> j) {
    return PurposeCheckResult(
      id: j['id']?.toString() ?? '',
      status: j['status']?.toString() ?? '',
      summary: j['summary']?.toString() ?? '',
      actionLine: j['action_line']?.toString() ?? '',
      bestWindows: _windows(j['best_windows']),
      cautionWindows: _windows(j['caution_windows']),
      betterOptions: _betterOptions(j['better_options']),
    );
  }
}

class JourneyPhaseItem {
  const JourneyPhaseItem({
    required this.periodLabel,
    required this.title,
    required this.sentences,
  });

  final String periodLabel;
  final String title;
  final List<String> sentences;

  factory JourneyPhaseItem.fromJson(Map<String, dynamic> j) {
    final s = j['sentences'];
    return JourneyPhaseItem(
      periodLabel: j['periodLabel']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      sentences:
          s is List ? s.map((e) => e.toString()).toList() : const <String>[],
    );
  }
}

class RemedyItem {
  const RemedyItem({
    required this.id,
    required this.title,
    required this.simpleLine,
    required this.remedyType,
  });

  final String id;
  final String title;
  final String simpleLine;
  final String remedyType;

  factory RemedyItem.fromJson(Map<String, dynamic> j) {
    return RemedyItem(
      id: j['id']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      simpleLine: j['simpleLine']?.toString() ?? j['simple_line']?.toString() ?? '',
      remedyType: j['remedyType']?.toString() ?? j['remedy_type']?.toString() ?? '',
    );
  }
}

List<String> _stringList(Object? v) {
  if (v is! List) return const [];
  return v.map((e) => e.toString()).toList();
}

List<TimingWindow> _windows(Object? v) {
  if (v is! List) return const [];
  return v
      .map((e) => TimingWindow.fromJson(Map<String, dynamic>.from(e as Map)))
      .toList();
}

List<Map<String, String>> _betterOptions(Object? v) {
  if (v is! List) return const [];
  return v.map((e) {
    final m = Map<String, dynamic>.from(e as Map);
    return {
      'label': m['label']?.toString() ?? '',
      'detail': m['detail']?.toString() ?? '',
    };
  }).toList();
}

class MuhurthaEngineApi {
  MuhurthaEngineApi(this._client);

  final SupabaseClient _client;

  Future<Map<String, dynamic>> _invoke(
    String action, {
    Map<String, Object?> extra = const {},
  }) async {
    final body = <String, Object?>{'action': action, ...extra};
    final res = await _client.functions.invoke(
      'muhurtha-api',
      body: body,
    );

    final data = res.data;
    if (data is! Map) {
      throw StateError('Unexpected response from engine: $data');
    }
    final map = Map<String, dynamic>.from(data);
    final err = map['error']?.toString();
    if (err != null && err.isNotEmpty) {
      throw StateError(err);
    }
    return map;
  }

  Future<ChartInitializeResult> chartInitialize(String birthInputId) async {
    final m = await _invoke(
      'chart_initialize',
      extra: {'birth_input_id': birthInputId},
    );
    return ChartInitializeResult.fromJson(m);
  }

  Future<List<QuickProofCard>> quickProofGenerate() async {
    final m = await _invoke('quick_proof_generate');
    final cards = m['cards'];
    if (cards is! List) return const [];
    return cards
        .map(
          (e) => QuickProofCard.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .toList();
  }

  Future<void> validationSubmit({
    required String phaseSegmentId,
    required String feedbackValue,
    String? optionalNote,
  }) async {
    await _invoke(
      'validation_submit',
      extra: {
        'phase_segment_id': phaseSegmentId,
        'feedback_value': feedbackValue,
        if (optionalNote != null) 'optional_note': optionalNote,
      },
    );
  }

  Future<TodayPayload> todayGet({String? date, String? locale}) async {
    final m = await _invoke(
      'today_get',
      extra: {
        if (date != null) 'date': date,
        if (locale != null) 'locale': locale,
      },
    );
    return TodayPayload.fromJson(m);
  }

  Future<PurposeCheckResult> purposeCheck({
    required String purposeType,
    String? targetDate,
    String? locale,
  }) async {
    final m = await _invoke(
      'purpose_check',
      extra: {
        'purpose_type': purposeType,
        if (targetDate != null) 'target_date': targetDate,
        if (locale != null) 'locale': locale,
      },
    );
    return PurposeCheckResult.fromJson(m);
  }

  Future<List<JourneyPhaseItem>> journeyGet({String? locale}) async {
    final m = await _invoke(
      'journey_get',
      extra: {if (locale != null) 'locale': locale},
    );
    final phases = m['phases'];
    if (phases is! List) return const [];
    return phases
        .map(
          (e) =>
              JourneyPhaseItem.fromJson(Map<String, dynamic>.from(e as Map)),
        )
        .toList();
  }

  Future<List<RemedyItem>> remedyToday({String? locale}) async {
    final m = await _invoke(
      'remedy_today',
      extra: {if (locale != null) 'locale': locale},
    );
    final r = m['remedies'];
    if (r is! List) return const [];
    return r
        .map((e) => RemedyItem.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }
}

/// Refreshes when user pulls to refresh or after onboarding completes.
final todayPayloadProvider =
    FutureProvider.autoDispose<TodayPayload?>((ref) async {
  final api = ref.watch(muhurthaEngineApiProvider);
  if (api == null) return null;
  final locale = ref.watch(localeProvider).languageCode;
  return api.todayGet(locale: locale);
});

final journeyPhasesProvider =
    FutureProvider.autoDispose<List<JourneyPhaseItem>?>((ref) async {
  final api = ref.watch(muhurthaEngineApiProvider);
  if (api == null) return null;
  final locale = ref.watch(localeProvider).languageCode;
  return api.journeyGet(locale: locale);
});

final remedyListProvider =
    FutureProvider.autoDispose<List<RemedyItem>?>((ref) async {
  final api = ref.watch(muhurthaEngineApiProvider);
  if (api == null) return null;
  final locale = ref.watch(localeProvider).languageCode;
  return api.remedyToday(locale: locale);
});

