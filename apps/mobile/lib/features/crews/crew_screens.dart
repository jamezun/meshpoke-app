import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meshpoke/core/api_client.dart';
import 'package:meshpoke/features/spots/spot_detail_screen.dart';

/// T12.3 crew UI: list crews, members/chat/Rebook, poll voting.
class Crew {
  final String id;
  final String spotName;
  final int members;
  final String? roomId;
  final String? whatsappUrl;
  Crew({required this.id, required this.spotName, required this.members, this.roomId, this.whatsappUrl});
  factory Crew.fromJson(Map<String, dynamic> j) => Crew(
    id: j['id'], spotName: j['spotName'] ?? 'Crew', members: (j['members'] as num?)?.toInt() ?? 0,
    roomId: j['roomId'], whatsappUrl: j['whatsappUrl']);
}

class Rebook {
  final String id;
  final List<String> pollOptions;
  final Map<String, dynamic> votes;
  final String? newSpotId;
  Rebook({required this.id, required this.pollOptions, required this.votes, this.newSpotId});
  factory Rebook.fromJson(Map<String, dynamic> j) => Rebook(
    id: j['id'],
    pollOptions: [for (final o in (j['pollOptions'] ?? []) as List) o as String],
    votes: (j['votes'] as Map<String, dynamic>?) ?? {},
    newSpotId: j['newSpotId']);
}

final crewsProvider = FutureProvider.autoDispose<List<Crew>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/crews');
  return [for (final c in (res.data['crews'] ?? []) as List) Crew.fromJson(c as Map<String, dynamic>)];
});

final rebooksProvider = FutureProvider.autoDispose.family<List<Rebook>, String>((ref, crewId) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/crews/$crewId/rebooks');
  return [for (final r in (res.data['rebooks'] ?? []) as List) Rebook.fromJson(r as Map<String, dynamic>)];
});

class CrewsScreen extends ConsumerWidget {
  const CrewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final crews = ref.watch(crewsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Crews')),
      body: crews.when(
        data: (list) => list.isEmpty
            ? const Center(child: Text('After a spot ends, tap "Keep the crew"'))
            : ListView(children: [for (final c in list) ListTile(
                leading: const Icon(Icons.group),
                title: Text(c.spotName),
                subtitle: Text('${c.members} members'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/crews/${c.id}'),
              )]),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }
}

class CrewDetailScreen extends ConsumerStatefulWidget {
  const CrewDetailScreen({super.key, required this.crewId});
  final String crewId;

  @override
  ConsumerState<CrewDetailScreen> createState() => _CrewDetailScreenState();
}

class _CrewDetailScreenState extends ConsumerState<CrewDetailScreen> {
  bool _startingPoll = false;

  @override
  Widget build(BuildContext context) {
    final crews = ref.watch(crewsProvider).valueOrNull ?? [];
    final crew = crews.where((c) => c.id == widget.crewId).firstOrNull;
    final rebooks = ref.watch(rebooksProvider(widget.crewId));
    return Scaffold(
      appBar: AppBar(title: Text(crew?.spotName ?? 'Crew')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(child: Text('${crew?.members ?? 0} members · keep it going', style: Theme.of(context).textTheme.bodySmall)),
                if (crew?.roomId != null)
                  FilledButton.tonal(
                    onPressed: () => context.push('/rooms/${crew!.roomId}'),
                    child: const Text('Chat'),
                  ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _startingPoll ? null : _startPoll,
                  child: const Text('Rebook'),
                ),
              ],
            ),
          ),
          Expanded(
            child: rebooks.when(
              data: (list) => ListView(
                children: [for (final rb in list) _RebookCard(rebook: rb, crewId: widget.crewId)],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('$e')),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _startPoll() async {
    setState(() => _startingPoll = true);
    try {
      final dio = ref.read(apiClientProvider);
      // default poll: next Fri/Sat/Sun 19:30
      final now = DateTime.now();
      final opts = <String>[];
      var d = now;
      while (opts.length < 3) {
        d = d.add(const Duration(days: 1));
        if (d.weekday == DateTime.friday || d.weekday == DateTime.saturday || d.weekday == DateTime.sunday) {
          opts.add(DateTime(d.year, d.month, d.day, 19, 30).toUtc().toIso8601String());
        }
      }
      await dio.post('/crews/${widget.crewId}/rebook', data: {'pollOptions': opts});
      ref.invalidate(rebooksProvider(widget.crewId));
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Rebook failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _startingPoll = false);
    }
  }
}

class _RebookCard extends ConsumerWidget {
  const _RebookCard({required this.rebook, required this.crewId});
  final Rebook rebook;
  final String crewId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final total = rebook.votes.values
        .map((v) => (v as List).length)
        .fold<int>(0, (a, b) => a + b);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(rebook.newSpotId != null ? 'Rebooked ✓' : 'Pick a date', style: Theme.of(context).textTheme.titleSmall),
            for (final opt in rebook.pollOptions)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(DateFormatOpt.format(opt), style: Theme.of(context).textTheme.bodyMedium),
                    ),
                    Text('${((rebook.votes[opt] as List?) ?? []).length} votes', style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(width: 8),
                    rebook.newSpotId != null
                        ? const SizedBox.shrink()
                        : TextButton(
                            onPressed: () async {
                              final dio = ref.read(apiClientProvider);
                              await dio.post('/rebooks/${rebook.id}/vote', data: {'option': opt});
                              ref.invalidate(rebooksProvider(crewId));
                            },
                            child: const Text('Vote'),
                          ),
                  ],
                ),
              ),
            if (rebook.newSpotId != null)
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.tonal(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => SpotDetailScreen(spotId: rebook.newSpotId!)),
                  ),
                  child: const Text('View spot'),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text('$total votes so far', style: Theme.of(context).textTheme.bodySmall),
              ),
          ],
        ),
      ),
    );
  }
}

class DateFormatOpt {
  static String format(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    final wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.weekday - 1];
    return '$wd ${d.day}/${d.month} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}
