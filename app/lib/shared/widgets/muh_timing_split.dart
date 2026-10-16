import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/format/clock_format.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../app/muh_theme.dart';
import '../../design_system/design_system.dart';

/// Good vs caution windows — one glance timing split (design §8).
class MuhTimingSplit extends StatelessWidget {
  const MuhTimingSplit({
    super.key,
    required this.goodWindows,
    required this.cautionWindows,
    required this.goodTitle,
    required this.cautionTitle,
    this.animate = true,
  });

  final List<TimingWindow> goodWindows;
  final List<TimingWindow> cautionWindows;
  final String goodTitle;
  final String cautionTitle;
  final bool animate;

  String _range(TimingWindow w) {
    return '${clock12h(clockHm(w.start))}–${clock12h(clockHm(w.end))}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;

    Widget column({
      required String title,
      required List<TimingWindow> windows,
      required Color accent,
      required int columnIndex,
    }) {
      final col = Expanded(
        child: Container(
          padding: const EdgeInsets.all(MuhSpace.md),
          decoration: BoxDecoration(
            color: MuhColors.surface,
            borderRadius: BorderRadius.circular(MuhRadius.card),
            border: Border.all(color: MuhColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: accent,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: MuhSpace.sm),
              if (windows.isEmpty)
                Text(
                  l10n.timelineNoWindows,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: MuhColors.muted,
                  ),
                )
              else
                ...windows.take(2).toList().asMap().entries.map(
                      (entry) => Padding(
                        padding: const EdgeInsets.only(bottom: MuhSpace.xs),
                        child: Text(
                          _range(entry.value),
                          style: MuhTheme.timeWindowNumeral().copyWith(
                            fontSize: MuhType.bodyM,
                            color: MuhColors.cream,
                          ),
                        )
                            .animate(
                              autoPlay: animate,
                            )
                            .fadeIn(
                              duration: MuhMotion.medium,
                              curve: MuhMotion.enterCurve,
                              delay: MuhMotion.staggerStep *
                                  (columnIndex * 2 + entry.key + 1),
                            )
                            .slideX(
                              begin: columnIndex == 0 ? -0.04 : 0.04,
                              duration: MuhMotion.medium,
                              curve: MuhMotion.enterCurve,
                              delay: MuhMotion.staggerStep *
                                  (columnIndex * 2 + entry.key + 1),
                            ),
                      ),
                    ),
            ],
          ),
        ),
      );
      if (!animate) return col;
      return col
          .animate()
          .fadeIn(
            duration: MuhMotion.medium,
            curve: MuhMotion.enterCurve,
            delay: MuhMotion.staggerStep * (columnIndex + 1),
          )
          .slideY(
            begin: MuhMotion.enterSlideY,
            duration: MuhMotion.slow,
            curve: MuhMotion.emphasis,
            delay: MuhMotion.staggerStep * (columnIndex + 1),
          );
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          column(
            title: goodTitle,
            windows: goodWindows,
            accent: MuhColors.emerald,
            columnIndex: 0,
          ),
          const SizedBox(width: MuhSpace.sm),
          column(
            title: cautionTitle,
            windows: cautionWindows,
            accent: MuhColors.amber,
            columnIndex: 1,
          ),
        ],
      ),
    );
  }
}
