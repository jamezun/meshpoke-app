import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';
import 'spot_repository.dart';
import '../billing/upgrade_sheet.dart';
import 'host_queue_screen.dart';
import 'live_spot_screen.dart';

/// T9.5 spot detail + join (open) / apply (application, note ≤500) + leave.
class SpotDetailScreen extends ConsumerStatefulWidget {
  const SpotDetailScreen({super.key, required this.spotId});
  final String spotId;

  @override
  ConsumerState<SpotDetailScreen> createState() => _SpotDetailScreenState();
}

class _SpotDetailScreenState extends ConsumerState<SpotDetailScreen> {
  String? _error;
  bool _busy = false;

  Future<void> _act(String path, {Map<String, dynamic>? body}) async {
    setState(() { _busy = true; _error = null; });
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/spots/${widget.spotId}/$path', data: body ?? {});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(switch (path) {
          'apply' => 'Applied — host will review',
          'join' => 'Joined (${res.data['role']})',
          'cancel' => 'Spot cancelled',
          _ => 'Left the spot',
        })),
      );
      ref.invalidate(spotDetailProvider(widget.spotId));
    } catch (e) {
      final hit = upgradeHitFrom(e);
      if (hit != null && mounted) {
        await showUpgradeSheet(context, hit.capType, hit.detail);
      } else if (mounted) {
        setState(() => _error = '$e');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // T13.3: share-my-spot — venue/time/count only (safety link, share_plus)
  Future<void> _shareMySpot() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/spots/${widget.spotId}/share-my-spot');
      final url = 'https://www.meshpoke.com${res.data['url']}';
      await Share.share(url, subject: 'My MeshPoke spot');
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  Future<void> _applySheet() async {
    final note = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Apply'),
          content: TextField(
            controller: controller,
            maxLength: 500,
            maxLines: 4,
            decoration: const InputDecoration(hintText: 'Note to host (optional)'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Send')),
          ],
        );
      },
    );
    if (note != null) await _act('apply', body: {'note': note.isEmpty ? null : note});
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(spotDetailProvider(widget.spotId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Spot'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () => Share.share(
              'https://www.meshpoke.com/s/${widget.spotId}',
              subject: 'MeshPoke spot',
            ),
          ),
        ],
      ),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (s) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(s.name, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text('${s.template} · ${s.state ?? 'forming'} · ${s.district ?? ''}'),
            if (s.venueName != null) Text('📍 ${s.venueName}'),
            if (s.startsAt != null) Text('🗓 ${s.startsAt!.toLocal()}'),
            const Divider(height: 24),
            Text('Members ${s.memberCount}/${s.maxHeadcount} (min ${s.minHeadcount} to schedule)'),
            if (s.requiredKeywords.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Wrap(
                  spacing: 6,
                  children: [for (final k in s.requiredKeywords) Chip(label: Text(k))],
                ),
              ),
            if (s.minScore != null) Text('Host requires Show-up Score ≥ ${s.minScore}'),
            if (s.priceRange != null) Text('Price: ${s.priceRange} (informational)'),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            const SizedBox(height: 16),
            _action(s),
          ],
        ),
      ),
    );
  }

  Widget _action(SpotDetail s) {
    if (_busy) return const Center(child: CircularProgressIndicator());
    if (s.myRole == 'host') {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        FilledButton.icon(
          icon: const Icon(Icons.list),
          label: const Text('Review queue'),
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => HostQueueScreen(spotId: s.id)),
          ),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: () => _act('cancel'),
          child: const Text('Cancel spot'),
        ),
      ]);
    }
    if (s.myRole != null && s.myApplication == null) {
      return FilledButton.tonal(
        onPressed: () => _act('leave'),
        child: const Text('Leave spot'),
      );
    }
    if (s.myApplication == 'pending') return const Chip(label: Text('Application pending'));
    if (s.state == 'forming' || s.state == 'confirmed') {
      return FilledButton(
        onPressed: () => s.joinMode == 'open' ? _act('join') : _applySheet(),
        child: Text(s.joinMode == 'open' ? 'Join' : 'Apply'),
      );
    }
    if ((s.state == 'live' || s.state == 'done') && (s.myRole != null || s.myApplication == null)) {
      return Column(children: [
        FilledButton.tonal(
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => LiveSpotScreen(spotId: s.id)),
          ),
          child: Text(s.state == 'live' ? "I'm here / roll-call" : 'After-event'),
        ),
        if (s.myRole != null)
          TextButton.icon(
            icon: const Icon(Icons.share_location_outlined),
            label: const Text('Share my spot'),
            onPressed: _shareMySpot,
          ),
      ]);
    }
    return const SizedBox.shrink();
  }
}
