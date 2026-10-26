import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Bottom-tab shell: Map, Spots, Rooms, Inbox, Profile (PRD §5.1).
/// Header extras (activity bell, My QR) land with M14/M15 — placeholders now.
class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key, required this.child});
  final Widget child;

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _index = 0;

  static const _tabs = [
    (icon: Icons.map, label: 'Map', path: '/map'),
    (icon: Icons.groups, label: 'Spots', path: '/spots'),
    (icon: Icons.chat_bubble_outline, label: 'Rooms', path: '/rooms'),
    (icon: Icons.notifications_none, label: 'Inbox', path: '/inbox'),
    (icon: Icons.person_outline, label: 'Profile', path: '/profile'),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final i = _tabs.indexWhere((t) => location.startsWith(t.path));
    if (i >= 0) _index = i;
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => context.go(_tabs[i].path),
        destinations: [
          for (final t in _tabs)
            NavigationDestination(icon: Icon(t.icon), label: t.label),
        ],
      ),
    );
  }
}
