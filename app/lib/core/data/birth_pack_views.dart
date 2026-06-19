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
    final cards = rangeCards(raw);
    if (cards.isEmpty) {
      return const HorizonView(headline: '', body: '', caution: '');
    }
    return cards.first;
  }

  List<HorizonView> get weeklyCards => rangeCards(_content['weekly_cards']);

  List<HorizonView> get monthlyCards => rangeCards(_content['monthly_cards']);

  static List<HorizonView> rangeCards(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((card) => horizonFromRangeCard(Map<String, dynamic>.from(card)))
        .where((h) => h.headline.isNotEmpty || h.body.isNotEmpty)
        .toList();
  }

  static HorizonView horizonFromRangeCard(Map<String, dynamic> card) {
    final careful = card['be_careful'];
    return HorizonView(
      headline: card['title']?.toString().trim().isNotEmpty == true
          ? card['title'].toString().trim()
          : card['key']?.toString().trim() ?? '',
      body: card['body']?.toString().trim() ?? '',
      caution: careful is List
          ? careful.map((e) => e.toString().trim()).where((s) => s.isNotEmpty).join('\n')
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

  /// Tap-ready Ask chips from pack `ask_templates` (strings or objects).
  List<String> get askSuggestions {
    final raw = _content['ask_templates'];
    if (raw is! List) return const [];
    final out = <String>[];
    for (final item in raw) {
      if (item is String) {
        final q = item.trim();
        if (q.isNotEmpty) out.add(q);
        continue;
      }
      if (item is Map) {
        final map = Map<String, dynamic>.from(item);
        final q = (map['question'] ?? map['title'] ?? map['label'] ?? '')
            .toString()
            .trim();
        if (q.isNotEmpty) out.add(q);
      }
    }
    return out;
  }

  String get askKnowledgeHint {
    final knowledge = _content['ask_knowledge'];
    if (knowledge is! Map) return '';
    final map = Map<String, dynamic>.from(knowledge);
    return (map['compact_summary'] ?? map['body'] ?? map['headline'] ?? '')
        .toString()
        .trim();
  }

  List<ChapterView> get chapters {
    final fromJourney = _chaptersFromJourneyPhases();
    if (fromJourney.isNotEmpty) {
      return _dedupeChapters(fromJourney);
    }
    if (_content['chapters'] is List) {
      return _dedupeChapters(
        (_content['chapters'] as List)
            .whereType<Map>()
            .map((e) => ChapterView.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
    }
    return _dedupeChapters(_chaptersFromLifeMapOnly());
  }

  /// Drop duplicate period rows (e.g. current chapter duplicated in past).
  List<ChapterView> _dedupeChapters(List<ChapterView> rows) {
    final currentPeriods = rows
        .where((c) => c.tense == 'current')
        .map((c) => _normalizePeriod(c.periodLabel))
        .where((p) => p.isNotEmpty)
        .toSet();
    final seen = <String>{};
    final out = <ChapterView>[];
    for (final row in rows) {
      final norm = _normalizePeriod(row.periodLabel);
      if (norm.isEmpty) continue;
      if (row.tense == 'past' && currentPeriods.contains(norm)) continue;
      final key = '$norm|${row.tense}';
      if (seen.contains(key)) continue;
      seen.add(key);
      out.add(row);
    }
    return out;
  }

  List<ChapterView> _chaptersFromLifeMapOnly() {
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

  List<ChapterView> _chaptersFromJourneyPhases() {
    final raw = _content['journey_phases'];
    if (raw is! List) return const [];
    final tenseByPeriod = _journeyTenseByPeriod();
    final items = raw.whereType<Map>().map(Map<String, dynamic>.from).toList()
      ..sort((a, b) {
        final ao = a['sortOrder'];
        final bo = b['sortOrder'];
        if (ao is num && bo is num) return ao.compareTo(bo);
        return 0;
      });

    final out = <ChapterView>[];
    for (final j in items) {
      final periodLabel = j['periodLabel']?.toString().trim() ?? '';
      final title = j['title']?.toString().trim() ?? '';
      final body = _journeyBody(j);
      if (periodLabel.isEmpty || (body.isEmpty && title.isEmpty)) continue;

      final tense = j['tense']?.toString().trim() ??
          tenseByPeriod[_normalizePeriod(periodLabel)] ??
          'past';

      out.add(
        ChapterView(
          tense: tense,
          periodLabel: periodLabel,
          title: title,
          story: body,
          useFor: j['phasePulse']?.toString().trim() ?? '',
          avoid: j['transitionNote']?.toString().trim() ?? '',
          shareHook: j['shareHook']?.toString().trim() ?? '',
          locked: j['proLocked'] == true,
        ),
      );
    }
    return out;
  }

  /// Period label → past | current | future for client rendering.
  Map<String, String> _journeyTenseByPeriod() {
    final map = <String, String>{};

    final facts = _content['journey_phase_facts'];
    if (facts is List) {
      for (final raw in facts) {
        if (raw is! Map) continue;
        final label = raw['periodLabel']?.toString().trim() ?? '';
        final tense = raw['tense']?.toString().trim() ?? '';
        if (label.isNotEmpty && tense.isNotEmpty) {
          map[_normalizePeriod(label)] = tense;
        }
      }
      if (map.isNotEmpty) return map;
    }

    final lifeMap = _content['life_map'];
    if (lifeMap is! Map) return _tenseByCurrentIndexFallback(map);

    final lm = Map<String, dynamic>.from(lifeMap);
    final current = lm['current_chapter'];
    String? currentPeriod;
    if (current is Map) {
      currentPeriod = current['period']?.toString().trim();
      if (currentPeriod != null && currentPeriod.isNotEmpty) {
        map[_normalizePeriod(currentPeriod)] = 'current';
      }
    }

    final future = lm['future_chapters'];
    if (future is List) {
      for (final raw in future.whereType<Map>()) {
        final period = raw['period']?.toString().trim() ?? '';
        if (period.isNotEmpty) {
          map[_normalizePeriod(period)] = 'future';
        }
      }
    }

    final past = lm['past_chapters'];
    if (past is List) {
      final currentNorm = _normalizePeriod(currentPeriod ?? '');
      for (final raw in past.whereType<Map>()) {
        final period = raw['period']?.toString().trim() ?? '';
        if (period.isEmpty) continue;
        final norm = _normalizePeriod(period);
        if (norm == currentNorm) continue;
        map.putIfAbsent(norm, () => 'past');
      }
    }

    if (map.isNotEmpty) return map;
    return _tenseByCurrentIndexFallback(map);
  }

  Map<String, String> _tenseByCurrentIndexFallback(Map<String, String> map) {
    final raw = _content['journey_phases'];
    if (raw is! List) return map;

    final sorted = raw.whereType<Map>().map(Map<String, dynamic>.from).toList()
      ..sort((a, b) {
        final ao = a['sortOrder'];
        final bo = b['sortOrder'];
        if (ao is num && bo is num) return ao.compareTo(bo);
        return 0;
      });
    if (sorted.isEmpty) return map;

    var currentIdx = -1;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i]['proLocked'] == true) {
        currentIdx = i > 0 ? i - 1 : 0;
        break;
      }
    }
    if (currentIdx < 0) currentIdx = sorted.length - 1;

    final lifeMap = _content['life_map'];
    if (lifeMap is Map) {
      final cp = (lifeMap['current_chapter'] as Map?)?['period']?.toString();
      if (cp != null && cp.trim().isNotEmpty) {
        final found = sorted.indexWhere(
          (p) => _normalizePeriod(p['periodLabel']?.toString() ?? '') ==
              _normalizePeriod(cp),
        );
        if (found >= 0) currentIdx = found;
      }
    }

    for (var i = 0; i < sorted.length; i++) {
      final label = sorted[i]['periodLabel']?.toString().trim() ?? '';
      if (label.isEmpty) continue;
      final norm = _normalizePeriod(label);
      if (i < currentIdx) {
        map[norm] = 'past';
      } else if (i == currentIdx) {
        map[norm] = 'current';
      } else {
        map[norm] = 'future';
      }
    }
    return map;
  }

  static String _normalizePeriod(String value) =>
      value.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');

  /// Full journey phase copy from the pack — no trimming or rewriting.
  static String _journeyBody(Map<String, dynamic> j) {
    final parts = <String>[];
    void add(String? raw) {
      final line = raw?.trim() ?? '';
      if (line.isEmpty || parts.contains(line)) return;
      parts.add(line);
    }

    add(j['highlight']?.toString());
    final sentences = j['sentences'];
    if (sentences is List) {
      for (final raw in sentences) {
        add(raw.toString());
      }
    }
    add(j['evidenceLine']?.toString());
    add(j['phasePulse']?.toString());
    add(j['transitionNote']?.toString());

    final focus = j['focusAreas'];
    if (focus is List && focus.isNotEmpty) {
      add(focus.map((e) => e.toString().trim()).where((s) => s.isNotEmpty).join(' · '));
    }

    return parts.join('\n\n');
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
    required this.body,
    required this.betterFor,
    required this.beCareful,
    required this.goodSummary,
    required this.avoidSummary,
  });

  final String oneLine;
  final String body;
  final List<String> betterFor;
  final List<String> beCareful;
  final String goodSummary;
  final String avoidSummary;

  String get displayAdvice {
    final parts = <String>[];
    if (oneLine.trim().isNotEmpty) parts.add(oneLine.trim());
    if (body.trim().isNotEmpty && body.trim() != oneLine.trim()) {
      parts.add(body.trim());
    }
    return parts.join('\n\n');
  }

  factory PlaybookDay.fromJson(Map<String, dynamic> j) => PlaybookDay(
        oneLine: j['one_line']?.toString() ?? '',
        body: j['body']?.toString() ?? '',
        betterFor: _list(j['better_for']),
        beCareful: _list(j['be_careful']),
        goodSummary: j['good_window_summary']?.toString() ?? '',
        avoidSummary: j['avoid_window_summary']?.toString() ?? '',
      );

  factory PlaybookDay.fromLegacyTodayCard(Map<String, dynamic> j) {
    final notes = j['good_window_notes'];
    final cautionNotes = j['caution_window_notes'];
    var goodSummary = j['good_window_summary']?.toString().trim() ?? '';
    var avoidSummary = j['avoid_window_summary']?.toString().trim() ?? '';
    if (goodSummary.isEmpty && notes is List && notes.isNotEmpty) {
      goodSummary = notes
          .whereType<Map>()
          .map((n) => n['why_it_works']?.toString().trim() ?? '')
          .where((s) => s.isNotEmpty)
          .join('\n');
    }
    if (avoidSummary.isEmpty && cautionNotes is List && cautionNotes.isNotEmpty) {
      avoidSummary = cautionNotes
          .whereType<Map>()
          .map((n) => n['why_it_works']?.toString().trim() ?? '')
          .where((s) => s.isNotEmpty)
          .join('\n');
    }
    return PlaybookDay(
      oneLine: j['one_line']?.toString().trim() ?? '',
      body: j['body']?.toString().trim() ?? '',
      betterFor: _list(j['better_for']),
      beCareful: _list(j['be_careful']),
      goodSummary: goodSummary,
      avoidSummary: avoidSummary,
    );
  }

  factory PlaybookDay.fromLegacyGuidance(Map<String, dynamic> j) => PlaybookDay(
        oneLine: j['main_advice']?.toString() ?? '',
        body: j['main_advice']?.toString() ?? '',
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
    this.shareLine = '',
    this.locked = false,
  });

  final String periodLabel;
  final String theme;
  final String whatMayMatch;
  final String shareLine;
  final bool locked;

  String get displayBody {
    final parts = <String>[];
    if (whatMayMatch.trim().isNotEmpty) parts.add(whatMayMatch.trim());
    if (shareLine.trim().isNotEmpty) parts.add(shareLine.trim());
    return parts.join('\n\n');
  }

  factory RecognitionCard.fromJson(Map<String, dynamic> j) => RecognitionCard(
        periodLabel:
            j['period_label']?.toString() ?? j['period']?.toString() ?? '',
        theme: j['theme']?.toString() ?? j['main_theme']?.toString() ?? '',
        whatMayMatch: j['what_may_match']?.toString() ?? '',
        shareLine: j['share_line']?.toString() ?? '',
        locked: j['locked'] == true || j['pro_locked'] == true,
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
    this.shareHook = '',
    this.locked = false,
  });

  final String tense;
  final String periodLabel;
  final String title;
  final String story;
  final String useFor;
  final String avoid;
  final String shareHook;
  final bool locked;

  factory ChapterView.fromJson(Map<String, dynamic> j) => ChapterView(
        tense: j['tense']?.toString() ?? '',
        periodLabel: j['period_label']?.toString() ?? '',
        title: j['title']?.toString() ?? j['theme']?.toString() ?? '',
        story: j['story']?.toString() ?? '',
        useFor: j['use_for']?.toString() ?? j['use_it_for']?.toString() ?? '',
        avoid: j['avoid']?.toString() ?? '',
        shareHook: j['share_hook']?.toString() ?? '',
        locked: j['locked'] == true || j['pro_locked'] == true,
      );

  factory ChapterView.fromLifeMap(Map<String, dynamic> j, {required String tense}) {
    final parts = <String>[];
    void add(String? raw) {
      final line = raw?.trim() ?? '';
      if (line.isEmpty || parts.contains(line)) return;
      parts.add(line);
    }

    add(j['theme']?.toString());
    add(j['career']?.toString());
    add(j['money']?.toString());
    add(j['family_relationship']?.toString());
    add(j['use_it_for']?.toString());
    add(j['avoid']?.toString());
    add(j['share_line']?.toString());

    return ChapterView(
      tense: tense,
      periodLabel: j['period']?.toString() ?? '',
      title: j['theme']?.toString() ?? '',
      story: parts.join('\n\n'),
      useFor: j['use_it_for']?.toString() ?? '',
      avoid: j['avoid']?.toString() ?? '',
      shareHook: j['share_line']?.toString() ?? '',
      locked: j['locked'] == true || j['pro_locked'] == true,
    );
  }

  String get displayBody => story.trim();
}

extension BirthPackViewsPaywall on BirthPackViews {
  Map<String, dynamic> get paywallCopy {
    final raw = _content['paywall_copy'];
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return const {};
  }

  List<String> get paywallBullets {
    final bullets = paywallCopy['bullets'];
    if (bullets is! List) return const [];
    return bullets.map((e) => e.toString().trim()).where((s) => s.isNotEmpty).toList();
  }
}
