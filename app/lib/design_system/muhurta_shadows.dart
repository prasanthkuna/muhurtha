import 'package:flutter/material.dart';

/// Elevation — soft shadows only, [MUHURTA_DESIGN.md](../../../MUHURTA_DESIGN.md).
abstract final class MuhShadows {
  static List<BoxShadow> get cardSoft => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.28),
          blurRadius: 28,
          offset: const Offset(0, 16),
        ),
      ];
}
