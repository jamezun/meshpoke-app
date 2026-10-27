import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meshpoke/core/api_client.dart';
import 'package:meshpoke/features/spots/spot_detail_screen.dart';

/// T14.4 activity bell + feed + notification settings.
class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class ActivityItem {
  final String id, type;
  final String category;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  ActivityItem({required this.id, required this.type, required this.category, required this.payload, required this.createdAt});
  factory ActivityItem.fromJson(Map<String, dynamic> j) => ActivityItem(
    id: j['id'], type: j['type'] ?? '', category: j['category'] ?? 'social',
    payload: (j['payload'] as Map<String, dynamic>?) ?? {}, createdAt: DateTime.tryParse(j['created_at'] ?? '') ?? DateTime.now());
  String get icon => switch (category) {
    'social' => '👋', 'spots' => '📍', 'venue' => '🏪', 'promo' => '📣', 'proximity' => '📡', _ => '🔔',
  };
  String get text => switch (type) {
    'poke_received' => 'New poke', 'connection' => 'You connected!',
    'application_accepted' => 'Application accepted', 'application_declined' => 'Application declined',
    'date_pinned' => 'Date pinned — confirm within 48h', 'crew_poll' => 'Crew poll — vote!',
    _ => type,
  };
}

final activityProvider = FutureProvider.autoDispose<(List<ActivityItem>, int)>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/me/activity');
  final items = [for (final m in (res.data['items'] ?? []) as List) ActivityItem.fromJson(m as Map<String, dynamic>)];
  return (items, (res.data['unread'] as num?)?.toInt() ?? 0);
});

/// Bell action for the app bar — shows unread badge, opens feed.
class ActivityBell extends ConsumerWidget {
  const ActivityBell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(activityProvider);
    final unread = async.valueOrNull?.$2 ?? 0;
    return IconButton(
      icon: Badge(
        isLabelVisible: unread > 0,
        label: Text('$unread'),
        child: const Icon(Icons.notifications_outlined),
      ),
      onPressed: () => context.push('/activity'),
    );
  }
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(activityProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity'),
        actions: [IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () => context.push('/activity/settings'))],
      ),
      body: async.when(
        data: (data) {
          final (items, _) = data;
          final filtered = _filter == 'all' ? items : items.where((i) => i.category == _filter).toList();
          return Column(children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Row(children: [
                for (final f in const [('all', 'All'), ('social', 'Pokes'), ('spots', 'Spots'), ('venue', 'Venues'), ('promo', 'Promo')])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(label: Text(f.$2), selected: _filter == f.$1, onSelected: (_) => setState(() => _filter = f.$1)),
                  ),
              ]),
            ),
            Expanded(
              child: filtered.isEmpty
                  ? const Center(child: Text('Nothing yet'))
                  : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (_, i) {
                        final it = filtered[i];
                        return ListTile(
                          leading: Text(it.icon, style: const TextStyle(fontSize: 22)),
                          title: Text(it.text),
                          subtitle: Text(_timeAgo(it.createdAt), style: Theme.of(context).textTheme.bodySmall),
                          onTap: () => _openDeepLink(context, it),
                        );
                      },
                    ),
            ),
          ]);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
      ),
    );
  }

  void _openDeepLink(BuildContext context, ActivityItem it) {
    switch (it.type) {
      case 'poke_received':
        context.push('/inbox');
      case 'connection':
        context.push('/connections');
      case 'date_pinned':
        if (it.payload['spotId'] is String) {
          Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => SpotDetailScreen(spotId: it.payload['spotId'] as String)));
        }
      case 'crew_poll':
        if (it.payload['crewId'] is String) context.push('/crews/${it.payload['crewId']}');
      default:
        break;
    }
  }
}

String _timeAgo(DateTime t) {
  final d = DateTime.now().difference(t);
  if (d.inMinutes < 60) return '${d.inMinutes}m ago';
  if (d.inHours < 24) return '${d.inHours}h ago';
  return '${d.inDays}d ago';
}

class NotificationSettingsScreen extends ConsumerStatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  ConsumerState<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends ConsumerState<NotificationSettingsScreen> {
  Map<String, dynamic>? _prefs;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final dio = ref.read(apiClientProvider);
    final res = await dio.get('/me/notification-prefs');
    if (mounted) setState(() => _prefs = res.data as Map<String, dynamic>);
  }

  Future<void> _patch(Map<String, dynamic> changes) async {
    setState(() => _busy = true);
    final dio = ref.read(apiClientProvider);
    try {
      await dio.patch('/me/notification-prefs', data: changes);
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _prefs;
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: p == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(children: [
              SwitchListTile(
                title: const Text('Promo & product updates'),
                subtitle: const Text('Off by default. We only send with your explicit consent.'),
                value: p['promoOptIn'] == true,
                onChanged: _busy ? null : (v) => _patch({'promoOptIn': v}),
              ),
              SwitchListTile(
                title: const Text('Nearby spots'),
                subtitle: const Text('At most one per day, only when you have it on.'),
                value: p['proximityOptIn'] == true,
                onChanged: _busy ? null : (v) => _patch({'proximityOptIn': v}),
              ),
              SwitchListTile(
                title: const Text('Quiet hours (23:00–08:00)'),
                subtitle: const Text('Hold non-urgent notifications overnight.'),
                value: p['quietHours'] != false,
                onChanged: _busy ? null : (v) => _patch({'quietHours': v}),
              ),
            ]),
    );
  }
}
