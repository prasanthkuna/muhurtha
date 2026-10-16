import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';
import 'muh_enter.dart';
import 'orbital_backdrop.dart';

/// Staggered onboarding list (same motion language as home tabs).
class MuhOnboardingList extends StatelessWidget {
  const MuhOnboardingList({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.all(MuhSpace.page),
    this.controller,
  });

  final List<Widget> children;
  final EdgeInsets padding;
  final ScrollController? controller;

  @override
  Widget build(BuildContext context) {
    return ListView(
      controller: controller,
      padding: padding,
      children: muhStaggerChildren(children),
    );
  }
}

/// Flat graphite onboarding shell (no gold rings).
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
    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: Text(title)),
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: body),
              if (bottom != null) bottom!,
            ],
          ),
        ),
      ),
    );
  }
}
