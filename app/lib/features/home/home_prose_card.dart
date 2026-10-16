import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../design_system/design_system.dart';
import '../../shared/widgets/editorial/muh_chapter_eyebrow.dart';

class HomeProseCard extends StatelessWidget {
  const HomeProseCard({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.body,
    this.footer,
    this.locked = false,
    this.onLockedTap,
  });

  final String eyebrow;
  final String title;
  final String body;
  final Widget? footer;
  final bool locked;
  final VoidCallback? onLockedTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (locked) {
      final l10n = AppLocalizations.of(context)!;
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onLockedTap,
          borderRadius: BorderRadius.circular(MuhRadius.card),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(MuhSpace.lg),
            decoration: BoxDecoration(
              color: MuhColors.paper,
              borderRadius: BorderRadius.circular(MuhRadius.card),
              border: Border.all(color: MuhColors.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MuhChapterEyebrow(eyebrow),
                if (title.trim().isNotEmpty) ...[
                  const SizedBox(height: MuhSpace.sm),
                  Text(
                    title,
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: MuhColors.inkSecondary,
                    ),
                  ),
                ],
                const SizedBox(height: MuhSpace.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.lock_outline_rounded, color: MuhColors.goldDeep),
                    const SizedBox(width: MuhSpace.sm),
                    Flexible(
                      child: Text(
                        l10n.paywallLockedTeaser,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (title.trim().isEmpty && body.trim().isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.paper,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (eyebrow.trim().isNotEmpty) MuhChapterEyebrow(eyebrow),
          if (title.trim().isNotEmpty) ...[
            const SizedBox(height: MuhSpace.sm),
            Text(
              title.trim(),
              style: theme.textTheme.titleLarge?.copyWith(
                color: MuhColors.ink,
                fontWeight: FontWeight.w700,
                height: 1.18,
              ),
            ),
          ],
          if (body.trim().isNotEmpty) ...[
            const SizedBox(height: MuhSpace.md),
            Text(
              body.trim(),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: MuhColors.ink,
                height: 1.52,
              ),
            ),
          ],
          if (footer != null) ...[
            const SizedBox(height: MuhSpace.lg),
            footer!,
          ],
        ],
      ),
    );
  }
}
