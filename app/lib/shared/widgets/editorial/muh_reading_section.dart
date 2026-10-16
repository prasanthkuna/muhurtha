import 'package:flutter/material.dart';

import '../../../app/muh_theme.dart';
import '../../../design_system/design_system.dart';

/// Text-led block without heavy card chrome — Golden Editorial §7.
class MuhReadingSection extends StatelessWidget {
  const MuhReadingSection({
    super.key,
    this.eyebrow,
    required this.title,
    this.lead,
    this.body,
    this.trailing,
    this.onTap,
  });

  final String? eyebrow;
  final String title;
  final String? lead;
  final String? body;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (eyebrow != null && eyebrow!.isNotEmpty) ...[
          Text(eyebrow!.toUpperCase(), style: MuhTheme.eyebrow(context)),
          const SizedBox(height: MuhSpace.sm),
        ],
        Text(
          title,
          style: theme.textTheme.headlineMedium,
        ),
        if (lead != null && lead!.isNotEmpty) ...[
          const SizedBox(height: MuhSpace.md),
          Text(lead!, style: theme.textTheme.bodyLarge),
        ],
        if (body != null && body!.isNotEmpty) ...[
          const SizedBox(height: MuhSpace.sm),
          Text(body!, style: theme.textTheme.bodyMedium),
        ],
        if (trailing != null) ...[
          const SizedBox(height: MuhSpace.md),
          trailing!,
        ],
      ],
    );

    if (onTap == null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: MuhSpace.md),
        child: content,
      );
    }
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(MuhRadius.readingSheet),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: MuhSpace.md),
          child: content,
        ),
      ),
    );
  }
}
