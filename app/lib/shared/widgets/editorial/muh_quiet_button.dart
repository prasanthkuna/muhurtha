import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../design_system/design_system.dart';

class MuhQuietButton extends StatelessWidget {
  const MuhQuietButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.enabled = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return TextButton.icon(
      onPressed: enabled
          ? () {
              HapticFeedback.lightImpact();
              onPressed?.call();
            }
          : null,
      style: TextButton.styleFrom(
        minimumSize: const Size(0, MuhIcons.minTap),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        padding: const EdgeInsets.symmetric(
          horizontal: MuhSpace.sm,
          vertical: MuhSpace.sm,
        ),
      ),
      icon: icon != null
          ? Icon(icon, size: 18, color: MuhColors.goldDeep)
          : const SizedBox.shrink(),
      label: Text(
        label,
        style: theme.textTheme.labelLarge?.copyWith(
          color: MuhColors.goldDeep,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
