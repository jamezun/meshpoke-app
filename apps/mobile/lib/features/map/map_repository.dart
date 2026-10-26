import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';

/// Viewport venues + spots (GET /map/viewport?bbox=…). T4.1 contract.
class ViewportData {
  final List<MapVenue> venues;
  final List<MapSpot> spots;
  ViewportData({this.venues = const [], this.spots = const []});

  factory ViewportData.fromJson(Map<String, dynamic> json) => ViewportData(
    venues: [
      (json['venues'] ?? []),
    ].expand((v) => v).map((e) => MapVenue.fromJson(e)).toList(),
    spots: [
      (json['spots'] ?? []),
    ].expand((v) => v).map((e) => MapSpot.fromJson(e)).toList(),
  );
}

class MapVenue {
  final String id;
  final String name;
  final String? category;
  final int activity7d;
  MapVenue({
    required this.id,
    required this.name,
    this.category,
    this.activity7d = 0,
  });

  factory MapVenue.fromJson(Map<String, dynamic> j) => MapVenue(
    id: j['id'],
    name: j['name'],
    category: j['category'],
    activity7d: (j['activity7d'] as num?)?.toInt() ?? 0,
  );
}

class MapSpot {
  final String id;
  final String name;
  final String state;
  MapSpot({required this.id, required this.name, required this.state});

  factory MapSpot.fromJson(Map<String, dynamic> j) =>
      MapSpot(id: j['id'], name: j['name'], state: j['state'] ?? 'forming');
}

/// Debounced camera-idle viewport provider: family on "minLng,minLat,maxLng,maxLat".
final viewportProvider = FutureProvider.autoDispose
    .family<ViewportData, String>((ref, bbox) async {
      final dio = ref.watch(apiClientProvider);
      final parts = bbox.split(',').map(double.parse).toList();
      final res = await dio.get(
        '/map/viewport',
        queryParameters: {'bbox': parts.join(',')},
      );
      return ViewportData.fromJson(res.data as Map<String, dynamic>);
    });

/// Bbox string helper.
String bboxOf(double minLng, double minLat, double maxLng, double maxLat) =>
    '$minLng,$minLat,$maxLng,$maxLat';
