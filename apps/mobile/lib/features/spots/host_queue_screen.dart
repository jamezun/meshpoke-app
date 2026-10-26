import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';
import 'spot_repository.dart';

/// T9.6 host queue: applications sorted (recommended default), accept/decline
/// with reason presets; schedule sheet (date + venue); cancel.
class HostQueueScreen extends ConsumerStatefulWidget {
  const HostQueueScreen({super.key, required this.spotId});
  final String spotId;

  @override
  ConsumerState<HostQueueScreen> createState() => _HostQueueScreenState();
}

class _HostQueueScreenState extends ConsumerState<HostQueueScreen> {
  String _sort = 'recommended';
  String? _error;

  Future<void> refreshList() async {
    ref.invalidate(_queueProvider((widget.spotId, _sort)));
  }

  Future<void> _decide(String applicationId, bool accept) async {
    String? reason;
    if (!accept) {
      reason = await showDialog<String>(
        context: context,
        builder: (context) => SimpleDialog(
          title: const Text('Decline reason'),
          children: [
            for (final r in const ['Minimum Show-up Score', 'Missing keywords', 'Spot is full', 'Not the right vibe', 'Other'])
              SimpleDialogOption(onPressed: () => Navigator.pop(context, r), child: Text(r)),
          ],
        ),
      );
      if (reason == null) return; // cancelled
    }
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/applications/$applicationId/decision', data: accept ? {'decision': 'accept'} : {'decision': 'decline', 'reason': reason});
      await refreshList();
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }

  Future<void> _scheduleSheet() async {
    final picked = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _ScheduleSheet(spotId: widget.spotId),
    );
    if (picked == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Spot scheduled — members have 48h to confirm')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = ref.watch(_queueProvider((widget.spotId, _sort)));
    final detail = ref.watch(spotDetailProvider(widget.spotId));
    return Scaffold(
      appBar: AppBar(title: const Text('Host queue')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(8),
          child: Row(children: [
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'recommended', label: Text('Recommended')),
                ButtonSegment(value: 'fifo', label: Text('Oldest first')),
              ],
              selected: {_sort},
              onSelectionChanged: (s) => setState(() => _sort = s.first),
            ),
            const Spacer(),
            detail.maybeWhen(
              data: (d) => FilledButton.icon(
                onPressed: d.state == 'forming' ? _scheduleSheet : null,
                icon: const Icon(Icons.event),
                label: const Text('Schedule'),
              ),
              orElse: () => const SizedBox.shrink(),
            ),
          ]),
        ),
        if (_error != null) Padding(padding: const EdgeInsets.all(8), child: Text(_error!, style: const TextStyle(color: Colors.red))),
        Expanded(
          child: q.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('$e')),
            data: (list) => list.isEmpty
                ? const Center(child: Text('No pending applications'))
                : ListView(children: [
                    for (final a in list)
                      ListTile(
                        leading: CircleAvatar(child: Text(a['express'] == true ? '★' : '·')),
                        title: Text('Applicant ${(a['userId'] as String).substring(0, 8)}'),
                        subtitle: Text(
                          '${(a['score'] as num?)?.toStringAsFixed(2) ?? '—'} · ${a['provenState'] ?? 'unproven'} · ${a['plan'] ?? 'free'}'
                          '${a['note'] != null ? ' · "${a['note']}"' : ''}',
                        ),
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          IconButton(icon: const Icon(Icons.check, color: Colors.green), onPressed: () => _decide(a['applicationId'] as String, true)),
                          IconButton(icon: const Icon(Icons.close, color: Colors.red), onPressed: () => _decide(a['applicationId'] as String, false)),
                        ]),
                      ),
                  ]),
          ),
        ),
      ]),
    );
  }
}

final _queueProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, (String, String)>((ref, p) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/spots/${p.$1}/queue', queryParameters: {'sort': p.$2});
  return [
    for (final a in (res.data['queue'] as List? ?? <dynamic>[]))
      if ((a as Map)['status'] == 'pending') Map<String, dynamic>.from(a),
  ];
});

class _ScheduleSheet extends ConsumerStatefulWidget {
  const _ScheduleSheet({required this.spotId});
  final String spotId;

  @override
  ConsumerState<_ScheduleSheet> createState() => _ScheduleSheetState();
}

class _ScheduleSheetState extends ConsumerState<_ScheduleSheet> {
  DateTime _date = DateTime.now().add(const Duration(days: 7));
  String? _venueId;
  String? _error;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final venues = ref.watch(_venueSearchProvider(''));
    return Padding(
      padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 16),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Schedule spot', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        ListTile(
          title: Text(_date.toLocal().toString().substring(0, 16)),
          trailing: const Icon(Icons.calendar_month),
          onTap: () async {
            final d = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 90)));
            if (d != null) setState(() => _date = d);
          },
        ),
        const Text('Venue (required to confirm)'),
        venues.when(
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => Text('$e'),
          data: (list) => DropdownButton<String>(
            isExpanded: true,
            hint: const Text('Pick a venue'),
            value: _venueId,
            items: [for (final v in list) DropdownMenuItem(value: v['id'] as String, child: Text(v['name'] as String, overflow: TextOverflow.ellipsis))],
            onChanged: (v) => setState(() => _venueId = v),
          ),
        ),
        if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: _busy || _venueId == null
              ? null
              : () async {
                  setState(() => _busy = true);
                  try {
                    final dio = ref.read(apiClientProvider);
                    await dio.post('/spots/${widget.spotId}/schedule', data: {
                      'startsAt': DateTime(_date.year, _date.month, _date.day, 19).toUtc().toIso8601String(),
                      'venueId': _venueId,
                    });
                    if (context.mounted) Navigator.pop(context, true);
                  } catch (e) {
                    if (mounted) setState(() => _error = '$e');
                  } finally {
                    if (mounted) setState(() => _busy = false);
                  }
                },
          child: const Text('Confirm & notify members'),
        ),
      ]),
    );
  }
}

final _venueSearchProvider = FutureProvider.autoDispose.family<List<Map<String, dynamic>>, String>((ref, q) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/venues/search', queryParameters: {'q': q.isEmpty ? 'a' : q});
  return [for (final v in (res.data['venues'] as List? ?? <dynamic>[])) Map<String, dynamic>.from(v as Map)];
});
