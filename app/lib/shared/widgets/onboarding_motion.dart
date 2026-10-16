import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';
import 'editorial/muh_page_scaffold.dart';
import 'muh_enter.dart';

/// Onboarding list — limited stagger (max 4 groups per Golden §6).
class MuhOnboardingList extends StatelessWidget {
  const MuhOnboardingList({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.all(MuhSpace.page),
    this.controller,
    this.stagger = true,
  });

  final List<Widget> children;
  final EdgeInsets padding;
  final ScrollController? controller;
  final bool stagger;

  @override
  Widget build(BuildContext context) {
    final items = stagger
        ? muhStaggerChildren(
            children,
            maxIndex: MuhMotion.staggerMaxGroups,
          )
        : children;
    return ListView(
      controller: controller,
      padding: padding,
      children: items,
    );
  }
}

/// Editorial onboarding shell — ivory canvas, no orbital art.
class MuhOnboardingScaffold extends StatelessWidget {
  const MuhOnboardingScaffold({
    super.key,
    required this.title,
    required this.body,
    this.bottom,
  });

  final String title;
  final Widget body;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    return MuhPageScaffold(
      title: title,
      body: body,
      bottom: bottom,
    );
  }
}
