import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/data/muhurtha_engine_api.dart';
import '../../design_system/design_system.dart';
import 'whatsapp_share_button.dart';

class LuckyStrip extends StatelessWidget {
  const LuckyStrip({
    super.key,
    required this.luck,
    this.compact = false,
    this.onShare,
  });

  final NatalLuckInfo luck;
  final bool compact;
  final VoidCallback? onShare;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    if (luck.luckyNumbers.isEmpty &&
        luck.luckyDays.isEmpty &&
        luck.luckyColours.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: EdgeInsets.all(compact ? MuhSpace.md : MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.surface,
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
                  l10n.luckyTitle,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: MuhColors.goldSoft,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (onShare != null) WhatsAppShareButton(onTap: onShare!),
            ],
          ),
          if (!compact && luck.moonSignLabel.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.xs),
            Text(
              luck.moonSignLabel,
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.creamMuted,
              ),
            ),
          ],
          const SizedBox(height: MuhSpace.md),
          if (luck.luckyNumbers.isNotEmpty)
            _Row(
              label: l10n.luckyNumbers,
              child: Wrap(
                spacing: MuhSpace.sm,
                runSpacing: MuhSpace.sm,
                children: luck.luckyNumbers
                    .map(
                      (n) => _Chip(
                        label: n,
                        background: MuhColors.gold.withValues(alpha: 0.15),
                      ),
                    )
                    .toList(),
              ),
            ),
          if (luck.luckyDays.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.sm),
            _Row(
              label: l10n.luckyDays,
              child: Wrap(
                spacing: MuhSpace.sm,
                runSpacing: MuhSpace.sm,
                children: luck.luckyDays
                    .map((d) => _Chip(label: d))
                    .toList(),
              ),
            ),
          ],
          if (luck.luckyColours.isNotEmpty) ...[
            const SizedBox(height: MuhSpace.sm),
            _Row(
              label: l10n.luckyColours,
              child: Wrap(
                spacing: MuhSpace.sm,
                runSpacing: MuhSpace.sm,
                children: luck.luckyColours
                    .map(
                      (c) => Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: _parseHex(c.hex),
                              shape: BoxShape.circle,
                              border: Border.all(color: MuhColors.line),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            c.label,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: MuhColors.cream,
                            ),
                          ),
                        ],
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _parseHex(String hex) {
    final cleaned = hex.replaceFirst('#', '');
    if (cleaned.length == 6) {
      final value = int.tryParse('FF$cleaned', radix: 16);
      if (value != null) return Color(value);
    }
    return MuhColors.gold;
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: MuhColors.creamMuted,
          ),
        ),
        const SizedBox(height: MuhSpace.xs),
        child,
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, this.background});

  final String label;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background ?? MuhColors.surfaceSoft,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: MuhColors.line),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: MuhColors.cream,
            ),
      ),
    );
  }
}
