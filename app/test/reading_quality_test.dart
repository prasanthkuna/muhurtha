import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:muhurta/features/home/widgets/today_panchanga_panel.dart';
import 'package:muhurta/core/data/birth_pack_views.dart';
import 'package:muhurta/core/data/life_period_matching.dart';
import 'package:muhurta/core/data/muhurtha_engine_api.dart';
import 'package:muhurta/features/onboarding/birth_draft.dart';

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
  test('missing city coordinates cannot be mistaken for verified Today', () {
    final today = TodayPayload.fromJson({
      'date':'2026-10-20',
      'locationLabel':'Hyderabad',
      'locationVerified':false,
      'goodWindows':<dynamic>[],
      'cautionWindows':<dynamic>[],
      'betterFor':<dynamic>[],
      'beCarefulWith':<dynamic>[],
    });
    expect(today.locationVerified,isFalse);
    expect(today.panchanga,isNull);
    expect(today.goodWindows,isEmpty);
  });
  test('parsed Panchanga and date comparisons remain inspectable', () {
    final today = TodayPayload.fromJson({
      'date':'2026-10-20','locationLabel':'Hyderabad','locationVerified':true,
      'betterFor':<dynamic>[],'beCarefulWith':<dynamic>[],'goodWindows':<dynamic>[],'cautionWindows':<dynamic>[],
      'panchanga':{'tithi':{'value':'Shukla Pratipada'},'method':'test'}
    });
    expect(today.locationVerified,isTrue);
    expect((today.panchanga?['tithi'] as Map)['value'],'Shukla Pratipada');
    final timing = PurposeCheckResult.fromJson({
      'status':'limited_assessment','headline':'General facts','summary':'',
      'best_windows':[{'start':'11:00','end':'12:00','label':'General'}],
      'caution_windows':<dynamic>[],
      'factors':[{'name':'Tithi','value':'Pratipada'}],
      'candidateDates':[{'date':'2026-10-20'}],
      'limitations':['Specialist rules needed'],
    });
    expect(timing.status,'limited_assessment');
    expect(timing.candidateDates.single['date'],'2026-10-20');
    expect(timing.factors.single['name'],'Tithi');
    expect(timing.bestWindows.single.start,'11:00');
  });
  test('editing a city invalidates previously detected coordinates', () {
    const old = BirthDraft(currentCity:'Old city',currentLat:17.38,
      currentLng:78.48,currentTimezone:'Asia/Kolkata',locationDetected:true);
    final changed = old.copyWith(currentCity:'New city',
      clearCurrentLocation:true,locationDetected:false);
    expect(changed.currentLat,isNull);
    expect(changed.currentLng,isNull);
    expect(changed.currentTimezone,isNull);
    expect(changed.locationDetected,isFalse);
  });

  testWidgets('Today requires verified location before time factors', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: TodayPanchangaPanel(
        locationVerified:false,locationLabel:'Hyderabad',
        panchanga:null,onSetLocation:(){},
      )),
    ));
    expect(find.text('Confirm your current city'),findsOneWidget);
    expect(find.text('Set current city'),findsOneWidget);
  });
  testWidgets('Today shows the supplied Panchanga without inventing factors',(tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(
        child: TodayPanchangaPanel(
          locationVerified:true,locationLabel:'Hyderabad',
          panchanga:{
            'tithi':{'name':'Tithi','value':'Shukla Pratipada'},
            'nakshatra':{'name':'Nakshatra','value':'Ashwini'},
            'yoga':{'name':'Yoga','value':'Siddha'},
            'karana':{'name':'Karana','value':'Bava'},
            'vara':{'name':'Vara','value':'Tuesday'},
            'method':'test',
          },
          onSetLocation:(){},
        ),
      )),
    ));
    expect(find.text('Shukla Pratipada'),findsOneWidget);
    expect(find.text('Ashwini'),findsOneWidget);
    expect(find.text('Confirm your current city'),findsNothing);
  });

}
