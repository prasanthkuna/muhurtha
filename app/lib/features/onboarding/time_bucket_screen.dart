import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_choice_card.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';
import 'birth_draft.dart';
import 'birth_draft_notifier.dart';

class TimeBucketScreen extends ConsumerStatefulWidget {
  const TimeBucketScreen({super.key});

  @override
  ConsumerState<TimeBucketScreen> createState() => _TimeBucketScreenState();
}

class _TimeBucketScreenState extends ConsumerState<TimeBucketScreen> {
  String _label(AppLocalizations l10n, TimeBucketOption o) {
    switch (o) {
      case TimeBucketOption.earlyMorning:
        return l10n.bucketEarlyMorning;
      case TimeBucketOption.morning:
        return l10n.bucketMorning;
      case TimeBucketOption.afternoon:
        return l10n.bucketAfternoon;
      case TimeBucketOption.evening:
        return l10n.bucketEvening;
      case TimeBucketOption.night:
        return l10n.bucketNight;
      case TimeBucketOption.lateNight:
        return l10n.bucketLateNight;
      case TimeBucketOption.exact:
        return l10n.bucketExact;
      case TimeBucketOption.unknown:
        return l10n.bucketUnknown;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final draft = ref.watch(birthDraftProvider);
    final notifier = ref.read(birthDraftProvider.notifier);

    final choices = [
      TimeBucketOption.earlyMorning,
      TimeBucketOption.morning,
      TimeBucketOption.afternoon,
      TimeBucketOption.evening,
      TimeBucketOption.night,
      TimeBucketOption.lateNight,
      TimeBucketOption.exact,
      TimeBucketOption.unknown,
    ];

    Future<void> pickExactTime() async {
      final t = await showTimePicker(
        context: context,
        initialTime:
            draft.exactBirthTime ?? const TimeOfDay(hour: 6, minute: 0),
      );
      if (t != null) {
        notifier.update((d) => d.copyWith(exactBirthTime: t));
      }
    }

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: Text(l10n.timeTitle)),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(MuhSpace.page),
            children: [
              Text(
                l10n.timeSubtitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.creamMuted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: MuhSpace.lg),
              ...choices.map(
                (o) => MuhChoiceCard(
                  title: _label(l10n, o),
                  selected: draft.timeBucket == o,
                  onTap: () {
                    final clearExact = o != TimeBucketOption.exact;
                    notifier.update(
                      (d) => d.copyWith(
                        timeBucket: o,
                        clearExactBirthTime: clearExact,
                      ),
                    );
                  },
                ),
              ),
              if (draft.timeBucket == TimeBucketOption.exact) ...[
                const SizedBox(height: MuhSpace.sm),
                ListTile(
                  tileColor: MuhColors.surfaceSoft,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(MuhRadius.input),
                  ),
                  title: Text(
                    draft.exactBirthTime == null
                        ? l10n.bucketExact
                        : draft.exactBirthTime!.format(context),
                    style: theme.textTheme.titleSmall,
                  ),
                  trailing:
                      const Icon(Icons.schedule_rounded, color: MuhColors.gold),
                  onTap: pickExactTime,
                ),
              ],
              const SizedBox(height: MuhSpace.xl),
              MuhPrimaryButton(
                label: l10n.continueLabel,
                onPressed: () {
                        if (draft.timeBucket == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(l10n.errorGeneric)),
                          );
                          return;
                        }
                        if (draft.timeBucket == TimeBucketOption.exact &&
                            draft.exactBirthTime == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(l10n.errorGeneric)),
                          );
                          return;
                        }
                        // Exact date+time fixes the chart: nakshatra is derived on the server
                        // (Lahiri Moon). Optional override via Nakshatra screen for bucket modes.
                        if (draft.timeBucket == TimeBucketOption.exact &&
                            draft.exactBirthTime != null) {
                          notifier.update(
                            (d) => d.copyWith(
                              nakshatraUnknown: true,
                              clearJanmaNakshatra: true,
                            ),
                          );
                        }
                        context.push('/onboarding/nakshatra');
                      },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
