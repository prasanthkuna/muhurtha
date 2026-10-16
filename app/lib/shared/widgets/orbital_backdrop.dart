import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';

/// Optional backdrop gradient. Geometry off by default (pro / flat UI).
class OrbitalBackdrop extends StatelessWidget {
  const OrbitalBackdrop({
    super.key,
    required this.child,
    this.intensity = 0,
    this.showGeometry = false,
  });

  final Widget child;

  /// Legacy knob; geometry uses this when [showGeometry] is true.
  final double intensity;
  final bool showGeometry;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                MuhColors.bg,
                MuhColors.bgElevated,
              ],
            ),
          ),
        ),
        if (showGeometry && intensity > 0)
          CustomPaint(
            painter: _OrbitalPainter(intensity: intensity),
          ),
        child,
      ],
    );
  }
}

class _OrbitalPainter extends CustomPainter {
  _OrbitalPainter({required this.intensity});

  final double intensity;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.5, size.height * 0.22);
    final paint = Paint()
      ..color = MuhColors.brand.withValues(alpha: 0.06 * intensity)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    for (var i = 0; i < 3; i++) {
      final r = 90.0 + i * 55;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: r),
        -math.pi * 0.15,
        math.pi * 1.35,
        false,
        paint,
      );
    }

    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          MuhColors.brand.withValues(alpha: 0.08 * intensity),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: 200));
    canvas.drawCircle(center, 200, glow);
  }

  @override
  bool shouldRepaint(covariant _OrbitalPainter oldDelegate) =>
      oldDelegate.intensity != intensity;
}
