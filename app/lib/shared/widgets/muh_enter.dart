import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../design_system/muhurta_motion.dart';

List<Widget> muhStaggerChildren(
  List<Widget> children, {
  int startIndex = 0,
  int? maxIndex,
}) {
  return [
    for (var i = 0; i < children.length; i++)
      children[i].muhEnter(
        maxIndex != null
            ? (startIndex + i).clamp(0, maxIndex)
            : startIndex + i,
      ),
  ];
}

/// Staggered fade + slide for list / screen sections.
Widget muhStaggerEnter(
  Widget child,
  int index, {
  Duration? duration,
  double slideY = MuhMotion.enterSlideY,
  bool? reduceMotion,
}) {
  final d = duration ?? MuhMotion.medium;
  final disable = reduceMotion ??
      WidgetsBinding.instance.platformDispatcher.accessibilityFeatures
          .disableAnimations;
  if (disable) return child;
  return Animate(
    delay: MuhMotion.staggerStep * index,
    child: child,
  )
      .fadeIn(duration: d, curve: MuhMotion.enterCurve)
      .slideY(begin: slideY, duration: d, curve: MuhMotion.enterCurve);
}

extension MuhEnterAnimation on Widget {
  Widget muhEnter(
    int index, {
    Duration? duration,
    double slideY = MuhMotion.enterSlideY,
  }) =>
      muhStaggerEnter(this, index, duration: duration, slideY: slideY);
}

/// Primary tap target with light haptic + press scale.
class MuhPressable extends StatefulWidget {
  const MuhPressable({
    super.key,
    required this.child,
    required this.onTap,
    this.enabled = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final bool enabled;

  @override
  State<MuhPressable> createState() => _MuhPressableState();
}

class _MuhPressableState extends State<MuhPressable> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final scale = _pressed && widget.enabled ? MuhMotion.pressScale : 1.0;
    return GestureDetector(
      onTapDown: widget.enabled ? (_) => setState(() => _pressed = true) : null,
      onTapUp: widget.enabled
          ? (_) {
              setState(() => _pressed = false);
              HapticFeedback.lightImpact();
              widget.onTap?.call();
            }
          : null,
      onTapCancel: widget.enabled ? () => setState(() => _pressed = false) : null,
      child: AnimatedScale(
        scale: scale,
        duration: MuhMotion.fast,
        curve: MuhMotion.enterCurve,
        child: widget.child,
      ),
    );
  }
}
