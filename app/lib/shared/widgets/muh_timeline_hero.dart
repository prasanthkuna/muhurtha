import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/data/muhurtha_engine_api.dart';
import '../../core/format/today_date_format.dart';
import '../../design_system/design_system.dart';

enum DayActionBias { act, soft, wait }

DayActionBias dayActionBias(TodayPayload payload) {
  final good = payload.goodWindows.length;
  final caution = payload.cautionWindows.length;
  if (good > 0 && caution == 0) return DayActionBias.act;
  if (caution > good) return DayActionBias.wait;
  if (caution > 0 && good == 0) return DayActionBias.wait;
  return DayActionBias.soft;
}

class MuhTimelineHero extends StatelessWidget {
  const MuhTimelineHero({
    super.key,
    required this.payload,
    required this.headline,
    this.personalizing = false,
  });

  final TodayPayload payload;
  final String headline;
  final bool personalizing;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final bias = dayActionBias(payload);
    final biasLabel = switch (bias) {
      DayActionBias.act => l10n.timelineBiasAct,
      DayActionBias.soft => l10n.timelineBiasSoft,
      DayActionBias.wait => l10n.timelineBiasWait,
    };
    final biasColor = switch (bias) {
      DayActionBias.act => MuhColors.emerald,
      DayActionBias.soft => MuhColors.amber,
      DayActionBias.wait => MuhColors.maroon,
    };

    final dateLine = formatTodayDateLabel(payload.date);
    final location = payload.locationLabel;

    return Container(
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.surfaceSoft,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  l10n.todayHeader,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: MuhColors.muted,
                    letterSpacing: 0.3,
                  ),
                ),
              ),
              if (personalizing)
                Text(
                  l10n.timelinePersonalizing,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: MuhColors.brand,
                  ),
                ),
            ],
          ),
          const SizedBox(height: MuhSpace.sm),
          Text(
            dateLine,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
              height: 1.15,
            ),
          ),
          if (location.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.xs),
            Text(
              location,
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.creamMuted,
              ),
            ),
          ],
          const SizedBox(height: MuhSpace.lg),
          if (headline.isNotEmpty)
            Text(
              headline,
              style: theme.textTheme.headlineSmall?.copyWith(
                color: MuhColors.ink,
                fontWeight: FontWeight.w600,
                height: 1.3,
              ),
            ),
          const SizedBox(height: MuhSpace.md),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: MuhSpace.sm,
              vertical: MuhSpace.xs,
            ),
            decoration: BoxDecoration(
              color: biasColor.withValues(alpha: 0.09),
              borderRadius: BorderRadius.circular(MuhRadius.input),
            ),
            child: Text(
              biasLabel,
              style: theme.textTheme.labelSmall?.copyWith(
                color: biasColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
