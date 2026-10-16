import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/data/muhurtha_engine_api.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/muhurtha_loading_view.dart';
import '../../shared/widgets/orbital_backdrop.dart';

class QuickProofScreen extends ConsumerStatefulWidget {
  const QuickProofScreen({super.key});

  @override
  ConsumerState<QuickProofScreen> createState() => _QuickProofScreenState();
}

class _QuickProofScreenState extends ConsumerState<QuickProofScreen> {
  QuickProofResult? _result;
  Object? _error;
  var _loading = true;
  final _feedbackSent = <String>{};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final api = ref.read(muhurthaEngineApiProvider);
    if (api == null) {
      setState(() {
        _loading = false;
        _result = const QuickProofResult(cards: [], engineMode: '');
      });
      return;
    }
    try {
      final r = await api
          .quickProofGenerate()
          .timeout(const Duration(seconds: 60));
      if (mounted) {
        setState(() {
          _result = r;
          _loading = false;
        });
      }
    } on TimeoutException {
      if (mounted) {
        setState(() {
          _result = const QuickProofResult(cards: [], engineMode: '');
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e;
          _loading = false;
        });
      }
    }
  }

  Future<void> _submitFeedback(QuickProofCard card, String value) async {
    final api = ref.read(muhurthaEngineApiProvider);
    if (api == null) return;
    try {
      await api.validationSubmit(
        phaseSegmentId: card.phaseSegmentId,
        feedbackValue: value,
      );
      if (!mounted) return;
      setState(() => _feedbackSent.add(card.phaseSegmentId));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.validationRecorded)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.errorGeneric)),
      );
    }
  }

  String _validationLabel(AppLocalizations l, String key) {
    return switch (key) {
      'exactly_this' => l.validationExactlyThis,
      'partly_true' => l.validationPartlyTrue,
      'wrong_timing' => l.validationWrongTiming,
      'didnt_happen' => l.validationDidntHappen,
      _ => key,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    if (_loading) {
      return const OrbitalBackdrop(
        intensity: 0.25,
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: MuhurthaLoadingView(mode: MuhurthaLoadingMode.generate),
        ),
      );
    }

    final cards = _result?.cards ?? const <QuickProofCard>[];

    return OrbitalBackdrop(
      intensity: 0.25,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: Text(l10n.quickProofTitle)),
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(MuhSpace.page),
                  children: [
                    Text(
                      l10n.quickProofSubtitle,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: MuhColors.creamMuted,
                        height: 1.45,
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: MuhSpace.md),
                      Text(
                        l10n.errorGeneric,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: MuhColors.maroon,
                        ),
                      ),
                    ],
                    if (cards.isEmpty) ...[
                      const SizedBox(height: MuhSpace.xl),
                      Text(
                        l10n.quickProofNoCards,
                        style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
                      ),
                    ],
                    ...cards.asMap().entries.map((entry) {
                      final i = entry.key;
                      final card = entry.value;
                      return _ProofCard(
                        card: card,
                        feedbackDone: _feedbackSent.contains(card.phaseSegmentId),
                        validationLabel: _validationLabel,
                        onFeedback: (v) => _submitFeedback(card, v),
                      )
                          .animate()
                          .fadeIn(
                            duration: 320.ms,
                            delay: (80 * i).ms,
                            curve: Curves.easeOutCubic,
                          )
                          .slideY(
                            begin: 0.06,
                            end: 0,
                            duration: 320.ms,
                            delay: (80 * i).ms,
                            curve: Curves.easeOutCubic,
                          );
                    }),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(MuhSpace.page),
                child: MuhPrimaryButton(
                  label: l10n.quickProofGoHome,
                  onPressed: () => context.go('/home?tab=decode'),
                ),
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
    required this.feedbackDone,
    required this.validationLabel,
    required this.onFeedback,
  });

  final QuickProofCard card;
  final bool feedbackDone;
  final String Function(AppLocalizations l, String key) validationLabel;
  final ValueChanged<String> onFeedback;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final support = card.sentences.isNotEmpty ? card.sentences.first : '';
    final options = card.validationOptions.isNotEmpty
        ? card.validationOptions
        : const [
            'exactly_this',
            'partly_true',
            'wrong_timing',
            'didnt_happen',
          ];

    return Container(
      margin: const EdgeInsets.only(top: MuhSpace.lg),
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.surfaceSoft,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.lineBright),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            card.periodLabel,
            style: theme.textTheme.labelMedium?.copyWith(
              color: MuhColors.muted,
              letterSpacing: 0.4,
            ),
          ),
          const SizedBox(height: MuhSpace.sm),
          Text(
            card.title,
            style: theme.textTheme.titleLarge?.copyWith(
              color: MuhColors.cream,
              fontWeight: FontWeight.w700,
              height: 1.25,
            ),
          ),
          if (card.highlight.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.md),
            Text(
              card.highlight,
              style: theme.textTheme.titleMedium?.copyWith(
                color: MuhColors.brand,
                fontWeight: FontWeight.w600,
                height: 1.35,
              ),
            ),
          ],
          if (support.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.sm),
            Text(
              support,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: MuhColors.creamMuted,
                height: 1.45,
              ),
            ),
          ],
          if (card.activeDomains.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.md),
            Wrap(
              spacing: MuhSpace.sm,
              runSpacing: MuhSpace.xs,
              children: card.activeDomains.take(4).map((d) {
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: MuhSpace.sm,
                    vertical: MuhSpace.xs,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(MuhRadius.chip),
                    border: Border.all(color: MuhColors.line),
                  ),
                  child: Text(
                    d,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: MuhColors.creamMuted,
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
          if (card.confidenceLabel.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.sm),
            Text(
              card.confidenceLabel.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(
                color: MuhColors.muted,
                letterSpacing: 0.8,
              ),
            ),
          ],
          if (!feedbackDone) ...[
            const SizedBox(height: MuhSpace.lg),
            Wrap(
              spacing: MuhSpace.sm,
              runSpacing: MuhSpace.sm,
              children: options.map((key) {
                return ActionChip(
                  label: Text(validationLabel(l10n, key)),
                  backgroundColor: MuhColors.surface,
                  side: const BorderSide(color: MuhColors.line),
                  labelStyle: theme.textTheme.labelLarge?.copyWith(
                    color: MuhColors.cream,
                  ),
                  onPressed: () => onFeedback(key),
                );
              }).toList(),
            ),
          ] else ...[
            const SizedBox(height: MuhSpace.md),
            Text(
              l10n.validationThankYou,
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.emerald,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
