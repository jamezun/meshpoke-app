import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/constants.g.dart' as c;
import 'poke_repository.dart';

/// T11.4 Inbox: incoming pokes (Recommended default) + connections + balance.
class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  int _tab = 0; // 0 pokes, 1 connections
  String _sort = 'recommended';

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Inbox'),
          bottom: TabBar(
            onTap: (i) => setState(() => _tab = i),
            tabs: const [Tab(text: 'Pokes'), Tab(text: 'Connections')],
          ),
        ),
        body: _tab == 0 ? _PokesTab(sort: _sort, onSortChanged: (s) => setState(() => _sort = s)) : const _ConnectionsTab(),
      ),
    );
  }
}

class _PokesTab extends ConsumerWidget {
  const _PokesTab({required this.sort, required this.onSortChanged});
  final String sort;
  final void Function(String) onSortChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balance = ref.watch(pokeBalanceProvider);
    final pokes = ref.watch(incomingPokesProvider(sort));
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            children: [
              balance.when(
                data: (b) => Text('${b.leftThisWeek} of ${b.allowance} pokes left this week',
                    style: Theme.of(context).textTheme.bodySmall),
                loading: () => const SizedBox.shrink(),
                error: (e, _) => const SizedBox.shrink(),
              ),
              const Spacer(),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'recommended', label: Text('Recommended')),
                  ButtonSegment(value: 'fifo', label: Text('Newest')),
                ],
                selected: {sort},
                onSelectionChanged: (s) => onSortChanged(s.first),
                showSelectedIcon: false,
                style: const ButtonStyle(visualDensity: VisualDensity.compact),
              ),
            ],
          ),
        ),
        Expanded(
          child: pokes.when(
            data: (list) => list.isEmpty
                ? const Center(child: Text('No pokes yet — they land here'))
                : ListView.builder(
                    itemCount: list.length,
                    itemBuilder: (_, i) {
                      final p = list[i];
                      return _PokeTile(poke: p);
                    },
                  ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: Colors.red))),
          ),
        ),
      ],
    );
  }
}

class _PokeTile extends ConsumerStatefulWidget {
  const _PokeTile({required this.poke});
  final IncomingPoke poke;

  @override
  ConsumerState<_PokeTile> createState() => _PokeTileState();
}

class _PokeTileState extends ConsumerState<_PokeTile> {
  bool _rippling = false;
  bool _done = false;

  Future<void> _pokeBack() async {
    setState(() => _rippling = true);
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/pokes', data: {'to': widget.poke.fromUserId, 'source': 'inbox'});
      final data = res.data as Map<String, dynamic>;
      setState(() => _done = true);
      if (mounted) {
        final msg = data['pokeBack'] == true
            ? 'Connected! Chat is open.'
            : 'Poked back — waiting for them';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
      if (data['pokeBack'] == true) {
        ref.invalidate(incomingPokesProvider('recommended'));
        ref.invalidate(incomingPokesProvider('fifo'));
        ref.invalidate(connectionsProvider);
      }
    } on Exception catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Poke failed: $e')));
      }
    } finally {
      await Future<void>.delayed(const Duration(milliseconds: 600));
      if (mounted) setState(() => _rippling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.poke;
    final trust = p.trust;
    final proven = trust?['provenState'] ?? 'unproven';
    final attended = trust?['spotsAttended'] ?? 0;
    return ListTile(
      leading: CircleAvatar(child: Text(p.displayName.isNotEmpty ? p.displayName[0].toUpperCase() : '?')),
      title: Text(p.displayName + (p.plan != 'free' ? '  ⚡' : '')),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (p.note != null && p.note!.isNotEmpty) Text('"${p.note}"', maxLines: 2, overflow: TextOverflow.ellipsis),
          Text('$attended spots · $proven · match ${(p.score * 100).round()}%', style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
      isThreeLine: true,
      trailing: _done
          ? const Icon(Icons.check_circle, color: Colors.green)
          : AnimatedScale(
              scale: _rippling ? 1.35 : 1.0,
              duration: const Duration(milliseconds: 300),
              child: FilledButton.tonal(
                onPressed: _rippling ? null : _pokeBack,
                child: const Text('Poke back · Free'),
              ),
            ),
    );
  }
}

class _ConnectionsTab extends ConsumerWidget {
  const _ConnectionsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conns = ref.watch(connectionsProvider);
    return conns.when(
      data: (list) => list.isEmpty
          ? const Center(child: Text('Mutual pokes become connections'))
          : ListView.builder(
              itemCount: list.length,
              itemBuilder: (_, i) {
                final c = list[i];
                return ListTile(
                  leading: CircleAvatar(child: Text(c.displayName.isNotEmpty ? c.displayName[0].toUpperCase() : '?')),
                  title: Text(c.displayName),
                  subtitle: Text(c.active ? 'Connected' : 'Disconnected'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (c.active && c.roomId != null)
                        IconButton(
                          icon: const Icon(Icons.chat_bubble_outline),
                          tooltip: 'Message',
                          onPressed: () => context.push('/rooms/${c.roomId}'),
                        ),
                      if (c.active)
                        IconButton(
                          icon: const Icon(Icons.link_off),
                          tooltip: 'Disconnect',
                          onPressed: () async {
                            final sure = await showDialog<bool>(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('Disconnect?'),
                                content: const Text('The chat closes for both of you. No notification is sent.'),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                                  FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Disconnect')),
                                ],
                              ),
                            );
                            if (sure == true) {
                              final dio = ref.read(apiClientProvider);
                              await dio.post('/connections/${c.id}/disconnect');
                              ref.invalidate(connectionsProvider);
                            }
                          },
                        ),
                    ],
                  ),
                );
              },
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e', style: const TextStyle(color: Colors.red))),
    );
  }
}

/// People-you-met sheet (T11.4): free pokes, "{h}h left" countdown.
class PeopleYouMetSheet extends ConsumerWidget {
  const PeopleYouMetSheet({super.key, required this.spotId, required this.spotName});
  final String spotId;
  final String spotName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pym = ref.watch(peopleYouMetProvider(spotId));
    return DraggableScrollableSheet(
      expand: false,
      builder: (_, controller) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text('People you met · $spotName', style: Theme.of(context).textTheme.titleMedium),
          ),
          Expanded(
            child: pym.when(
              data: (data) {
                final people = data;
                if (people.isEmpty) return const Center(child: Text('Nobody else yet'));
                return ListView.builder(
                  controller: controller,
                  itemCount: people.length,
                  itemBuilder: (_, i) {
                    final person = people[i];
                    return ListTile(
                      leading: CircleAvatar(child: Text(person.displayName.isNotEmpty ? person.displayName[0].toUpperCase() : '?')),
                      title: Text(person.displayName),
                      subtitle: Text(
                        'Free poke · met at $spotName',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      onLongPress: () => _rateSheet(context, ref, spotId, person.userId, person.displayName),
                      trailing: FilledButton.tonal(
                        onPressed: () async {
                          final dio = ref.read(apiClientProvider);
                          try {
                            final res = await dio.post('/pokes', data: {
                              'to': person.userId,
                              'source': 'people_you_met',
                              'spotId': spotId,
                            });
                            final d = res.data as Map<String, dynamic>;
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                content: Text(d['pokeBack'] == true ? 'Connected!' : 'Poked (free — you met)')));
                            }
                          } on Exception catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
                            }
                          }
                        },
                        child: const Text('Poke · Free'),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('$e')),
            ),
          ),
        ],
      ),
    );
  }
}

/// Poke sheet with note counter + allowance indicator — used from map/profile.
Future<void> showPokeSheet(BuildContext context, WidgetRef ref, String toUserId, String displayName) {
  final controller = TextEditingController();
  final balance = ref.read(pokeBalanceProvider).valueOrNull;
  final maxNote = 200; // plan-aware cap applied server-side
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => Padding(
        padding: EdgeInsets.only(
          left: 16, right: 16, top: 16,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Poke $displayName', style: Theme.of(ctx).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (balance != null)
              Text('${balance.leftThisWeek} of ${balance.allowance} pokes left this week',
                  style: Theme.of(ctx).textTheme.bodySmall),
            const SizedBox(height: 8),
            TextField(
              controller: controller,
              maxLength: maxNote,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Say hi — why them? (optional)',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 4),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () async {
                  final dio = ref.read(apiClientProvider);
                  try {
                    final res = await dio.post('/pokes', data: {
                      'to': toUserId,
                      if (controller.text.trim().isNotEmpty) 'note': controller.text.trim(),
                      'source': 'profile',
                    });
                    if (ctx.mounted) {
                      Navigator.pop(ctx);
                      final d = res.data as Map<String, dynamic>;
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(d['pokeBack'] == true ? 'Connected!' : 'Poked — expires in ${c.Pokes.expiryDays} days')));
                    }
                  } on Exception catch (e) {
                    if (ctx.mounted) {
                      ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Failed: $e')));
                    }
                  }
                },
                child: const Text('Poke'),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}


/// T13.5: private post-spot safety rating (1–5 + flag) — feeds moderation.
Future<void> _rateSheet(BuildContext context, WidgetRef ref, String spotId, String userId, String name) async {
  final ctrl = TextEditingController();
  final flagged = ValueNotifier<bool>(false);
  final go = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: StatefulBuilder(
          builder: (ctx, setSheet) => Column(mainAxisSize: MainAxisSize.min, children: [
            Padding(padding: const EdgeInsets.all(12), child: Text('How was $name?', style: Theme.of(ctx).textTheme.titleMedium)),
            Wrap(
              spacing: 8,
              children: [for (final r in [1, 2, 3, 4, 5])
                ChoiceChip(label: Text('$r'), selected: ctrl.text == '$r' && r == 5 ? false : ctrl.text == '$r' && r == int.tryParse(ctrl.text),
                  onSelected: (_) => setSheet(() => ctrl.text = '$r'))],
            ),
            SwitchListTile(
              value: flagged.value,
              onChanged: (v) => setSheet(() => flagged.value = v),
              title: const Text('Flag for safety review'),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Submit'),
              ),
            ),
          ]),
        ),
      ),
    ),
  );
  if (go != true) return;
  final rating = int.tryParse(ctrl.text);
  if (rating == null) return;
  final dio = ref.read(apiClientProvider);
  try {
    await dio.post('/spots/$spotId/safety-rating', data: {
      'ratedUserId': userId, 'rating': rating, if (flagged.value) 'flag': true,
    });
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thanks — private, always')));
    }
  } on Exception catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Rating failed: $e')));
    }
  }
}
