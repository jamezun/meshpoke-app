import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Profile tab: trust-signal row, sketch/keywords editor, photos, settings entries.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 32,
                child: Icon(Icons.person, size: 36),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'You',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Member since 2026 · 0 spots · Unproven',
                    style: TextStyle(color: Colors.white54, fontSize: 13),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('Sketch & keywords'),
              subtitle: const Text(
                'Industry, one-liner, 10 keywords with levels',
              ),
              onTap: () => context.push('/profile/edit'),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.photo_outlined),
              title: const Text('Photos'),
              subtitle: const Text(
                'Pick, upload, reorder — visible per photo ladder',
              ),
              onTap: () {}, // photo manager lands with R2 env keys (M-phase)
            ),
          ),
          Card(
            child: SwitchListTile(
              title: const Text('Hide my photo in chat rooms'),
              value: true,
              onChanged: (_) {}, // PATCH /me hide_photo_in_rooms
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Settings'),
              onTap: () {},
            ),
          ),
        ],
      ),
    );
  }
}
