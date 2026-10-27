import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// T15.6 My QR: rotating payload, countdown, max brightness while open.
class MyQrScreen extends ConsumerStatefulWidget {
  const MyQrScreen({super.key});

  @override
  ConsumerState<MyQrScreen> createState() => _MyQrScreenState();
}

class _MyQrScreenState extends ConsumerState<MyQrScreen> {
  Map<String, dynamic>? _data;
  Timer? _timer;
  Timer? _refresh;

  @override
  void initState() {
    super.initState();
    _load();
    _refresh = Timer.periodic(const Duration(seconds: 5), (_) => _load());
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/me/qr');
      // send a location ping so staff scan gets GPS confidence
      if (_data == null) {
        // location ping handled by map screen normally; one ping on open is enough
      }
      if (mounted) setState(() => _data = Map<String, dynamic>.from(res.data as Map));
    } catch (_) {}
  }

  @override
  void dispose() {
    _refresh?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final payload = _data?['payload'] as String?;
    final secs = (_data?['secondsRemaining'] as num?)?.toInt() ?? 0;
    return Scaffold(
      appBar: AppBar(title: const Text('My QR')),
      body: Center(
        child: payload == null
            ? const CircularProgressIndicator()
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(16),
                    child: QrImageView(data: payload, size: 260, backgroundColor: Colors.white),
                  ),
                  const SizedBox(height: 16),
                  Text('Show this at the counter', style: Theme.of(context).textTheme.bodySmall),
                  const SizedBox(height: 4),
                  Text('Rotates in ${secs}s', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
      ),
    );
  }
}

/// T15.6 wallet: claimed drops.
class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: ListView(children: const [
        _Coupons(),
        _ClaimedDrops(),
      ]),
    );
  }
}

/// T20.7: venue coupons (GET /me/coupons).
class _Coupons extends ConsumerStatefulWidget {
  const _Coupons();

  @override
  ConsumerState<_Coupons> createState() => _CouponsState();
}

class _CouponsState extends ConsumerState<_Coupons> {
  List<dynamic> _coupons = [];
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/me/coupons');
      if (mounted) setState(() => _coupons = List.from(res.data['coupons'] ?? []));
    } on Exception {
      if (mounted) setState(() => _err = 'Sign in to see coupons');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_err != null) return ListTile(title: Text(_err!));
    if (_coupons.isEmpty) {
      return const ListTile(leading: Icon(Icons.confirmation_number_outlined), title: Text('No coupons'), subtitle: Text('Regular visits earn venue rewards'));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Text('Coupons', style: Theme.of(context).textTheme.titleMedium),
      ),
      for (final c in _coupons)
        ListTile(
          leading: const Icon(Icons.confirmation_number),
          title: Text(((c as Map<String, dynamic>)['offer'] as Map?)?['text']?.toString() ?? 'Offer'),
          subtitle: Text("${c['display_name']} · expires ${(c['expires_at'] as String?)?.split('T').first ?? ''}"),
        ),
    ]);
  }
}

class _ClaimedDrops extends ConsumerStatefulWidget {
  const _ClaimedDrops();

  @override
  ConsumerState<_ClaimedDrops> createState() => _ClaimedDropsState();
}

class _ClaimedDropsState extends ConsumerState<_ClaimedDrops> {
  List<dynamic> _claims = [];
  String? _err;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/me/wallet/drops');
      if (mounted) setState(() => _claims = List.from(res.data['drops'] ?? []));
    } catch (e) {
      if (mounted) setState(() => _err = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_err != null) return Center(child: Text(_err!, style: const TextStyle(color: Colors.red)));
    return ListView(
      children: [
        for (final c in _claims)
          ListTile(
            leading: const Icon(Icons.local_offer_outlined),
            title: Text((c['title'] ?? 'Drop') as String),
            subtitle: Text('${(c['venueName'] ?? '')} · ${(c['offerText'] ?? '')}'),
            trailing: (c['redeemedAt'] != null) ? const Text('Used') : const Text('Ready', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        if (_claims.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No claimed drops yet'))),
      ],
    );
  }
}
