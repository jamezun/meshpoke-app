import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meshpoke/core/theme.dart';
import 'package:meshpoke/features/auth/dob_screen.dart';
import 'package:meshpoke/features/auth/phone_screen.dart';
import 'package:meshpoke/features/auth/sign_in_screen.dart';

/// Captured referral code from meshpoke://r/{code} (set by router, consumed at onboarding).
final referralProvider = StateProvider<String?>((ref) => null);

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SignInScreen()),
      GoRoute(path: '/onboard/dob', builder: (_, __) => const DobScreen()),
      GoRoute(path: '/onboard/phone', builder: (_, __) => const PhoneScreen()),
      GoRoute(
        path: '/r/:code',
        builder: (context, state) {
          ref.read(referralProvider.notifier).state =
              state.pathParameters['code'];
          WidgetsBinding.instance.addPostFrameCallback((_) => context.go('/'));
          return const SizedBox.shrink();
        },
      ),
    ],
  );
});

class MeshPokeApp extends ConsumerWidget {
  const MeshPokeApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'MeshPoke',
      theme: AppTheme.dark(),
      routerConfig: ref.watch(routerProvider),
    );
  }
}
