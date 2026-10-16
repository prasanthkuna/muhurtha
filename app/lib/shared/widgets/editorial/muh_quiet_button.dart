import 'package:flutter/material.dart';

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
      onPressed: enabled ? onPressed : null,
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
