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
import '../../../shared/widgets/editorial/editorial.dart';
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
    final subjectName = ref.watch(chartDisplayNameProvider);

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
        final name = subjectName.isNotEmpty ? subjectName : pack.displayName.trim();
        final decodeHit = views.displayHook;
        final identitySummary = views.identitySummary;
        final hasCopy = decodeHit.isNotEmpty ||
            identitySummary.isNotEmpty ||
            views.strengths.isNotEmpty ||
            views.watchouts.isNotEmpty;

        final subtitle = identitySummary.isNotEmpty &&
                decodeHit.isNotEmpty &&
                identitySummary.trim() != decodeHit.trim()
            ? identitySummary
            : '';

        return HomeEditorialScroll(
          title: name.isEmpty ? copy.decodeTitle : '$name, decoded',
          subtitle: subtitle,
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
              MuhReadingSection(
                title: decodeHit.isNotEmpty ? copy.thisSounds : copy.decodeTitle,
                lead: decodeHit.isNotEmpty ? decodeHit : identitySummary,
                trailing: MuhQuietButton(
                  label: 'Why this reading',
                  onPressed: () => MuhWhyDrawer.show(
                    context,
                    plain: views.decodePlainWhy,
                    traditional: views.decodeTraditionalWhy,
                  ),
                ),
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
              if (views.strengths.isNotEmpty)
                MuhReadingSection(
                  title: copy.strengths,
                  body: views.strengths.map((s) => '• $s').join('\n'),
                ),
              if (views.watchouts.isNotEmpty)
                MuhReadingSection(
                  title: copy.watchouts,
                  body: views.watchouts.map((s) => '• $s').join('\n'),
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
