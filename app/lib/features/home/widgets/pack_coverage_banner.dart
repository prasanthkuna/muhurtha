import 'package:flutter/material.dart';

import '../../../core/data/birth_pack_coverage.dart';
import '../../../core/data/muhurtha_engine_api.dart';
import '../../../design_system/design_system.dart';

class PackCoverageBanner extends StatelessWidget {
  const PackCoverageBanner({super.key, required this.pack});

  final BirthPackPayload pack;

  @override
  Widget build(BuildContext context) {
    if (pack.fullPackComplete) return const SizedBox.shrink();
    final warnings = pack.qualityWarnings;
    if (warnings.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(MuhSpace.md),
      decoration: BoxDecoration(
        color: MuhColors.warningWash,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.warningInk.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Calendar still filling in',
            style: theme.textTheme.labelLarge?.copyWith(
              color: MuhColors.warningInk,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: MuhSpace.xs),
          ...warnings.take(3).map(
                (w) => Padding(
                  padding: const EdgeInsets.only(bottom: MuhSpace.xs),
                  child: Text(
                    w,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: MuhColors.inkSecondary,
                      height: 1.4,
                    ),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}
