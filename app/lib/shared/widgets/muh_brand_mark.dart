import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';

/// Editorial brand lockup — moon mark + optional wordmark (matches welcome / boot).
class MuhBrandMark extends StatelessWidget {
  const MuhBrandMark({
    super.key,
    this.title,
    this.subtitle,
    this.markSize = 56,
    this.compact = false,
  });

  final String? title;
  final String? subtitle;
  final double markSize;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gap = compact ? MuhSpace.sm : MuhSpace.lg;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CustomPaint(
          size: Size.square(markSize),
          painter: const _CrescentMarkPainter(),
        ),
        if (title != null && title!.isNotEmpty) ...[
          SizedBox(height: gap),
          Text(
            title!,
            textAlign: TextAlign.center,
            style: theme.textTheme.displayMedium?.copyWith(
              color: MuhColors.ink,
              height: 1.05,
            ),
          ),
        ],
        if (subtitle != null && subtitle!.isNotEmpty) ...[
          const SizedBox(height: MuhSpace.sm),
          Text(
            subtitle!,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: MuhColors.inkSecondary,
              letterSpacing: 0.4,
            ),
          ),
        ],
      ],
    );
  }
}

class _CrescentMarkPainter extends CustomPainter {
  const _CrescentMarkPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.shortestSide * 0.045;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = MuhColors.goldAccent;

    final center = size.center(Offset.zero);
    final radius = size.shortestSide * 0.36;
    final rect = Rect.fromCircle(center: center, radius: radius);

    canvas.drawArc(rect, math.pi * 0.22, math.pi * 1.12, false, paint);

    final inner = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke * 0.85
      ..strokeCap = StrokeCap.round
      ..color = MuhColors.goldAccent.withValues(alpha: 0.35);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius * 0.72),
      -math.pi * 0.35,
      math.pi * 0.55,
      false,
      inner,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
