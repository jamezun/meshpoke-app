import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as sio;

/// Socket.io client with reconnect + offline queue (T7.4).
/// Sends queued messages oldest-first on reconnect; drops ack-failures
/// to a [failed] callback (caller surfaces a snackbar).
class ChatSocket {
  ChatSocket({required this.baseUrl, required this.tokenProvider});

  final String baseUrl;
  final Future<String?> Function() tokenProvider;
  sio.Socket? _io;

  final List<Map<String, dynamic>> _queue = [];
  final _messages = StreamController<Map<String, dynamic>>.broadcast();
  final _presence = StreamController<Map<String, dynamic>>.broadcast();
  final _typing = StreamController<Map<String, dynamic>>.broadcast();
  final _connection = StreamController<bool>.broadcast();
  final _failed = StreamController<Map<String, dynamic>>.broadcast();

  bool get connected => _io?.connected ?? false;

  Stream<Map<String, dynamic>> get messages => _messages.stream;
  Stream<Map<String, dynamic>> get presence => _presence.stream;
  Stream<Map<String, dynamic>> get typing => _typing.stream;
  Stream<bool> get connection => _connection.stream;
  Stream<Map<String, dynamic>> get failed => _failed.stream;

  Future<void> connect() async {
    final token = await tokenProvider();
    if (token == null) return;
    _io = sio.io(
      baseUrl,
      sio.OptionBuilder()
          .setPath('/ws')
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .setReconnectionDelay(2000)
          .build(),
    );
    _io!
      ..onConnect((_) {
        _connection.add(true);
        _flush();
      })
      ..onDisconnect((_) => _connection.add(false))
      ..on('message:new', (d) => _messages.add(Map<String, dynamic>.from(d as Map)))
      ..on('presence', (d) => _presence.add(Map<String, dynamic>.from(d as Map)))
      ..on('typing', (d) => _typing.add(Map<String, dynamic>.from(d as Map)));
  }

  void joinRoom(String roomId) => _io?.emitWithAck('room:join', roomId, ack: _ok('join:$roomId'));
  void leaveRoom(String roomId) => _io?.emit('room:leave', roomId);
  void sendTyping(String roomId, bool isTyping) => _io?.emit('typing', [roomId, isTyping]);

  /// Send now if connected, else queue. [onAck] gets the server ack.
  /// [confirmed] = user passed the T13.2 scam/contact interstitial.
  void sendMessage(String roomId, String body, {String? clientMsgId, bool confirmed = false, void Function(Map<String, dynamic>)? onAck}) {
    final payload = <String, dynamic>{'roomId': roomId, 'body': body, 'clientMsgId': ?clientMsgId, 'confirmed': confirmed};
    if (connected) {
      _io?.emitWithAck('message:send', payload, ack: (a) {
        final m = Map<String, dynamic>.from(a as Map);
        if (m['ok'] == true) {
          onAck?.call(m);
        } else {
          _failed.add({...m, 'payload': payload});
        }
      });
    } else {
      _queue.add(payload);
    }
  }

  Future<void> _flush() async {
    while (_queue.isNotEmpty && connected == true) {
      final p = _queue.removeAt(0);
      _io?.emitWithAck('message:send', p, ack: (a) {
        final m = Map<String, dynamic>.from(a as Map);
        if (m['ok'] != true) _failed.add({...m, 'payload': p});
      });
    }
  }

  void Function(dynamic) _ok(String tag) => (a) {
        final m = Map<String, dynamic>.from(a as Map);
        if (m['ok'] != true) _failed.add({...m, 'tag': tag});
      };

  void dispose() {
    _io?.dispose();
    _queue.clear();
    _messages.close();
    _presence.close();
    _typing.close();
    _connection.close();
    _failed.close();
  }
}
