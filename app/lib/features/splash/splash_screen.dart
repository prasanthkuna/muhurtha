import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/env.dart';
import '../../core/data/profile_repository.dart';
import '../../design_system/design_system.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _route());
  }

  Future<void> _route() async {
    if (!Env.hasSupabase) {
      if (mounted) context.go('/onboarding/birth-basics');
      return;
    }

    final repo = ref.read(profileRepositoryProvider);
    if (repo == null) {
      if (mounted) context.go('/welcome');
      return;
    }

    final target = await repo.initialSignedInRoute();
    if (!mounted) return;

    switch (target) {
      case 'home':
        context.go('/home');
        return;
      case 'onboarding':
        context.go('/onboarding/birth-basics');
        return;
      default:
        context.go('/welcome');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(color: MuhColors.gold),
      ),
    );
  }
}
