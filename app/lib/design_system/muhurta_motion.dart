import 'package:flutter/animation.dart';

/// Shared motion tokens — Framer-like enter/stagger, minimal decoration.
abstract final class MuhMotion {
  static const Duration fast = Duration(milliseconds: 180);
  static const Duration medium = Duration(milliseconds: 320);
  static const Duration slow = Duration(milliseconds: 520);
  static const Duration staggerStep = Duration(milliseconds: 50);

  static const Curve enterCurve = Curves.easeOutCubic;
  static const Curve exitCurve = Curves.easeInCubic;
  static const Curve emphasis = Curves.easeOutQuart;

  static const double enterSlideY = 0.045;
  static const double pressScale = 0.985;
}
