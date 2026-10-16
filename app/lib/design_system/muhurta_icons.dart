import 'package:flutter/material.dart';

/// Tab and affordance icons — editorial stroke style, ink / goldText when selected.
abstract final class MuhTabIcons {
  static const IconData today = Icons.wb_sunny_outlined;
  static const IconData todaySelected = Icons.wb_sunny_rounded;
  static const IconData lifeMap = Icons.landscape_outlined;
  static const IconData lifeMapSelected = Icons.landscape_rounded;
  static const IconData decode = Icons.auto_stories_outlined;
  static const IconData decodeSelected = Icons.auto_stories_rounded;
  static const IconData timing = Icons.schedule_outlined;
  static const IconData timingSelected = Icons.schedule_rounded;
  static const IconData ask = Icons.edit_note_outlined;
  static const IconData askSelected = Icons.edit_note_rounded;
}

abstract final class MuhIcons {
  static const double tab = 22;
  static const double inline = 20;
  static const double minTap = 48;

  static const double whatsAppShare = 18;
  static const double whatsAppSharePadding = 4;
}
