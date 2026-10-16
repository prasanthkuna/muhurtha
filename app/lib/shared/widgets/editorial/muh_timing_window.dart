import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';
import 'muh_why_drawer.dart';

enum MuhTimingStatus { good, caution, neutral, unassessed }

class MuhTimingWindow extends StatelessWidget {
  const MuhTimingWindow({
    super.key,
    required this.purposeLabel,
    required this.timeLabel,
    required this.status,
    this.summary,
    this.whyPlain,
    this.whyTraditional,
    this.whyRaw,
  });

  final String purposeLabel;
  final String timeLabel;
  final MuhTimingStatus status;
  final String? summary;
  final String? whyPlain;
  final String? whyTraditional;
  final String? whyRaw;

  Color get _accent => switch (status) {
        MuhTimingStatus.good => MuhColors.successInk,
        MuhTimingStatus.caution => MuhColors.warningInk,
        MuhTimingStatus.neutral => MuhColors.inkSecondary,
        MuhTimingStatus.unassessed => MuhColors.line,
      };

  String get _statusLabel => switch (status) {
        MuhTimingStatus.good => 'Favorable',
        MuhTimingStatus.caution => 'Use care',
        MuhTimingStatus.neutral => 'Neutral',
        MuhTimingStatus.unassessed => 'Not assessed',
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.paper,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _accent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: MuhSpace.sm),
              Expanded(
                child: Text(
                  purposeLabel,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: MuhColors.ink,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                _statusLabel,
                style: theme.textTheme.labelMedium?.copyWith(color: _accent),
              ),
            ],
          ),
          const SizedBox(height: MuhSpace.xs),
          Text(
            timeLabel,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: MuhColors.inkSecondary,
            ),
          ),
          if (summary != null && summary!.trim().isNotEmpty) ...[
            const SizedBox(height: MuhSpace.sm),
            Text(summary!, style: theme.textTheme.bodyMedium),
          ],
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => MuhWhyDrawer.show(
                context,
                plain: whyPlain,
                traditional: whyTraditional,
                raw: whyRaw,
              ),
              child: const Text('Why'),
            ),
          ),
        ],
      ),
    );
  }
}
