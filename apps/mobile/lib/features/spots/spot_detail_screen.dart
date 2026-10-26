import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';
import 'spot_repository.dart';

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
          _ => 'Left the spot',
        })),
      );
      ref.invalidate(spotDetailProvider(widget.spotId));
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
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
      appBar: AppBar(title: const Text('Spot')),
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
    if (s.myRole == 'host') return const Chip(label: Text('You host this spot'));
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
    return const SizedBox.shrink();
  }
}
