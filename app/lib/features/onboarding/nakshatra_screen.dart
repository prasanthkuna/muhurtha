import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../design_system/design_system.dart';
import '../../core/data/nakshatras.dart';
import '../../shared/widgets/muh_choice_card.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';
import 'birth_draft_notifier.dart';

class NakshatraScreen extends ConsumerStatefulWidget {
  const NakshatraScreen({super.key});

  @override
  ConsumerState<NakshatraScreen> createState() => _NakshatraScreenState();
}

class _NakshatraScreenState extends ConsumerState<NakshatraScreen> {
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final draft = ref.watch(birthDraftProvider);
    final notifier = ref.read(birthDraftProvider.notifier);

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: Text(l10n.nakshatraTitle)),
        body: SafeArea(
          child: Column(
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
                  l10n.nakshatraSubtitle,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: MuhColors.creamMuted,
                    height: 1.45,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: MuhSpace.page),
                child: MuhChoiceCard(
                  title: l10n.nakshatraUnknown,
                  selected: draft.nakshatraUnknown,
                  onTap: () {
                    notifier.update(
                      (d) => d.copyWith(
                        nakshatraUnknown: true,
                        clearJanmaNakshatra: true,
                      ),
                    );
                  },
                ),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(
                    horizontal: MuhSpace.page,
                  ),
                  itemCount: kNakshatras.length,
                  itemBuilder: (context, i) {
                    final n = kNakshatras[i];
                    final sel =
                        !draft.nakshatraUnknown && draft.janmaNakshatra == n;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: MuhSpace.sm),
                      child: MuhChoiceCard(
                        title: n,
                        selected: sel,
                        onTap: () {
                          notifier.update(
                            (d) => d.copyWith(
                              janmaNakshatra: n,
                              nakshatraUnknown: false,
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(MuhSpace.page),
                child: MuhPrimaryButton(
                  label: l10n.continueLabel,
                  onPressed: () {
                    if (!draft.nakshatraUnknown &&
                        (draft.janmaNakshatra?.isEmpty ?? true)) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.errorGeneric)),
                      );
                      return;
                    }
                    context.push('/onboarding/concern');
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
