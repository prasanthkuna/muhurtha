import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../../core/analytics/app_analytics.dart';
import '../../../core/data/birth_pack_readiness.dart';
import '../../../core/data/birth_pack_views.dart';
import '../../../core/data/life_period_matching.dart';
import '../../../core/data/active_chart_profile.dart';
import '../../../core/data/muhurtha_engine_api.dart';
import '../../../core/engagement/engagement_scope.dart';
import '../../../core/engagement/user_engagement_store.dart';
import '../../../core/subscription/subscription_access.dart';
import '../../../design_system/design_system.dart';
import '../../../shared/widgets/muhurtha_loading_view.dart';
import '../../../core/subscription/subscription_service.dart';
import '../../../shared/widgets/paywall_sheet.dart';
import '../home_copy.dart';
import '../home_empty_state.dart';
import '../home_share.dart';
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
  var _initializedSelection = false;

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
        if (!_initializedSelection) {
          _initializedSelection = true;
          final current = views.currentChapter;
          _selectedId = current?.periodLabel ?? chapters.first.$1.periodLabel;
        }
        final selectedId = _selectedId ?? chapters.first.$1.periodLabel;
        (ChapterView, String) resolveSelected() {
          for (final e in chapters) {
            if (e.$1.periodLabel == selectedId) return e;
          }
          for (final e in chapters) {
            if (e.$2 == 'current') return e;
          }
          return chapters.first;
        }

        final selected = resolveSelected();
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
                final match = chapters.firstWhere(
                  (e) => e.$1.periodLabel == id,
                  orElse: () => chapters.first,
                );
                final phase = match.$2;
                setState(() => _selectedId = id);
                ref.read(appAnalyticsProvider).chapterOpened(
                      screen: 'life_map',
                      chapterPhase: phase,
                      entryPoint: 'rail',
                    );
                unawaited(
                  UserEngagementStore.instance.recordExposure(
                    scope: engagementScope(ref),
                    contentKey: 'life-$phase-$id',
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
            else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(MuhSpace.lg),
                decoration: BoxDecoration(
                  color: MuhColors.goldWash,
                  borderRadius: BorderRadius.circular(MuhRadius.readingSheet),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(chapter.periodLabel,
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: MuhColors.goldDeep,
                            fontWeight: FontWeight.w700)),
                    const SizedBox(height: MuhSpace.md),
                    Text(chapter.title,
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: MuhColors.ink,
                            height: 1.18,
                            fontWeight: FontWeight.w500)),
                    const SizedBox(height: MuhSpace.md),
                    Text(
                      chapter.story,
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: MuhColors.inkSecondary,
                            height: 1.5),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    MuhQuietButton(
                      label: 'Read this chapter',
                      icon: Icons.menu_book_outlined,
                      onPressed: () => showModalBottomSheet<void>(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: MuhColors.paper,
                        builder: (sheetContext) => FractionallySizedBox(
                          heightFactor: 0.78,
                          child: SafeArea(
                            child: ListView(
                              padding: const EdgeInsets.all(MuhSpace.page),
                              children: [
                                Text(chapter.periodLabel,
                                    style: Theme.of(context).textTheme.labelLarge
                                        ?.copyWith(color: MuhColors.goldDeep)),
                                const SizedBox(height: MuhSpace.md),
                                Text(chapter.title,
                                    style: Theme.of(context).textTheme.headlineMedium),
                                const SizedBox(height: MuhSpace.lg),
                                Text(chapter.detailBody,
                                    style: Theme.of(context).textTheme.bodyLarge
                                        ?.copyWith(height: 1.6)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (chapter.evidenceLine.isNotEmpty)
                MuhQuietButton(
                  label: 'Why this chapter',
                  onPressed: () => MuhWhyDrawer.show(
                    context,
                    plain: chapter.story,
                    traditional: chapter.evidenceLine,
                  ),
                ),
              if (chapter.shareHook.isNotEmpty)
                MuhQuietButton(
                  label: 'Share this chapter',
                  icon: Icons.ios_share_rounded,
                  onPressed: () => shareExactCard(
                    ref,
                    context,
                    title: chapter.title,
                    body: chapter.shareHook,
                    sourceType: 'journey_phase',
                    sourceId: chapterKey,
                  ),
                ),
              MuhReflectionChoice(
                onSelected: (feedback) {
                  unawaited(
                    UserEngagementStore.instance.saveReflection(
                      scope: engagementScope(ref),
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
            ],
            if (tense == 'past')
              ...views.likelyLifeEvents
                  .where((event) => lifeEventMatchesChapter(
                        event.periodLabel, chapter.periodLabel))
                  .take(2)
                  .map((event) => HomeProseCard(
                        eyebrow: 'Possible theme for this period',
                        title: event.eventTheme,
                        body: event.whyItMayFit,
                      )),
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
