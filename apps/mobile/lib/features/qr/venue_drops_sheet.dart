import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';

/// T15.6 venue sheet: active drops + claim.
class VenueDropsSheet extends ConsumerStatefulWidget {
  final String venueId;
  final String venueName;
  const VenueDropsSheet({super.key, required this.venueId, required this.venueName});

  @override
  ConsumerState<VenueDropsSheet> createState() => _VenueDropsSheetState();
}

class _VenueDropsSheetState extends ConsumerState<VenueDropsSheet> {
  List<dynamic> _drops = [];
  String? _err;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/venues/${widget.venueId}/drops');
      if (mounted) setState(() { _drops = List.from(res.data['drops'] ?? []); _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _err = '$e'; _loading = false; });
    }
  }

  Future<void> _claim(String dropId) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/drops/$dropId/claim');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Claimed! Show My QR at the counter.')));
        await _load();
      }
    } catch (e) {
      if (mounted) {
        final msg = '$e'.contains('409') ? 'Already claimed or full' : '$e';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text(widget.venueName, style: Theme.of(context).textTheme.titleMedium),
          ),
          if (_loading) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
          if (_err != null) Padding(padding: const EdgeInsets.all(16), child: Text(_err!, style: const TextStyle(color: Colors.red))),
          Flexible(
            child: ListView(
              shrinkWrap: true,
              children: [
                for (final d in _drops)
                  ListTile(
                    leading: Icon(d['kind'] == 'group' ? Icons.groups : Icons.local_offer,
                        color: d['sponsored'] == true ? Colors.amber : null),
                    title: Text('${d['title']}'),
                    subtitle: Text('${d['offer_text']} · ${d['claimed_count']}/${d['capacity']} claimed'),
                    trailing: FilledButton.tonal(onPressed: () => _claim(d['id'] as String), child: const Text('Claim')),
                  ),
                if (!_loading && _drops.isEmpty)
                  const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No active drops right now'))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
