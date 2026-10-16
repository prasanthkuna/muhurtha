import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../design_system/design_system.dart';

/// Purpose / suggestion chip — consistent hit target, haptic, and selection styling.
class MuhPurposeChip extends StatelessWidget {
  const MuhPurposeChip({
    super.key,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bg =
        isSelected ? MuhColors.gold.withValues(alpha: 0.14) : MuhColors.surface;
    final border = isSelected ? MuhColors.gold : MuhColors.line;
    final text = isSelected ? MuhColors.goldDeep : MuhColors.ink;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        borderRadius: BorderRadius.circular(MuhRadius.button),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: MuhIcons.minTap),
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: MuhSpace.md,
              vertical: MuhSpace.sm,
            ),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(MuhRadius.button),
              border: Border.all(color: border),
            ),
            alignment: Alignment.center,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: text,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}
