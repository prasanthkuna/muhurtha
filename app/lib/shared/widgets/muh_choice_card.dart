import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';

class MuhChoiceCard extends StatelessWidget {
  const MuhChoiceCard({
    super.key,
    required this.title,
    required this.selected,
    required this.onTap,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      margin: const EdgeInsets.only(bottom: MuhSpace.md),
      child: Material(
        color: selected ? MuhColors.surfaceGold : MuhColors.surface,
        borderRadius: BorderRadius.circular(MuhRadius.button),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(MuhRadius.button),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: MuhSpace.lg,
              vertical: MuhSpace.lg,
            ),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(MuhRadius.button),
              border: Border.all(
                color: selected ? MuhColors.gold : MuhColors.line,
                width: selected ? 1.4 : 1,
              ),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: MuhColors.gold.withValues(alpha: 0.18),
                        blurRadius: 22,
                        spreadRadius: -4,
                      ),
                    ]
                  : null,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          color: MuhColors.cream,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: MuhSpace.xs),
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: MuhColors.creamMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                Icon(
                  selected ? Icons.check_circle_rounded : Icons.circle_outlined,
                  color: selected ? MuhColors.gold : MuhColors.muted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
