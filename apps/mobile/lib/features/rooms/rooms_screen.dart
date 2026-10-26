import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/api_client.dart';
import '../../core/chat_socket.dart';

/// Rooms tab (T7.4): list of joined rooms w/ last message + member count.
class RoomsScreen extends ConsumerStatefulWidget {
  const RoomsScreen({super.key});

  @override
  ConsumerState<RoomsScreen> createState() => _RoomsScreenState();
}

class _RoomsScreenState extends ConsumerState<RoomsScreen> {
  List<Map<String, dynamic>> _rooms = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/rooms');
      final data = (res.data as Map?)?['rooms'] as List? ?? [];
      setState(() { _rooms = data.cast<Map<String, dynamic>>(); _error = null; });
    } catch (_) {
      setState(() => _error = 'Could not load rooms');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rooms')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(children: [SizedBox(height: 200, child: Center(child: Text(_error!)))])
                : ListView(
                    children: [
                      for (final r in _rooms)
                        ListTile(
                          leading: const Icon(Icons.forum_outlined),
                          title: Text(r['district'] as String? ?? 'Room'),
                          subtitle: Text(
                            (r['last_message'] as String?) ?? 'No messages yet',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: Text('${r['member_count'] ?? 0}'),
                          onTap: () => context.push('/rooms/${r['id']}'),
                        ),
                    ],
                  ),
      ),
    );
  }
}

/// Room screen (T7.4): live messages via ChatSocket, member rail drawer,
/// offline queue banner, read-only banner for unverified users.
class RoomScreen extends ConsumerStatefulWidget {
  const RoomScreen({super.key, required this.roomId});
  final String roomId;

  @override
  ConsumerState<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends ConsumerState<RoomScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  List<Map<String, dynamic>> _members = [];
  ChatSocket? _socket;
  bool _connected = false;
  bool _verified = true;
  Timer? _typingDebounce;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final dio = ref.read(apiClientProvider);
    final base = dio.options.baseUrl.replaceFirst(RegExp(r'/v1/?$'), '');
    _socket = ChatSocket(
      baseUrl: base,
      tokenProvider: () async => Supabase.instance.client.auth.currentSession?.accessToken,
    )..connect();
    _socket!.connection.listen((c) {
      if (mounted) setState(() => _connected = c);
    });
    _socket!.messages.listen((m) {
      if (m['roomId'] != widget.roomId) return;
      if (mounted) setState(() => _messages.add(m));
    });
    _socket!.joinRoom(widget.roomId);
    await _loadHistory();
    await _loadMembers();
    // posting gate mirrors server: unverified may read only
    try {
      final me = await dio.get('/me');
      final v = (me.data as Map?)?['phoneVerified'];
      if (mounted) setState(() => _verified = v == true);
    } catch (_) {}
  }

  Future<void> _loadHistory() async {
    final dio = ref.read(apiClientProvider);
    final res = await dio.get('/rooms/${widget.roomId}/messages');
    final msgs = ((res.data as Map?)?['messages'] as List? ?? []).cast<Map<String, dynamic>>();
    if (mounted) {
      setState(() {
        _messages
          ..clear()
          ..addAll(msgs);
      });
    }
  }

  Future<void> _loadMembers() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/rooms/${widget.roomId}/members');
      final m = ((res.data as Map?)?['members'] as List? ?? []).cast<Map<String, dynamic>>();
      if (mounted) setState(() => _members = m);
    } catch (_) {/* non-member view stays */}
  }

  void _send() {
    final body = _controller.text.trim();
    if (body.isEmpty) return;
    _controller.clear();
    _socket?.sendMessage(widget.roomId, body);
  }

  @override
  void dispose() {
    _typingDebounce?.cancel();
    _controller.dispose();
    _scroll.dispose();
    _socket?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Room · ${_members.isEmpty ? '' : _members.length}')),
      endDrawer: Drawer(
        width: 260,
        child: ListView(
          children: [
            const DrawerHeader(child: Text('Members')),
            for (final m in _members)
              ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person)),
                title: Text(m['display_name'] as String? ?? 'Member'),
                subtitle: Text(
                  m['photoAccess'] == 'full' ? 'Photo visible' : 'Photo hidden',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
      body: Column(
        children: [
          if (!_connected)
            const BannerStrip(label: 'Offline — messages will send when reconnected'),
          if (!_verified)
            const BannerStrip(label: 'Read-only: verify your phone to post', emphasis: true),
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              itemCount: _messages.length,
              itemBuilder: (_, i) {
                final m = _messages[i];
                return Align(
                  alignment: Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Text(m['body'] as String? ?? ''),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      enabled: _verified,
                      decoration: const InputDecoration(hintText: 'Message…', isDense: true),
                      onChanged: (_) {
                        _typingDebounce?.cancel();
                        _socket?.sendTyping(widget.roomId, true);
                        _typingDebounce = Timer(
                          const Duration(seconds: 2),
                          () => _socket?.sendTyping(widget.roomId, false),
                        );
                      },
                    ),
                  ),
                  IconButton(onPressed: _verified ? _send : null, icon: const Icon(Icons.send)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class BannerStrip extends StatelessWidget {
  const BannerStrip({super.key, required this.label, this.emphasis = false});
  final String label;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: emphasis
          ? Theme.of(context).colorScheme.errorContainer
          : Theme.of(context).colorScheme.secondaryContainer,
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      child: Text(label, style: Theme.of(context).textTheme.bodySmall),
    );
  }
}
