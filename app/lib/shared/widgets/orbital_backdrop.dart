import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';

/// Subtle sacred-geometry accent — warm lamp glow, not neon space UI.
class OrbitalBackdrop extends StatelessWidget {
  const OrbitalBackdrop({
    super.key,
    required this.child,
    this.intensity = 1,
  });

  final Widget child;
  final double intensity;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                MuhColors.bg,
                MuhColors.bgElevated,
                Color(0xFF0A0805),
              ],
            ),
          ),
        ),
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
      ..color = MuhColors.gold.withValues(alpha: 0.07 * intensity)
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
          MuhColors.gold.withValues(alpha: 0.14 * intensity),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: 200));
    canvas.drawCircle(center, 200, glow);
  }

  @override
  bool shouldRepaint(covariant _OrbitalPainter oldDelegate) =>
      oldDelegate.intensity != intensity;
}
