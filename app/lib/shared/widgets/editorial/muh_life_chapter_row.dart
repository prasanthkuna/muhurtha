import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';
import 'muh_chapter_eyebrow.dart';

enum MuhChapterPhase { past, current, future, unknown }

class MuhLifeChapterRow extends StatelessWidget {
  const MuhLifeChapterRow({
    super.key,
    required this.periodLabel,
    required this.title,
    required this.selected,
    required this.phase,
    required this.onTap,
  });

  final String periodLabel;
  final String title;
  final bool selected;
  final MuhChapterPhase phase;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final markColor = switch (phase) {
      MuhChapterPhase.current => MuhColors.goldDeep,
      MuhChapterPhase.future => MuhColors.inkTertiary,
      MuhChapterPhase.past => MuhColors.inkSecondary,
      MuhChapterPhase.unknown => MuhColors.line,
    };
    return Material(
      color: selected ? MuhColors.goldWash : Colors.transparent,
      borderRadius: BorderRadius.circular(MuhRadius.chip),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(MuhRadius.chip),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: MuhSpace.md,
            vertical: MuhSpace.md,
          ),
          child: Row(
            children: [
              Container(
                width: 3,
                height: 36,
                decoration: BoxDecoration(
                  color: markColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: MuhSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MuhChapterEyebrow(periodLabel),
                    const SizedBox(height: 4),
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: MuhColors.ink,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (selected)
                const Icon(Icons.chevron_right_rounded, color: MuhColors.goldDeep),
            ],
          ),
        ),
      ),
    );
  }
}
