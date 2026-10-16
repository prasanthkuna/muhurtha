import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../../core/analytics/app_analytics.dart';
import '../../../core/data/active_chart_profile.dart';
import '../../../core/data/birth_pack_readiness.dart';
import '../../../core/data/birth_pack_views.dart';
import '../../../core/data/muhurtha_engine_api.dart';
import '../../../core/engagement/engagement_scope.dart';
import '../../../core/engagement/user_engagement_store.dart';
import '../../../design_system/design_system.dart';
import '../../../shared/widgets/muh_purpose_chip.dart';
import '../../../shared/widgets/muhurtha_loading_view.dart';
import '../home_copy.dart';
import '../home_editorial_scroll.dart';
import '../home_prose_card.dart';
import '../home_purpose_provider.dart';
import '../home_share.dart';
import '../widgets/pack_coverage_banner.dart';

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

class TimingEditorialTab extends ConsumerStatefulWidget {
  const TimingEditorialTab({
    super.key,
    required this.l10n,
    required this.purposeLabel,
  });

  final AppLocalizations l10n;
  final String Function(AppLocalizations l, String key) purposeLabel;

  @override
  ConsumerState<TimingEditorialTab> createState() => _TimingEditorialTabState();
}

class _TimingEditorialTabState extends ConsumerState<TimingEditorialTab> {
  AsyncValue<PurposeCheckResult?>? _result;
  var _outlookExpanded = false;
  var _autoEvaluated = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_autoEvaluated) return;
      final purpose = ref.read(homeSelectedPurposeProvider);
      if (purpose != null && purpose.isNotEmpty) {
        _autoEvaluated = true;
        unawaited(_evaluate());
      }
    });
  }

  String _purposeLabel(String key) => widget.purposeLabel(widget.l10n, key);

  Future<void> _evaluate() async {
    final purpose = ref.read(homeSelectedPurposeProvider);
    if (purpose == null || purpose.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.l10n.purposeChoose)),
      );
      return;
    }
    final api = ref.read(muhurthaEngineApiProvider);
    if (api == null) return;
    final targetDate = ref.read(homeTimingTargetDateProvider) ??
        ref.read(birthPackProvider).valueOrNull?.date;
    setState(() => _result = const AsyncValue.loading());
    try {
      final r = await api.purposeCheck(
        purposeType: purpose,
        targetDate: targetDate?.isNotEmpty == true ? targetDate : null,
      );
      setState(() => _result = AsyncValue.data(r));
      unawaited(
        ref.read(appAnalyticsProvider).purposeSelected(purpose: purpose),
      );
    } catch (e, st) {
      setState(() => _result = AsyncValue.error(e, st));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = widget.l10n;
    final copy = HomeCopy(l10n);
    final packAsync = ref.watch(birthPackProvider);
    ref.watch(activeChartProfileIdProvider);
    final subjectName = ref.watch(chartDisplayNameProvider);
    final selectedPurpose = ref.watch(homeSelectedPurposeProvider);

    return packAsync.when(
      data: (pack) {
        if (pack == null) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingTimingPlan,
          );
        }
        if (!pack.hasLlmPack) {
          return MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.screen,
            message: l10n.loadingTimingPlan,
          );
        }
        final timingTitle = subjectName.isNotEmpty
            ? '${subjectName.trim()}, ${copy.timingTitle.toLowerCase()}'
            : copy.timingTitle;

        return HomeEditorialScroll(
          title: timingTitle,
          subtitle: 'Evaluate a specific plan against traditional timing.',
          onRefresh: () async {
            ref.invalidate(birthPackProvider);
            await _evaluate();
          },
          children: [
            PackCoverageBanner(pack: pack),
            const SizedBox(height: MuhSpace.md),
            Text(
              l10n.purposeChoose,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: MuhColors.ink,
                  ),
            ),
            const SizedBox(height: MuhSpace.sm),
            Wrap(
              spacing: MuhSpace.sm,
              runSpacing: MuhSpace.sm,
              children: _purposeEntries.map((entry) {
                final label = _purposeLabel(entry.labelKey);
                final selected = selectedPurpose == entry.value;
                return MuhPurposeChip(
                  label: label,
                  isSelected: selected,
                  onTap: () {
                    ref.read(homeSelectedPurposeProvider.notifier).state =
                        entry.value;
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: MuhSpace.md),
            OutlinedButton.icon(
              icon: const Icon(Icons.calendar_month_outlined),
              label: Text(
                ref.watch(homeTimingTargetDateProvider) ?? 'Choose a date',
              ),
              onPressed: () async {
                final now = DateTime.now();
                final first = DateTime(now.year, now.month, now.day);
                final last = first.add(const Duration(days: 90));
                final requested = DateTime.tryParse(
                  ref.read(homeTimingTargetDateProvider) ?? '',
                ) ?? first;
                final initial = requested.isBefore(first) || requested.isAfter(last)
                    ? first
                    : requested;
                final picked = await showDatePicker(
                  context: context,
                  initialDate: initial,
                  firstDate: first,
                  lastDate: last,
                  helpText: 'Choose a date for your plan',
                );
                if (picked != null && mounted) {
                  ref.read(homeTimingTargetDateProvider.notifier).state =
                      picked.toIso8601String().substring(0, 10);
                  setState(() => _result = null);
                }
              },
            ),
            const SizedBox(height: MuhSpace.sm),
            MuhQuietButton(
              label: l10n.purposeCheck,
              icon: Icons.event_available_outlined,
              enabled: selectedPurpose != null && selectedPurpose.isNotEmpty,
              onPressed: _evaluate,
            ),
            const SizedBox(height: MuhSpace.lg),
            if (_result != null)
              _result!.when(
                data: (r) {
                  if (r == null) return const SizedBox.shrink();
                  return _PurposeResultCard(
                    result: r,
                    onWhy: () => MuhWhyDrawer.show(
                      context,
                      plain: r.summary,
                      traditional: [
                        if (r.domainLenses.isNotEmpty)
                          'Domain focus: ${r.domainLenses.join(', ')}',
                        if (r.personalSignals.isNotEmpty)
                          'Chart signals: ${r.personalSignals.join(', ')}',
                        if (r.timingNote.isNotEmpty) r.timingNote,
                      ].join('\n\n'),
                    ),
                    onSave: () {
                      final scope = engagementScope(ref);
                      final purpose = selectedPurpose ?? 'unknown';
                      final dateIso = ref.read(homeTimingTargetDateProvider) ??
                          pack.date;
                      unawaited(
                        UserEngagementStore.instance.saveIntention(
                          scope: scope,
                          id: 'purpose-$purpose-$dateIso',
                          purpose: purpose,
                          dateIso: dateIso,
                          note: r.headline,
                        ),
                      );
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.profileSaved)),
                      );
                    },
                    onShare: () => shareExactCard(
                      ref,
                      context,
                      title: r.headline,
                      body: [r.summary, r.actionLine]
                          .where((s) => s.isNotEmpty)
                          .join('\n\n'),
                      sourceType: 'purpose_result',
                      sourceId: r.id,
                    ),
                  );
                },
                loading: () => MuhInlineStatus(
                  message: l10n.loadingTimingPlan,
                  kind: MuhInlineStatusKind.loading,
                ),
                error: (_, __) => MuhInlineStatus(
                  message: l10n.errorGeneric,
                  kind: MuhInlineStatusKind.empty,
                ),
              ),
            const SizedBox(height: MuhSpace.lg),
            MuhQuietButton(
              label: _outlookExpanded ? 'Hide week/month outlook' : 'Week/month outlook',
              icon: _outlookExpanded
                  ? Icons.expand_less_rounded
                  : Icons.expand_more_rounded,
              onPressed: () =>
                  setState(() => _outlookExpanded = !_outlookExpanded),
            ),
            if (_outlookExpanded) ...[
              const SizedBox(height: MuhSpace.md),
              Text(
                'General horizon context — not a substitute for purpose evaluation above.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: MuhColors.inkSecondary,
                    ),
              ),
              const SizedBox(height: MuhSpace.sm),
              _OutlookSection(pack: pack, copy: copy),
            ],
          ],
        );
      },
      loading: () => MuhurthaLoadingView(
        mode: MuhurthaLoadingMode.screen,
        message: l10n.loadingTimingPlan,
      ),
      error: (_, __) => HomeProseCard(
        eyebrow: copy.timingTitle,
        title: l10n.errorGeneric,
        body: 'Pull to retry after your chart pack finishes loading.',
      ),
    );
  }
}

class _PurposeResultCard extends StatelessWidget {
  const _PurposeResultCard({
    required this.result,
    required this.onWhy,
    required this.onSave,
    required this.onShare,
  });

  final PurposeCheckResult result;
  final VoidCallback onWhy;
  final VoidCallback onSave;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    return HomeProseCard(
      eyebrow: result.status.replaceAll('_', ' '),
      title: result.headline,
      body: [
        result.summary,
        if (result.actionLine.isNotEmpty) result.actionLine,
        if (result.timingNote.isNotEmpty) result.timingNote,
      ].where((s) => s.isNotEmpty).join('\n\n'),
      footer: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          MuhQuietButton(
            label: 'Why this reading',
            onPressed: onWhy,
          ),
          MuhQuietButton(
            label: 'Save this plan',
            icon: Icons.bookmark_outline_rounded,
            onPressed: onSave,
          ),
          MuhQuietButton(
            label: 'Share timing',
            icon: Icons.ios_share_rounded,
            onPressed: onShare,
          ),
        ],
      ),
    );
  }
}

class _OutlookSection extends ConsumerWidget {
  const _OutlookSection({required this.pack, required this.copy});

  final BirthPackPayload pack;
  final HomeCopy copy;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final views = BirthPackViews(pack);
    final week = views.week;
    final month = views.month;
    if (week.headline.isEmpty &&
        week.body.isEmpty &&
        month.headline.isEmpty &&
        month.body.isEmpty) {
      return const MuhInlineStatus(
        message: 'Outlook cards not generated for this pack yet.',
        kind: MuhInlineStatusKind.empty,
      );
    }
    return Column(
      children: [
        if (week.headline.isNotEmpty || week.body.isNotEmpty)
          HomeProseCard(
            eyebrow: copy.week,
            title: week.headline,
            body: week.body,
          ),
        if (month.headline.isNotEmpty || month.body.isNotEmpty)
          HomeProseCard(
            eyebrow: copy.month,
            title: month.headline,
            body: month.body,
          ),
      ],
    );
  }
}
