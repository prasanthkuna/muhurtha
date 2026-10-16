import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';
import '../muh_primary_button.dart';
import 'muh_quiet_button.dart';

/// Story/share composer preview — Ivory or Night Gold variants (§9).
class MuhSharePreview extends StatelessWidget {
  const MuhSharePreview({
    super.key,
    required this.title,
    required this.body,
    this.night = false,
    this.redacted = true,
    this.onToggleRedaction,
    this.onShare,
    this.onCancel,
  });

  final String title;
  final String body;
  final bool night;
  final bool redacted;
  final VoidCallback? onToggleRedaction;
  final VoidCallback? onShare;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bg = night ? MuhColors.shareCanvas : MuhColors.paper;
    final fg = night ? MuhColors.paper : MuhColors.ink;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(MuhSpace.page),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Share preview',
              style: theme.textTheme.titleLarge?.copyWith(
                color: MuhColors.ink,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: MuhSpace.md),
            AspectRatio(
              aspectRatio: 9 / 16,
              child: Container(
                padding: const EdgeInsets.all(MuhSpace.lg),
                decoration: BoxDecoration(
                  color: bg,
                  borderRadius: BorderRadius.circular(MuhRadius.card),
                  border: Border.all(
                    color: night ? MuhColors.goldSoft : MuhColors.line,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: fg,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    Expanded(
                      child: SingleChildScrollView(
                        child: Text(
                          body,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: fg.withValues(alpha: 0.92),
                            height: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (onToggleRedaction != null) ...[
              const SizedBox(height: MuhSpace.sm),
              MuhQuietButton(
                label: redacted ? 'Edit what is shared' : 'Use safe redaction',
                onPressed: onToggleRedaction,
              ),
            ],
            const SizedBox(height: MuhSpace.md),
            Row(
              children: [
                if (onCancel != null)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onCancel,
                      child: const Text('Cancel'),
                    ),
                  ),
                if (onCancel != null) const SizedBox(width: MuhSpace.sm),
                Expanded(
                  child: MuhPrimaryButton(
                    label: 'Share',
                    onPressed: onShare,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
