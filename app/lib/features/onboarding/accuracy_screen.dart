import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../design_system/design_system.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/data/engine_cache_invalidate.dart';
import '../../core/data/profile_repository.dart';
import '../../core/engine/accuracy_copy.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';
import 'birth_draft_notifier.dart';

class AccuracyScreen extends ConsumerStatefulWidget {
  const AccuracyScreen({super.key});

  @override
  ConsumerState<AccuracyScreen> createState() => _AccuracyScreenState();
}

class _AccuracyScreenState extends ConsumerState<AccuracyScreen> {
  var _saving = false;

  Future<void> _finish() async {
    final l10n = AppLocalizations.of(context)!;
    final draft = ref.read(birthDraftProvider);
    final repo = ref.read(profileRepositoryProvider);

    if (repo == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorNeedSupabase)),
        );
        context.go('/home');
      }
      return;
    }

    setState(() => _saving = true);
    try {
      final ids = await repo.saveOnboardingDraft(draft);
      final api = ref.read(muhurthaEngineApiProvider);
      var cards = <QuickProofCard>[];

      if (api != null) {
        try {
          final chart = await api.chartInitialize(ids.birthInputId);
          if (chart.canShowQuickProof) {
            try {
              cards = await api.quickProofGenerate();
            } catch (_) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.errorGeneric)),
                );
              }
            }
          }
        } catch (_) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(l10n.errorGeneric)),
            );
          }
          return;
        }
      }

      if (!mounted) return;
      invalidateAllEngineCaches(ref);
      context.go('/onboarding/quick-proof', extra: cards);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorGeneric)),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final draft = ref.watch(birthDraftProvider);
    final mode = draft.resolution.engineMode;
    final body = accuracyLocalizedBody(l10n, mode);

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: Text(l10n.accuracyTitle)),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(MuhSpace.page),
            children: [
              Text(
                l10n.accuracySubtitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.creamMuted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: MuhSpace.xl),
              Container(
                padding: const EdgeInsets.all(MuhSpace.xl),
                decoration: BoxDecoration(
                  color: MuhColors.surface,
                  borderRadius: BorderRadius.circular(MuhRadius.card),
                  border: Border.all(color: MuhColors.line),
                ),
                child: Text(
                  body,
                  style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
                ),
              ),
              const SizedBox(height: MuhSpace.xl),
              MuhPrimaryButton(
                label: l10n.accuracyContinue,
                onPressed: _saving ? null : _finish,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
