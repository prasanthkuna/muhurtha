import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../../core/analytics/app_analytics.dart';
import '../../../core/config/env.dart';
import '../../../core/data/active_chart_profile.dart';
import '../../../core/data/birth_pack_readiness.dart';
import '../../../core/data/birth_pack_views.dart';
import '../../../core/data/muhurtha_engine_api.dart';
import '../../../core/engagement/engagement_scope.dart';
import '../../../core/engagement/user_engagement_store.dart';
import '../widgets/pack_coverage_banner.dart';
import '../../../core/session/session_preferences.dart';
import '../../../design_system/design_system.dart';
import '../../../shared/widgets/muhurtha_loading_view.dart';
import '../home_copy.dart';
import '../home_editorial_scroll.dart';
import '../home_empty_state.dart';
import '../home_share.dart';

class DecodeEditorialTab extends ConsumerStatefulWidget {
  const DecodeEditorialTab({super.key, required this.l10n});

  final AppLocalizations l10n;

  @override
  ConsumerState<DecodeEditorialTab> createState() => _DecodeEditorialTabState();
}

class _DecodeEditorialTabState extends ConsumerState<DecodeEditorialTab> {
  var _loggedFirstInsight = false;
  String? _openDomainKey;

  @override
  Widget build(BuildContext context) {
    final l10n = widget.l10n;
    if (!Env.supportsPackTabs) {
      return HomeEmptyState(
        headline: l10n.todayEmptyHeadline,
        message: l10n.errorNeedSupabase,
        icon: Icons.fingerprint_rounded,
      );
    }
    final packAsync = ref.watch(birthPackProvider);
    ref.watch(activeChartProfileIdProvider);
    final copy = HomeCopy(l10n);

    return packAsync.when(
      data: (pack) {
        if (pack == null) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingDecode,
          );
        }
        if (!pack.hasLlmPack) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingDecode,
          );
        }
        if (!_loggedFirstInsight) {
          _loggedFirstInsight = true;
          unawaited(SessionPreferences.markFirstInsightComplete());
          unawaited(
            ref.read(appAnalyticsProvider).firstInsightViewed(screen: 'decode'),
          );
          unawaited(
            UserEngagementStore.instance.recordExposure(
              scope: engagementScope(ref),
              contentKey: 'decode-${pack.date}',
              screen: 'decode',
              completed: true,
            ),
          );
        }
        final views = BirthPackViews(pack);
        final decodeHit = views.displayHook;
        final identitySummary = views.identitySummary;
        final hasCopy = decodeHit.isNotEmpty ||
            identitySummary.isNotEmpty ||
            views.strengths.isNotEmpty ||
            views.watchouts.isNotEmpty;

        return HomeEditorialScroll(
          title: copy.decodeTitle,
          subtitle: '',
          onRefresh: () async {
            ref.invalidate(birthPackProvider);
            ref.invalidate(todayPayloadProvider);
          },
          footer: hasCopy
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    MuhQuietButton(
                      label: 'Explore Life Map',
                      icon: Icons.auto_stories_outlined,
                      onPressed: () {
                        ref.read(appAnalyticsProvider).decodeLifeMapCta();
                        context.go('/home?tab=life_map');
                      },
                    ),
                    MuhQuietButton(
                      label: 'Share reading',
                      icon: Icons.ios_share_rounded,
                      onPressed: () => shareExactCard(
                        ref,
                        context,
                        title: decodeHit.isNotEmpty ? copy.thisSounds : copy.decodeTitle,
                        body: decodeHit.isNotEmpty ? decodeHit : identitySummary,
                        sourceType: 'decode_hero',
                        sourceId: 'decode-hero-${pack.date}',
                      ),
                    ),
                  ],
                )
              : null,
          children: [
            if (!hasCopy && pack.isGenerating)
              MuhInlineStatus(
                message: l10n.loadingDecode,
                kind: MuhInlineStatusKind.loading,
              ),
            PackCoverageBanner(pack: pack),
            if (hasCopy) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(MuhSpace.lg),
                decoration: BoxDecoration(
                  color: MuhColors.goldWash,
                  borderRadius: BorderRadius.circular(MuhRadius.card),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      copy.thisSounds,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: MuhColors.goldDeep,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    Text(
                      decodeHit.isNotEmpty ? decodeHit : identitySummary,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            height: 1.19,
                            fontWeight: FontWeight.w500,
                            color: MuhColors.ink,
                          ),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    MuhQuietButton(
                      label: 'Why this reading',
                      onPressed: () => MuhWhyDrawer.show(
                        context,
                        plain: views.decodePlainWhy,
                        traditional: views.decodeTraditionalWhy,
                      ),
                    ),
                  ],
                ),
              ),
              if (identitySummary.isNotEmpty &&
                  identitySummary.trim() != decodeHit.trim())
                ExpansionTile(
                  title: Text(copy.decodeSub),
                  childrenPadding: const EdgeInsets.fromLTRB(
                    MuhSpace.md, 0, MuhSpace.md, MuhSpace.md),
                  children: [
                    Text(identitySummary,
                        style: Theme.of(context).textTheme.bodyLarge),
                  ],
                ),
              if (views.strengths.isNotEmpty || views.watchouts.isNotEmpty)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (views.strengths.isNotEmpty)
                      Expanded(
                        child: _PatternPreview(
                          label: copy.strengths,
                          lines: views.strengths,
                          color: MuhColors.successInk,
                        ),
                      ),
                    if (views.strengths.isNotEmpty && views.watchouts.isNotEmpty)
                      const SizedBox(width: MuhSpace.sm),
                    if (views.watchouts.isNotEmpty)
                      Expanded(
                        child: _PatternPreview(
                          label: copy.watchouts,
                          lines: views.watchouts,
                          color: MuhColors.warningInk,
                        ),
                      ),
                  ],
                ),
              MuhReflectionChoice(
                onSelected: (value) {
                  unawaited(
                    UserEngagementStore.instance.saveReflection(
                      scope: engagementScope(ref),
                      contentKey: 'decode-${pack.date}',
                      feedback: value,
                    ),
                  );
                  ref.read(appAnalyticsProvider).reflectionSubmitted(
                        screen: 'decode',
                        feedback: value,
                      );
                },
              ),
              if (views.categoryReports.isNotEmpty) ...[
                const SizedBox(height: MuhSpace.sm),
                Text(
                  'Explore by life area',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: MuhColors.ink,
                      ),
                ),
                const SizedBox(height: MuhSpace.sm),
                for (final report in views.categoryReports)
                  ExpansionTile(
                    key: ValueKey(report.key),
                    initiallyExpanded: _openDomainKey == report.key,
                    onExpansionChanged: (open) {
                      setState(() => _openDomainKey = open ? report.key : null);
                    },
                    title: Text(
                      report.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(
                          MuhSpace.md,
                          0,
                          MuhSpace.md,
                          MuhSpace.md,
                        ),
                        child: Text(
                          report.body,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                height: 1.45,
                                color: MuhColors.ink,
                              ),
                        ),
                      ),
                    ],
                  ),
              ] else ...[
                if (views.workMoney.isNotEmpty)
                  MuhReadingSection(
                    eyebrow: copy.workMoney,
                    title: copy.workMoney,
                    body: views.workMoney,
                  ),
                if (views.relationship.isNotEmpty)
                  MuhReadingSection(
                    eyebrow: copy.relationship,
                    title: copy.relationship,
                    body: views.relationship,
                  ),
              ],
            ],
          ],
        );
      },
      loading: () => MuhurthaLoadingView(
        mode: MuhurthaLoadingMode.screen,
        message: l10n.loadingDecode,
      ),
      error: (_, __) => HomeEmptyState(
        headline: l10n.todayEmptyHeadline,
        message:
            'Birth pack is not ready yet. Pull to retry after generation finishes.',
        icon: Icons.fingerprint_rounded,
        onRetry: () => ref.invalidate(birthPackProvider),
      ),
    );
  }
}

/// Keep the first screen readable: reveal one meaningful pattern per column,
/// then let the reader open the full set instead of a wall of bullet points.
class _PatternPreview extends StatelessWidget {
  const _PatternPreview({
    required this.label,
    required this.lines,
    required this.color,
  });
  final String label;
  final List<String> lines;
  final Color color;

  @override
  Widget build(BuildContext context) {
    if (lines.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(MuhSpace.md),
      decoration: BoxDecoration(
        color: MuhColors.paper,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: color, fontWeight: FontWeight.w700)),
          const SizedBox(height: MuhSpace.sm),
          Text(lines.first,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600, height: 1.35)),
          if (lines.length > 1)
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              childrenPadding: EdgeInsets.zero,
              title: Text('+ ${lines.length - 1}',
                  style: Theme.of(context).textTheme.labelSmall),
              children: [
                for (final line in lines.skip(1))
                  Padding(
                    padding: const EdgeInsets.only(bottom: MuhSpace.sm),
                    child: Text(line,
                        style: Theme.of(context).textTheme.bodySmall),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
