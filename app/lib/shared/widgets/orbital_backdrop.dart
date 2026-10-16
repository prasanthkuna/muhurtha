import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';

/// Flat editorial canvas. Optional geometry is off by default (Retention §6).
class OrbitalBackdrop extends StatelessWidget {
  const OrbitalBackdrop({
    super.key,
    required this.child,
    this.intensity = 0,
    this.showGeometry = false,
  });

  final Widget child;
  final double intensity;
  final bool showGeometry;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: MuhColors.canvas,
      child: child,
    );
  }
}
