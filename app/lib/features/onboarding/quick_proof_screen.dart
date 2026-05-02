import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/data/muhurtha_engine_api.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';

/// After saving birth data + `chart_initialize`, user validates recent-life cards.
class QuickProofScreen extends ConsumerStatefulWidget {
  const QuickProofScreen({super.key, this.initialCards});

  final List<QuickProofCard>? initialCards;

  @override
  ConsumerState<QuickProofScreen> createState() => _QuickProofScreenState();
}

class _QuickProofScreenState extends ConsumerState<QuickProofScreen> {
  var _loading = false;
  List<QuickProofCard>? _cards;
  final _sent = <String>{};

  @override
  void initState() {
    super.initState();
    _cards = widget.initialCards;
    if (_cards == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    }
  }

  Future<void> _load() async {
    final api = ref.read(muhurthaEngineApiProvider);
    if (api == null) {
      if (mounted) context.go('/home');
      return;
    }
    setState(() => _loading = true);
    try {
      final c = await api.quickProofGenerate();
      if (mounted) setState(() => _cards = c);
    } catch (_) {
      if (mounted) context.go('/home');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit(
    AppLocalizations l10n,
    QuickProofCard card,
    String value,
  ) async {
    final api = ref.read(muhurthaEngineApiProvider);
    if (api == null) return;
    try {
      await api.validationSubmit(
        phaseSegmentId: card.phaseSegmentId,
        feedbackValue: value,
      );
      if (!mounted) return;
      setState(() => _sent.add(card.phaseSegmentId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.validationThankYou)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: Text(l10n.quickProofTitle)),
        body: SafeArea(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: MuhColors.gold),
                )
              : ListView(
                  padding: const EdgeInsets.all(MuhSpace.page),
                  children: [
                    Text(
                      l10n.quickProofSubtitle,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: MuhColors.creamMuted,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.xl),
                    if ((_cards == null || _cards!.isEmpty))
                      Text(
                        l10n.quickProofNoCards,
                        style: theme.textTheme.bodyLarge,
                      )
                    else
                      ..._cards!.map(
                        (c) => _ProofCard(
                          card: c,
                          l10n: l10n,
                          theme: theme,
                          submitted: _sent.contains(c.phaseSegmentId),
                          onFeedback: (v) => _submit(l10n, c, v),
                        ),
                      ),
                    const SizedBox(height: MuhSpace.xl),
                    MuhPrimaryButton(
                      label: l10n.quickProofGoHome,
                      onPressed: () {
                        ref.invalidate(todayPayloadProvider);
                        ref.invalidate(journeyPhasesProvider);
                        ref.invalidate(remedyListProvider);
                        context.go('/home');
                      },
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _ProofCard extends StatelessWidget {
  const _ProofCard({
    required this.card,
    required this.l10n,
    required this.theme,
    required this.submitted,
    required this.onFeedback,
  });

  final QuickProofCard card;
  final AppLocalizations l10n;
  final ThemeData theme;
  final bool submitted;
  final void Function(String) onFeedback;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: MuhSpace.lg),
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.surface,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            card.title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          if (card.periodLabel.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.xs),
            Text(
              card.periodLabel,
              style: theme.textTheme.labelMedium?.copyWith(
                color: MuhColors.creamMuted,
              ),
            ),
          ],
          const SizedBox(height: MuhSpace.md),
          ...card.sentences.map(
            (s) => Padding(
              padding: const EdgeInsets.only(bottom: MuhSpace.sm),
              child: Text(
                s,
                style: theme.textTheme.bodyMedium?.copyWith(height: 1.5),
              ),
            ),
          ),
          const SizedBox(height: MuhSpace.md),
          if (submitted)
            Text(
              l10n.validationRecorded,
              style: theme.textTheme.bodySmall?.copyWith(color: MuhColors.gold),
            )
          else
            Wrap(
              spacing: MuhSpace.sm,
              runSpacing: MuhSpace.sm,
              children: [
                _pill(l10n.validationExactlyThis, () => onFeedback('exactly_this')),
                _pill(l10n.validationPartlyTrue, () => onFeedback('partly_true')),
                _pill(l10n.validationWrongTiming, () => onFeedback('wrong_timing')),
                _pill(l10n.validationDidntHappen, () => onFeedback('didnt_happen')),
              ],
            ),
        ],
      ),
    );
  }

  Widget _pill(String label, VoidCallback onTap) {
    return ActionChip(
      label: Text(label),
      onPressed: onTap,
      backgroundColor: MuhColors.surfaceGold,
      side: const BorderSide(color: MuhColors.line),
    );
  }
}
