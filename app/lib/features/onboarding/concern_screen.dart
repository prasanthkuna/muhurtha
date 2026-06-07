import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';
import 'birth_draft_notifier.dart';

const _concernOptions = <({String value, String labelKey})>[
  (value: 'life_stuck', labelKey: 'concernLifeStuck'),
  (value: 'career_timing', labelKey: 'concernCareerTiming'),
  (value: 'money_growth', labelKey: 'concernMoneyGrowth'),
  (value: 'marriage_relationship', labelKey: 'concernMarriage'),
  (value: 'family_pressure', labelKey: 'concernFamilyPressure'),
  (value: 'business_direction', labelKey: 'concernBusiness'),
  (value: 'health_routine', labelKey: 'concernHealth'),
  (value: 'good_bad_timing', labelKey: 'concernGoodBadTiming'),
];

const _roleOptions = <({String value, String labelKey})>[
  (value: 'student_fresher', labelKey: 'roleStudent'),
  (value: 'early_career', labelKey: 'roleEarlyCareer'),
  (value: 'manager_senior', labelKey: 'roleManager'),
  (value: 'business_owner', labelKey: 'roleBusinessOwner'),
  (value: 'homemaker', labelKey: 'roleHomemaker'),
  (value: 'between_jobs', labelKey: 'roleBetweenJobs'),
];

class ConcernScreen extends ConsumerWidget {
  const ConcernScreen({super.key});

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
      'roleStudent' => l.roleStudent,
      'roleEarlyCareer' => l.roleEarlyCareer,
      'roleManager' => l.roleManager,
      'roleBusinessOwner' => l.roleBusinessOwner,
      'roleHomemaker' => l.roleHomemaker,
      'roleBetweenJobs' => l.roleBetweenJobs,
      _ => key,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final draft = ref.watch(birthDraftProvider);
    final notifier = ref.read(birthDraftProvider.notifier);
    final concern = draft.intent.mainConcern;
    final role = draft.intent.lifeRole;

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: Text(l10n.concernTitle)),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(MuhSpace.page),
            children: [
              Text(
                l10n.concernSubtitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.creamMuted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: MuhSpace.xl),
              Text(
                l10n.concernMainLabel,
                style: theme.textTheme.titleSmall?.copyWith(
                  color: MuhColors.goldSoft,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: MuhSpace.md),
              Wrap(
                spacing: MuhSpace.sm,
                runSpacing: MuhSpace.sm,
                children: _concernOptions
                    .map(
                      (o) => ChoiceChip(
                        label: Text(_label(l10n, o.labelKey)),
                        selected: concern == o.value,
                        onSelected: (_) {
                          notifier.update(
                            (d) => d.copyWith(
                              intent: d.intent.copyWith(mainConcern: o.value),
                            ),
                          );
                        },
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: MuhSpace.xl),
              Text(
                l10n.concernRoleLabel,
                style: theme.textTheme.titleSmall?.copyWith(
                  color: MuhColors.goldSoft,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: MuhSpace.md),
              Wrap(
                spacing: MuhSpace.sm,
                runSpacing: MuhSpace.sm,
                children: _roleOptions
                    .map(
                      (o) => ChoiceChip(
                        label: Text(_label(l10n, o.labelKey)),
                        selected: role == o.value,
                        onSelected: (_) {
                          notifier.update(
                            (d) => d.copyWith(
                              intent: d.intent.copyWith(lifeRole: o.value),
                            ),
                          );
                        },
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: MuhSpace.xl),
              MuhPrimaryButton(
                label: l10n.continueLabel,
                onPressed: () => context.push('/onboarding/accuracy'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
