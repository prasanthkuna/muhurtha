import 'muhurtha_engine_api.dart';

/// Central projection layer over birth pack JSON — tabs should use this, not raw keys.
class BirthPackViews {
  BirthPackViews(this.pack);

  final BirthPackPayload pack;

  Map<String, dynamic> get _content => pack.content;

  Map<String, dynamic> get person {
    final raw = _content['person'];
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return _legacyPerson();
  }

  NatalLuckInfo? get natalLuck {
    final raw = _content['natal_luck'] ?? person['natal_luck'];
    if (raw is Map) return NatalLuckInfo.fromJson(raw);
    return null;
  }

  String get displayHook {
    final hook = _text(person['display_hook']);
    if (hook.isNotEmpty) return hook;
    final preview = _text(_content['free_preview'], 'decode_hit');
    if (preview.isNotEmpty) return preview;
    return _text(_legacyIdentity(), 'headline');
  }

  String get identitySummary {
    final summary = _text(person['summary']);
    if (summary.isNotEmpty) return summary;
    return _text(_legacyIdentity(), 'summary');
  }

  List<String> get strengths =>
      _strings(person['traits'], 'strengths').isNotEmpty
          ? _strings(person['traits'], 'strengths')
          : _strings(_legacyIdentity(), 'strengths');

  List<String> get watchouts =>
      _strings(person['traits'], 'watchouts').isNotEmpty
          ? _strings(person['traits'], 'watchouts')
          : _strings(_legacyIdentity(), 'watchouts');

  String get workMoney {
    final patterns = person['patterns'];
    return (patterns is Map ? patterns['work_money']?.toString().trim() : null) ??
        _text(_legacyIdentity(), 'work_money_pattern');
  }

  String get relationship {
    final patterns = person['patterns'];
    return (patterns is Map
            ? patterns['relationship']?.toString().trim()
            : null) ??
        _text(_legacyIdentity(), 'relationship_pattern');
  }

  PlaybookDay? playbookFor(String date) {
    final playbook = _content['playbook'];
    if (playbook is Map && playbook[date] is Map) {
      return PlaybookDay.fromJson(
        Map<String, dynamic>.from(playbook[date] as Map),
      );
    }
    final cards = _content['today_cards'];
    if (cards is List) {
      for (final raw in cards) {
        if (raw is! Map) continue;
        final map = Map<String, dynamic>.from(raw);
        if (map['key']?.toString() == date) {
          return PlaybookDay.fromLegacyTodayCard(map);
        }
      }
    }
    final guidance = _content['today_guidance'];
    if (guidance is Map) {
      return PlaybookDay.fromLegacyGuidance(Map<String, dynamic>.from(guidance));
    }
    return null;
  }

  HorizonView get week {
    final fromHorizons = HorizonView.from(
      _content['horizons'] is Map
          ? (_content['horizons'] as Map)['week']
          : _content['timing_plan'] is Map
              ? (_content['timing_plan'] as Map)['week']
              : null,
    );
    if (fromHorizons.headline.isNotEmpty || fromHorizons.body.isNotEmpty) {
      return fromHorizons;
    }
    return _horizonFromRangeCards(_content['weekly_cards']);
  }

  HorizonView get month {
    final fromHorizons = HorizonView.from(
      _content['horizons'] is Map
          ? (_content['horizons'] as Map)['month']
          : _content['timing_plan'] is Map
              ? (_content['timing_plan'] as Map)['month']
              : null,
    );
    if (fromHorizons.headline.isNotEmpty || fromHorizons.body.isNotEmpty) {
      return fromHorizons;
    }
    return _horizonFromRangeCards(_content['monthly_cards']);
  }

  HorizonView _horizonFromRangeCards(dynamic raw) {
    if (raw is! List || raw.isEmpty || raw.first is! Map) {
      return const HorizonView(headline: '', body: '', caution: '');
    }
    final card = Map<String, dynamic>.from(raw.first as Map);
    final careful = card['be_careful'];
    return HorizonView(
      headline: card['title']?.toString() ?? '',
      body: card['body']?.toString() ?? '',
      caution: careful is List && careful.isNotEmpty
          ? careful.first.toString()
          : '',
    );
  }

  List<RecognitionCard> get recognition {
    final raw = _content['recognition'] ?? _content['past_life_check'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => RecognitionCard.fromJson(Map<String, dynamic>.from(e)))
        .where((c) => c.theme.isNotEmpty)
        .toList();
  }

  List<ChapterView> get chapters {
    if (_content['chapters'] is List) {
      return (_content['chapters'] as List)
          .whereType<Map>()
          .map((e) => ChapterView.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    final lifeMap = _content['life_map'];
    if (lifeMap is! Map) return const [];
    final map = Map<String, dynamic>.from(lifeMap);
    final out = <ChapterView>[];
    final past = map['past_chapters'];
    if (past is List) {
      for (final raw in past.whereType<Map>()) {
        out.add(ChapterView.fromLifeMap(
          Map<String, dynamic>.from(raw),
          tense: 'past',
        ));
      }
    }
    final current = map['current_chapter'];
    if (current is Map) {
      out.add(ChapterView.fromLifeMap(
        Map<String, dynamic>.from(current),
        tense: 'current',
      ));
    }
    final future = map['future_chapters'];
    if (future is List) {
      for (final raw in future.whereType<Map>()) {
        out.add(ChapterView.fromLifeMap(
          Map<String, dynamic>.from(raw),
          tense: 'future',
        ));
      }
    }
    return out;
  }

  List<ChapterView> chaptersByTense(String tense) =>
      chapters.where((c) => c.tense == tense).toList();

  Map<String, dynamic> _legacyPerson() {
    final identity = _legacyIdentity();
    final preview = _content['free_preview'];
    return {
      'display_hook': _text(preview, 'decode_hit'),
      'summary': _text(identity, 'summary'),
      'traits': {
        'strengths': _strings(identity, 'strengths'),
        'watchouts': _strings(identity, 'watchouts'),
      },
      'patterns': {
        'work_money': _text(identity, 'work_money_pattern'),
        'relationship': _text(identity, 'relationship_pattern'),
      },
    };
  }

  Map<String, dynamic> _legacyIdentity() {
    final raw = _content['user_identity'];
    if (raw is Map) return Map<String, dynamic>.from(raw);
    final me = _content['me_profile'];
    if (me is Map) return Map<String, dynamic>.from(me);
    return const {};
  }

  static String _text(dynamic raw, [String? key]) {
    if (key == null) return raw?.toString().trim() ?? '';
    if (raw is Map) return raw[key]?.toString().trim() ?? '';
    return '';
  }

  static List<String> _strings(dynamic raw, String key) {
    if (raw is! Map) return const [];
    final list = raw[key];
    if (list is! List) return const [];
    return list.map((e) => e.toString().trim()).where((s) => s.isNotEmpty).toList();
  }
}

class PlaybookDay {
  const PlaybookDay({
    required this.oneLine,
    required this.betterFor,
    required this.beCareful,
    required this.goodSummary,
    required this.avoidSummary,
  });

  final String oneLine;
  final List<String> betterFor;
  final List<String> beCareful;
  final String goodSummary;
  final String avoidSummary;

  factory PlaybookDay.fromJson(Map<String, dynamic> j) => PlaybookDay(
        oneLine: j['one_line']?.toString() ?? '',
        betterFor: _list(j['better_for']),
        beCareful: _list(j['be_careful']),
        goodSummary: j['good_window_summary']?.toString() ?? '',
        avoidSummary: j['avoid_window_summary']?.toString() ?? '',
      );

  factory PlaybookDay.fromLegacyTodayCard(Map<String, dynamic> j) => PlaybookDay(
        oneLine: j['one_line']?.toString() ?? j['body']?.toString() ?? '',
        betterFor: _list(j['better_for']),
        beCareful: _list(j['be_careful']),
        goodSummary: '',
        avoidSummary: '',
      );

  factory PlaybookDay.fromLegacyGuidance(Map<String, dynamic> j) => PlaybookDay(
        oneLine: j['main_advice']?.toString() ?? '',
        betterFor: _list(j['best_for']),
        beCareful: _list(j['be_careful']),
        goodSummary: j['good_window_summary']?.toString() ?? '',
        avoidSummary: j['avoid_window_summary']?.toString() ?? '',
      );

  static List<String> _list(dynamic raw) {
    if (raw is! List) return const [];
    return raw.map((e) => e.toString().trim()).where((s) => s.isNotEmpty).toList();
  }
}

class HorizonView {
  const HorizonView({
    required this.headline,
    required this.body,
    required this.caution,
  });

  final String headline;
  final String body;
  final String caution;

  static HorizonView from(dynamic raw) {
    if (raw is! Map) return const HorizonView(headline: '', body: '', caution: '');
    final map = Map<String, dynamic>.from(raw);
    return HorizonView(
      headline: map['headline']?.toString() ?? '',
      body: map['action_focus']?.toString() ??
          map['strategy']?.toString() ??
          map['focus']?.toString() ??
          '',
      caution: map['caution']?.toString() ?? '',
    );
  }
}

class RecognitionCard {
  const RecognitionCard({
    required this.periodLabel,
    required this.theme,
    required this.whatMayMatch,
  });

  final String periodLabel;
  final String theme;
  final String whatMayMatch;

  factory RecognitionCard.fromJson(Map<String, dynamic> j) => RecognitionCard(
        periodLabel:
            j['period_label']?.toString() ?? j['period']?.toString() ?? '',
        theme: j['theme']?.toString() ?? j['main_theme']?.toString() ?? '',
        whatMayMatch: j['what_may_match']?.toString() ?? '',
      );
}

class ChapterView {
  const ChapterView({
    required this.tense,
    required this.periodLabel,
    required this.title,
    required this.story,
    required this.useFor,
    required this.avoid,
  });

  final String tense;
  final String periodLabel;
  final String title;
  final String story;
  final String useFor;
  final String avoid;

  factory ChapterView.fromJson(Map<String, dynamic> j) => ChapterView(
        tense: j['tense']?.toString() ?? '',
        periodLabel: j['period_label']?.toString() ?? '',
        title: j['title']?.toString() ?? j['theme']?.toString() ?? '',
        story: j['story']?.toString() ?? '',
        useFor: j['use_for']?.toString() ?? j['use_it_for']?.toString() ?? '',
        avoid: j['avoid']?.toString() ?? '',
      );

  factory ChapterView.fromLifeMap(Map<String, dynamic> j, {required String tense}) {
    final parts = [
      j['career']?.toString(),
      j['money']?.toString(),
      j['family_relationship']?.toString(),
    ].whereType<String>().where((s) => s.trim().isNotEmpty);
    return ChapterView(
      tense: tense,
      periodLabel: j['period']?.toString() ?? '',
      title: j['theme']?.toString() ?? '',
      story: parts.join('\n'),
      useFor: j['use_it_for']?.toString() ?? '',
      avoid: j['avoid']?.toString() ?? '',
    );
  }
}
