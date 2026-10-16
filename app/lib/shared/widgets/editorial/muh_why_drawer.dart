import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

enum MuhWhyAvailability { full, partial, unavailable }

class MuhWhyDrawer extends StatelessWidget {
  const MuhWhyDrawer({
    super.key,
    this.plain,
    this.traditional,
    this.raw,
  });

  final String? plain;
  final String? traditional;
  final String? raw;

  MuhWhyAvailability get availability {
    final p = plain?.trim().isNotEmpty ?? false;
    final t = traditional?.trim().isNotEmpty ?? false;
    final r = raw?.trim().isNotEmpty ?? false;
    if (p && t && r) return MuhWhyAvailability.full;
    if (p || t || r) return MuhWhyAvailability.partial;
    return MuhWhyAvailability.unavailable;
  }

  static Future<void> show(
    BuildContext context, {
    String? plain,
    String? traditional,
    String? raw,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: MuhColors.paper,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(MuhRadius.sheet)),
      ),
      builder: (ctx) => MuhWhyDrawer(
        plain: plain,
        traditional: traditional,
        raw: raw,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final avail = availability;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          MuhSpace.page,
          MuhSpace.lg,
          MuhSpace.page,
          MuhSpace.page + MediaQuery.paddingOf(context).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Why this reading',
              style: theme.textTheme.titleLarge?.copyWith(
                color: MuhColors.ink,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: MuhSpace.lg),
            if (avail == MuhWhyAvailability.unavailable)
              Text(
                'Traditional factors are not available for this section yet.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.inkSecondary,
                ),
              )
            else ...[
              if (plain != null && plain!.trim().isNotEmpty) ...[
                Text('In plain words', style: theme.textTheme.labelLarge),
                const SizedBox(height: MuhSpace.xs),
                Text(plain!, style: theme.textTheme.bodyMedium),
                const SizedBox(height: MuhSpace.md),
              ],
              if (traditional != null && traditional!.trim().isNotEmpty) ...[
                Text('Traditional factors', style: theme.textTheme.labelLarge),
                const SizedBox(height: MuhSpace.xs),
                Text(traditional!, style: theme.textTheme.bodyMedium),
                const SizedBox(height: MuhSpace.md),
              ],
              if (raw != null && raw!.trim().isNotEmpty) ...[
                Text('Calculation trace', style: theme.textTheme.labelLarge),
                const SizedBox(height: MuhSpace.xs),
                Text(
                  raw!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: MuhColors.inkTertiary,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
