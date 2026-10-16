import 'package:flutter/material.dart';

/// Pro product palette (RazorSense-inspired graphite + brand azure).
/// Canonical reference: `MUHURTA_DESIGN.md` §5.
abstract final class MuhColors {
  static const Color bg = Color(0xFF0B0C0E);
  static const Color bgElevated = Color(0xFF141619);
  static const Color surface = Color(0xFF141619);
  static const Color surfaceSoft = Color(0xFF1C1F24);
  static const Color surfaceGold = Color(0xFF22262D);

  static const Color brand = Color(0xFF528FF0);
  static const Color brandSoft = Color(0xFF3D6FB8);

  static const Color cta = Color(0xFFFFFFFF);
  static const Color onCta = Color(0xFF0B0C0E);

  static const Color cream = Color(0xFFF4F6F8);
  static const Color creamMuted = Color(0xFF9AA3AD);
  static const Color muted = Color(0xFF5C6570);

  /// Heritage accent — Pro badge, nakshatra dot; not default borders.
  static const Color gold = Color(0xFFC9A227);
  static const Color goldDeep = Color(0xFF9A7B1A);
  static const Color goldSoft = Color(0xFFE6C04A);

  static const Color emerald = Color(0xFF27A644);
  static const Color emeraldBg = Color(0xFF142318);

  static const Color amber = Color(0xFFF4A118);
  static const Color amberBg = Color(0xFF241A0A);

  static const Color maroon = Color(0xFFE5484D);
  static const Color maroonBg = Color(0xFF2A1214);

  static const Color line = Color(0xFF2A2E36);
  static const Color lineBright = Color(0xFF3A404A);
  static const Color overlay = Color(0x99000000);
}
