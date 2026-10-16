import 'birth_pack_readiness.dart';
import 'muhurtha_engine_api.dart';

/// Expected calendar sizes (must match `PACK_*` in birth_pack_multiturn.ts).
abstract final class BirthPackCoverageExpectations {
  static const int dailyDays = 30;
  static const int weeklyWeeks = 8;
  static const int monthlyMonths = 12;
}

/// Usable vs complete pack — separate from [BirthPackPayload.status].
extension BirthPackCoverage on BirthPackPayload {
  Map<String, dynamic> get _meta {
    final raw = content['pack_meta'];
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return const {};
  }

  int get dailyCardCount {
    final fromMeta = _meta['daily_card_count'];
    if (fromMeta is num) return fromMeta.toInt();
    final cards = content['today_cards'];
    if (cards is List) return cards.length;
    return 0;
  }

  int get weeklyCardCount {
    final fromMeta = _meta['weekly_card_count'];
    if (fromMeta is num) return fromMeta.toInt();
    final cards = content['weekly_cards'];
    if (cards is List) return cards.length;
    return 0;
  }

  int get monthlyCardCount {
    final fromMeta = _meta['monthly_card_count'];
    if (fromMeta is num) return fromMeta.toInt();
    final cards = content['monthly_cards'];
    if (cards is List) return cards.length;
    return 0;
  }

  bool get fullPackComplete {
    final flag = _meta['full_pack_complete'];
    if (flag is bool) return flag;
    return isComplete &&
        dailyCardCount >= BirthPackCoverageExpectations.dailyDays &&
        weeklyCardCount >= BirthPackCoverageExpectations.weeklyWeeks &&
        monthlyCardCount >= BirthPackCoverageExpectations.monthlyMonths;
  }

  List<String> get qualityWarnings {
    final seen = <String>{};
    final out = <String>[];

    void add(String line) {
      final trimmed = line.trim();
      if (trimmed.isEmpty || seen.contains(trimmed)) return;
      seen.add(trimmed);
      out.add(trimmed);
    }

    final fromMeta = _meta['quality_warnings'];
    if (fromMeta is List) {
      for (final raw in fromMeta) {
        add(_humanizeWarning(raw.toString()));
      }
    }

    if (dailyCardCount > 0 &&
        dailyCardCount < BirthPackCoverageExpectations.dailyDays) {
      add(
        'Daily readings cover $dailyCardCount of ${BirthPackCoverageExpectations.dailyDays} days.',
      );
    }
    if (weeklyCardCount > 0 &&
        weeklyCardCount < BirthPackCoverageExpectations.weeklyWeeks) {
      add(
        'Weekly outlook: $weeklyCardCount of ${BirthPackCoverageExpectations.weeklyWeeks} weeks.',
      );
    }
    if (monthlyCardCount > 0 &&
        monthlyCardCount < BirthPackCoverageExpectations.monthlyMonths) {
      add(
        'Monthly outlook: $monthlyCardCount of ${BirthPackCoverageExpectations.monthlyMonths} months.',
      );
    }
    if (!fullPackComplete && out.isNotEmpty) {
      add('Some calendar sections are still filling in.');
    }
    return out;
  }

  String _humanizeWarning(String raw) {
    final line = raw.trim();
    if (line.isEmpty) return line;
    final dailyMatch = RegExp(r'today_cards expected (\d+), got (\d+)').firstMatch(line);
    if (dailyMatch != null) {
      return 'Daily readings cover ${dailyMatch.group(2)} of ${dailyMatch.group(1)} days.';
    }
    if (line.startsWith('weekly_cards') || line.startsWith('monthly_cards')) {
      return 'Outlook calendar is still incomplete.';
    }
    return line;
  }

  bool hasTodayCardFor(String dateIso) {
    final cards = content['today_cards'];
    if (cards is! List) return false;
    for (final raw in cards) {
      if (raw is! Map) continue;
      if (raw['key']?.toString() == dateIso) return true;
    }
    return false;
  }
}
