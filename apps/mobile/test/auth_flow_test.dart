import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meshpoke/features/auth/dob_screen.dart';
import 'package:meshpoke/features/auth/phone_screen.dart';

Widget wrap(Widget child) => MaterialApp(home: child);

void main() {
  testWidgets('DOB: continue without picking → friendly error', (tester) async {
    await tester.pumpWidget(wrap(const DobScreen()));
    await tester.tap(find.text('Continue'));
    await tester.pump();
    expect(find.text('Pick your date of birth first.'), findsOneWidget);
  });

  test('DOB 18+ arithmetic (mirror of screen logic)', () {
    bool is18(DateTime dob) {
      final now = DateTime.now();
      return !dob.isAfter(DateTime(now.year - 18, now.month, now.day));
    }

    final now = DateTime.now();
    expect(is18(DateTime(now.year - 20, 1, 1)), isTrue);
    expect(is18(DateTime(now.year - 10, 1, 1)), isFalse);
    expect(
      is18(DateTime(now.year - 18, now.month, now.day + 1)),
      isFalse,
    ); // birthday tomorrow → still 17
  });

  testWidgets(
    'phone: 8-digit validation gates send; resend timer counts down',
    (tester) async {
      await tester.pumpWidget(wrap(const PhoneScreen()));
      await tester.enterText(find.byType(TextField), '12345'); // too short
      await tester.tap(find.text('Send code'));
      await tester.pump();
      expect(find.text('Enter the 8 digits after +852.'), findsOneWidget);

      await tester.enterText(find.byType(TextField), '98765432');
      await tester.tap(find.text('Send code'));
      await tester.pump();
      expect(find.textContaining('6-digit code'), findsOneWidget);
      expect(find.textContaining('Resend in 60s'), findsOneWidget);
      // drain the resend ticker so no pending timer trips invariants
      await tester.pump(const Duration(seconds: 61));
      expect(find.text('Resend code'), findsOneWidget);
    },
  );

  testWidgets('phone: short OTP rejected', (tester) async {
    await tester.pumpWidget(wrap(const PhoneScreen()));
    await tester.enterText(find.byType(TextField), '98765432');
    await tester.tap(find.text('Send code'));
    await tester.pump();
    await tester.enterText(find.byType(TextField).at(0), '123'); // 3 digits
    await tester.tap(find.text('Verify'));
    await tester.pump();
    expect(find.text('Enter the 6-digit code.'), findsOneWidget);
    await tester.pump(const Duration(seconds: 61));
  });
}
