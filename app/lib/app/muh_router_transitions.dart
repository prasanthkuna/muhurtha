import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../design_system/muhurta_motion.dart';

/// Shared [GoRouter] page transitions (Framer-like fade + slide).
CustomTransitionPage<void> muhTransitionPage({
  required GoRouterState state,
  required Widget child,
  MuhRouteTransition style = MuhRouteTransition.forward,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: MuhMotion.medium,
    reverseTransitionDuration: MuhMotion.fast,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: MuhMotion.enterCurve,
        reverseCurve: MuhMotion.exitCurve,
      );
      final begin = switch (style) {
        MuhRouteTransition.forward => const Offset(0.045, 0),
        MuhRouteTransition.up => const Offset(0, 0.035),
        MuhRouteTransition.fade => Offset.zero,
      };
      final slide = begin == Offset.zero
          ? child
          : SlideTransition(
              position: Tween<Offset>(begin: begin, end: Offset.zero)
                  .animate(curved),
              child: child,
            );
      return FadeTransition(opacity: curved, child: slide);
    },
  );
}

enum MuhRouteTransition { forward, up, fade }

GoRoute muhGoRoute({
  required String path,
  required Widget Function(BuildContext context, GoRouterState state) builder,
  MuhRouteTransition transition = MuhRouteTransition.forward,
  List<RouteBase> routes = const [],
}) {
  return GoRoute(
    path: path,
    routes: routes,
    pageBuilder: (context, state) => muhTransitionPage(
      state: state,
      style: transition,
      child: builder(context, state),
    ),
  );
}
