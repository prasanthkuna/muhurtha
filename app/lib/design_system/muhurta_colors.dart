import 'package:flutter/material.dart';

/// Golden Editorial palette — canonical: `Muhurta_Golden_Editorial_Design_System_v1.md` §3.
///
/// Legacy names (`bg`, `cream`, `brand`, …) map to semantic light-mode roles so existing
/// widgets migrate without a single mega-diff. Prefer the explicit `canvas` / `ink` names
/// in new code.
abstract final class MuhColors {
  // —— Primary light reading surface ——
  static const Color canvas = Color(0xFFF8F5EE);
  static const Color paper = Color(0xFFFFFCF6);
  static const Color ink = Color(0xFF242019);
  static const Color inkSecondary = Color(0xFF5E574E);
  static const Color inkTertiary = Color(0xFF6B6256);

  static const Color goldText = Color(0xFF77541F);
  static const Color goldAccent = Color(0xFFA67B35);
  static const Color goldButton = Color(0xFFC59B4F);
  static const Color goldWash = Color(0xFFF3E8D2);
  static const Color line = Color(0xFFE8E0D3);
  static const Color white = Color(0xFFFFFFFF);
  static const Color focusRing = Color(0xFF77541F);

  // —— Quiet feedback (not predictive “accuracy”) ——
  static const Color successInk = Color(0xFF285D46);
  static const Color successWash = Color(0xFFE4F0E7);
  static const Color warningInk = Color(0xFF88551B);
  static const Color warningWash = Color(0xFFFCEDD8);
  static const Color errorInk = Color(0xFF933E39);
  static const Color errorWash = Color(0xFFF9E9E6);

  // —— Share / night edition only ——
  static const Color shareCanvas = Color(0xFF201B16);
  static const Color shareSurface = Color(0xFF2C251D);
  static const Color shareTitle = Color(0xFFF7F0E3);
  static const Color shareBody = Color(0xFFD2C6B5);
  static const Color shareGold = Color(0xFFC59B4F);
  static const Color shareLine = Color(0xFF675742);

  static const Color overlay = Color(0x66000000);

  // —— Legacy aliases (light editorial) ——
  static const Color bg = canvas;
  static const Color bgElevated = paper;
  static const Color surface = paper;
  static const Color surfaceSoft = goldWash;
  static const Color surfaceGold = goldWash;

  static const Color brand = goldText;
  static const Color brandSoft = goldAccent;

  static const Color cta = goldButton;
  static const Color onCta = ink;

  static const Color cream = ink;
  static const Color creamMuted = inkSecondary;
  static const Color muted = inkTertiary;

  static const Color gold = goldAccent;
  static const Color goldDeep = goldText;
  static const Color goldSoft = goldAccent;

  static const Color emerald = successInk;
  static const Color emeraldBg = successWash;
  static const Color amber = warningInk;
  static const Color amberBg = warningWash;
  static const Color maroon = errorInk;
  static const Color maroonBg = errorWash;

  static const Color lineBright = line;
}
