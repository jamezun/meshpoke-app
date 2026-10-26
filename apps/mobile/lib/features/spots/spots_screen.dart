import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'spot_detail_screen.dart';
import 'spot_repository.dart';

/// Spots tab (T9.5): district-scoped event list + time filter.
class SpotsScreen extends ConsumerStatefulWidget {
  const SpotsScreen({super.key});

  @override
  ConsumerState<SpotsScreen> createState() => _SpotsScreenState();
}

class _SpotsScreenState extends ConsumerState<SpotsScreen> {
  String? _districtId;
  String _time = 'week';

  @override
  Widget build(BuildContext context) {
    final districts = ref.watch(districtListProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Spots')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: districts.when(
                    loading: () => const Center(child: LinearProgressIndicator()),
                    error: (e, _) => Text('$e', style: const TextStyle(fontSize: 12)),
                    data: (list) => DropdownButton<String>(
                      isExpanded: true,
                      hint: const Text('District'),
                      value: _districtId,
                      items: [
                        for (final d in list)
                          DropdownMenuItem(value: d.id, child: Text(d.nameEn, overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (v) => setState(() => _districtId = v),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'today', label: Text('Today')),
                    ButtonSegment(value: 'week', label: Text('Week')),
                    ButtonSegment(value: 'all', label: Text('All')),
                  ],
                  selected: {_time},
                  onSelectionChanged: (s) => setState(() => _time = s.first),
                ),
              ],
            ),
          ),
          Expanded(
            child: _districtId == null
                ? const Center(child: Text('Pick a district to browse spots'))
                : ref.watch(spotsProvider((_districtId!, _time))).when(
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('$e')),
                    data: (spots) => spots.isEmpty
                        ? const Center(child: Text('No spots yet — host one!'))
                        : ListView.builder(
                            itemCount: spots.length,
                            itemBuilder: (_, i) {
                              final s = spots[i];
                              return ListTile(
                                leading: _stateBadge(s.state),
                                title: Text(s.name),
                                subtitle: Text(
                                  '${s.template} · ${s.memberCount}/${s.maxHeadcount}'
                                  '${s.startsAt != null ? ' · ${s.startsAt!.toLocal().month}/${s.startsAt!.toLocal().day}' : ''}',
                                ),
                                trailing: s.joinMode == 'open'
                                    ? const Chip(label: Text('Open'))
                                    : const Chip(label: Text('Apply')),
                                onTap: () => Navigator.of(context).push(
                                  MaterialPageRoute(builder: (_) => SpotDetailScreen(spotId: s.id)),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _stateBadge(String? state) {
    final s = state ?? 'forming';
    final color = switch (s) {
      'confirmed' => Colors.green,
      'live' => Colors.red,
      _ => Colors.orange,
    };
    return CircleAvatar(backgroundColor: color.withValues(alpha: .2), child: Text(s[0].toUpperCase(), style: TextStyle(color: color)));
  }
}
