import 'package:flutter/material.dart';

/// Venue page (PRD §4.2/§5.3): name, category, address, claimed badge, activity,
/// save/unsave, report; add-a-place flow with duplicate suggestions.
class VenuePageScreen extends StatelessWidget {
  const VenuePageScreen({super.key, required this.venueId});
  final String venueId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Venue')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Venue $venueId',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.amber.shade900,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('Claimed', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Cafe · 123 Queen\'s Road Central',
            style: TextStyle(color: Colors.white54),
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.local_activity_outlined),
              title: const Text('3 check-ins this week'),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: FilledButton.tonalIcon(
                  onPressed: () {},
                  icon: const Icon(Icons.bookmark_border),
                  label: const Text('Save'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.flag_outlined),
                  label: const Text('Report'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// "Add a place" flow: drop pin → name/category → duplicate suggestions (force=true to override).
class AddPlaceScreen extends StatefulWidget {
  const AddPlaceScreen({super.key});
  @override
  State<AddPlaceScreen> createState() => _AddPlaceScreenState();
}

class _AddPlaceScreenState extends State<AddPlaceScreen> {
  final _name = TextEditingController();
  String _category = 'cafe';
  bool _hasPinned = false;
  List<Map<String, dynamic>> _duplicates = [];
  bool _submitting = false;

  static const kCategories = [
    'restaurant',
    'cafe',
    'bar',
    'dessert',
    'fast_food',
    'convenience',
    'gym',
    'sports',
    'park',
    'library',
    'coworking',
    'other',
  ];

  Future<void> _submit({bool force = false}) async {
    if (!_hasPinned) {
      setState(() => _duplicates = []);
      return; // caller shows "drop a pin first"
    }
    setState(() => _submitting = true);
    // POST /venues via api client; 409 → duplicates list shown, force=true overrides.
    // Placeholder flow until live env; the duplicate-suggestion UI is what this screen owns.
    setState(() {
      _submitting = false;
      _duplicates = force ? [] : const [];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add a place')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListTile(
            leading: Icon(
              _hasPinned ? Icons.place : Icons.add_location_alt_outlined,
            ),
            title: Text(_hasPinned ? 'Pin dropped' : 'Drop a pin'),
            subtitle: Text(
              _hasPinned ? 'Tap to move' : 'Tap the map to place it',
            ),
            onTap: () => setState(() => _hasPinned = true),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _category,
            items: [
              for (final c in kCategories)
                DropdownMenuItem(value: c, child: Text(c)),
            ],
            onChanged: (v) => setState(() => _category = v!),
            decoration: const InputDecoration(labelText: 'Category'),
          ),
          if (_duplicates.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'Similar places nearby',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const Text(
              'Is one of these the same place?',
              style: TextStyle(color: Colors.white54),
            ),
            for (final d in _duplicates)
              ListTile(
                leading: const Icon(Icons.place),
                title: Text('${d['display_name']}'),
              ),
            FilledButton(
              onPressed: () => _submit(force: true),
              child: const Text('It\'s different — add anyway'),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _submitting ? null : () => _submit(),
            child: _submitting
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Add place'),
          ),
        ],
      ),
    );
  }
}

/// About screen with data attribution (T4.6 GET /meta/attributions).
class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});
  @override
  Widget build(BuildContext context) {
    const attributions = [
      'Contains information from DATA.GOV.HK / 資料一線通 — FEHD licensed restaurants.',
      'Address geocoding via the Address Lookup Service (ALS), Lands Department.',
      'Coordinate conversion: HK1980 Grid System, Survey & Mapping Office.',
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('About MeshPoke')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Poke the mesh. Watch your network ripple.',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          const Text(
            'Data attribution',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          for (final a in attributions)
            ListTile(
              dense: true,
              leading: const Icon(Icons.info_outline, size: 18),
              title: Text(a, style: const TextStyle(fontSize: 13)),
            ),
        ],
      ),
    );
  }
}
