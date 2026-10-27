// T17.6: referral screen — share link credits both sides with pokes.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/api_client.dart';

class Referral {
  final String code;
  final int monthRewarded;
  final int monthCap;
  final List<Map<String, dynamic>> referrals;
  Referral({required this.code, required this.monthRewarded, required this.monthCap, required this.referrals});

  static Referral fromJson(Map<String, dynamic> j) => Referral(
        code: j['code'] as String? ?? '',
        monthRewarded: j['monthRewarded'] as int? ?? 0,
        monthCap: j['monthCap'] as int? ?? 10,
        referrals: (j['referrals'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>(),
      );
}

final referralProvider = FutureProvider.autoDispose<Referral>((ref) async {
  final dio = ref.watch(apiClientProvider);
  return Referral.fromJson((await dio.get<Map<String, dynamic>>('/me/referrals')).data ?? {});
});

class ReferralScreen extends ConsumerWidget {
  const ReferralScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = ref.watch(referralProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Invite friends')),
      body: r.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (d) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Give 5 pokes, get 5 pokes',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Your friend gets 5 bonus pokes when they verify their phone. '
              'You get 5 when they show up to their first spot.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.share),
              label: const Text('Share your invite'),
              onPressed: () => Share.share('Meet people in real life on MeshPoke: https://www.meshpoke.com/r/${d.code}'),
            ),
            const SizedBox(height: 8),
            Text('Code: ${d.code} · ${d.monthRewarded}/${d.monthCap} rewarded this month',
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 16),
            ...d.referrals.map((x) => ListTile(
                  dense: true,
                  leading: Icon(x['firstAttended'] == true
                      ? Icons.check_circle
                      : x['verified'] == true
                          ? Icons.verified_user_outlined
                          : Icons.hourglass_empty),
                  title: Text(x['displayName'] as String? ?? ''),
                  subtitle: Text(x['firstAttended'] == true
                      ? 'Showed up — you both got 5 pokes'
                      : x['verified'] == true
                          ? 'Phone verified — waiting for first spot'
                          : 'Signed up'),
                )),
          ],
        ),
      ),
    );
  }
}
