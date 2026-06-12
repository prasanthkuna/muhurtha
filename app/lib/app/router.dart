import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config/env.dart';
import '../features/auth/sign_in_screen.dart';
import '../features/home/home_shell.dart';
import '../features/onboarding/accuracy_screen.dart';
import '../features/onboarding/birth_basics_screen.dart';
import '../features/onboarding/nakshatra_screen.dart';
import '../features/onboarding/time_bucket_screen.dart';
import '../features/profile/profile_tune_screen.dart';
import '../features/splash/splash_screen.dart';
import '../features/welcome/welcome_screen.dart';

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
      if (session == null && !isPublic && !path.startsWith('/splash')) {
        return '/welcome';
      }
      if (session != null && path == '/welcome') {
        return null;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/auth',
        builder: (context, state) => const PhoneAuthScreen(),
      ),
      GoRoute(
        path: '/onboarding/birth-basics',
        builder: (context, state) => const BirthBasicsScreen(),
      ),
      GoRoute(
        path: '/onboarding/time',
        builder: (context, state) => const TimeBucketScreen(),
      ),
      GoRoute(
        path: '/onboarding/nakshatra',
        builder: (context, state) => const NakshatraScreen(),
      ),
      GoRoute(
        path: '/onboarding/accuracy',
        builder: (context, state) => const AccuracyScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) {
          final tab = state.uri.queryParameters['tab'];
          final initialIndex = switch (tab) {
            'life_map' || 'journey' => 1,
            'today' || 'remedies' => 2,
            'timing' => 3,
            'ask' || 'purpose' => 4,
            _ => 0,
          };
          return HomeShell(initialIndex: initialIndex);
        },
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileTuneScreen(),
      ),
    ],
  );
});
