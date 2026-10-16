import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_choice_card.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/muh_enter.dart';
import '../../shared/widgets/editorial/muh_page_scaffold.dart';
import 'birth_draft_notifier.dart';
import 'package:go_router/go_router.dart';

import '../../core/analytics/app_analytics.dart';

const _concernOptions = <({String id, String labelKey})>[
  (id: 'life_stuck', labelKey: 'concernLifeStuck'),
  (id: 'career_timing', labelKey: 'concernCareerTiming'),
  (id: 'money_growth', labelKey: 'concernMoneyGrowth'),
  (id: 'relationship_timing', labelKey: 'concernMarriage'),
  (id: 'family_pressure', labelKey: 'concernFamilyPressure'),
  (id: 'business_timing', labelKey: 'concernBusiness'),
  (id: 'health_timing', labelKey: 'concernHealth'),
  (id: 'good_bad_timing', labelKey: 'concernGoodBadTiming'),
  (id: 'just_exploring', labelKey: 'concernJustExploring'),
];

const _roleOptions = <({String id, String labelKey})>[
  (id: 'student', labelKey: 'roleStudent'),
  (id: 'early_career', labelKey: 'roleEarlyCareer'),
  (id: 'manager', labelKey: 'roleManager'),
  (id: 'business_owner', labelKey: 'roleBusinessOwner'),
  (id: 'homemaker', labelKey: 'roleHomemaker'),
  (id: 'between_jobs', labelKey: 'roleBetweenJobs'),
];

class ConcernScreen extends ConsumerStatefulWidget {
  const ConcernScreen({super.key});

  @override
  ConsumerState<ConcernScreen> createState() => _ConcernScreenState();
}

class _ConcernScreenState extends ConsumerState<ConcernScreen> {
  var _finishing = false;

  String _label(AppLocalizations l, String key) {
    return switch (key) {
      'concernLifeStuck' => l.concernLifeStuck,
      'concernCareerTiming' => l.concernCareerTiming,
      'concernMoneyGrowth' => l.concernMoneyGrowth,
      'concernMarriage' => l.concernMarriage,
      'concernFamilyPressure' => l.concernFamilyPressure,
      'concernBusiness' => l.concernBusiness,
      'concernHealth' => l.concernHealth,
      'concernGoodBadTiming' => l.concernGoodBadTiming,
      'concernJustExploring' => l.concernJustExploring,
      'roleStudent' => l.roleStudent,
      'roleEarlyCareer' => l.roleEarlyCareer,
      'roleManager' => l.roleManager,
      'roleBusinessOwner' => l.roleBusinessOwner,
      'roleHomemaker' => l.roleHomemaker,
      'roleBetweenJobs' => l.roleBetweenJobs,
      _ => key,
    };
  }

  Future<void> _continue() async {
    if (_finishing) return;
    final l10n = AppLocalizations.of(context)!;
    final draft = ref.read(birthDraftProvider);
    if (draft.intent.mainConcern == null || draft.intent.mainConcern!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.concernMainLabel)),
      );
      return;
    }
    setState(() => _finishing = true);
    try {
      await ref.read(appAnalyticsProvider).onboardingStepViewed(step: 'concern');
      if (context.mounted) context.push('/onboarding/birth-basics');
    } finally {
      if (mounted) setState(() => _finishing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final draft = ref.watch(birthDraftProvider);
    final notifier = ref.read(birthDraftProvider.notifier);
    final concern = draft.intent.mainConcern;
    final role = draft.intent.lifeRole;

    return MuhPageScaffold(
        title: l10n.concernTitle,
        body: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  MuhSpace.page,
                  MuhSpace.sm,
                  MuhSpace.page,
                  MuhSpace.md,
                ),
                child: Text(
                  l10n.concernSubtitle,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: MuhColors.creamMuted,
                    height: 1.45,
                  ),
                ).muhEnter(0),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: MuhSpace.page),
                  children: muhStaggerChildren([
                    Text(
                      l10n.concernMainLabel,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: MuhColors.cream,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.sm),
                    ..._concernOptions.map(
                      (o) => MuhChoiceCard(
                        title: _label(l10n, o.labelKey),
                        selected: concern == o.id,
                        onTap: () {
                          notifier.update(
                            (d) => d.copyWith(
                              intent: d.intent.copyWith(mainConcern: o.id),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: MuhSpace.lg),
                    Text(
                      l10n.concernRoleLabel,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: MuhColors.cream,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.sm),
                    ..._roleOptions.map(
                      (o) => MuhChoiceCard(
                        title: _label(l10n, o.labelKey),
                        selected: role == o.id,
                        onTap: () {
                          notifier.update(
                            (d) => d.copyWith(
                              intent: d.intent.copyWith(lifeRole: o.id),
                            ),
                          );
                        },
                      ),
                    ),
                  ], startIndex: 1),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(MuhSpace.page),
                child: MuhPrimaryButton(
                  label: _finishing ? l10n.loadingGenerate : l10n.continueLabel,
                  onPressed: _finishing ? null : _continue,
                ).muhEnter(12),
              ),
            ],
          ),
    );
  }
}
