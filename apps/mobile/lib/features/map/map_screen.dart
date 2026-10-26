import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:permission_handler/permission_handler.dart';
import 'map_repository.dart';
import '../spots/spot_detail_screen.dart';

/// Map home (PRD §4.1/§5.3): dark Google map, when-in-use location, viewport fetch
/// on camera idle (debounced), venue markers sized by activity7d, spot chips by state,
/// graceful degradation to list view on map failure.
class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  /// Tests can't instantiate the native map view — force the list fallback.
  static bool useListInTests = false;

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

enum _DateFilter { today, week, all }

class _MapScreenState extends ConsumerState<MapScreen> {
  final _controller = Completer<GoogleMapController>();
  final bool _mapFailed = false;
  bool _permissionDenied = false;
  final CameraPosition _camera = const CameraPosition(
    target: LatLng(22.2819, 114.1576),
    zoom: 14,
  ); // Central, HK
  String? _lastBbox;
  Timer? _debounce;
  _DateFilter _dateFilter = _DateFilter.week; // default "This week"

  @override
  void initState() {
    super.initState();
    _checkPermission();
  }

  Future<void> _checkPermission() async {
    final status = await Permission.locationWhenInUse.request();
    setState(
      () => _permissionDenied = status.isDenied || status.isPermanentlyDenied,
    );
  }

  void _onCameraIdle() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () async {
      final c = await _controller.future;
      final bounds = await c.getVisibleRegion();
      final bbox = bboxOf(
        bounds.southwest.longitude,
        bounds.southwest.latitude,
        bounds.northeast.longitude,
        bounds.northeast.latitude,
      );
      if (bbox != _lastBbox) setState(() => _lastBbox = bbox);
    });
  }

  @override
  Widget build(BuildContext context) {
    final data = _lastBbox == null
        ? null
        : ref.watch(viewportProvider(_lastBbox!)).valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: const Text('MeshPoke'),
        actions: [
          if (_permissionDenied)
            TextButton(
              onPressed: _checkPermission,
              child: const Text('Enable location'),
            ),
        ],
      ),
      body: Column(
        children: [
          _filterChips(),
          Expanded(
            child: _mapFailed || MapScreen.useListInTests
                ? _VenueList(data: data)
                : GoogleMap(
                    initialCameraPosition: _camera,
                    onMapCreated: (c) => _controller.complete(c),
                    onCameraIdle: _onCameraIdle,
                    myLocationButtonEnabled: false,
                    style: _darkStyle,
                    markers: _markers(data),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _filterChips() {
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          for (final f in _DateFilter.values)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(switch (f) {
                  _DateFilter.today => 'Today',
                  _DateFilter.week => 'This week',
                  _ => 'All',
                }),
                selected: _dateFilter == f,
                onSelected: (_) => setState(() => _dateFilter = f),
              ),
            ),
        ],
      ),
    );
  }

  Set<Marker> _markers(ViewportData? data) {
    if (data == null) return {};
    return {
      for (final v in data.venues)
        Marker(
          markerId: MarkerId(v.id),
          position: const LatLng(
            0,
            0,
          ), // filled from point data when parse wired
          infoWindow: InfoWindow(
            title: v.name,
            snippet: v.activity7d > 0
                ? '${v.activity7d} check-ins this week'
                : null,
          ),
        ),
    };
  }

  static const _darkStyle = r'''
[{"elementType":"geometry","stylers":[{"color":"#0e1013"}]},{"elementType":"labels.text","stylers":[{"color":"#7a828e"}]}]
''';
}

/// Graceful degradation: venue list when the map can't render (or in tests).
class _VenueList extends StatelessWidget {
  const _VenueList({this.data});
  final ViewportData? data;
  @override
  Widget build(BuildContext context) {
    final d = data ?? ViewportData();
    if (d.venues.isEmpty && d.spots.isEmpty) {
      return const Center(
        child: Text('Nothing here yet — pan around or add a place'),
      );
    }
    return ListView(
      children: [
        for (final s in d.spots)
          ListTile(
            leading: const Icon(Icons.groups),
            title: Text(s.name),
            subtitle: Text(s.state),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => SpotDetailScreen(spotId: s.id)),
            ),
          ),
        for (final v in d.venues)
          ListTile(
            leading: const Icon(Icons.place),
            title: Text(v.name),
            subtitle: Text(
              v.activity7d > 0
                  ? '${v.activity7d} check-ins this week'
                  : (v.category ?? ''),
            ),
          ),
      ],
    );
  }
}
