import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meshpoke/core/constants.g.dart';
import 'package:meshpoke/features/auth/sign_in_screen.dart';
import 'package:meshpoke/core/shell.dart';
import 'package:go_router/go_router.dart';

void main() {
  testWidgets('themed sign-in shell renders tagline', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: SignInScreen()));
    expect(find.text('Poke the mesh.'), findsOneWidget);
    expect(find.text('Watch your network ripple.'), findsOneWidget);
  });

  testWidgets('shell renders 5 bottom tabs', (tester) async {
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/map',
          builder: (_, _) => ShellScreen(child: const SizedBox()),
        ),
      ],
      initialLocation: '/map',
    );
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    expect(find.text('Map'), findsOneWidget);
    expect(find.text('Spots'), findsOneWidget);
    expect(find.text('Rooms'), findsOneWidget);
    expect(find.text('Inbox'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });

  test('shared constants available in Dart', () {
    expect(Tiers.freeWeeklyPokes, 5);
    expect(Prices.plusMonthlyIap, 148);
    expect(Spots.confirmWindowHours, 48);
  });
}
