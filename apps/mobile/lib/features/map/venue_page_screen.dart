import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';

/// T20.7: venue page with membership join, ladder display, progress bar,
/// coupons. Fetches GET /venues/:id (venue + ladder + myMembership).
class VenuePageScreen extends ConsumerStatefulWidget {
  const VenuePageScreen({super.key, required this.venueId});
  final String venueId;

  @override
  ConsumerState<VenuePageScreen> createState() => _VenuePageScreenState();
}

class _VenuePageScreenState extends ConsumerState<VenuePageScreen> {
  Map<String, dynamic>? _data;
  String? _err;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/venues/${widget.venueId}');
      if (mounted) setState(() { _data = Map<String, dynamic>.from(res.data); _err = null; });
    } catch (e) {
      if (mounted) setState(() => _err = 'Could not load venue');
    }
  }

  Future<void> _join() async {
    setState(() => _busy = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/venues/${widget.venueId}/membership');
      await _load();
    } on Exception catch (e) {
      String msg = 'Could not join';
      final d = e.toString();
      if (d.contains('402')) msg = 'Membership cap reached — too many venues';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _leave() async {
    setState(() => _busy = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.delete('/venues/${widget.venueId}/membership');
      await _load();
    } on Exception {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not leave')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final venue = _data?['venue'] as Map<String, dynamic>?;
    final ladder = (_data?['ladder'] as List?) ?? const [];
    final mine = _data?['myMembership'] as Map<String, dynamic>?;

    return Scaffold(
      appBar: AppBar(title: Text(venue?['display_name'] as String? ?? 'Venue')),
      body: _err != null
          ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(_err!), const SizedBox(height: 8),
              OutlinedButton(onPressed: _load, child: const Text('Retry')),
            ]))
          : venue == null
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Row(children: [
                      Expanded(
                        child: Text(
                          venue['display_name'] as String? ?? '',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                        ),
                      ),
                      if (venue['claimed'] == true)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: Colors.amber.shade900, borderRadius: BorderRadius.circular(8)),
                          child: const Text('Claimed', style: TextStyle(fontSize: 12)),
                        ),
                    ]),
                    const SizedBox(height: 8),
                    Text(
                      '${venue['category'] ?? ''} · ${venue['address'] ?? ''}',
                      style: const TextStyle(color: Colors.white54),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.local_activity_outlined),
                        title: Text('${venue['activity_7d'] ?? 0} check-ins this week'),
                        subtitle: venue['claimed'] == true ? Text('${venue['member_count']} members') : null,
                      ),
                    ),
                    if (venue['claimed'] == true) ..._membershipSection(ladder, mine),
                  ],
                ),
    );
  }

  List<Widget> _membershipSection(List ladder, Map<String, dynamic>? mine) {
    final status = mine?['status'] as String?;
    final visits = (mine?['visits_count'] as num?)?.toInt() ?? 0;
    final level = (mine?['level_position'] as num?)?.toInt() ?? 0;
    // progress to next level
    final nextLevel = ladder.where((l) => (l['position'] as num) == level + 1).toList();
    double progress = 0;
    String progressLabel = '';
    if (status == 'active') {
      if (nextLevel.isNotEmpty) {
        final nl = nextLevel.first as Map<String, dynamic>;
        final need = (nl['min_visits'] as num).toInt();
        progress = (visits / need).clamp(0.0, 1.0);
        progressLabel = '${need - visits > 0 ? need - visits : 0} more visits to ${nl['name']}';
      } else if (ladder.isNotEmpty) {
        progress = 1;
        progressLabel = 'Top level — thank you for being a regular';
      }
    }

    return [
      const SizedBox(height: 16),
      Text('Membership', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      if (status == null)
        FilledButton(
          onPressed: _busy ? null : _join,
          child: _busy ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Join as a member'),
        )
      else if (status == 'waitlisted')
        Card(child: ListTile(
          leading: const Icon(Icons.hourglass_top),
          title: const Text('On the waitlist'),
          subtitle: const Text('You\'ll be notified when a seat frees up'),
          trailing: TextButton(onPressed: _busy ? null : _leave, child: const Text('Leave')),
        ))
      else ...[
        Card(child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Level $level${level > 0 ? ' · ${_levelName(ladder, level)}' : ''} · $visits visits'),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: progress, minHeight: 6),
            const SizedBox(height: 6),
            Text(progressLabel, style: const TextStyle(fontSize: 12, color: Colors.white54)),
          ]),
        )),
        Align(alignment: Alignment.centerRight, child: TextButton(onPressed: _busy ? null : _leave, child: const Text('End membership'))),
      ],
      const SizedBox(height: 16),
      Text('Member ladder', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      for (final l in ladder)
        ListTile(
          dense: true,
          leading: CircleAvatar(
            radius: 14,
            backgroundColor: ((l as Map<String, dynamic>)['position'] as num) == level && status == 'active' ? Colors.green.shade700 : null,
            child: Text('${l['position']}'),
          ),
          title: Text('${l['name']}'),
          subtitle: Text(
            '${l['min_visits']} visits'
            '${(l['min_months'] as num?) != 0 && l['min_months'] != null ? ' · ${l['min_months']} mo' : ''}'
            '${l['discount_pct'] != null ? ' · −${l['discount_pct']}%' : ''}'
            '${l['perk_text'] != null && (l['perk_text'] as String).isNotEmpty ? ' · ${l['perk_text']}' : ''}',
          ),
        ),
    ];
  }

  String _levelName(List ladder, int position) {
    for (final l in ladder) {
      if ((l as Map<String, dynamic>)['position'] as num == position) return l['name'] as String;
    }
    return '';
  }
}
