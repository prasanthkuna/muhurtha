import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/analytics/app_analytics.dart';
import '../../core/config/env.dart';
import '../../core/data/profile_repository.dart';
import '../../core/session/session_preferences.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_brand_mark.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/editorial/muh_page_scaffold.dart';

class WelcomeScreen extends ConsumerStatefulWidget {
  const WelcomeScreen({super.key});

  @override
  ConsumerState<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends ConsumerState<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: MuhMotion.chapter,
    );
    _opacity = CurvedAnimation(parent: _c, curve: MuhMotion.enterCurve);
    _c.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(ref.read(appAnalyticsProvider).welcomeViewed());
      unawaited(_maybeAutoContinueForSignedInUser());
    });
  }

  /// Skip welcome when already signed in and chart exists (common after reinstall).
  Future<void> _maybeAutoContinueForSignedInUser() async {
    if (!Env.hasSupabase) return;
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return;
    final repo = ref.read(profileRepositoryProvider);
    if (repo == null) return;
    try {
      final target = await repo.initialSignedInRoute();
      if (!mounted || target != 'home') return;
      final tab = await SessionPreferences.defaultHomeTabQuery();
      if (!mounted) return;
      context.go('/home?tab=$tab');
    } catch (_) {}
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<void> _onBegin() async {
    unawaited(ref.read(appAnalyticsProvider).welcomeCtaTapped());
    unawaited(ref.read(appAnalyticsProvider).setupStarted(entry: 'welcome'));
    if (!Env.hasSupabase) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppLocalizations.of(context)!.errorNeedSupabase)),
      );
      return;
    }
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      if (mounted) context.go('/auth');
      return;
    }
    final repo = ref.read(profileRepositoryProvider);
    if (repo == null) {
      if (mounted) context.go('/auth');
      return;
    }
    try {
      final target = await repo.initialSignedInRoute();
      if (!mounted) return;
      switch (target) {
        case 'home':
          final tab = await SessionPreferences.defaultHomeTabQuery();
          if (!mounted) return;
          context.go('/home?tab=$tab');
        case 'onboarding':
          context.go('/onboarding/concern');
        default:
          await Supabase.instance.client.auth.signOut();
          if (mounted) context.go('/auth');
      }
    } catch (_) {
      await Supabase.instance.client.auth.signOut();
      if (mounted) context.go('/auth');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return MuhPageScaffold(
      body: FadeTransition(
        opacity: _opacity,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: MuhSpace.page),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: MuhSpace.xxl),
              MuhBrandMark(
                title: l10n.appTitle,
                subtitle: 'Your story · Your chapters · Your timing',
                markSize: 52,
                compact: true,
              ),
              const SizedBox(height: MuhSpace.xl),
              Text(
                l10n.welcomeTagline,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: MuhColors.inkSecondary,
                  height: 1.57,
                ),
              ),
              const SizedBox(height: MuhSpace.md),
              Text(
                l10n.welcomeFootnote,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: MuhColors.inkTertiary,
                ),
              ),
              const Spacer(),
              MuhPrimaryButton(
                label: l10n.welcomeCta,
                onPressed: _onBegin,
              ),
              const SizedBox(height: MuhSpace.xxl),
            ],
          ),
        ),
      ),
    );
  }
}
