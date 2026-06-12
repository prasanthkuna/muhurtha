import 'package:flutter/foundation.dart';
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
  });

  final String chartRunId;
  final String engineMode;

  factory ChartInitializeResult.fromJson(Map<String, dynamic> j) {
    return ChartInitializeResult(
      chartRunId: j['chartRunId'] as String? ?? '',
      engineMode: j['engineMode'] as String? ?? '',
    );
  }
}

class PlaceResolveResult {
  const PlaceResolveResult({
    required this.label,
    required this.lat,
    required this.lng,
    required this.timezone,
  });

  final String label;
  final double lat;
  final double lng;
  final String timezone;

  factory PlaceResolveResult.fromJson(Map<String, dynamic> j) {
    return PlaceResolveResult(
      label: j['resolvedLabel']?.toString() ??
          j['place']?.toString() ??
          '',
      lat: (j['lat'] as num?)?.toDouble() ?? div0,
      lng: (j['lng'] as num?)?.toDouble() ?? 0,
      timezone: j['timezone']?.toString() ?? 'Asia/Kolkata',
    );
  }

  static const double div0 = 0;
}

class NatalLuckColour {
  const NatalLuckColour({
    required this.key,
    required this.label,
    required this.hex,
  });

  final String key;
  final String label;
  final String hex;

  factory NatalLuckColour.fromJson(Map<String, dynamic> j) {
    return NatalLuckColour(
      key: j['key']?.toString() ?? '',
      label: j['label']?.toString() ?? '',
      hex: j['hex']?.toString() ?? '#6B7280',
    );
  }
}

class NatalLuckInfo {
  const NatalLuckInfo({
    required this.moonSignKey,
    required this.moonSignLabel,
    required this.moonSymbol,
    required this.luckyNumbers,
    required this.luckyDays,
    required this.luckyColours,
  });

  final String moonSignKey;
  final String moonSignLabel;
  final String moonSymbol;
  final List<String> luckyNumbers;
  final List<String> luckyDays;
  final List<NatalLuckColour> luckyColours;

  factory NatalLuckInfo.fromJson(Object? raw) {
    final j = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
    final colours = j['lucky_colours'] ?? j['luckyColours'];
    return NatalLuckInfo(
      moonSignKey: j['moon_sign_key']?.toString() ?? '',
      moonSignLabel: j['moon_sign_label']?.toString() ?? '',
      moonSymbol: j['moon_symbol']?.toString() ?? '☽',
      luckyNumbers: _stringList(j['lucky_numbers'] ?? j['luckyNumbers']),
      luckyDays: _stringList(j['lucky_days'] ?? j['luckyDays']),
      luckyColours: colours is List
          ? colours
              .whereType<Map>()
              .map((e) => NatalLuckColour.fromJson(
                    Map<String, dynamic>.from(e),
                  ))
              .toList()
          : const <NatalLuckColour>[],
    );
  }

  factory NatalLuckInfo.fromMoonSign(MoonSignInfo? moon) {
    if (moon == null || moon.key.isEmpty) {
      return const NatalLuckInfo(
        moonSignKey: '',
        moonSignLabel: '',
        moonSymbol: '☽',
        luckyNumbers: [],
        luckyDays: [],
        luckyColours: [],
      );
    }
    return NatalLuckInfo(
      moonSignKey: moon.key,
      moonSignLabel: moon.label,
      moonSymbol: moon.symbol,
      luckyNumbers: moon.luckyNumbers
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(),
      luckyDays: moon.luckyDays
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList(),
      luckyColours: moon.goodColors
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .map(
            (c) => NatalLuckColour(
              key: c.toLowerCase(),
              label: c,
              hex: '#6B7280',
            ),
          )
          .toList(),
    );
  }
}

class MoonSignInfo {
  const MoonSignInfo({
    required this.key,
    required this.label,
    required this.symbol,
    required this.luckyNumbers,
    required this.luckyDays,
    required this.goodColors,
    this.dateRange,
  });

  final String key;
  final String label;
  final String symbol;
  final String luckyNumbers;
  final String luckyDays;
  final String goodColors;
  final String? dateRange;

  factory MoonSignInfo.fromJson(Object? raw) {
    final j = raw is Map ? Map<String, dynamic>.from(raw) : null;
    if (j == null) {
      return const MoonSignInfo(
        key: '',
        label: '',
        symbol: '☽',
        luckyNumbers: '',
        luckyDays: '',
        goodColors: '',
      );
    }
    return MoonSignInfo(
      key: j['key']?.toString() ?? '',
      label: j['label']?.toString() ?? '',
      symbol: j['symbol']?.toString() ?? '☽',
      luckyNumbers: j['luckyNumbers']?.toString() ?? '',
      luckyDays: j['luckyDays']?.toString() ?? '',
      goodColors: j['goodColors']?.toString() ?? '',
      dateRange: j['dateRange']?.toString(),
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
    this.birthMoonSign,
    this.birthMoonNakshatra,
    this.sunSign,
    this.oneLine,
    this.currentLifePeriodLabel,
    this.currentLifePeriodSummary,
    this.mahadashaLord,
    this.antardashaLord,
    this.shareHook,
    this.lifeChapter,
    this.personalSignals = const <String>[],
    this.domainLenses = const <String>[],
    this.natalLuck,
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
  final MoonSignInfo? birthMoonSign;
  final String? birthMoonNakshatra;
  final MoonSignInfo? sunSign;
  final String? oneLine;
  final String? currentLifePeriodLabel;
  final String? currentLifePeriodSummary;
  final String? mahadashaLord;
  final String? antardashaLord;
  final String? shareHook;
  final LifeChapterInfo? lifeChapter;
  final List<String> personalSignals;
  final List<String> domainLenses;
  final NatalLuckInfo? natalLuck;

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
      moonSign:
          j['moonSign'] != null ? MoonSignInfo.fromJson(j['moonSign']) : null,
      moonNakshatra: j['moonNakshatra']?.toString(),
      birthMoonSign: j['birthMoonSign'] != null
          ? MoonSignInfo.fromJson(j['birthMoonSign'])
          : null,
      birthMoonNakshatra: j['birthMoonNakshatra']?.toString(),
      sunSign:
          j['sunSign'] != null ? MoonSignInfo.fromJson(j['sunSign']) : null,
      oneLine: j['oneLine']?.toString(),
      currentLifePeriodLabel:
          (j['currentLifePeriod'] as Map?)?['label']?.toString(),
      currentLifePeriodSummary:
          (j['currentLifePeriod'] as Map?)?['summary']?.toString(),
      mahadashaLord: j['mahadashaLord']?.toString(),
      antardashaLord: j['antardashaLord']?.toString(),
      shareHook: j['shareHook']?.toString(),
      lifeChapter: j['lifeChapter'] != null
          ? LifeChapterInfo.fromJson(j['lifeChapter'])
          : null,
      personalSignals: _stringList(j['personalSignals']),
      domainLenses: _stringList(j['domainLenses']),
      natalLuck: j['natalLuck'] != null
          ? NatalLuckInfo.fromJson(j['natalLuck'])
          : NatalLuckInfo.fromMoonSign(
              j['birthMoonSign'] != null
                  ? MoonSignInfo.fromJson(j['birthMoonSign'])
                  : null,
            ),
    );
  }
}

class BirthPackPayload {
  const BirthPackPayload({
    required this.date,
    required this.locale,
    required this.displayName,
    required this.locationLabel,
    required this.provider,
    required this.model,
    required this.content,
    this.isPlus = false,
    this.isPro = false,
    this.planCode = 'free',
  });

  final String date;
  final String locale;
  final String displayName;
  final String locationLabel;
  final String provider;
  final String model;
  final Map<String, dynamic> content;
  final bool isPlus;
  final bool isPro;
  final String planCode;

  factory BirthPackPayload.fromJson(Map<String, dynamic> j) {
    final rawContent = j['content'];
    final access = j['access'] is Map
        ? Map<String, dynamic>.from(j['access'] as Map)
        : const <String, dynamic>{};
    return BirthPackPayload(
      date: j['date']?.toString() ?? '',
      locale: j['locale']?.toString() ?? 'en',
      displayName: j['displayName']?.toString() ?? '',
      locationLabel: j['locationLabel']?.toString() ?? '',
      provider: j['provider']?.toString() ?? '',
      model: j['model']?.toString() ?? '',
      content: rawContent is Map
          ? Map<String, dynamic>.from(rawContent)
          : const <String, dynamic>{},
      isPlus: access['isPlus'] == true || access['isPro'] == true,
      isPro: access['isPro'] == true,
      planCode: access['planCode']?.toString() ?? 'free',
    );
  }

  Map<String, dynamic> section(String key) {
    final raw = content[key];
    return raw is Map ? Map<String, dynamic>.from(raw) : const {};
  }

  List<Map<String, dynamic>> sectionList(String key) {
    final raw = content[key];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }
}

class LifeChapterInfo {
  const LifeChapterInfo({
    required this.title,
    required this.summary,
    required this.qualityLabel,
    required this.timelineLabel,
    required this.currentChapterLabel,
    required this.currentEpisodeLabel,
    required this.nextChapterLabel,
    required this.actionLine,
    required this.traditionalWhy,
  });

  final String title;
  final String summary;
  final String qualityLabel;
  final String timelineLabel;
  final String currentChapterLabel;
  final String currentEpisodeLabel;
  final String nextChapterLabel;
  final String actionLine;
  final String traditionalWhy;

  factory LifeChapterInfo.fromJson(Object? raw) {
    final j = raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{};
    return LifeChapterInfo(
      title: j['title']?.toString() ?? '',
      summary: j['summary']?.toString() ?? '',
      qualityLabel: j['qualityLabel']?.toString() ?? '',
      timelineLabel: j['timelineLabel']?.toString() ?? '',
      currentChapterLabel: j['currentChapterLabel']?.toString() ?? '',
      currentEpisodeLabel: j['currentEpisodeLabel']?.toString() ?? '',
      nextChapterLabel: j['nextChapterLabel']?.toString() ?? '',
      actionLine: j['actionLine']?.toString() ?? '',
      traditionalWhy: j['traditionalWhy']?.toString() ?? '',
    );
  }
}

class TimingWindow {
  const TimingWindow({
    required this.start,
    required this.end,
    required this.label,
    this.category,
    this.whyItWorks,
    this.bestFor = const <String>[],
    this.avoidFor = const <String>[],
    this.shareLine,
    this.confidence,
  });

  final String start;
  final String end;
  final String label;
  final String? category;
  final String? whyItWorks;
  final List<String> bestFor;
  final List<String> avoidFor;
  final String? shareLine;
  final String? confidence;

  factory TimingWindow.fromJson(Map<String, dynamic> j) {
    return TimingWindow(
      start: j['start']?.toString() ?? '',
      end: j['end']?.toString() ?? '',
      label: j['label']?.toString() ?? '',
      category: j['category']?.toString(),
      whyItWorks: j['whyItWorks']?.toString(),
      bestFor: _stringList(j['bestFor']),
      avoidFor: _stringList(j['avoidFor']),
      shareLine: j['shareLine']?.toString(),
      confidence: j['confidence']?.toString(),
    );
  }
}

class PurposeCheckResult {
  const PurposeCheckResult({
    required this.id,
    required this.status,
    required this.headline,
    required this.summary,
    required this.actionLine,
    required this.timingNote,
    required this.bestWindows,
    required this.cautionWindows,
    required this.betterOptions,
    this.shareHook,
    this.personalSignals = const <String>[],
    this.domainLenses = const <String>[],
  });

  final String id;
  final String status;
  final String headline;
  final String summary;
  final String actionLine;
  final String timingNote;
  final List<TimingWindow> bestWindows;
  final List<TimingWindow> cautionWindows;
  final List<Map<String, String>> betterOptions;
  final String? shareHook;
  final List<String> personalSignals;
  final List<String> domainLenses;

  factory PurposeCheckResult.fromJson(Map<String, dynamic> j) {
    return PurposeCheckResult(
      id: j['id']?.toString() ?? '',
      status: j['status']?.toString() ?? '',
      headline: j['headline']?.toString() ?? '',
      summary: j['summary']?.toString() ?? '',
      actionLine: j['action_line']?.toString() ?? '',
      timingNote: j['timing_note']?.toString() ?? '',
      bestWindows: _windows(j['best_windows']),
      cautionWindows: _windows(j['caution_windows']),
      betterOptions: _betterOptions(j['better_options']),
      shareHook: j['shareHook']?.toString(),
      personalSignals: _stringList(j['personalSignals']),
      domainLenses: _stringList(j['domainLenses']),
    );
  }
}

class AskAnswerResult {
  const AskAnswerResult({
    required this.sessionId,
    required this.answerId,
    required this.directAnswer,
    required this.bestTime,
    required this.cautionTime,
    required this.betterOption,
    required this.actionLine,
    required this.shareHook,
    this.simpleWhy,
    this.planCode,
    this.freeRemainingToday,
    this.isPro = false,
  });

  final String sessionId;
  final String answerId;
  final String directAnswer;
  final String bestTime;
  final String cautionTime;
  final String betterOption;
  final String actionLine;
  final String shareHook;
  final String? simpleWhy;
  final String? planCode;
  final int? freeRemainingToday;
  final bool isPro;

  factory AskAnswerResult.fromJson(Map<String, dynamic> j) {
    final access = j['askAccess'] is Map
        ? Map<String, dynamic>.from(j['askAccess'] as Map)
        : const <String, dynamic>{};
    return AskAnswerResult(
      sessionId: j['sessionId']?.toString() ?? '',
      answerId: j['answerId']?.toString() ?? '',
      directAnswer: j['directAnswer']?.toString() ?? '',
      bestTime: j['bestTime']?.toString() ?? '',
      cautionTime: j['cautionTime']?.toString() ?? '',
      betterOption: j['betterOption']?.toString() ?? '',
      actionLine: j['actionLine']?.toString() ?? '',
      shareHook: j['shareHook']?.toString() ?? '',
      simpleWhy: j['simpleWhy']?.toString(),
      planCode: access['planCode']?.toString(),
      freeRemainingToday: int.tryParse('${access['freeRemainingToday'] ?? ''}'),
      isPro: access['isPro'] == true,
    );
  }
}

class JourneyPhaseItem {
  const JourneyPhaseItem({
    required this.periodLabel,
    required this.title,
    required this.highlight,
    required this.sentences,
    required this.mahadashaLord,
    required this.antardashaLord,
    required this.focusAreas,
    required this.tone,
    required this.pressureThemes,
    required this.phasePulse,
    required this.transitionNote,
    required this.evidenceLine,
    this.shareHook,
    this.kernelSignals = const <String>[],
    this.domainLenses = const <String>[],
  });

  final String periodLabel;
  final String title;
  final String highlight;
  final List<String> sentences;
  final String mahadashaLord;
  final String antardashaLord;
  final List<String> focusAreas;
  final List<String> tone;
  final List<String> pressureThemes;
  final String phasePulse;
  final String transitionNote;
  final String evidenceLine;
  final String? shareHook;
  final List<String> kernelSignals;
  final List<String> domainLenses;

  factory JourneyPhaseItem.fromJson(Map<String, dynamic> j) {
    final s = j['sentences'];
    return JourneyPhaseItem(
      periodLabel: j['periodLabel']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      highlight: j['highlight']?.toString() ?? '',
      sentences:
          s is List ? s.map((e) => e.toString()).toList() : const <String>[],
      mahadashaLord: j['mahadashaLord']?.toString() ?? '',
      antardashaLord: j['antardashaLord']?.toString() ?? '',
      focusAreas: _stringList(j['focusAreas']),
      tone: _stringList(j['tone']),
      pressureThemes: _stringList(j['pressureThemes']),
      phasePulse: j['phasePulse']?.toString() ?? '',
      transitionNote: j['transitionNote']?.toString() ?? '',
      evidenceLine: j['evidenceLine']?.toString() ?? '',
      shareHook: j['shareHook']?.toString(),
      kernelSignals: _stringList(j['kernelSignals']),
      domainLenses: _stringList(j['domainLenses']),
    );
  }
}

class RemedyItem {
  const RemedyItem({
    required this.id,
    required this.title,
    required this.simpleLine,
    required this.remedyType,
    required this.remedyCategoryKey,
    required this.remedyCategoryLabel,
    required this.whyNow,
    required this.keepItSimple,
  });

  final String id;
  final String title;
  final String simpleLine;
  final String remedyType;
  final String remedyCategoryKey;
  final String remedyCategoryLabel;
  final String whyNow;
  final String keepItSimple;

  factory RemedyItem.fromJson(Map<String, dynamic> j) {
    return RemedyItem(
      id: j['id']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      simpleLine:
          j['simpleLine']?.toString() ?? j['simple_line']?.toString() ?? '',
      remedyType:
          j['remedyType']?.toString() ?? j['remedy_type']?.toString() ?? '',
      remedyCategoryKey: j['remedyCategoryKey']?.toString() ??
          j['remedy_category_key']?.toString() ??
          '',
      remedyCategoryLabel: j['remedyCategoryLabel']?.toString() ??
          j['remedy_category_label']?.toString() ??
          '',
      whyNow: j['whyNow']?.toString() ?? '',
      keepItSimple: j['keepItSimple']?.toString() ?? '',
    );
  }
}

class ShareCardResult {
  const ShareCardResult({
    required this.id,
    required this.sourceType,
    required this.shareTitle,
    required this.shareBody,
    required this.shareContext,
    required this.shareText,
    required this.deepLink,
    required this.brandVariant,
    required this.locale,
  });

  final String id;
  final String sourceType;
  final String shareTitle;
  final String shareBody;
  final String shareContext;
  final String shareText;
  final String deepLink;
  final String brandVariant;
  final String locale;

  factory ShareCardResult.fromJson(Map<String, dynamic> j) {
    return ShareCardResult(
      id: j['id']?.toString() ?? '',
      sourceType: j['sourceType']?.toString() ?? '',
      shareTitle: j['shareTitle']?.toString() ?? '',
      shareBody: j['shareBody']?.toString() ?? '',
      shareContext: j['shareContext']?.toString() ?? '',
      shareText: j['shareText']?.toString() ?? '',
      deepLink: j['deepLink']?.toString() ?? '',
      brandVariant: j['brandVariant']?.toString() ?? '',
      locale: j['locale']?.toString() ?? 'en',
    );
  }
}

class ScheduledNotificationItem {
  const ScheduledNotificationItem({
    required this.id,
    required this.key,
    required this.type,
    required this.scheduledAt,
    required this.title,
    required this.body,
    required this.deepLink,
  });

  final String id;
  final String key;
  final String type;
  final DateTime scheduledAt;
  final String title;
  final String body;
  final String deepLink;

  factory ScheduledNotificationItem.fromJson(Map<String, dynamic> j) {
    return ScheduledNotificationItem(
      id: j['id']?.toString() ?? '',
      key: j['notification_key']?.toString() ?? '',
      type: j['notification_type']?.toString() ?? '',
      scheduledAt: DateTime.tryParse(j['scheduled_at']?.toString() ?? '') ??
          DateTime.now(),
      title: j['title']?.toString() ?? '',
      body: j['body']?.toString() ?? '',
      deepLink: j['deep_link']?.toString() ?? '',
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

  Never _throwEngineError(Map<String, dynamic> map) {
    final code = map['error_code']?.toString() ?? 'engine_error';
    final message = map['error']?.toString() ?? 'Unknown engine error';
    throw EngineException(code: code, message: message);
  }

  Future<Map<String, dynamic>> _invoke(
    String action, {
    Map<String, Object?> extra = const {},
  }) async {
    final body = <String, Object?>{'action': action, ...extra};
    late final FunctionResponse res;
    try {
      res = await _client.functions.invoke(
        'muhurtha-api',
        body: body,
      );
    } on FunctionException catch (e) {
      final details = e.details;
      if (details is Map) {
        _throwEngineError(Map<String, dynamic>.from(details));
      }
      throw EngineException(
        code: 'http_${e.status}',
        message: e.reasonPhrase ?? 'Function call failed',
      );
    }

    final data = res.data;
    if (data is! Map) {
      throw StateError('Unexpected response from engine: $data');
    }
    final map = Map<String, dynamic>.from(data);
    final err = map['error']?.toString();
    if (err != null && err.isNotEmpty) {
      _throwEngineError(map);
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

  Future<PlaceResolveResult> resolvePlace({
    String? place,
    double? lat,
    double? lng,
  }) async {
    final m = await _invoke(
      'birth_place_resolve',
      extra: {
        if (place != null) 'place': place,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
      },
    );
    return PlaceResolveResult.fromJson(m);
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

  Future<BirthPackPayload> birthPackGet({String? date, String? locale}) async {
    final m = await _invoke(
      'birth_pack_get',
      extra: {
        if (date != null) 'date': date,
        if (locale != null) 'locale': locale,
      },
    );
    return BirthPackPayload.fromJson(m);
  }

  Future<void> subscriptionSync({
    required String planCode,
    String? productId,
    String? currentPeriodEnd,
    String? providerSubscriptionId,
  }) async {
    await _invoke(
      'subscription_sync',
      extra: {
        'plan_code': planCode,
        if (productId != null) 'product_id': productId,
        if (currentPeriodEnd != null) 'current_period_end': currentPeriodEnd,
        if (providerSubscriptionId != null)
          'provider_subscription_id': providerSubscriptionId,
      },
    );
  }

  Future<AskAnswerResult> ask({
    required String question,
    String? sessionId,
    String? locale,
  }) async {
    final m = await _invoke(
      'ask',
      extra: {
        'question': question,
        if (sessionId != null) 'session_id': sessionId,
        if (locale != null) 'locale': locale,
      },
    );
    return AskAnswerResult.fromJson(m);
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

  Future<void> logEvent({
    required String level,
    required String message,
    String? stackTrace,
    Map<String, dynamic>? context,
  }) async {
    try {
      await _invoke(
        'log_app_event',
        extra: {
          'level': level,
          'message': message,
          if (stackTrace != null) 'stack_trace': stackTrace,
          if (context != null) 'context': context,
          'service': 'app',
        },
      );
    } catch (e) {
      // Don't recursive-loop if logging fails
      debugPrint('CRITICAL: Logging failed locally: $e');
    }
  }

  Future<List<ScheduledNotificationItem>> notificationScheduleGet({
    String? date,
    String? locale,
  }) async {
    final m = await _invoke(
      'notification_schedule_get',
      extra: {
        if (date != null) 'date': date,
        if (locale != null) 'locale': locale,
      },
    );
    final rows = m['notifications'];
    if (rows is! List) return const [];
    return rows
        .map(
          (e) => ScheduledNotificationItem.fromJson(
            Map<String, dynamic>.from(e as Map),
          ),
        )
        .toList();
  }
}

class EngineException implements Exception {
  const EngineException({
    required this.code,
    required this.message,
  });

  final String code;
  final String message;

  @override
  String toString() => 'EngineException($code): $message';
}

/// Refreshes when user pulls to refresh or after onboarding completes.
final todayPayloadProvider =
    FutureProvider.autoDispose<TodayPayload?>((ref) async {
  final api = ref.watch(muhurthaEngineApiProvider);
  if (api == null) return null;
  final locale = ref.watch(localeProvider).languageCode;
  return api.todayGet(locale: locale);
});

final birthPackProvider =
    FutureProvider.autoDispose<BirthPackPayload?>((ref) async {
  final api = ref.watch(muhurthaEngineApiProvider);
  if (api == null) return null;
  final locale = ref.watch(localeProvider).languageCode;
  return api.birthPackGet(locale: locale);
});

final remedyListProvider =
    FutureProvider.autoDispose<List<RemedyItem>?>((ref) async {
  final api = ref.watch(muhurthaEngineApiProvider);
  if (api == null) return null;
  final locale = ref.watch(localeProvider).languageCode;
  return api.remedyToday(locale: locale);
});

