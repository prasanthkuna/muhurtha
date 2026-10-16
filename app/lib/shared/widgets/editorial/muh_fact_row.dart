import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';
import 'muh_why_drawer.dart';

class MuhFactRow extends StatelessWidget {
  const MuhFactRow({
    super.key,
    required this.label,
    required this.value,
    this.qualifier,
    this.whyPlain,
    this.whyTraditional,
    this.whyRaw,
  });

  final String label;
  final String value;
  final String? qualifier;
  final String? whyPlain;
  final String? whyTraditional;
  final String? whyRaw;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasWhy = (whyPlain?.trim().isNotEmpty ?? false) ||
        (whyTraditional?.trim().isNotEmpty ?? false) ||
        (whyRaw?.trim().isNotEmpty ?? false);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: MuhSpace.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: MuhColors.inkTertiary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: MuhColors.ink,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (qualifier != null && qualifier!.trim().isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      qualifier!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: MuhColors.inkSecondary,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (hasWhy)
            IconButton(
              tooltip: 'Why',
              icon: const Icon(Icons.info_outline_rounded, size: 20),
              color: MuhColors.goldDeep,
              onPressed: () => MuhWhyDrawer.show(
                context,
                plain: whyPlain,
                traditional: whyTraditional,
                raw: whyRaw,
              ),
            ),
        ],
      ),
    );
  }
}
