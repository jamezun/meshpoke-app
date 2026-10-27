import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meshpoke/core/theme.dart';
import 'package:meshpoke/features/auth/dob_screen.dart';
import 'package:meshpoke/features/auth/phone_screen.dart';
import 'package:meshpoke/features/auth/sign_in_screen.dart';
import 'package:meshpoke/core/shell.dart';
import 'package:meshpoke/features/map/map_screen.dart';
import 'package:meshpoke/features/map/venue_screens.dart';
import 'package:meshpoke/features/spots/spots_screen.dart';
import 'package:meshpoke/features/rooms/rooms_screen.dart';
import 'package:meshpoke/features/pokes/poke_screens.dart' show InboxScreen;
import 'package:meshpoke/features/crews/crew_screens.dart';
import 'package:meshpoke/features/activity/activity_screens.dart';
import 'package:meshpoke/features/qr/qr_screens.dart';
import 'package:meshpoke/features/profile/profile_screen.dart';
import 'package:meshpoke/features/profile/profile_edit_screen.dart';

/// Captured referral code from meshpoke://r/{code} (set by router, consumed at onboarding).
final referralProvider = StateProvider<String?>((ref) => null);

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    routes: [
      GoRoute(path: '/', builder: (_, _) => const SignInScreen()),
      GoRoute(path: '/onboard/dob', builder: (_, _) => const DobScreen()),
      GoRoute(path: '/onboard/phone', builder: (_, _) => const PhoneScreen()),
      GoRoute(
        path: '/map',
        builder: (_, _) => const ShellScreen(child: MapScreen()),
      ),
      GoRoute(
        path: '/spots',
        builder: (_, _) => const ShellScreen(child: SpotsScreen()),
      ),
      GoRoute(
        path: '/rooms',
        builder: (_, _) => const ShellScreen(child: RoomsScreen()),
      ),
      GoRoute(
        path: '/rooms/:id',
        builder: (_, s) => RoomScreen(roomId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/my-qr',
        builder: (_, _) => const MyQrScreen(),
      ),
      GoRoute(
        path: '/wallet',
        builder: (_, _) => const WalletScreen(),
      ),
      GoRoute(
        path: '/activity',
        builder: (_, _) => const ActivityScreen(),
      ),
      GoRoute(
        path: '/activity/settings',
        builder: (_, _) => const NotificationSettingsScreen(),
      ),
      GoRoute(
        path: '/crews',
        builder: (_, _) => const CrewsScreen(),
      ),
      GoRoute(
        path: '/crews/:id',
        builder: (_, s) => CrewDetailScreen(crewId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/inbox',
        builder: (_, _) => const ShellScreen(child: InboxScreen()),
      ),
      GoRoute(
        path: '/profile',
        builder: (_, _) => const ShellScreen(child: ProfileScreen()),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (_, _) => const ProfileEditScreen(),
      ),
      GoRoute(
        path: '/spot/:id',
        builder: (_, s) => const ShellScreen(child: MapScreen()),
      ),
      GoRoute(
        path: '/venue/:id',
        builder: (_, s) => VenuePageScreen(venueId: s.pathParameters['id']!),
      ),
      GoRoute(path: '/venue/add', builder: (_, _) => const AddPlaceScreen()),
      GoRoute(path: '/about', builder: (_, _) => const AboutScreen()),
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
