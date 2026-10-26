import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as perm;
import 'package:meshpoke/core/api_client.dart';
import 'spot_repository.dart';

/// T10.4 live + after-event UX: I'm-here button, roll-call, absent report, forgiveness.
class LiveSpotScreen extends ConsumerStatefulWidget {
  const LiveSpotScreen({super.key, required this.spotId});
  final String spotId;

  @override
  ConsumerState<LiveSpotScreen> createState() => _LiveSpotScreenState();
}

class _LiveSpotScreenState extends ConsumerState<LiveSpotScreen> {
  String? _status;
  bool _busy = false;

  Future<void> _imHere() async {
    setState(() => _busy = true);
    try {
      var granted = await perm.Permission.locationWhenInUse.status;
      if (granted != perm.PermissionStatus.granted) {
        granted = await perm.Permission.locationWhenInUse.request();
      }
      if (granted != perm.PermissionStatus.granted) {
        if (mounted) _msg('Location permission needed to check in');
        return;
      }
      final pos = await Geolocator.getCurrentPosition();
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/spots/${widget.spotId}/im-here', data: {
        'lat': pos.latitude, 'lng': pos.longitude, 'accuracy_m': pos.accuracy.round(),
      });
      if (mounted) setState(() => _status = 'checked in ✓');
      _msg(res.statusCode == 200 ? "You're checked in" : 'Check-in failed');
    } catch (e) {
      final msg = '$e';
      _msg(msg.contains('Not close enough') ? 'Not close enough — see the map pin' : 'Check-in failed: $msg');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _msg(String m) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  Future<void> _reportAbsent(String userId) async {
    final dio = ref.read(apiClientProvider);
    try {
      await dio.post('/spots/${widget.spotId}/report-absent', data: {'userId': userId});
      _msg('Reported');
    } catch (e) {
      _msg('$e');
    }
  }

  Future<void> _forgive(String note) async {
    final dio = ref.read(apiClientProvider);
    try {
      await dio.post('/spots/${widget.spotId}/forgiveness', data: {'note': note});
      _msg('Sent to host');
    } catch (e) {
      _msg('$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = ref.watch(spotDetailProvider(widget.spotId));
    return Scaffold(
      appBar: AppBar(title: const Text('Spot')),
      body: d.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (spot) {
          final isHost = spot.myRole == 'host';
          final isDone = spot.state == 'done';
          final isLive = spot.state == 'live';
          return ListView(padding: const EdgeInsets.all(16), children: [
            Text(spot.name, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text('${spot.template} · ${spot.state?.toUpperCase() ?? ''}'),
            const SizedBox(height: 16),
            if (isLive) ...[
              FilledButton.icon(
                icon: const Icon(Icons.my_location),
                label: Text(_status ?? "I'm here"),
                onPressed: _busy ? null : _imHere,
              ),
              const SizedBox(height: 8),
              const Text('Check in at the venue — GPS confirms you showed up.', style: TextStyle(color: Colors.grey)),
            ],
            if (isDone && isHost) ...[
              const Divider(),
              Text('Roll-call', style: Theme.of(context).textTheme.titleMedium),
              const Text('Everyone is marked attended by default. Untick anyone who didn\'t show.'),
              const SizedBox(height: 8),
              _RollCall(spotId: widget.spotId),
            ],
            if (isDone && !isHost) ...[
              const Divider(),
              FilledButton.tonal(
                onPressed: () => _forgiveSheet(),
                child: const Text('I was marked absent — explain'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => _reportSheet(),
                child: const Text('Report someone absent'),
              ),
            ],
          ]);
        },
      ),
    );
  }

  Future<void> _forgiveSheet() async {
    final controller = TextEditingController();
    final note = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('What happened?'),
          TextField(controller: controller, maxLines: 3, maxLength: 500, decoration: const InputDecoration(hintText: 'e.g. MTR suspension, family emergency')),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Send to host')),
        ]),
      ),
    );
    if (note != null && note.trim().length > 2) await _forgive(note.trim());
  }

  Future<void> _reportSheet() async {
    final d = ref.read(spotDetailProvider(widget.spotId));
    d.whenData((spot) async {
      final userId = await showDialog<String>(
        context: context,
        builder: (context) => SimpleDialog(
          title: const Text('Who was absent?'),
          children: [
            for (final m in spot.members)
              SimpleDialogOption(
                onPressed: () => Navigator.pop(context, m['userId'] as String),
                child: Text(m['displayName'] ?? 'member'),
              ),
          ],
        ),
      );
      if (userId != null) await _reportAbsent(userId);
    });
  }
}

class _RollCall extends ConsumerStatefulWidget {
  const _RollCall({required this.spotId});
  final String spotId;

  @override
  ConsumerState<_RollCall> createState() => _RollCallState();
}

class _RollCallState extends ConsumerState<_RollCall> {
  Map<String, bool>? _present;

  @override
  Widget build(BuildContext context) {
    final dio = ref.watch(apiClientProvider);
    return FutureBuilder(
      future: dio.get('/spots/${widget.spotId}/roll-call'),
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) return const LinearProgressIndicator();
        final members = snap.data?.data['members'] as List? ?? [];
        _present ??= {for (final m in members) m['userId'] as String: m['status'] == 'attended'};
        return Column(children: [
          for (final m in members)
            CheckboxListTile(
              title: Text(m['display_name'] ?? 'member'),
              value: _present![m['userId']],
              onChanged: (v) => setState(() => _present![m['userId'] as String] = v ?? true),
            ),
          FilledButton(
            onPressed: () async {
              final absent = _present!.entries.where((e) => !e.value).map((e) => e.key).toList();
              await dio.post('/spots/${widget.spotId}/roll-call', data: {'absent': absent});
              if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Roll-call saved')));
            },
            child: const Text('Save roll-call'),
          ),
        ]);
      },
    );
  }
}
