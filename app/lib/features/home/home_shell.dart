import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/config/env.dart';
import '../../core/data/birth_pack_readiness.dart';
import '../../core/data/birth_pack_views.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/format/clock_format.dart';
import '../../core/format/day_window_label.dart';
import '../../core/locale/locale_provider.dart';
import '../../core/notifications/muhurtha_notification_service.dart';
import '../../core/share/share_card_service.dart';
import '../../core/data/profile_repository.dart';
import '../../core/subscription/onboarding_intent_map.dart';
import '../../core/subscription/subscription_access.dart';
import '../../core/subscription/subscription_service.dart';
import '../../shared/widgets/paywall_sheet.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/celestial_components.dart';
import '../../shared/widgets/lucky_strip.dart';
import '../../shared/widgets/muhurtha_loading_view.dart';
import '../../shared/widgets/whatsapp_share_button.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';

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
  const HomeShell({super.key, this.initialIndex = 0});

  final int initialIndex;

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  late var _index = widget.initialIndex.clamp(0, 4);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _configureBilling());
  }

  Future<void> _configureBilling() async {
    final repo = ref.read(profileRepositoryProvider);
    if (repo == null) return;
    try {
      final profileId = await repo.ensureSignedInProfile();
      await ref
          .read(subscriptionServiceProvider)
          .configureForProfile(profileId);
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
    };
    if (lang == 'te') return te[key] ?? en[key] ?? key;
    if (lang == 'hi') return hi[key] ?? en[key] ?? key;
    return en[key] ?? key;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    ref.listen(birthPackProvider, (_, next) {
      final pack = next.valueOrNull;
      if (pack != null && pack.isComplete) {
        ref.read(muhurthaNotificationServiceProvider).syncNextWeek();
      }
    });
    final pages = <Widget>[
      _DecodeTab(l10n: l10n, ref: ref),
      _LifeMapTab(l10n: l10n, ref: ref),
      _TodayFocusTab(l10n: l10n, ref: ref),
      _TimingTab(l10n: l10n, ref: ref),
      _AskTab(
        l10n: l10n,
        ref: ref,
        purposeLabel: _purposeLabel,
      ),
    ];

    return OrbitalBackdrop(
      intensity: 0.65,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Column(
          children: [
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.only(right: MuhSpace.sm),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    tooltip: l10n.profileTuneTitle,
                    icon: const Icon(Icons.tune_rounded, color: MuhColors.gold),
                    onPressed: () => context.push('/profile'),
                  ),
                ),
              ),
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 280),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                child: KeyedSubtree(
                  key: ValueKey(_index),
                  child: pages[_index],
                ),
              ),
            ),
          ],
        ),
        bottomNavigationBar: NavigationBarTheme(
          data: NavigationBarThemeData(
            labelTextStyle: WidgetStateProperty.resolveWith((s) {
              if (s.contains(WidgetState.selected)) {
                return const TextStyle(
                  color: MuhColors.gold,
                  fontWeight: FontWeight.w600,
                  fontSize: MuhType.bodyS,
                );
              }
              return const TextStyle(
                color: MuhColors.muted,
                fontWeight: FontWeight.w500,
                fontSize: MuhType.bodyS,
              );
            }),
            iconTheme: WidgetStateProperty.resolveWith((s) {
              if (s.contains(WidgetState.selected)) {
                return const IconThemeData(color: MuhColors.gold);
              }
              return const IconThemeData(color: MuhColors.muted);
            }),
          ),
          child: NavigationBar(
            height: 72,
            backgroundColor: MuhColors.surface.withValues(alpha: 0.94),
            elevation: 0,
            indicatorColor: MuhColors.gold.withValues(alpha: 0.14),
            selectedIndex: _index,
            onDestinationSelected: (i) => setState(() => _index = i),
            destinations: [
              NavigationDestination(
                icon: const Icon(Icons.fingerprint_rounded),
                label: _navLabel('decode'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.auto_graph_rounded),
                label: _navLabel('life_map'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.wb_sunny_outlined),
                label: _navLabel('today'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.schedule_rounded),
                label: _navLabel('timing'),
              ),
              NavigationDestination(
                icon: const Icon(Icons.chat_bubble_outline_rounded),
                label: _navLabel('ask'),
              ),
            ],
          ),
        ),
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
}) async {
  try {
    await ref.read(shareCardServiceProvider).shareExact(
          context: context,
          title: title,
          body: body,
          contextLine: contextLine,
          sourceType: sourceType,
          sourceId: sourceId,
        );
  } catch (e) {
    if (!context.mounted) return;
    final l10n = AppLocalizations.of(context)!;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${_V3Copy(l10n).failed}: $e')),
    );
  }
}

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

class _DecodeTab extends ConsumerWidget {
  const _DecodeTab({required this.l10n, required this.ref});

  final AppLocalizations l10n;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context, WidgetRef _) {
    if (!Env.hasSupabase) {
      return _EmptyStateScreen(
        headline: l10n.todayEmptyHeadline,
        message: l10n.errorNeedSupabase,
        icon: Icons.fingerprint_rounded,
      );
    }
    final packAsync = ref.watch(birthPackProvider);
    final todayAsync = ref.watch(todayPayloadProvider);
    final copy = _V3Copy(l10n);
    return packAsync.when(
      data: (pack) {
        if (pack == null) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingDecode,
          );
        }
        if (!pack.isScreenReady(BirthPackScreen.decode)) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingDecode,
          );
        }
        final payload = todayAsync.valueOrNull;
        final views = BirthPackViews(pack);
        final name = pack.displayName.trim();
        final moon = payload?.birthMoonSign ?? payload?.moonSign;
        final decodeHit = views.displayHook;
        final identitySummary = views.identitySummary;
        final workMoney = views.workMoney;
        final relationship = views.relationship;
        return _V3Scroll(
          title: name.isEmpty ? copy.decodeTitle : '$name, decoded',
          subtitle:
              identitySummary.isNotEmpty ? identitySummary : copy.decodeSub,
          onRefresh: () async {
            ref.invalidate(birthPackProvider);
            ref.invalidate(todayPayloadProvider);
          },
          children: [
            if (moon != null)
              CelestialHeaderCard(
                heroLabel: copy.moonLabel,
                heroTitle: moon.label,
                heroSymbol: moon.symbol,
                heroSubline: payload?.birthMoonNakshatra,
                explainer: copy.moonExplainer,
                trailingAction: WhatsAppShareButton(
                  onTap: () => _shareExactCard(
                    ref,
                    context,
                    title: copy.moonLabel,
                    body:
                        '${moon.label}${payload?.birthMoonNakshatra == null ? '' : ' · ${payload!.birthMoonNakshatra}'}',
                    contextLine: copy.moonExplainer,
                    sourceId: 'decode-moon-${pack.date}',
                  ),
                ),
                supportingPills: [
                  if (payload?.sunSign != null)
                    MoonSunPillData(
                      label: copy.sunSign,
                      value: payload!.sunSign!.label,
                      symbol: payload.sunSign!.symbol,
                      subtitle: payload.sunSign!.dateRange,
                    ),
                ],
              ),
            if (decodeHit.isNotEmpty)
              _ShareableSignalCard(
                title: copy.thisSounds,
                body: decodeHit,
                trailingAction: WhatsAppShareButton(
                  onTap: () => _shareExactCard(
                    ref,
                    context,
                    title: copy.thisSounds,
                    body: decodeHit,
                    sourceType: 'decode',
                    sourceId: 'decode-hit-${pack.date}',
                  ),
                ),
              ),
            _InsightSection(
              title: copy.strengths,
              items: views.strengths,
              accent: MuhColors.emerald,
              trailingAction: WhatsAppShareButton(
                onTap: () => _shareExactCard(
                  ref,
                  context,
                  title: copy.strengths,
                  body: views.strengths.join('\n'),
                  sourceId: 'decode-strengths-${pack.date}',
                ),
              ),
            ),
            _InsightSection(
              title: copy.watchouts,
              items: views.watchouts,
              accent: MuhColors.gold,
              trailingAction: WhatsAppShareButton(
                onTap: () => _shareExactCard(
                  ref,
                  context,
                  title: copy.watchouts,
                  body: views.watchouts.join('\n'),
                  sourceId: 'decode-watchouts-${pack.date}',
                ),
              ),
            ),
            if (workMoney.isNotEmpty)
              _ShareableSignalCard(
                title: copy.workMoney,
                body: workMoney,
                trailingAction: WhatsAppShareButton(
                  onTap: () => _shareExactCard(
                    ref,
                    context,
                    title: copy.workMoney,
                    body: workMoney,
                    sourceId: 'decode-work-money-${pack.date}',
                  ),
                ),
              ),
            if (relationship.isNotEmpty)
              _ShareableSignalCard(
                title: copy.relationship,
                body: relationship,
                trailingAction: WhatsAppShareButton(
                  onTap: () => _shareExactCard(
                    ref,
                    context,
                    title: copy.relationship,
                    body: relationship,
                    sourceId: 'decode-relationship-${pack.date}',
                  ),
                ),
              ),
          ],
        );
      },
      loading: () => MuhurthaLoadingView(
        mode: MuhurthaLoadingMode.screen,
        message: l10n.loadingDecode,
      ),
      error: (_, __) => _EmptyStateScreen(
        headline: l10n.todayEmptyHeadline,
        message:
            'Birth pack is not ready yet. Pull to retry after generation finishes.',
        icon: Icons.fingerprint_rounded,
      ),
    );
  }
}

class _TodayFocusTab extends ConsumerWidget {
  const _TodayFocusTab({required this.l10n, required this.ref});

  final AppLocalizations l10n;
  final WidgetRef ref;

  List<TimeWindowData> _windows(
    List<TimingWindow> windows,
    AppLocalizations l10n,
  ) {
    return windows
        .take(3)
        .map(
          (w) => TimeWindowData(
            timeText:
                '${clock12h(clockHm(w.start))} - ${clock12h(clockHm(w.end))}',
            tag: localizeWindowLabel(l10n, w.label),
            note: w.whyItWorks,
          ),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context, WidgetRef _) {
    if (!Env.hasSupabase) {
      return _EmptyStateScreen(
        headline: l10n.todayEmptyHeadline,
        message: l10n.errorNeedSupabase,
        icon: Icons.wb_sunny_outlined,
      );
    }
    final today = ref.watch(todayPayloadProvider);
    final packAsync = ref.watch(birthPackProvider);
    final remedies = ref.watch(remedyListProvider);
    final copy = _V3Copy(l10n);
    return packAsync.when(
      data: (pack) {
        if (pack == null) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingToday,
          );
        }
        if (!pack.isScreenReady(BirthPackScreen.today)) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingToday,
          );
        }
        final payload = today.valueOrNull;
        if (payload == null) {
          if (today.isLoading) {
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
        final views = BirthPackViews(pack);
        final playbook = views.playbookFor(payload.date);
        final mainAdvice = playbook?.displayAdvice.isNotEmpty == true
            ? playbook!.displayAdvice
            : payload.oneLine ?? '';
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
        return _V3Scroll(
          title: copy.todayTitle,
          subtitle: copy.todaySub,
          onRefresh: () async {
            ref.invalidate(birthPackProvider);
            ref.invalidate(todayPayloadProvider);
            ref.invalidate(remedyListProvider);
            await ref.read(todayPayloadProvider.future);
          },
          children: [
            _ShareableSignalCard(
              title: copy.mainAdvice,
              body: mainAdvice,
              trailingAction: WhatsAppShareButton(
                onTap: () => _shareExactCard(
                  ref,
                  context,
                  title: copy.mainAdvice,
                  body: mainAdvice,
                  sourceType: 'today_one_line',
                  sourceId: 'today-main-${payload.date}',
                ),
              ),
            ),
            if (luck.luckyNumbers.isNotEmpty ||
                luck.luckyDays.isNotEmpty ||
                luck.luckyColours.isNotEmpty)
              LuckyStrip(
                luck: luck,
                onShare: () => _shareExactCard(
                  ref,
                  context,
                  title: l10n.luckyTitle,
                  body: [
                    if (luck.moonSignLabel.isNotEmpty) luck.moonSignLabel,
                    if (luck.luckyNumbers.isNotEmpty)
                      '${l10n.luckyNumbers}: ${luck.luckyNumbers.join(', ')}',
                    if (luck.luckyDays.isNotEmpty)
                      '${l10n.luckyDays}: ${luck.luckyDays.join(', ')}',
                    if (luck.luckyColours.isNotEmpty)
                      '${l10n.luckyColours}: ${luck.luckyColours.map((c) => c.label).join(', ')}',
                  ].join('\n'),
                  sourceType: 'natal_luck',
                  sourceId: 'natal-luck-${payload.date}',
                ),
              ),
            TimeWindowRail(
              title: copy.goodWindow,
              subtitle: goodSummary.isNotEmpty ? goodSummary : null,
              windows: _windows(payload.goodWindows, l10n),
              tone: WindowTone.good,
              trailingAction: WhatsAppShareButton(
                onTap: () => _shareExactCard(
                  ref,
                  context,
                  title: copy.goodWindow,
                  body: _windows(payload.goodWindows, l10n)
                      .map((w) =>
                          [w.timeText, w.note].whereType<String>().join(' · '))
                      .join('\n'),
                  contextLine: goodSummary,
                  sourceType: 'today_one_line',
                  sourceId: 'today-good-${payload.date}',
                ),
              ),
            ),
            TimeWindowRail(
              title: copy.cautionWindow,
              subtitle: avoidSummary.isNotEmpty ? avoidSummary : null,
              windows: _windows(payload.cautionWindows, l10n),
              tone: WindowTone.caution,
              trailingAction: WhatsAppShareButton(
                onTap: () => _shareExactCard(
                  ref,
                  context,
                  title: copy.cautionWindow,
                  body: _windows(payload.cautionWindows, l10n)
                      .map((w) => [w.timeText, w.tag, w.note]
                          .whereType<String>()
                          .join(' · '))
                      .join('\n'),
                  contextLine: avoidSummary,
                  sourceType: 'today_one_line',
                  sourceId: 'today-caution-${payload.date}',
                ),
              ),
            ),
            _InsightSection(
              title: copy.betterFor,
              items: betterFor,
              accent: MuhColors.emerald,
              trailingAction: WhatsAppShareButton(
                onTap: () => _shareExactCard(
                  ref,
                  context,
                  title: copy.betterFor,
                  body: betterFor.join('\n'),
                  sourceId: 'today-better-${payload.date}',
                ),
              ),
            ),
            _InsightSection(
              title: copy.carefulWith,
              items: beCareful,
              accent: MuhColors.gold,
              trailingAction: WhatsAppShareButton(
                onTap: () => _shareExactCard(
                  ref,
                  context,
                  title: copy.carefulWith,
                  body: beCareful.join('\n'),
                  sourceId: 'today-careful-${payload.date}',
                ),
              ),
            ),
            if (remedy != null)
              RitualCard(
                typeLabel: remedy.remedyCategoryLabel,
                title: remedy.title,
                whyNow: remedy.whyNow,
                whatToDo: remedy.simpleLine,
                keepItSimple: remedy.keepItSimple,
                trailingAction: WhatsAppShareButton(
                  onTap: () => _shareExactCard(
                    ref,
                    context,
                    title: remedy.title,
                    body: remedy.simpleLine,
                    contextLine: remedy.whyNow,
                    sourceType: 'remedy',
                    sourceId: 'today-remedy-${remedy.id}',
                  ),
                ),
              ),
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

class _TimingTab extends ConsumerWidget {
  const _TimingTab({required this.l10n, required this.ref});

  final AppLocalizations l10n;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context, WidgetRef _) {
    final packAsync = ref.watch(birthPackProvider);
    final copy = _V3Copy(l10n);
    return packAsync.when(
      data: (pack) {
        if (pack == null) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingTimingPlan,
          );
        }
        if (!pack.isScreenReady(BirthPackScreen.timing)) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingTimingPlan,
          );
        }
        final views = BirthPackViews(pack);
        final isPro = ref.watch(subscriptionAccessProvider).isPro;
        final week = views.week;
        final month = views.month;
        final weekBody = [
          week.body,
          week.caution,
        ].where((line) => line.isNotEmpty).join('\n\n');
        final monthBody = [
          month.body,
          month.caution,
        ].where((line) => line.isNotEmpty).join('\n\n');
        return _V3Scroll(
          title: copy.timingTitle,
          subtitle: copy.timingSub,
          onRefresh: () async {
            ref.invalidate(birthPackProvider);
          },
          children: [
            if (week.headline.isNotEmpty || weekBody.isNotEmpty)
              _V3ProseCard(
                eyebrow: copy.week,
                title: week.headline,
                body: weekBody,
                trailingAction: WhatsAppShareButton(
                  onTap: () => _shareExactCard(
                    ref,
                    context,
                    title: week.headline,
                    body: weekBody,
                    sourceType: 'purpose_result',
                    sourceId: 'timing-week-${pack.date}',
                  ),
                ),
              ),
            if (month.headline.isNotEmpty || monthBody.isNotEmpty)
              _V3ProseCard(
                eyebrow: copy.month,
                title: month.headline,
                body: monthBody,
                locked: !isPro,
                onLockedTap: !isPro
                    ? () => PaywallSheet.show(
                          context,
                          headline: views.paywallCopy['headline']?.toString(),
                          subline: views.paywallCopy['subline']?.toString(),
                          bullets: views.paywallBullets,
                          cta: views.paywallCopy['cta']?.toString(),
                          preferredPlan: PaywallPlan.pro,
                        )
                    : null,
                trailingAction: isPro
                    ? WhatsAppShareButton(
                        onTap: () => _shareExactCard(
                          ref,
                          context,
                          title: month.headline,
                          body: monthBody,
                          sourceType: 'purpose_result',
                          sourceId: 'timing-month-${pack.date}',
                        ),
                      )
                    : null,
              ),
          ],
        );
      },
      loading: () => MuhurthaLoadingView(
        mode: MuhurthaLoadingMode.screen,
        message: l10n.loadingTimingPlan,
      ),
      error: (_, __) => _EmptyStateScreen(
        headline: copy.timingTitle,
        message:
            'Birth pack is not ready yet. Pull to retry after generation finishes.',
        icon: Icons.schedule_rounded,
      ),
    );
  }
}

class _LifeMapTab extends ConsumerWidget {
  const _LifeMapTab({required this.l10n, required this.ref});

  final AppLocalizations l10n;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context, WidgetRef _) {
    final async = ref.watch(birthPackProvider);
    final copy = _V3Copy(l10n);
    return async.when(
      data: (pack) {
        if (pack == null) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingLifeMap,
          );
        }
        if (!pack.isScreenReady(BirthPackScreen.lifeMap)) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingLifeMap,
          );
        }
        final views = BirthPackViews(pack);
        final isPro = ref.watch(subscriptionAccessProvider).isPro;
        final past = views.chaptersByTense('past');
        final future = views.chaptersByTense('future');
        final current = views.chaptersByTense('current').firstOrNull;
        return _V3Scroll(
          title: copy.lifeTitle,
          subtitle: copy.lifeSub,
          onRefresh: () async {
            ref.invalidate(birthPackProvider);
          },
          children: [
            ...past.map(
              (p) => _V3ProseCard(
                eyebrow: p.periodLabel,
                title: p.title,
                body: p.displayBody,
                trailingAction: WhatsAppShareButton(
                  onTap: () => _shareExactCard(
                    ref,
                    context,
                    title: p.title,
                    body: p.displayBody,
                    contextLine: p.periodLabel,
                    sourceType: 'journey_phase',
                    sourceId: 'life-past-${p.periodLabel}',
                  ),
                ),
              ),
            ),
            if (current != null &&
                (current.title.isNotEmpty || current.displayBody.isNotEmpty))
              _V3ProseCard(
                eyebrow: '${copy.currentPhase} · ${current.periodLabel}',
                title: current.title,
                body: current.displayBody,
                trailingAction: WhatsAppShareButton(
                  onTap: () => _shareExactCard(
                    ref,
                    context,
                    title: current.title,
                    body: current.displayBody,
                    contextLine: '${copy.currentPhase} · ${current.periodLabel}',
                    sourceType: 'journey_phase',
                    sourceId: 'life-current-${pack.date}',
                  ),
                ),
              ),
            ...future.map(
                  (p) {
                    final locked = p.locked && !isPro;
                    return _V3ProseCard(
                    eyebrow: p.periodLabel,
                    title: p.title,
                    body: p.displayBody,
                    locked: locked,
                    onLockedTap: locked
                        ? () => PaywallSheet.show(
                              context,
                              headline: views.paywallCopy['headline']?.toString(),
                              subline: views.paywallCopy['subline']?.toString(),
                              bullets: views.paywallBullets,
                              cta: views.paywallCopy['cta']?.toString(),
                              preferredPlan: PaywallPlan.pro,
                            )
                        : null,
                    trailingAction: locked
                        ? null
                        : WhatsAppShareButton(
                      onTap: () => _shareExactCard(
                        ref,
                        context,
                        title: p.title,
                        body: p.displayBody,
                        contextLine: p.periodLabel,
                        sourceType: 'journey_phase',
                        sourceId: 'life-future-${p.periodLabel}',
                      ),
                    ),
                  );
                  },
                ),
          ],
        );
      },
      loading: () => MuhurthaLoadingView(
        mode: MuhurthaLoadingMode.screen,
        message: l10n.loadingLifeMap,
      ),
      error: (_, __) => _EmptyStateScreen(
        headline: l10n.journeyEmptyHeadline,
        message: l10n.errorGeneric,
        icon: Icons.auto_graph_rounded,
      ),
    );
  }
}

class _V3ProseCard extends StatelessWidget {
  const _V3ProseCard({
    required this.eyebrow,
    required this.title,
    required this.body,
    this.trailingAction,
    this.locked = false,
    this.onLockedTap,
  });

  final String eyebrow;
  final String title;
  final String body;
  final Widget? trailingAction;
  final bool locked;
  final VoidCallback? onLockedTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (!locked && title.trim().isEmpty && body.trim().isEmpty) {
      return const SizedBox.shrink();
    }
    if (locked) {
      final l10n = AppLocalizations.of(context)!;
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(MuhRadius.card),
          onTap: onLockedTap,
          child: Container(
            padding: const EdgeInsets.all(MuhSpace.lg),
            decoration: BoxDecoration(
              color: MuhColors.surface,
              borderRadius: BorderRadius.circular(MuhRadius.card),
              border: Border.all(color: MuhColors.gold.withValues(alpha: 0.28)),
              boxShadow: MuhShadows.cardSoft,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (eyebrow.trim().isNotEmpty)
                  Text(
                    eyebrow,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: MuhColors.goldSoft,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                if (eyebrow.trim().isNotEmpty) const SizedBox(height: MuhSpace.xs),
                if (title.trim().isNotEmpty)
                  Text(
                    title.trim(),
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: MuhColors.cream.withValues(alpha: 0.72),
                      fontWeight: FontWeight.w800,
                      height: 1.18,
                    ),
                  ),
                const SizedBox(height: MuhSpace.md),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: MuhSpace.lg,
                    vertical: MuhSpace.lg,
                  ),
                  decoration: BoxDecoration(
                    color: MuhColors.surfaceSoft,
                    borderRadius: BorderRadius.circular(MuhRadius.chip),
                    border: Border.all(color: MuhColors.goldSoft.withValues(alpha: 0.35)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_rounded, color: MuhColors.goldSoft, size: 20),
                      const SizedBox(width: MuhSpace.sm),
                      Flexible(
                        child: Text(
                          l10n.paywallLockedTeaser,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: MuhColors.cream,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final card = Container(
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            MuhColors.gold.withValues(alpha: 0.18),
            MuhColors.surface,
            MuhColors.surfaceSoft,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.gold.withValues(alpha: 0.24)),
        boxShadow: MuhShadows.cardSoft,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (eyebrow.trim().isNotEmpty || trailingAction != null) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    eyebrow,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: MuhColors.goldSoft,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (trailingAction != null) ...[
                  const SizedBox(width: MuhSpace.sm),
                  trailingAction!,
                ],
              ],
            ),
            if (eyebrow.trim().isNotEmpty) const SizedBox(height: MuhSpace.xs),
          ] else if (trailingAction != null) ...[
            Align(
              alignment: Alignment.centerRight,
              child: trailingAction!,
            ),
            const SizedBox(height: MuhSpace.xs),
          ],
          if (title.trim().isNotEmpty)
            Text(
              title.trim(),
              style: theme.textTheme.titleLarge?.copyWith(
                color: MuhColors.cream,
                fontWeight: FontWeight.w800,
                height: 1.18,
              ),
            ),
          if (body.trim().isNotEmpty) ...[
            const SizedBox(height: MuhSpace.md),
            Text(
              body.trim(),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: MuhColors.cream,
                height: 1.52,
              ),
            ),
          ],
        ],
      ),
    );

    return card;
  }
}

class _V3Scroll extends StatelessWidget {
  const _V3Scroll({
    required this.title,
    required this.subtitle,
    required this.children,
    this.onRefresh,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final list = ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        MuhSpace.page,
        MuhSpace.xxl,
        MuhSpace.page,
        MuhSpace.xl,
      ),
      children: [
        Text(
          title,
          style: theme.textTheme.headlineSmall?.copyWith(
            color: MuhColors.cream,
            fontWeight: FontWeight.w800,
            height: 1.08,
          ),
        ),
        const SizedBox(height: MuhSpace.sm),
        Text(
          subtitle,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: MuhColors.creamMuted,
            height: 1.45,
          ),
        ),
        const SizedBox(height: MuhSpace.xl),
        ...children
            .expand((child) => [child, const SizedBox(height: MuhSpace.md)]),
      ],
    );
    if (onRefresh == null) return list;
    return RefreshIndicator(
      color: MuhColors.gold,
      onRefresh: onRefresh!,
      child: list,
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

  Future<void> _recordPurposeIntent(String purposeValue) async {
    final repo = widget.ref.read(profileRepositoryProvider);
    if (repo == null) return;
    try {
      await repo.patchOnboardingIntent(intentPatchForPurpose(purposeValue));
    } catch (_) {}
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
    setState(() => _result = const AsyncValue.loading());
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
      setState(() {
        _sessionId = r.sessionId;
        _result = AsyncValue.data(r);
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

    if (!Env.hasSupabase) {
      return _EmptyStateScreen(
        headline: _tx('title'),
        message: widget.l10n.errorNeedSupabase,
        icon: Icons.chat_bubble_outline_rounded,
      );
    }

    final packAsync = widget.ref.watch(birthPackProvider);
    return packAsync.when(
      data: (pack) {
        if (pack != null && !pack.isScreenReady(BirthPackScreen.ask)) {
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
              color: MuhColors.creamMuted,
              height: 1.45,
            ),
          ),
          const SizedBox(height: MuhSpace.xl),
          Container(
            padding: const EdgeInsets.all(MuhSpace.md),
            decoration: BoxDecoration(
              color: MuhColors.surface,
              borderRadius: BorderRadius.circular(MuhRadius.card),
              border: Border.all(color: MuhColors.gold.withValues(alpha: 0.22)),
              boxShadow: MuhShadows.cardSoft,
            ),
            child: Column(
              children: [
                TextField(
                  controller: _controller,
                  maxLines: 4,
                  minLines: 3,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: MuhColors.cream,
                    height: 1.4,
                  ),
                  decoration: InputDecoration(
                    hintText: _tx('placeholder'),
                    hintStyle: theme.textTheme.bodyLarge?.copyWith(
                      color: MuhColors.muted,
                    ),
                    border: InputBorder.none,
                  ),
                  textInputAction: TextInputAction.newline,
                ),
                const SizedBox(height: MuhSpace.sm),
                Align(
                  alignment: Alignment.centerRight,
                  child: MuhPrimaryButton(
                    label: _tx('send'),
                    onPressed: _ask,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: MuhSpace.lg),
          Text(
            _tx('suggested'),
            style: theme.textTheme.titleSmall?.copyWith(
              color: MuhColors.gold,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: MuhSpace.sm),
          Wrap(
            spacing: MuhSpace.sm,
            runSpacing: MuhSpace.sm,
            children: [
              ..._suggestions(pack).map(
                (q) => _PurposeChoiceChip(
                  label: q,
                  isSelected: false,
                  onTap: () {
                    _controller.text = q;
                    _controller.selection = TextSelection.collapsed(
                      offset: _controller.text.length,
                    );
                  },
                ),
              ),
              ..._purposeEntries.take(4).map(
                    (entry) => _PurposeChoiceChip(
                      label: widget.purposeLabel(widget.l10n, entry.labelKey),
                      isSelected: false,
                      onTap: () {
                        unawaited(_recordPurposeIntent(entry.value));
                        final label =
                            widget.purposeLabel(widget.l10n, entry.labelKey);
                        _controller.text = _lang == 'te'
                            ? '$label కి ఈరోజు మంచి సమయం ఏది?'
                            : _lang == 'hi'
                                ? '$label के लिए आज अच्छा समय कौन सा है?'
                                : 'What is the best timing for $label today?';
                        _controller.selection = TextSelection.collapsed(
                          offset: _controller.text.length,
                        );
                      },
                    ),
                  ),
            ],
          ),
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
                      onShare: () => _shareAsk(r),
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

class _InsightSection extends StatelessWidget {
  const _InsightSection({
    required this.title,
    required this.items,
    required this.accent,
    this.trailingAction,
  });

  final String title;
  final List<String> items;
  final Color accent;
  final Widget? trailingAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.surface,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (trailingAction != null) ...[
                const SizedBox(width: MuhSpace.sm),
                trailingAction!,
              ],
            ],
          ),
          const SizedBox(height: MuhSpace.md),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: MuhSpace.sm),
              child: Text(
                '- $item',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.cream,
                  height: 1.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ShareableSignalCard extends StatelessWidget {
  const _ShareableSignalCard({
    required this.title,
    required this.body,
    this.trailingAction,
  });

  final String title;
  final String body;
  final Widget? trailingAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            MuhColors.gold.withValues(alpha: 0.16),
            MuhColors.surfaceSoft,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.gold.withValues(alpha: 0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: MuhColors.goldSoft,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
              if (trailingAction != null) ...[
                const SizedBox(width: MuhSpace.sm),
                trailingAction!,
              ],
            ],
          ),
          const SizedBox(height: MuhSpace.sm),
          Text(
            body,
            style: theme.textTheme.titleMedium?.copyWith(
              color: MuhColors.cream,
              fontWeight: FontWeight.w700,
              height: 1.35,
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
  });

  final AskAnswerResult result;
  final Map<String, String> labels;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            MuhColors.surfaceSoft,
            MuhColors.surface,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.gold.withValues(alpha: 0.24)),
        boxShadow: MuhShadows.cardSoft,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  labels['answer'] ?? 'Answer',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: MuhColors.gold,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
              WhatsAppShareButton(onTap: onShare),
            ],
          ),
          const SizedBox(height: MuhSpace.sm),
          Text(
            result.directAnswer,
            style: theme.textTheme.titleMedium?.copyWith(
              color: MuhColors.cream,
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
            color: MuhColors.goldSoft,
          ),
          const SizedBox(height: MuhSpace.md),
          Text(
            labels['action'] ?? 'What to do now',
            style: theme.textTheme.labelLarge?.copyWith(
              color: MuhColors.gold,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: MuhSpace.xs),
          Text(
            result.actionLine,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: MuhColors.cream,
              height: 1.45,
            ),
          ),
          if (result.shareHook.trim().isNotEmpty) ...[
            const SizedBox(height: MuhSpace.md),
            Text(
              result.shareHook,
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.creamMuted,
                height: 1.45,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
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
                    color: MuhColors.cream,
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

class _PurposeChoiceChip extends StatelessWidget {
  const _PurposeChoiceChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg =
        isSelected ? MuhColors.gold.withValues(alpha: 0.14) : MuhColors.surface;
    final border = isSelected ? MuhColors.gold : MuhColors.line;
    final text = isSelected ? MuhColors.goldSoft : MuhColors.cream;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(MuhRadius.button),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: MuhSpace.md,
          vertical: MuhSpace.sm,
        ),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(MuhRadius.button),
          border: Border.all(color: border),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: text,
                fontWeight: FontWeight.w600,
              ),
        ),
      ),
    );
  }
}

class _EmptyStateScreen extends StatelessWidget {
  const _EmptyStateScreen({
    required this.headline,
    required this.message,
    required this.icon,
  });

  final String headline;
  final String message;
  final IconData icon;

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
