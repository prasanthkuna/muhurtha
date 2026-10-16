import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../../core/analytics/app_analytics.dart';
import '../../../core/data/birth_pack_readiness.dart';
import '../../../core/data/birth_pack_views.dart';
import '../../../core/data/active_chart_profile.dart';
import '../../../core/data/muhurtha_engine_api.dart';
import '../../../core/engagement/user_engagement_store.dart';
import '../../../core/subscription/subscription_access.dart';
import '../../../design_system/design_system.dart';
import '../../../shared/widgets/editorial/editorial.dart';
import '../../../shared/widgets/muh_enter.dart';
import '../../../shared/widgets/muhurtha_loading_view.dart';
import '../../../core/subscription/subscription_service.dart';
import '../../../shared/widgets/paywall_sheet.dart';
import '../home_copy.dart';
import '../home_empty_state.dart';
import '../home_editorial_scroll.dart';
import '../home_prose_card.dart';

String _shortPeriodRailLabel(String periodLabel) {
  if (periodLabel.length <= 16) return periodLabel;
  final match = RegExp(
    r'(\w{3})\s+(\d{4})\s*-\s*(\w{3})?\s*(\d{4})',
  ).firstMatch(periodLabel);
  if (match != null) {
    final y1 = match.group(2);
    final y2 = match.group(4);
    if (y1 != null && y2 != null) return '$y1–$y2';
  }
  return '${periodLabel.substring(0, 14)}…';
}

class LifeAtlasTab extends ConsumerStatefulWidget {
  const LifeAtlasTab({super.key, required this.l10n});

  final AppLocalizations l10n;

  @override
  ConsumerState<LifeAtlasTab> createState() => _LifeAtlasTabState();
}

class _LifeAtlasTabState extends ConsumerState<LifeAtlasTab> {
  String? _selectedId;
  var _loggedOpen = false;

  @override
  Widget build(BuildContext context) {
    final l10n = widget.l10n;
    final copy = HomeCopy(l10n);
    final async = ref.watch(birthPackProvider);
    final subjectName = ref.watch(chartDisplayNameProvider);

    return async.when(
      data: (pack) {
        if (pack == null) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingLifeMap,
          );
        }
        if (!pack.hasLlmPack) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingLifeMap,
          );
        }
        if (!_loggedOpen) {
          _loggedOpen = true;
          unawaited(ref.read(appAnalyticsProvider).lifeMapOpened());
        }
        final views = BirthPackViews(pack);
        final isPro = ref.watch(subscriptionAccessProvider).isPro;
        final chapters = [
          ...views.chaptersByTense('past').map((c) => (c, 'past')),
          if (views.chaptersByTense('current').isNotEmpty)
            (views.chaptersByTense('current').first, 'current'),
          ...views.chaptersByTense('future').map((c) => (c, 'future')),
        ];
        if (chapters.isEmpty) {
          return HomeEditorialScroll(
            title: subjectName.isNotEmpty
                ? '${subjectName.trim()}, ${copy.lifeTitle.toLowerCase()}'
                : copy.lifeTitle,
            subtitle: '',
            onRefresh: () async => ref.invalidate(birthPackProvider),
            children: [
              MuhInlineStatus(
                message: pack.isGenerating
                    ? l10n.loadingLifeMap
                    : l10n.journeyEmptyHeadline,
                kind: pack.isGenerating
                    ? MuhInlineStatusKind.loading
                    : MuhInlineStatusKind.empty,
              ),
            ],
          );
        }
        final selectedId = _selectedId ?? chapters.first.$1.periodLabel;
        final selected = chapters.firstWhere(
          (e) => e.$1.periodLabel == selectedId,
          orElse: () => chapters.first,
        );
        final chapter = selected.$1;
        final tense = selected.$2;
        final chapterKey = 'life-$tense-${chapter.periodLabel}';
        final locked = tense == 'future' && chapter.locked && !isPro;

        return HomeEditorialScroll(
          title: subjectName.isNotEmpty
              ? '${subjectName.trim()}, ${copy.lifeTitle.toLowerCase()}'
              : copy.lifeTitle,
          subtitle: '',
          onRefresh: () async => ref.invalidate(birthPackProvider),
          children: [
            MuhPeriodRail(
              items: chapters
                  .map(
                    (e) => MuhPeriodRailItem(
                      id: e.$1.periodLabel,
                      label: _shortPeriodRailLabel(e.$1.periodLabel),
                      selected: e.$1.periodLabel == selectedId,
                    ),
                  )
                  .toList(),
              onSelected: (id) {
                setState(() => _selectedId = id);
                ref.read(appAnalyticsProvider).chapterOpened(
                      screen: 'life_map',
                      chapterPhase: tense,
                      entryPoint: 'rail',
                    );
                unawaited(
                  UserEngagementStore.instance.recordExposure(
                    contentKey: 'life-$tense-$id',
                    screen: 'life_map',
                  ),
                );
              },
            ),
            const SizedBox(height: MuhSpace.lg),
            if (locked)
              HomeProseCard(
                eyebrow: chapter.periodLabel,
                title: chapter.title,
                body: '',
                locked: true,
                onLockedTap: () => PaywallSheet.show(
                  context,
                  headline: views.paywallCopy['headline']?.toString(),
                  subline: views.paywallCopy['subline']?.toString(),
                  bullets: views.paywallBullets,
                  cta: views.paywallCopy['cta']?.toString(),
                  preferredPlan: PaywallPlan.pro,
                ),
              )
            else
              HomeProseCard(
                eyebrow: chapter.periodLabel,
                title: chapter.title,
                body: chapter.displayBody,
                footer: MuhReflectionChoice(
                  onSelected: (feedback) {
                    unawaited(
                      UserEngagementStore.instance.saveReflection(
                        contentKey: chapterKey,
                        feedback: feedback,
                      ),
                    );
                    ref.read(appAnalyticsProvider).reflectionSubmitted(
                          screen: 'life_map',
                          feedback: feedback,
                        );
                  },
                ),
              ),
          ],
        );
      },
      loading: () => MuhurthaLoadingView(
        mode: MuhurthaLoadingMode.screen,
        message: l10n.loadingLifeMap,
      ),
      error: (_, __) => HomeEmptyState(
        headline: l10n.journeyEmptyHeadline,
        message: l10n.errorGeneric,
        icon: Icons.auto_graph_rounded,
      ),
    );
  }
}
