import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';

/// Premium indeterminate loader (Rive-ready slot — swap body when .riv exists).
class MuhProgressLoader extends StatefulWidget {
  const MuhProgressLoader({
    super.key,
    this.size = 88,
    this.strokeWidth = 2.4,
  });

  final double size;
  final double strokeWidth;

  @override
  State<MuhProgressLoader> createState() => _MuhProgressLoaderState();
}

class _MuhProgressLoaderState extends State<MuhProgressLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          return CustomPaint(
            painter: _ArcLoaderPainter(
              progress: _c.value,
              strokeWidth: widget.strokeWidth,
            ),
          );
        },
      ),
    );
  }
}

class _ArcLoaderPainter extends CustomPainter {
  _ArcLoaderPainter({
    required this.progress,
    required this.strokeWidth,
  });

  final double progress;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2 - strokeWidth;
    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = MuhColors.line;
    canvas.drawCircle(center, radius, track);

    final start = progress * math.pi * 2;
    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..color = MuhColors.brand;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      start,
      math.pi * 0.72,
      false,
      arc,
    );

    final inner = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth * 0.85
      ..strokeCap = StrokeCap.round
      ..color = MuhColors.creamMuted.withValues(alpha: 0.45);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius * 0.62),
      -start * 1.4,
      math.pi * 0.38,
      false,
      inner,
    );
  }

  @override
  bool shouldRepaint(covariant _ArcLoaderPainter oldDelegate) =>
      oldDelegate.progress != progress;
}
