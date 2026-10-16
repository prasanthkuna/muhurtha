import 'package:flutter/animation.dart';

/// Motion tokens — Golden Editorial §6.1 + Retention plan (calm, no double-enter).
abstract final class MuhMotion {
  static const Duration instant = Duration(milliseconds: 100);
  static const Duration fast = Duration(milliseconds: 170);
  static const Duration standard = Duration(milliseconds: 250);
  static const Duration chapter = Duration(milliseconds: 360);
  static const Duration sheet = Duration(milliseconds: 320);

  static const Duration medium = standard;
  static const Duration slow = chapter;
  static const Duration staggerStep = Duration(milliseconds: 45);
  static const int staggerMaxGroups = 4;

  static const Curve enterCurve = Curves.easeOutCubic;
  static const Curve exitCurve = Curves.easeInCubic;
  static const Curve emphasis = Curves.easeInOutCubic;

  static const double enterSlideY = 0.028;
  static const double pressScale = 0.99;
}
