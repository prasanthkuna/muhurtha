import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';
import 'muh_quiet_button.dart';

enum MuhInlineStatusKind { offline, stale, loading, empty, error }

class MuhInlineStatus extends StatelessWidget {
  const MuhInlineStatus({
    super.key,
    required this.message,
    this.kind = MuhInlineStatusKind.empty,
    this.onRetry,
    this.retryLabel = 'Try again',
  });

  final String message;
  final MuhInlineStatusKind kind;
  final VoidCallback? onRetry;
  final String retryLabel;

  IconData get _icon => switch (kind) {
        MuhInlineStatusKind.offline => Icons.cloud_off_outlined,
        MuhInlineStatusKind.stale => Icons.history_rounded,
        MuhInlineStatusKind.loading => Icons.hourglass_empty_rounded,
        MuhInlineStatusKind.error => Icons.error_outline_rounded,
        MuhInlineStatusKind.empty => Icons.menu_book_outlined,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: MuhSpace.xl),
      child: Column(
        children: [
          Icon(_icon, size: 40, color: MuhColors.inkTertiary),
          const SizedBox(height: MuhSpace.md),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: MuhColors.inkSecondary,
              height: 1.45,
            ),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: MuhSpace.md),
            MuhQuietButton(label: retryLabel, onPressed: onRetry),
          ],
        ],
      ),
    );
  }
}
