import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/env.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _opacity;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );
    _opacity = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);
    _slide = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _c, curve: Curves.easeOutCubic));
    _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _onBegin() {
    if (!Env.hasSupabase) {
      context.go('/onboarding/birth-basics');
      return;
    }
    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      context.go('/onboarding/birth-basics');
    } else {
      context.push('/auth');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: MuhSpace.page),
            child: FadeTransition(
              opacity: _opacity,
              child: SlideTransition(
                position: _slide,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: MuhSpace.xxl),
                    Text(
                      l10n.appTitle,
                      style: theme.textTheme.headlineLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.5,
                        height: 1.05,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.xl),
                    Text(
                      l10n.welcomeTagline,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: MuhColors.creamMuted,
                        height: 1.45,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const Spacer(),
                    MuhPrimaryButton(
                      label: l10n.welcomeCta,
                      onPressed: _onBegin,
                    ),
                    const SizedBox(height: MuhSpace.lg),
                    Text(
                      l10n.welcomeFootnote,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: MuhColors.muted,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.xl),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
