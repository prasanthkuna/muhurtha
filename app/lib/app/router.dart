import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config/env.dart';
import '../features/auth/sign_in_screen.dart';
import '../features/home/home_shell.dart';
import '../features/onboarding/concern_screen.dart';
import '../features/onboarding/birth_basics_screen.dart';
import '../features/onboarding/nakshatra_screen.dart';
import '../features/onboarding/time_bucket_screen.dart';
import '../features/profile/profile_tune_screen.dart';
import '../features/splash/splash_screen.dart';
import '../features/welcome/welcome_screen.dart';
import 'muh_router_transitions.dart';

final _rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

final goRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      final path = state.matchedLocation;
      if (path == '/splash') return null;

      if (!Env.hasSupabase) return null;

      final session = Supabase.instance.client.auth.currentSession;
      final isPublic = path == '/welcome' || path == '/auth';
      if (session == null && !isPublic) {
        return '/welcome';
      }
      if (session != null && path == '/welcome') {
        return null;
      }
      return null;
    },
    routes: [
      muhGoRoute(
        path: '/splash',
        transition: MuhRouteTransition.fade,
        builder: (context, state) => const SplashScreen(),
      ),
      muhGoRoute(
        path: '/welcome',
        transition: MuhRouteTransition.up,
        builder: (context, state) => const WelcomeScreen(),
      ),
      muhGoRoute(
        path: '/auth',
        builder: (context, state) => const PhoneAuthScreen(),
      ),
      muhGoRoute(
        path: '/onboarding/birth-basics',
        builder: (context, state) => const BirthBasicsScreen(),
      ),
      muhGoRoute(
        path: '/onboarding/time',
        builder: (context, state) => const TimeBucketScreen(),
      ),
      muhGoRoute(
        path: '/onboarding/nakshatra',
        builder: (context, state) => const NakshatraScreen(),
      ),
      muhGoRoute(
        path: '/onboarding/concern',
        builder: (context, state) => const ConcernScreen(),
      ),
      muhGoRoute(
        path: '/home',
        transition: MuhRouteTransition.fade,
        builder: (context, state) {
          final tab = state.uri.queryParameters['tab'];
          // Tab order: Today | Life Map | Decode | Timing | Ask (Retention §2.1).
          final initialIndex = switch (tab) {
            'today' || 'remedies' || 'timeline' => 0,
            'life_map' || 'journey' => 1,
            'decode' => 2,
            'timing' => 3,
            'ask' || 'purpose' => 4,
            _ => 0,
          };
          return HomeShell(initialIndex: initialIndex);
        },
      ),
      muhGoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileTuneScreen(),
      ),
    ],
  );
});
