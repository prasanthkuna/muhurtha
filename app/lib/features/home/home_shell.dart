import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/config/env.dart';
import '../../core/data/birth_pack_readiness.dart';
import '../../core/data/chart_profile_repository.dart';
import '../../core/data/active_chart_profile.dart';
import '../../core/data/birth_pack_views.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/locale/locale_provider.dart';
import '../../core/notifications/muhurtha_notification_service.dart';
import '../../core/growth/referral_service.dart';
import '../../core/share/share_card_service.dart';
import '../../core/data/profile_repository.dart';
import '../../core/analytics/app_analytics.dart';
import '../../core/subscription/subscription_service.dart';
import '../../shared/widgets/paywall_sheet.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/chart_profile_switcher.dart';
import '../../shared/widgets/celestial_components.dart';
import '../../shared/widgets/lucky_strip.dart';
import '../../shared/widgets/editorial/editorial.dart';
import '../../shared/widgets/muh_purpose_chip.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/muhurtha_loading_view.dart';
import 'home_editorial_scroll.dart';
import 'home_prose_card.dart';
import '../../shared/widgets/muh_timeline_hero.dart';
import 'tabs/decode_editorial_tab.dart';
import 'tabs/life_atlas_tab.dart';
import 'tabs/timing_editorial_tab.dart';
import 'home_purpose_provider.dart';
import 'home_share.dart';
import 'widgets/pack_coverage_banner.dart';
import 'widgets/today_timing_panel.dart';
import '../../core/data/birth_pack_coverage.dart';
import '../../core/engagement/ask_conversation_store.dart';
import '../../core/engagement/engagement_scope.dart';

const _purposeEntries = <({String value, String labelKey})>[
  (value: 'career_interview', labelKey: 'purposeCareerInterview'),
  (value: 'business_launch', labelKey: 'purposeBusinessLaunch'),
  (value: 'money_talk', labelKey: 'purposeMoneyTalk'),
  (value: 'property_vehicle', labelKey: 'purposePropertyVehicle'),
  (value: 'relationship_marriage_talk', labelKey: 'purposeRelationship'),
  (value: 'family_discussion', labelKey: 'purposeFamily'),
  (value: 'travel', labelKey: 'purposeTravel'),
  (value: 'study_exam', labelKey: 'purposeStudy'),
  (value: 'health_routine', labelKey: 'purposeHealth'),
];

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({
    super.key,
    this.initialIndex = 0,
    this.initialPurpose,
    this.initialTimingDate,
  });

  final int initialIndex;
  final String? initialPurpose;
  final String? initialTimingDate;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  late var _index = widget.initialIndex.clamp(0, 4);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _configureBilling();
      if (widget.initialPurpose != null) {
        ref.read(homeSelectedPurposeProvider.notifier).state =
            widget.initialPurpose;
      }
      if (widget.initialTimingDate != null) {
        ref.read(homeTimingTargetDateProvider.notifier).state =
            widget.initialTimingDate;
      }
    });
  }

  static const _tabNames = ['today', 'life_map', 'decode', 'timing', 'ask'];

  void _syncTabFromRoute() {
    final tab = GoRouterState.of(context).uri.queryParameters['tab'];
    if (tab == null || tab.isEmpty) return;
    final i = _tabNames.indexOf(tab);
    if (i >= 0 && i != _index) {
      setState(() => _index = i);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncTabFromRoute();
  }

  void _selectTab(int i) {
    final next = i.clamp(0, _tabNames.length - 1);
    if (next != _index) {
      HapticFeedback.selectionClick();
    }
    setState(() => _index = next);
    final tab = _tabNames[next];
    final uri = GoRouterState.of(context).uri;
    final params = Map<String, String>.from(uri.queryParameters);
    if (params['tab'] == tab) return;
    params['tab'] = tab;
    final q = params.entries
        .map((e) =>
            '${Uri.encodeQueryComponent(e.key)}=${Uri.encodeQueryComponent(e.value)}')
        .join('&');
    context.go('/home?$q');
  }

  Future<void> _configureBilling() async {
    final repo = ref.read(profileRepositoryProvider);
    if (repo == null) return;
    try {
      final profileId = await repo.ensureSignedInProfile();
      await ref
          .read(subscriptionServiceProvider)
          .configureForProfile(profileId);
      await ref.read(referralServiceProvider).syncPendingAttribution();
    } catch (_) {}
  }

  String _purposeLabel(AppLocalizations l, String key) {
    return switch (key) {
      'purposeCareerInterview' => l.purposeCareerInterview,
      'purposeBusinessLaunch' => l.purposeBusinessLaunch,
      'purposeMoneyTalk' => l.purposeMoneyTalk,
      'purposePropertyVehicle' => l.purposePropertyVehicle,
      'purposeRelationship' => l.purposeRelationship,
      'purposeFamily' => l.purposeFamily,
      'purposeTravel' => l.purposeTravel,
      'purposeStudy' => l.purposeStudy,
      'purposeHealth' => l.purposeHealth,
      'purposeLegal' => l.purposeLegal,
      'purposeSpiritual' => l.purposeSpiritual,
      'purposeCreative' => l.purposeCreative,
      _ => key,
    };
  }

  String _navLabel(String key) {
    final lang = ref.read(localeProvider).languageCode.toLowerCase();
    const te = {
      'decode': 'డీకోడ్',
      'today': 'ఈరోజు',
      'timing': 'టైమింగ్',
      'life_map': 'లైఫ్ మ్యాప్',
      'ask': 'అడుగు',
    };
    const hi = {
      'decode': 'डिकोड',
      'today': 'आज',
      'timing': 'टाइमिंग',
      'life_map': 'लाइफ मैप',
      'ask': 'पूछें',
    };
    const en = {
      'decode': 'Decode',
      'today': 'Today',
      'timing': 'Timing',
      'life_map': 'Life Map',
      'ask': 'Ask',
      'timeline': 'Today',
    };
    if (lang == 'te') return te[key] ?? en[key] ?? key;
    if (lang == 'hi') return hi[key] ?? en[key] ?? key;
    return en[key] ?? key;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final chartScope = ref.watch(activeChartProfileIdProvider) ?? 'own';
    final displayName = ref.watch(chartDisplayNameProvider);
    final localeCode = ref.watch(localeProvider.select((l) => l.languageCode));
    ref.listen(birthPackProvider, (_, next) {
      final pack = next.valueOrNull;
      if (pack != null && pack.isComplete) {
        ref.read(muhurthaNotificationServiceProvider).syncNextWeek();
      }
    });
    final pages = <Widget>[
      _TodayFocusTab(l10n: l10n, purposeLabel: _purposeLabel),
      LifeAtlasTab(l10n: l10n),
      DecodeEditorialTab(l10n: l10n),
      TimingEditorialTab(l10n: l10n, purposeLabel: _purposeLabel),
      _AskTab(
        l10n: l10n,
        ref: ref,
        purposeLabel: _purposeLabel,
      ),
    ];

    return Scaffold(
        backgroundColor: MuhColors.canvas,
        body: Column(
          children: [
            const ChartProfileBanner(),
            Expanded(
              child: Column(
                children: [
                  SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(
                        MuhSpace.page,
                        0,
                        MuhSpace.sm,
                        MuhSpace.xs,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              displayName.isNotEmpty ? displayName : l10n.appTitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                          Semantics(
                            label: 'Profile settings',
                            button: true,
                            child: IconButton(
                              tooltip: l10n.profileTuneTitle,
                              icon: const Icon(Icons.tune_rounded,
                                  color: MuhColors.inkSecondary),
                              onPressed: () => context.push('/profile'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Expanded(
                    child: IndexedStack(
                      index: _index,
                      children: [
                        for (var i = 0; i < pages.length; i++)
                          _HomeTabKeepAlive(
                            active: _index == i,
                            child: KeyedSubtree(
                              key: ValueKey('$chartScope-$i-$localeCode'),
                              child: pages[i],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
            height: 72,
            selectedIndex: _index,
            onDestinationSelected: _selectTab,
            destinations: [
              NavigationDestination(
                icon: const Icon(MuhTabIcons.today),
                selectedIcon: const Icon(MuhTabIcons.todaySelected),
                label: _navLabel('today'),
              ),
              NavigationDestination(
                icon: const Icon(MuhTabIcons.lifeMap),
                selectedIcon: const Icon(MuhTabIcons.lifeMapSelected),
                label: _navLabel('life_map'),
              ),
              NavigationDestination(
                icon: const Icon(MuhTabIcons.decode),
                selectedIcon: const Icon(MuhTabIcons.decodeSelected),
                label: _navLabel('decode'),
              ),
              NavigationDestination(
                icon: const Icon(MuhTabIcons.timing),
                selectedIcon: const Icon(MuhTabIcons.timingSelected),
                label: _navLabel('timing'),
              ),
              NavigationDestination(
                icon: const Icon(MuhTabIcons.ask),
                selectedIcon: const Icon(MuhTabIcons.askSelected),
                label: _navLabel('ask'),
              ),
            ],
          ),
      );
  }
}

Future<void> _shareExactCard(
  WidgetRef ref,
  BuildContext context, {
  required String title,
  required String body,
  String contextLine = '',
  String sourceType = 'generic_card',
  String? sourceId,
}) =>
    shareExactCard(
      ref,
      context,
      title: title,
      body: body,
      contextLine: contextLine,
      sourceType: sourceType,
      sourceId: sourceId,
    );

class _V3Copy {
  const _V3Copy(this.l10n);

  final AppLocalizations l10n;

  String get decodeTitle => l10n.v3DecodeTitle;
  String get decodeSub => l10n.v3DecodeSub;
  String get moonLabel => l10n.v3MoonLabel;
  String get moonExplainer => l10n.v3MoonExplainer;
  String get sunSign => l10n.v3SunSign;
  String get thisSounds => l10n.v3ThisSounds;
  String get strengths => l10n.v3Strengths;
  String get watchouts => l10n.v3Watchouts;
  String get workMoney => l10n.v3WorkMoney;
  String get relationship => l10n.v3Relationship;
  String get todayTitle => l10n.v3TodayTitle;
  String get todaySub => l10n.v3TodaySub;
  String get mainAdvice => l10n.v3MainAdvice;
  String get goodWindow => l10n.v3GoodWindow;
  String get cautionWindow => l10n.v3CautionWindow;
  String get betterFor => l10n.v3BetterFor;
  String get carefulWith => l10n.v3CarefulWith;
  String get timingTitle => l10n.v3TimingTitle;
  String get timingSub => l10n.v3TimingSub;
  String get week => l10n.v3Week;
  String get month => l10n.v3Month;
  String get currentPhase => l10n.v3CurrentPhase;
  String get lifeTitle => l10n.v3LifeTitle;
  String get lifeSub => l10n.v3LifeSub;
  String get pastCheck => l10n.v3PastCheck;
  String get coming => l10n.v3Coming;
  String get ask => l10n.v3Ask;
  String get failed => l10n.v3ShareFailed;
}

class _TodayFocusTab extends ConsumerStatefulWidget {
  const _TodayFocusTab({
    required this.l10n,
    required this.purposeLabel,
  });

  final AppLocalizations l10n;
  final String Function(AppLocalizations l, String key) purposeLabel;

  @override
  ConsumerState<_TodayFocusTab> createState() => _TodayFocusTabState();
}

class _TodayFocusTabState extends ConsumerState<_TodayFocusTab> {
  var _loggedOpen = false;
  var _planningExpanded = false;
  var _traditionsExpanded = false;
  var _outlookExpanded = false;

  @override
  Widget build(BuildContext context) {
    final l10n = widget.l10n;
    if (!Env.supportsPackTabs) {
      return _EmptyStateScreen(
        headline: l10n.todayEmptyHeadline,
        message: l10n.errorNeedSupabase,
        icon: Icons.wb_sunny_outlined,
      );
    }
    final today = ref.watch(todayPayloadProvider);
    final packAsync = ref.watch(birthPackProvider);
    final remedies = ref.watch(remedyListProvider);
    ref.watch(activeChartProfileIdProvider);
    final subjectName = ref.watch(chartDisplayNameProvider);
    final copy = _V3Copy(l10n);
    return packAsync.when(
      data: (pack) {
        final payload = today.valueOrNull;
        final packReady = pack != null && pack.hasLlmPack;

        if (payload == null) {
          if (today.isLoading || pack == null) {
            return MuhurthaLoadingView(
              mode: MuhurthaLoadingMode.screen,
              message: l10n.loadingTodayWindows,
            );
          }
          return _EmptyStateScreen(
            headline: l10n.todayEmptyHeadline,
            message: l10n.todayEmptyMessage,
            icon: Icons.wb_sunny_outlined,
          );
        }

        if (!packReady) {
          final instantHeadline = payload.oneLine ?? '';
          final todayTitle = subjectName.isNotEmpty
              ? '${subjectName.trim()}, ${copy.todayTitle.toLowerCase()}'
              : copy.todayTitle;
          return HomeEditorialScroll(
            title: todayTitle,
            subtitle: '',
            onRefresh: () async {
              ref.invalidate(birthPackProvider);
              ref.invalidate(todayPayloadProvider);
              await ref.read(todayPayloadProvider.future);
            },
            children: [
              MuhTimelineHero(
                payload: payload,
                headline: instantHeadline,
                personalizing: true,
              ),
              const SizedBox(height: MuhSpace.md),
              TodayTimingPanel(
                payload: payload,
                goodTitle: copy.goodWindow,
                cautionTitle: copy.cautionWindow,
              ),
              const SizedBox(height: MuhSpace.lg),
              _PersonalizingBanner(message: l10n.loadingToday),
            ],
          );
        }
        final views = BirthPackViews(pack);
        final playbook = views.playbookFor(payload.date);
        final mainAdvice = playbook?.oneLine.trim().isNotEmpty == true
            ? playbook!.oneLine.trim()
            : payload.oneLine ?? '';
        final detailedAdvice = playbook?.body.trim() ?? '';
        final goodSummary = playbook?.goodSummary ?? '';
        final avoidSummary = playbook?.avoidSummary ?? '';
        final betterFor = playbook?.betterFor.isNotEmpty == true
            ? playbook!.betterFor
            : payload.betterFor.take(4).toList();
        final beCareful = playbook?.beCareful.isNotEmpty == true
            ? playbook!.beCareful
            : payload.beCarefulWith.take(4).toList();
        final luck = payload.natalLuck ??
            views.natalLuck ??
            NatalLuckInfo.fromMoonSign(payload.birthMoonSign);
        final remedy = remedies.valueOrNull?.firstOrNull;
        final todayTitle = subjectName.isNotEmpty
            ? '${subjectName.trim()}, ${copy.todayTitle.toLowerCase()}'
            : copy.todayTitle;
        if (!_loggedOpen) {
          _loggedOpen = true;
          unawaited(
            ref.read(appAnalyticsProvider).todayOpened(
                  hasNewContent: mainAdvice.isNotEmpty,
                ),
          );
        }
        return HomeEditorialScroll(
          title: todayTitle,
          subtitle: '',
          onRefresh: () async {
            ref.invalidate(birthPackProvider);
            ref.invalidate(todayPayloadProvider);
            ref.invalidate(remedyListProvider);
            await ref.read(todayPayloadProvider.future);
          },
          footer: MuhQuietButton(
            label: 'Share reading',
            icon: Icons.ios_share_rounded,
            onPressed: () => _shareExactCard(
              ref,
              context,
              title: copy.todayTitle,
              body: mainAdvice.isNotEmpty ? mainAdvice : (payload.oneLine ?? ''),
              sourceType: 'today_one_line',
              sourceId: 'today-main-${payload.date}',
            ),
          ),
          children: [
            PackCoverageBanner(pack: pack),
            if (!pack.hasTodayCardFor(payload.date) && pack.dailyCardCount > 0)
              Padding(
                padding: const EdgeInsets.only(bottom: MuhSpace.md),
                child: MuhInlineStatus(
                  message:
                      'No dedicated reading for this date yet. Windows below are calculated; narrative may be limited.',
                  kind: MuhInlineStatusKind.empty,
                ),
              ),
            MuhTimelineHero(
              payload: payload,
              headline: mainAdvice.isNotEmpty ? mainAdvice : (payload.oneLine ?? ''),
            ),
            if (detailedAdvice.isNotEmpty && detailedAdvice != mainAdvice)
              ExpansionTile(
                title: Text(copy.todayTitle),
                childrenPadding: const EdgeInsets.all(MuhSpace.md),
                children: [
                  Text(detailedAdvice,
                    style: Theme.of(context).textTheme.bodyMedium
                        ?.copyWith(height: 1.55)),
                ],
              ),
            const SizedBox(height: MuhSpace.md),
            TodayTimingPanel(
              payload: payload,
              goodTitle: copy.goodWindow,
              cautionTitle: copy.cautionWindow,
              goodSummary: goodSummary.isNotEmpty ? goodSummary : null,
              avoidSummary: avoidSummary.isNotEmpty ? avoidSummary : null,
              betterFor: betterFor,
              beCareful: beCareful,
            ),
            const SizedBox(height: MuhSpace.md),
            MuhQuietButton(
              label: _planningExpanded
                  ? l10n.purposeChoose
                  : '${l10n.purposeChoose}…',
              icon: _planningExpanded
                  ? Icons.expand_less_rounded
                  : Icons.expand_more_rounded,
              onPressed: () =>
                  setState(() => _planningExpanded = !_planningExpanded),
            ),
            if (_planningExpanded) ...[
              const SizedBox(height: MuhSpace.sm),
              Wrap(
                spacing: MuhSpace.sm,
                runSpacing: MuhSpace.sm,
                children: _purposeEntries.map((entry) {
                  final purposeLabel =
                      widget.purposeLabel(l10n, entry.labelKey);
                  final selected =
                      ref.watch(homeSelectedPurposeProvider) == entry.value;
                  return MuhPurposeChip(
                    label: purposeLabel,
                    isSelected: selected,
                    onTap: () {
                      ref.read(homeSelectedPurposeProvider.notifier).state =
                          entry.value;
                      unawaited(
                        ref.read(appAnalyticsProvider).purposeSelected(
                              purpose: entry.value,
                            ),
                      );
                    },
                  );
                }).toList(),
              ),
              if (ref.watch(homeSelectedPurposeProvider) != null) ...[
                const SizedBox(height: MuhSpace.sm),
                MuhPrimaryButton(
                  expanded: false,
                  label: l10n.purposeCheck,
                  onPressed: () {
                    final purpose = ref.read(homeSelectedPurposeProvider)!;
                    ref.read(homeTimingTargetDateProvider.notifier).state =
                        payload.date;
                    context.go(
                      '/home?tab=timing&purpose=${Uri.encodeComponent(purpose)}&date=${Uri.encodeComponent(payload.date)}',
                    );
                  },
                ),
              ],
            ],
            if (views.week.headline.isNotEmpty || views.month.headline.isNotEmpty) ...[
              const SizedBox(height: MuhSpace.md),
              MuhQuietButton(
                label: _outlookExpanded ? 'Hide outlook' : 'This week / month',
                icon: _outlookExpanded
                    ? Icons.expand_less_rounded
                    : Icons.expand_more_rounded,
                onPressed: () =>
                    setState(() => _outlookExpanded = !_outlookExpanded),
              ),
              if (_outlookExpanded) ...[
                const SizedBox(height: MuhSpace.sm),
                if (views.week.headline.isNotEmpty || views.week.body.isNotEmpty)
                  HomeProseCard(
                    eyebrow: copy.week,
                    title: views.week.headline,
                    body: views.week.body,
                  ),
                if (views.month.headline.isNotEmpty || views.month.body.isNotEmpty)
                  HomeProseCard(
                    eyebrow: copy.month,
                    title: views.month.headline,
                    body: views.month.body,
                  ),
              ],
            ],
            if (remedy != null ||
                luck.luckyNumbers.isNotEmpty ||
                luck.luckyDays.isNotEmpty ||
                luck.luckyColours.isNotEmpty) ...[
              const SizedBox(height: MuhSpace.md),
              MuhQuietButton(
                label: _traditionsExpanded
                    ? 'Hide traditions'
                    : 'Traditions & practice',
                icon: _traditionsExpanded
                    ? Icons.expand_less_rounded
                    : Icons.expand_more_rounded,
                onPressed: () => setState(
                  () => _traditionsExpanded = !_traditionsExpanded,
                ),
              ),
              if (_traditionsExpanded) ...[
                const SizedBox(height: MuhSpace.sm),
                if (luck.luckyNumbers.isNotEmpty ||
                    luck.luckyDays.isNotEmpty ||
                    luck.luckyColours.isNotEmpty)
                  LuckyStrip(luck: luck),
                if (remedy != null)
                  RitualCard(
                    typeLabel: remedy.remedyCategoryLabel,
                    title: remedy.title,
                    whyNow: remedy.whyNow,
                    whatToDo: remedy.simpleLine,
                    keepItSimple: remedy.keepItSimple,
                  ),
              ],
            ],
          ],
        );
      },
      loading: () => MuhurthaLoadingView(
        mode: MuhurthaLoadingMode.screen,
        message: l10n.loadingTodayWindows,
      ),
      error: (_, __) => _EmptyStateScreen(
        headline: l10n.todayEmptyHeadline,
        message: l10n.errorGeneric,
        icon: Icons.wb_sunny_outlined,
      ),
    );
  }
}

class _AskTab extends StatefulWidget {
  const _AskTab({
    required this.l10n,
    required this.ref,
    required this.purposeLabel,
  });

  final AppLocalizations l10n;
  final WidgetRef ref;
  final String Function(AppLocalizations l, String key) purposeLabel;

  @override
  State<_AskTab> createState() => _AskTabState();
}

class _AskTabState extends State<_AskTab> {
  final _controller = TextEditingController();
  AsyncValue<AskAnswerResult?>? _result;
  String? _sessionId;
  bool? _answerUseful;
  List<AskTurn> _history = const [];
  var _loadedHistory = false;

  String get _lang =>
      widget.ref.read(localeProvider).languageCode.toLowerCase();

  String _tx(String key) {
    const en = {
      'title': 'Ask Muhurta',
      'sub':
          'Ask about timing, work, money, family, travel, study, or a tough conversation.',
      'placeholder': 'Ask Muhurta anything...',
      'suggested': 'Try asking',
      'send': 'Ask',
      'thinking': 'Checking your timing...',
      'answer': 'Direct answer',
      'best': 'Best time',
      'caution': 'Caution time',
      'better': 'Better option',
      'action': 'What to do now',
      'share_failed': 'Share failed',
      'empty': 'Type a question first.',
      'share_title': 'Ask Muhurta answer',
    };
    const te = {
      'title': 'ముహూర్తని అడగండి',
      'sub':
          'టైమింగ్, పని, డబ్బు, కుటుంబం, ప్రయాణం, చదువు, లేదా కష్టమైన మాట గురించి అడగండి.',
      'placeholder': 'ముహూర్తని ఏదైనా అడగండి...',
      'suggested': 'ఇలా అడగండి',
      'send': 'అడగండి',
      'thinking': 'మీ టైమింగ్ చూస్తున్నాం...',
      'answer': 'సూటి సమాధానం',
      'best': 'మంచి సమయం',
      'caution': 'జాగ్రత్త సమయం',
      'better': 'మరింత మంచి ఆప్షన్',
      'action': 'ఇప్పుడు చేయాల్సింది',
      'share_failed': 'షేర్ కాలేదు',
      'empty': 'ముందు ప్రశ్న టైప్ చేయండి.',
      'share_title': 'ముహూర్త సమాధానం',
    };
    const hi = {
      'title': 'मुहूर्त से पूछें',
      'sub':
          'समय, काम, पैसे, परिवार, यात्रा, पढ़ाई या कठिन बात के बारे में पूछें.',
      'placeholder': 'मुहूर्त से कुछ भी पूछें...',
      'suggested': 'ऐसे पूछें',
      'send': 'पूछें',
      'thinking': 'आपका समय देख रहे हैं...',
      'answer': 'सीधा जवाब',
      'best': 'अच्छा समय',
      'caution': 'सावधानी समय',
      'better': 'बेहतर विकल्प',
      'action': 'अब क्या करें',
      'share_failed': 'शेयर नहीं हुआ',
      'empty': 'पहले सवाल लिखें.',
      'share_title': 'मुहूर्त जवाब',
    };
    if (_lang == 'te') return te[key] ?? en[key] ?? key;
    if (_lang == 'hi') return hi[key] ?? en[key] ?? key;
    return en[key] ?? key;
  }

  List<String> _suggestions(BirthPackPayload? pack) {
    if (pack != null) {
      final fromPack = BirthPackViews(pack).askSuggestions;
      if (fromPack.isNotEmpty) return fromPack;
    }
    if (_lang == 'te') {
      return const [
        'ఈరోజు ఇంటర్వ్యూకి బాగుందా?',
        'మేనేజర్‌తో ఎప్పుడు మాట్లాడాలి?',
        'ఈ వారం డబ్బు విషయంలో ఏం జాగ్రత్త?',
        'ప్రయాణం ప్లాన్ చేయడానికి ఏ సమయం మంచిది?',
      ];
    }
    if (_lang == 'hi') {
      return const [
        'आज इंटरव्यू के लिए ठीक है?',
        'मैनेजर से कब बात करूं?',
        'इस हफ्ते पैसे में क्या सावधानी?',
        'यात्रा प्लान करने का अच्छा समय?',
      ];
    }
    return const [
      'Is today good for an interview?',
      'When should I talk to my manager?',
      'What should I avoid this week?',
      'Best time for a property discussion?',
    ];
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadHistory());
  }

  void _loadHistory() {
    if (_loadedHistory) return;
    _loadedHistory = true;
    final scope = engagementScope(widget.ref);
    final store = AskConversationStore.instance;
    setState(() {
      _sessionId = store.sessionIdFor(scope);
      _history = store.turnsFor(scope);
    });
  }

  Future<void> _ask() async {
    final question = _controller.text.trim();
    if (question.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_tx('empty'))),
      );
      return;
    }
    final api = widget.ref.read(muhurthaEngineApiProvider);
    if (api == null) return;
    setState(() {
      _result = const AsyncValue.loading();
      _answerUseful = null;
    });
    try {
      final packLocale =
          widget.ref.read(birthPackProvider).valueOrNull?.locale;
      final loc = (packLocale != null && packLocale.isNotEmpty)
          ? packLocale
          : widget.ref.read(localeProvider).languageCode;
      final r = await api.ask(
        question: question,
        sessionId: _sessionId,
        locale: loc,
      );
      final scope = engagementScope(widget.ref);
      final store = AskConversationStore.instance;
      await store.saveSessionId(scope, r.sessionId);
      await store.appendTurn(
        scope,
        AskTurn(
          question: question,
          directAnswer: r.directAnswer,
          askedMs: DateTime.now().millisecondsSinceEpoch,
          sessionId: r.sessionId,
        ),
      );
      setState(() {
        _sessionId = r.sessionId;
        _result = AsyncValue.data(r);
        _history = store.turnsFor(scope);
      });
    } catch (e, st) {
      setState(() => _result = AsyncValue.error(e, st));
      if (e is EngineException && e.code == 'free_ask_limit_reached' && mounted) {
        unawaited(
          PaywallSheet.show(
            context,
            headline: widget.l10n.paywallTitle,
            subline: widget.l10n.errorAskLimitReached,
            preferredPlan: PaywallPlan.pro,
          ),
        );
      }
    }
  }

  Future<void> _shareAsk(AskAnswerResult result) async {
    try {
      await widget.ref.read(shareCardServiceProvider).shareInsight(
        context: context,
        sourceType: 'ask_answer',
        sourceId: result.answerId,
        payload: {
          'title': _tx('share_title'),
          'question': _controller.text.trim(),
          'directAnswer': result.directAnswer,
          'bestTime': result.bestTime,
          'cautionTime': result.cautionTime,
          'betterOption': result.betterOption,
          'actionLine': result.actionLine,
          'shareHook': result.shareHook,
        },
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${_tx('share_failed')}: $e')),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!Env.supportsPackTabs) {
      return _EmptyStateScreen(
        headline: _tx('title'),
        message: widget.l10n.errorNeedSupabase,
        icon: Icons.chat_bubble_outline_rounded,
      );
    }

    if (widget.ref.watch(activeChartProfileIdProvider) != null) {
      return _EmptyStateScreen(
        headline: _tx('title'),
        message: widget.l10n.chartProfileAskBlocked,
        icon: Icons.chat_bubble_outline_rounded,
        actionLabel: widget.l10n.chartProfileBackToMine,
        onAction: () => selectOwnChart(widget.ref),
      );
    }

    final packAsync = widget.ref.watch(birthPackProvider);
    return packAsync.when(
      data: (pack) {
        if (pack != null && !pack.hasLlmPack && pack.isGenerating) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.ask,
            message: widget.l10n.loadingAsk,
          );
        }
        return _askBody(theme, pack: pack);
      },
      loading: () => MuhurthaLoadingView(
        mode: MuhurthaLoadingMode.ask,
        message: widget.l10n.loadingAsk,
      ),
      error: (_, __) => _askBody(theme, pack: null),
    );
  }

  Widget _askBody(ThemeData theme, {BirthPackPayload? pack}) {
    final knowledgeHint = pack == null ? '' : BirthPackViews(pack).askKnowledgeHint;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          MuhSpace.page,
          MuhSpace.xxl,
          MuhSpace.page,
          MuhSpace.xl,
        ),
        children: [
          Text(
            _tx('title'),
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: MuhSpace.sm),
          Text(
            knowledgeHint.isNotEmpty ? knowledgeHint : _tx('sub'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: MuhColors.inkSecondary,
              height: 1.45,
            ),
          ),
          const SizedBox(height: MuhSpace.xl),
          MuhPromptComposer(
            controller: _controller,
            hint: _tx('placeholder'),
            sendLabel: _tx('send'),
            onSend: _ask,
            sending: _result?.isLoading ?? false,
          ),
          const SizedBox(height: MuhSpace.lg),
          Text(
            _tx('suggested'),
            style: theme.textTheme.titleSmall?.copyWith(
              color: MuhColors.goldDeep,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: MuhSpace.sm),
          Wrap(
            spacing: MuhSpace.sm,
            runSpacing: MuhSpace.sm,
            children: _suggestions(pack).map(
              (q) => MuhPurposeChip(
                label: q,
                isSelected: false,
                onTap: () {
                  _controller.text = q;
                  _controller.selection = TextSelection.collapsed(
                    offset: _controller.text.length,
                  );
                },
              ),
            ).toList(),
          ),
          if (_history.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.lg),
            Text(
              'Recent',
              style: theme.textTheme.titleSmall?.copyWith(
                color: MuhColors.inkSecondary,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: MuhSpace.sm),
            for (final turn in _history.reversed.take(6))
              Padding(
                padding: const EdgeInsets.only(bottom: MuhSpace.md),
                child: Container(
                  padding: const EdgeInsets.all(MuhSpace.md),
                  decoration: BoxDecoration(
                    color: MuhColors.paper,
                    borderRadius: BorderRadius.circular(MuhRadius.card),
                    border: Border.all(color: MuhColors.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        turn.question,
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: MuhColors.goldDeep,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: MuhSpace.xs),
                      Text(
                        turn.directAnswer,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: MuhColors.ink,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
          const SizedBox(height: MuhSpace.xl),
          if (_result != null)
            _result!.when(
              data: (r) => r == null
                  ? const SizedBox.shrink()
                  : _AskAnswerCard(
                      result: r,
                      labels: {
                        'answer': _tx('answer'),
                        'best': _tx('best'),
                        'caution': _tx('caution'),
                        'better': _tx('better'),
                        'action': _tx('action'),
                      },
                      answerUseful: _answerUseful,
                      onShare: () => _shareAsk(r),
                      onFeedback: (useful) {
                        setState(() => _answerUseful = useful);
                        unawaited(
                          widget.ref
                              .read(appAnalyticsProvider)
                              .askAnswerResolved(useful: useful),
                        );
                      },
                    ),
              loading: () => Padding(
                padding: const EdgeInsets.all(MuhSpace.lg),
                child: Column(
                  children: [
                    MuhurthaLoadingView(
                      mode: MuhurthaLoadingMode.ask,
                      compact: true,
                      message: _tx('thinking'),
                    ),
                  ],
                ),
              ),
              error: (e, _) => Text(
                e is EngineException && e.code == 'free_ask_limit_reached'
                    ? widget.l10n.errorAskLimitReached
                    : widget.l10n.errorGeneric,
              ),
            ),
        ],
      ),
    );
  }
}

class _AskAnswerCard extends StatelessWidget {
  const _AskAnswerCard({
    required this.result,
    required this.labels,
    required this.onShare,
    required this.onFeedback,
    this.answerUseful,
  });

  final AskAnswerResult result;
  final Map<String, String> labels;
  final VoidCallback onShare;
  final void Function(bool useful) onFeedback;
  final bool? answerUseful;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.paper,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            labels['answer'] ?? 'Answer',
            style: theme.textTheme.labelLarge?.copyWith(
              color: MuhColors.goldDeep,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(height: MuhSpace.sm),
          Text(
            result.directAnswer,
            style: theme.textTheme.titleMedium?.copyWith(
              color: MuhColors.ink,
              fontWeight: FontWeight.w700,
              height: 1.38,
            ),
          ),
          const SizedBox(height: MuhSpace.lg),
          _AskAnswerRow(
            label: labels['best'] ?? 'Best time',
            value: result.bestTime,
            icon: Icons.check_circle_outline_rounded,
            color: MuhColors.emerald,
          ),
          _AskAnswerRow(
            label: labels['caution'] ?? 'Caution time',
            value: result.cautionTime,
            icon: Icons.warning_amber_rounded,
            color: MuhColors.amber,
          ),
          _AskAnswerRow(
            label: labels['better'] ?? 'Better option',
            value: result.betterOption,
            icon: Icons.alt_route_rounded,
            color: MuhColors.goldDeep,
          ),
          const SizedBox(height: MuhSpace.md),
          Text(
            labels['action'] ?? 'What to do now',
            style: theme.textTheme.labelLarge?.copyWith(
              color: MuhColors.goldDeep,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: MuhSpace.xs),
          Text(
            result.actionLine,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: MuhColors.ink,
              height: 1.45,
            ),
          ),
          if (result.shareHook.trim().isNotEmpty) ...[
            const SizedBox(height: MuhSpace.md),
            Text(
              result.shareHook,
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.inkSecondary,
                height: 1.45,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          const SizedBox(height: MuhSpace.lg),
          if (answerUseful == null)
            Wrap(
              spacing: MuhSpace.sm,
              runSpacing: MuhSpace.sm,
              children: [
                OutlinedButton(
                  onPressed: () => onFeedback(true),
                  child: const Text('Useful'),
                ),
                OutlinedButton(
                  onPressed: () => onFeedback(false),
                  child: const Text('Didn\'t answer'),
                ),
              ],
            )
          else
            Text(
              answerUseful! ? 'Thanks — noted as useful.' : 'Thanks — we\'ll improve.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.inkSecondary,
              ),
            ),
          MuhQuietButton(
            label: 'Share answer',
            icon: Icons.ios_share_rounded,
            onPressed: onShare,
          ),
        ],
      ),
    );
  }
}

class _AskAnswerRow extends StatelessWidget {
  const _AskAnswerRow({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (value.trim().isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: MuhSpace.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: MuhSpace.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: MuhColors.ink,
                    height: 1.42,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PersonalizingBanner extends StatelessWidget {
  const _PersonalizingBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.surface,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(MuhRadius.chip),
            child: LinearProgressIndicator(
              minHeight: 4,
              backgroundColor: MuhColors.line,
              color: MuhColors.brand,
            ),
          ),
          const SizedBox(height: MuhSpace.md),
          Text(
            message,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: MuhColors.creamMuted,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyStateScreen extends StatelessWidget {
  const _EmptyStateScreen({
    required this.headline,
    required this.message,
    required this.icon,
    this.actionLabel,
    this.onAction,
  });

  final String headline;
  final String message;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          MuhSpace.page,
          MuhSpace.xxl,
          MuhSpace.page,
          MuhSpace.xl,
        ),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(MuhSpace.md),
                decoration: BoxDecoration(
                  color: MuhColors.surfaceGold,
                  borderRadius: BorderRadius.circular(MuhRadius.button),
                  border: Border.all(color: MuhColors.line),
                  boxShadow: MuhShadows.cardSoft,
                ),
                child: Icon(icon, color: MuhColors.gold, size: 28),
              ),
              const SizedBox(width: MuhSpace.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      headline,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    Text(
                      message,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: MuhColors.creamMuted,
                        height: 1.5,
                      ),
                    ),
                    if (actionLabel != null && onAction != null) ...[
                      const SizedBox(height: MuhSpace.lg),
                      OutlinedButton(
                        onPressed: onAction,
                        child: Text(
                          actionLabel!,
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: MuhColors.cream,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HomeTabKeepAlive extends StatefulWidget {
  const _HomeTabKeepAlive({required this.active, required this.child});

  final bool active;
  final Widget child;

  @override
  State<_HomeTabKeepAlive> createState() => _HomeTabKeepAliveState();
}

class _HomeTabKeepAliveState extends State<_HomeTabKeepAlive>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Offstage(offstage: !widget.active, child: widget.child);
  }
}
