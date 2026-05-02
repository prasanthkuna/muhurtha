import 'package:flutter/material.dart';

import '../../core/data/muhurtha_engine_api.dart';
import '../../design_system/design_system.dart';

/// Share-friendly moon rāśi strip — uses engine labels + symbol; keeps polish without clutter.
class MoonSignStrip extends StatelessWidget {
  const MoonSignStrip({
    super.key,
    required this.moon,
    this.nakshatra,
    required this.caption,
  });

  final MoonSignInfo moon;
  final String? nakshatra;
  final String caption;

  @override
  Widget build(BuildContext context) {
    if (moon.label.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: MuhSpace.md),
      padding: const EdgeInsets.symmetric(
        horizontal: MuhSpace.lg,
        vertical: MuhSpace.md,
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.gold.withValues(alpha: 0.4)),
        boxShadow: [
          BoxShadow(
            color: MuhColors.gold.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            MuhColors.surface.withValues(alpha: 0.92),
            MuhColors.surfaceSoft.withValues(alpha: 0.88),
          ],
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(moon.symbol, style: const TextStyle(fontSize: 34, height: 1)),
          const SizedBox(width: MuhSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  caption,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: MuhColors.muted,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: MuhSpace.xs),
                Text(
                  moon.label,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: MuhColors.gold,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (nakshatra != null && nakshatra!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: MuhSpace.xs),
                    child: Text(
                      nakshatra!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: MuhColors.creamMuted,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
