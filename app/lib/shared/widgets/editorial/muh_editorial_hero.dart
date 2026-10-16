import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

/// Big serif title + one supporting line + optional action (Golden Editorial §7).
class MuhEditorialHero extends StatelessWidget {
  const MuhEditorialHero({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? subtitle;
  final Widget? action;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.headlineSmall?.copyWith(
            color: MuhColors.ink,
            fontWeight: FontWeight.w700,
            height: 1.08,
            letterSpacing: -0.35,
          ),
        ),
        if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
          const SizedBox(height: MuhSpace.sm),
          Text(
            subtitle!,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: MuhColors.inkSecondary,
              height: 1.45,
            ),
          ),
        ],
        if (action != null) ...[
          const SizedBox(height: MuhSpace.md),
          action!,
        ] else if (actionLabel != null && onAction != null) ...[
          const SizedBox(height: MuhSpace.md),
          TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ],
    );
  }
}
