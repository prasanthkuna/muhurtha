import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/env.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/format/clock_format.dart';
import '../../core/format/day_window_label.dart';
import '../../core/locale/locale_provider.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/moon_sign_strip.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';

/// Tab values match TRD purpose keys sent to `purpose_check`.
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
  (value: 'legal_dispute', labelKey: 'purposeLegal'),
  (value: 'spiritual_puja', labelKey: 'purposeSpiritual'),
  (value: 'creative_public', labelKey: 'purposeCreative'),
];

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  var _index = 0;

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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final pages = <Widget>[
      _TodayTab(l10n: l10n, ref: ref),
      _PurposeTab(
        l10n: l10n,
        ref: ref,
        purposeLabel: _purposeLabel,
      ),
      _JourneyTab(l10n: l10n, ref: ref),
      _RemediesTab(l10n: l10n, ref: ref),
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
                icon: const Icon(Icons.wb_sunny_outlined),
                label: l10n.navToday,
              ),
              NavigationDestination(
                icon: const Icon(Icons.flag_outlined),
                label: l10n.navPurpose,
              ),
              NavigationDestination(
                icon: const Icon(Icons.auto_graph_rounded),
                label: l10n.navJourney,
              ),
              NavigationDestination(
                icon: const Icon(Icons.spa_outlined),
                label: l10n.navRemedies,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TodayTab extends StatelessWidget {
  const _TodayTab({required this.l10n, required this.ref});

  final AppLocalizations l10n;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!Env.hasSupabase) {
      return _EmptyStateScreen(
        headline: l10n.todayEmptyHeadline,
        message: l10n.errorNeedSupabase,
        icon: Icons.wb_twilight_rounded,
      );
    }

    final async = ref.watch(todayPayloadProvider);

    return async.when(
      data: (payload) {
        if (payload == null) {
          return _EmptyStateScreen(
            headline: l10n.todayEmptyHeadline,
            message: l10n.todayEmptyMessage,
            icon: Icons.wb_twilight_rounded,
          );
        }
        return LayoutBuilder(
          builder: (context, constraints) {
            final topPad =
                MediaQuery.paddingOf(context).top + MuhSpace.lg;
            final minH = constraints.maxHeight.isFinite
                ? constraints.maxHeight
                : MediaQuery.sizeOf(context).height;
            return RefreshIndicator(
              color: MuhColors.gold,
              onRefresh: () async {
                ref.invalidate(todayPayloadProvider);
                await ref.read(todayPayloadProvider.future);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.fromLTRB(
                  MuhSpace.page,
                  topPad,
                  MuhSpace.page,
                  MuhSpace.xxl,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: minH),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        payload.displayName != null &&
                                payload.displayName!.trim().isNotEmpty
                            ? '${l10n.todayHeader} · ${payload.displayName}'
                            : l10n.todayHeader,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: MuhSpace.xs),
                      if (payload.moonSign != null)
                        MoonSignStrip(
                          moon: payload.moonSign!,
                          nakshatra: payload.moonNakshatra,
                          caption: l10n.moonSignToday,
                        ),
                      Text(
                        '${l10n.todayDateLabel}: ${payload.date} · ${payload.locationLabel}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: MuhColors.creamMuted,
                        ),
                      ),
                      const SizedBox(height: MuhSpace.lg),
                      Text(
                        l10n.todayBetterFor,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: MuhColors.gold,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: MuhSpace.sm),
                      ...payload.betterFor.map(
                        (s) => Padding(
                          padding:
                              const EdgeInsets.only(bottom: MuhSpace.xs),
                          child: Text('· $s',
                              style: theme.textTheme.bodyLarge),
                        ),
                      ),
                      const SizedBox(height: MuhSpace.lg),
                      Text(
                        l10n.todayBeCareful,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: MuhColors.creamMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: MuhSpace.sm),
                      ...payload.beCarefulWith.map(
                        (s) => Padding(
                          padding:
                              const EdgeInsets.only(bottom: MuhSpace.xs),
                          child: Text('· $s',
                              style: theme.textTheme.bodyLarge),
                        ),
                      ),
                      if (payload.currentLifePeriodLabel != null) ...[
                        const SizedBox(height: MuhSpace.lg),
                        Text(
                          l10n.todayCurrentRhythm,
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: MuhSpace.sm),
                        Text(
                          payload.currentLifePeriodLabel!,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (payload.currentLifePeriodSummary != null)
                          Text(
                            payload.currentLifePeriodSummary!,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: MuhColors.creamMuted,
                              height: 1.5,
                            ),
                          ),
                      ],
                      const SizedBox(height: MuhSpace.lg),
                      Text(
                        l10n.todayGoodWindows,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: MuhSpace.xs),
                      Text(
                        l10n.todayGoodWindowsHint,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: MuhColors.muted,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: MuhSpace.sm),
                      ...payload.goodWindows.map(
                        (w) => Padding(
                          padding:
                              const EdgeInsets.only(bottom: MuhSpace.sm),
                          child: Text(
                            '${clock12h(clockHm(w.start))} – ${clock12h(clockHm(w.end))} · ${localizeWindowLabel(l10n, w.label)}',
                          ),
                        ),
                      ),
                      const SizedBox(height: MuhSpace.md),
                      Text(
                        l10n.todayCautionWindows,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: MuhSpace.sm),
                      ...payload.cautionWindows.map(
                        (w) => Padding(
                          padding:
                              const EdgeInsets.only(bottom: MuhSpace.sm),
                          child: Text(
                            '${clock12h(clockHm(w.start))} – ${clock12h(clockHm(w.end))} · ${localizeWindowLabel(l10n, w.label)}',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(color: MuhColors.gold),
      ),
      error: (_, __) => _EmptyStateScreen(
        headline: l10n.todayEmptyHeadline,
        message: l10n.errorGeneric,
        icon: Icons.wb_twilight_rounded,
      ),
    );
  }
}

class _PurposeTab extends StatefulWidget {
  const _PurposeTab({
    required this.l10n,
    required this.ref,
    required this.purposeLabel,
  });

  final AppLocalizations l10n;
  final WidgetRef ref;
  final String Function(AppLocalizations l, String key) purposeLabel;

  @override
  State<_PurposeTab> createState() => _PurposeTabState();
}

class _PurposeTabState extends State<_PurposeTab> {
  String _value = _purposeEntries.first.value;
  AsyncValue<PurposeCheckResult?>? _result;

  Future<void> _run(WidgetRef ref) async {
    final api = ref.read(muhurthaEngineApiProvider);
    if (api == null) return;
    setState(() => _result = const AsyncValue.loading());
    try {
      final loc = ref.read(localeProvider).languageCode;
      final r = await api.purposeCheck(purposeType: _value, locale: loc);
      setState(() => _result = AsyncValue.data(r));
    } catch (e, st) {
      setState(() => _result = AsyncValue.error(e, st));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!Env.hasSupabase) {
      return _EmptyStateScreen(
        headline: widget.l10n.purposeEmptyHeadline,
        message: widget.l10n.errorNeedSupabase,
        icon: Icons.flag_outlined,
      );
    }

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
            widget.l10n.purposeScreenTitle,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: MuhSpace.lg),
          Text(widget.l10n.purposeChoose, style: theme.textTheme.bodyMedium),
          const SizedBox(height: MuhSpace.sm),
          DropdownButtonFormField<String>(
            initialValue: _value,
            dropdownColor: MuhColors.surface,
            decoration: InputDecoration(
              labelText: widget.l10n.purposeChoose,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(MuhRadius.button),
              ),
            ),
            items: _purposeEntries
                .map(
                  (e) => DropdownMenuItem(
                    value: e.value,
                    child: Text(
                      widget.purposeLabel(widget.l10n, e.labelKey),
                    ),
                  ),
                )
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => _value = v);
            },
          ),
          const SizedBox(height: MuhSpace.lg),
          MuhPrimaryButton(
            label: widget.l10n.purposeCheck,
            onPressed: () => _run(widget.ref),
          ),
          const SizedBox(height: MuhSpace.xl),
          if (_result != null)
            _result!.when(
              data: (r) {
                if (r == null) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${widget.l10n.purposeStatus}: ${r.status}',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: MuhColors.gold,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    Text(r.summary, style: theme.textTheme.bodyLarge),
                    const SizedBox(height: MuhSpace.md),
                    Text(
                      r.actionLine,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: MuhColors.creamMuted,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.lg),
                    Text(
                      widget.l10n.todayGoodWindows,
                      style: theme.textTheme.titleSmall,
                    ),
                    ...r.bestWindows.map(
                      (w) => Text(
                        '${clock12h(clockHm(w.start))} – ${clock12h(clockHm(w.end))}',
                      ),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    Text(
                      widget.l10n.todayCautionWindows,
                      style: theme.textTheme.titleSmall,
                    ),
                    ...r.cautionWindows.map(
                      (w) => Text(
                        '${clock12h(clockHm(w.start))} – ${clock12h(clockHm(w.end))} · ${localizeWindowLabel(widget.l10n, w.label)}',
                      ),
                    ),
                    if (r.betterOptions.isNotEmpty) ...[
                      const SizedBox(height: MuhSpace.md),
                      Text(
                        widget.l10n.purposeBetterOptions,
                        style: theme.textTheme.titleSmall,
                      ),
                      ...r.betterOptions.map(
                        (o) => Text('· ${o['label']}: ${o['detail']}'),
                      ),
                    ],
                  ],
                );
              },
              loading: () => const Padding(
                padding: EdgeInsets.all(MuhSpace.lg),
                child: Center(
                  child: CircularProgressIndicator(color: MuhColors.gold),
                ),
              ),
              error: (_, __) => Text(widget.l10n.errorGeneric),
            ),
        ],
      ),
    );
  }
}

class _JourneyTab extends StatelessWidget {
  const _JourneyTab({required this.l10n, required this.ref});

  final AppLocalizations l10n;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!Env.hasSupabase) {
      return _EmptyStateScreen(
        headline: l10n.journeyEmptyHeadline,
        message: l10n.errorNeedSupabase,
        icon: Icons.auto_graph_rounded,
      );
    }

    final async = ref.watch(journeyPhasesProvider);
    return async.when(
      data: (phases) {
        if (phases == null || phases.isEmpty) {
          return _EmptyStateScreen(
            headline: l10n.journeyEmptyHeadline,
            message: l10n.journeyEmptyMessage,
            icon: Icons.auto_graph_rounded,
          );
        }
        return RefreshIndicator(
          color: MuhColors.gold,
          onRefresh: () async {
            ref.invalidate(journeyPhasesProvider);
            await ref.read(journeyPhasesProvider.future);
          },
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              MuhSpace.page,
              MuhSpace.xxl,
              MuhSpace.page,
              MuhSpace.xl,
            ),
            itemCount: phases.length,
            itemBuilder: (context, i) {
              final p = phases[i];
              return Container(
                margin: const EdgeInsets.only(bottom: MuhSpace.lg),
                padding: const EdgeInsets.all(MuhSpace.lg),
                decoration: BoxDecoration(
                  color: MuhColors.surface,
                  borderRadius: BorderRadius.circular(MuhRadius.card),
                  border: Border.all(color: MuhColors.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (p.periodLabel.isNotEmpty)
                      Text(
                        p.periodLabel,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: MuhColors.creamMuted,
                        ),
                      ),
                    const SizedBox(height: MuhSpace.sm),
                    ...p.sentences.map(
                      (s) => Padding(
                        padding: const EdgeInsets.only(bottom: MuhSpace.xs),
                        child: Text(
                          s,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            height: 1.45,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(color: MuhColors.gold),
      ),
      error: (_, __) => _EmptyStateScreen(
        headline: l10n.journeyEmptyHeadline,
        message: l10n.errorGeneric,
        icon: Icons.auto_graph_rounded,
      ),
    );
  }
}

class _RemediesTab extends StatelessWidget {
  const _RemediesTab({required this.l10n, required this.ref});

  final AppLocalizations l10n;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!Env.hasSupabase) {
      return _EmptyStateScreen(
        headline: l10n.remediesEmptyHeadline,
        message: l10n.errorNeedSupabase,
        icon: Icons.spa_outlined,
      );
    }

    final async = ref.watch(remedyListProvider);
    return async.when(
      data: (list) {
        if (list == null || list.isEmpty) {
          return _EmptyStateScreen(
            headline: l10n.remediesEmptyHeadline,
            message: l10n.remediesEmptyMessage,
            icon: Icons.spa_outlined,
          );
        }
        return RefreshIndicator(
          color: MuhColors.gold,
          onRefresh: () async {
            ref.invalidate(remedyListProvider);
            await ref.read(remedyListProvider.future);
          },
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              MuhSpace.page,
              MuhSpace.xxl,
              MuhSpace.page,
              MuhSpace.xl,
            ),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final r = list[i];
              return Container(
                margin: const EdgeInsets.only(bottom: MuhSpace.lg),
                padding: const EdgeInsets.all(MuhSpace.lg),
                decoration: BoxDecoration(
                  color: MuhColors.surface,
                  borderRadius: BorderRadius.circular(MuhRadius.card),
                  border: Border.all(color: MuhColors.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      r.title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.sm),
                    Text(
                      r.simpleLine,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        height: 1.45,
                        color: MuhColors.creamMuted,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.xs),
                    Text(
                      r.remedyType,
                      style: theme.textTheme.labelSmall,
                    ),
                  ],
                ),
              );
            },
          ),
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(color: MuhColors.gold),
      ),
      error: (_, __) => _EmptyStateScreen(
        headline: l10n.remediesEmptyHeadline,
        message: l10n.errorGeneric,
        icon: Icons.spa_outlined,
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
