import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
    final enabled = onPressed != null;
    final child = FilledButton(
      style: FilledButton.styleFrom(
        backgroundColor: enabled ? MuhColors.cta : MuhColors.surfaceSoft,
        foregroundColor: enabled ? MuhColors.onCta : MuhColors.creamMuted,
        disabledBackgroundColor: MuhColors.surfaceSoft,
        disabledForegroundColor: MuhColors.creamMuted,
        padding: const EdgeInsets.symmetric(
          horizontal: MuhSpace.xl,
          vertical: MuhSpace.lg,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MuhRadius.button),
        ),
        elevation: 0,
      ),
      onPressed: enabled
          ? () {
              HapticFeedback.lightImpact();
              onPressed!();
            }
          : null,
      child: Text(
        label,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              letterSpacing: 0.2,
              color: enabled ? MuhColors.onCta : MuhColors.creamMuted,
            ),
      ),
    );

    if (expanded) {
      return SizedBox(width: double.infinity, child: child);
    }
    return child;
  }
}
