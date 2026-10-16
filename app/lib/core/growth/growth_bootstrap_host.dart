import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/core/growth/growth_bootstrap.dart';

/// Starts app-links listener and first-open analytics once per process.
class GrowthBootstrapHost extends ConsumerStatefulWidget {
  const GrowthBootstrapHost({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<GrowthBootstrapHost> createState() =>
      _GrowthBootstrapHostState();
}

class _GrowthBootstrapHostState extends ConsumerState<GrowthBootstrapHost> {
  GrowthBootstrap? _bootstrap;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _bootstrap = ref.read(growthBootstrapProvider);
      _bootstrap?.start();
    });
  }

  @override
  void dispose() {
    _bootstrap?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
