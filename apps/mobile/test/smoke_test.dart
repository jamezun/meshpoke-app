import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meshpoke/core/constants.g.dart';
import 'package:meshpoke/features/auth/sign_in_screen.dart';

void main() {
  testWidgets('themed sign-in shell renders tagline', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: SignInScreen()));
    expect(find.text('Poke the mesh.'), findsOneWidget);
    expect(find.text('Watch your network ripple.'), findsOneWidget);
  });

  test('shared constants available in Dart', () {
    expect(Tiers.freeWeeklyPokes, 5);
    expect(Prices.plusMonthlyIap, 148);
    expect(Spots.confirmWindowHours, 48);
  });
}
