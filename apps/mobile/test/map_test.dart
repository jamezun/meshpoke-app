import 'package:flutter_test/flutter_test.dart';
import 'package:meshpoke/features/map/map_repository.dart';

void main() {
  test('ViewportData parses venues + spots + activity7d', () {
    final d = ViewportData.fromJson({
      'venues': [
        {
          'id': 'v1',
          'name': 'Central Test Cafe',
          'category': 'cafe',
          'activity7d': 2,
        },
        {'id': 'v2', 'name': 'Quiet Bar'},
      ],
      'spots': [
        {'id': 's1', 'name': 'Tennis in Central', 'state': 'confirmed'},
      ],
    });
    expect(d.venues, hasLength(2));
    expect(d.venues.first.activity7d, 2);
    expect(d.venues.last.activity7d, 0); // missing → 0
    expect(d.spots.single.state, 'confirmed');
  });

  test('bbox helper', () {
    expect(bboxOf(114.14, 22.27, 114.17, 22.29), '114.14,22.27,114.17,22.29');
  });
}
