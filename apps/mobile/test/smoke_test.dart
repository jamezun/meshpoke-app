import 'package:flutter_test/flutter_test.dart';
import 'package:meshpoke/main.dart';
import 'package:meshpoke/core/constants.g.dart';

void main() {
  testWidgets('themed shell renders tagline', (tester) async {
    await tester.pumpWidget(const MeshPokeApp());
    expect(
      find.text('Poke the mesh. Watch your network ripple.'),
      findsOneWidget,
    );
  });

  test('shared constants available in Dart', () {
    expect(Tiers.freeWeeklyPokes, 5);
    expect(Prices.plusMonthlyIap, 148);
    expect(Spots.confirmWindowHours, 48);
  });
}
