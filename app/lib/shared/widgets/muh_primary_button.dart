import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';

class MuhPrimaryButton extends StatelessWidget {
  const MuhPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.expanded = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final child = FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: MuhColors.gold,
        foregroundColor: MuhColors.bg,
        disabledBackgroundColor: MuhColors.gold.withValues(alpha: 0.35),
        padding: const EdgeInsets.symmetric(
          horizontal: MuhSpace.xl,
          vertical: MuhSpace.lg,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MuhRadius.button),
        ),
        elevation: 0,
      ),
      onPressed: onPressed,
      child: Text(
        label,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              letterSpacing: 0.2,
            ),
      ),
    );

    if (expanded) {
      return SizedBox(width: double.infinity, child: child);
    }
    return child;
  }
}
