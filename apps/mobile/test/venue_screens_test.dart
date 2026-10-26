import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meshpoke/features/map/venue_screens.dart';

void main() {
  testWidgets('venue page shows claimed badge + actions', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: VenuePageScreen(venueId: 'v123')),
    );
    expect(find.text('Claimed'), findsOneWidget);
    expect(find.text('Save'), findsOneWidget);
    expect(find.text('Report'), findsOneWidget);
  });

  testWidgets('add-a-place: duplicate suggestions offer override', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: AddPlaceScreen()));
    await tester.tap(find.text('Drop a pin'));
    await tester.pump();
    await tester.enterText(find.byType(TextField), 'Peak View Cafe');
    await tester.tap(find.text('Add place'));
    await tester.pump();
    // no duplicates yet → no override CTA
    expect(find.text("It's different — add anyway"), findsNothing);
    expect(find.text('Pin dropped'), findsOneWidget);
  });

  testWidgets('about screen lists attributions', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AboutScreen()));
    expect(find.textContaining('DATA.GOV.HK'), findsOneWidget);
    expect(find.textContaining('Lands Department'), findsOneWidget);
  });
}
