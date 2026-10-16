import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../../core/data/muhurtha_engine_api.dart';
import '../../../core/format/clock_format.dart';
import '../../../core/format/day_window_label.dart';
import '../../../design_system/design_system.dart';
import '../../../shared/widgets/celestial_components.dart';
import '../../../shared/widgets/editorial/muh_quiet_button.dart';

List<TimeWindowData> _timingWindows(
  List<TimingWindow> windows,
  AppLocalizations l10n,
) {
  return windows
      .take(3)
      .map(
        (w) => TimeWindowData(
          timeText:
              '${clock12h(clockHm(w.start))} - ${clock12h(clockHm(w.end))}',
          tag: localizeWindowLabel(l10n, w.label),
          note: w.whyItWorks,
        ),
      )
      .toList();
}

/// Single expandable good/caution timeline for Today (no duplicate split + rails).
class TodayTimingPanel extends StatefulWidget {
  const TodayTimingPanel({
    super.key,
    required this.payload,
    required this.goodTitle,
    required this.cautionTitle,
    this.goodSummary,
    this.avoidSummary,
    this.betterFor = const [],
    this.beCareful = const [],
  });

  final TodayPayload payload;
  final String goodTitle;
  final String cautionTitle;
  final String? goodSummary;
  final String? avoidSummary;
  final List<String> betterFor;
  final List<String> beCareful;

  @override
  State<TodayTimingPanel> createState() => _TodayTimingPanelState();
}

class _TodayTimingPanelState extends State<TodayTimingPanel> {
  var _expanded = false;

  String? _nextGoodWindow(AppLocalizations l10n) {
    final good = widget.payload.goodWindows;
    if (good.isEmpty) return null;
    final w = good.first;
    return '${widget.goodTitle}: ${clock12h(clockHm(w.start))}–${clock12h(clockHm(w.end))}';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final preview = _nextGoodWindow(l10n);
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (preview != null)
          Text(
            preview,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: MuhColors.ink,
              fontWeight: FontWeight.w600,
            ),
          ),
        const SizedBox(height: MuhSpace.sm),
        MuhQuietButton(
          label: _expanded ? 'Hide full timeline' : 'Show full timeline',
          icon: _expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
          onPressed: () => setState(() => _expanded = !_expanded),
        ),
        if (_expanded) ...[
          const SizedBox(height: MuhSpace.md),
          TimeWindowRail(
            title: widget.goodTitle,
            subtitle: widget.goodSummary?.isNotEmpty == true ? widget.goodSummary : null,
            windows: _timingWindows(widget.payload.goodWindows, l10n),
            tone: WindowTone.good,
          ),
          const SizedBox(height: MuhSpace.sm),
          TimeWindowRail(
            title: widget.cautionTitle,
            subtitle: widget.avoidSummary?.isNotEmpty == true ? widget.avoidSummary : null,
            windows: _timingWindows(widget.payload.cautionWindows, l10n),
            tone: WindowTone.caution,
          ),
          if (widget.betterFor.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.md),
            Text(
              l10n.v3BetterFor,
              style: theme.textTheme.labelLarge?.copyWith(
                color: MuhColors.successInk,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: MuhSpace.xs),
            ...widget.betterFor.take(4).map(
                  (item) => Text(
                    '• $item',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: MuhColors.ink,
                      height: 1.45,
                    ),
                  ),
                ),
          ],
          if (widget.beCareful.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.sm),
            Text(
              l10n.v3CarefulWith,
              style: theme.textTheme.labelLarge?.copyWith(
                color: MuhColors.warningInk,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: MuhSpace.xs),
            ...widget.beCareful.take(4).map(
                  (item) => Text(
                    '• $item',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: MuhColors.ink,
                      height: 1.45,
                    ),
                  ),
                ),
          ],
        ],
      ],
    );
  }
}
