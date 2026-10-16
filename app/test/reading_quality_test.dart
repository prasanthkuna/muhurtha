import 'package:flutter_test/flutter_test.dart';
import 'package:muhurta/core/data/birth_pack_views.dart';
import 'package:muhurta/core/data/life_period_matching.dart';
import 'package:muhurta/core/data/muhurtha_engine_api.dart';

BirthPackPayload pack(Map<String, dynamic> content) => BirthPackPayload(
  date: '2026-10-16',
  locale: 'te',
  displayName: '',
  locationLabel: '',
  provider: 'test',
  model: 'test',
  content: content,
);

void main() {
  test('English and Telugu labels match the same life period', () {
    expect(lifeEventMatchesChapter(
      'మార్చి 2026 - జూన్ 2028', 'Mar 2026 - Jun 2028'), isTrue);
    expect(lifeEventMatchesChapter(
      'జూన్ 2028 - జూన్ 2029', 'Mar 2026 - Jun 2028'), isFalse);
    expect(lifeEventMatchesChapter(
      'Jul 2037 - Jul 2040', 'Jul 2021 - Sep 2023'), isFalse);
  });

  test('Decode includes relationship report (singular source key)', () {
    final views = BirthPackViews(pack({
      'category_reports': {
        'relationship': {'headline': 'Care and clarity', 'summary': 'A theme'},
        'career': {'headline': 'Focused work', 'summary': 'Another theme'},
      },
    }));
    expect(views.categoryReports.map((x) => x.key), contains('relationship'));
  });

  test('legacy duplicate periods select the later editorial narrative', () {
    final views = BirthPackViews(pack({
      'journey_phase_facts': [
        {'periodLabel': 'Mar 2026 - Jun 2028', 'tense': 'current'}
      ],
      'journey_phases': [
        {'periodLabel': 'Mar 2026 - Jun 2028', 'sortOrder': 0,
         'title': 'Jupiter-Mercury', 'sentences': ['Fallback description']},
        {'periodLabel': 'Mar 2026 - Jun 2028', 'sortOrder': 0,
         'title': 'A more personal chapter',
         'sentences': ['Distinct editorial reading']},
      ],
    }));
    expect(views.chapters.length, 1);
    expect(views.chapters.single.title, 'A more personal chapter');
  });
}
