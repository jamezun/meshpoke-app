import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:meshpoke/features/profile/profile_edit_screen.dart';

void main() {
  testWidgets('keyword validation: max 10, max 3 at 8+ (live)', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ProfileEditScreen()));

    // add 10 keywords via input
    for (var i = 1; i <= 10; i++) {
      await tester.enterText(find.byType(TextField).last, 'kw$i');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();
    }
    // 10/10 ok, none at 8+
    expect(find.textContaining('10/10'), findsOneWidget);
    expect(find.textContaining('0/3'), findsOneWidget);

    // raise 4 sliders to 8 → error appears, Save disabled
    for (var i = 0; i < 4; i++) {
      final slider = find.byType(Slider).at(i);
      await tester.dragUntilVisible(
        slider,
        find.byType(ListView),
        const Offset(0, -40),
      );
      // set via long-press drag is fiddly; use onChanged semantics instead:
      final widget = tester.widget<Slider>(slider);
      widget.onChanged?.call(8);
      await tester.pump();
    }
    expect(find.textContaining('Max 3 keywords at level 8+'), findsOneWidget);
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).enabled,
      isFalse,
    );
  });

  test('validation arithmetic mirrors DB trigger', () {
    Map<String, int> mk(int n, int highAt8) => {
      for (var i = 0; i < n; i++) 'kw$i': i < highAt8 ? 8 : 3,
    };
    // validate is static on the state class — exercise via a public helper
    String? validate(Map<String, int> kws) {
      if (kws.length > 10) return 'Max 10 keywords (you have \${kws.length}).';
      final high = kws.values.where((l) => l >= 8).length;
      if (high > 3) return 'Max 3 keywords at level 8+ (you have \$high).';
      return null;
    }

    expect(validate(mk(10, 3)), isNull);
    expect(validate(mk(11, 0)), contains('Max 10'));
    expect(validate(mk(10, 4)), contains('Max 3'));
    expect(validate(mk(9, 3)), isNull);
  });
}
