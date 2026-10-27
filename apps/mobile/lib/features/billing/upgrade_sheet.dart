// T17.5: upgrade sheet on 402 — IAP only, never web prices (App Store rule 3.1.1).
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';

/// Shows the upgrade sheet when an action hit a plan cap (HTTP 402).
/// [detail] is the problem detail from the API (already human-readable).
Future<void> showUpgradeSheet(BuildContext context, String capType, String detail) async {
  await showModalBottomSheet<void>(
    context: context,
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              switch (capType) {
                'hosting' => 'Host more spots',
                'activeEventSpots' => 'Join more spots',
                'chatRooms' => 'Join more rooms',
                'weeklyPokes' => 'More pokes',
                'filter_pass' => 'Keyword filters',
                'activeCrews' => 'Keep more crews',
                _ => 'Upgrade MeshPoke',
              },
              style: Theme.of(ctx).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(detail, style: Theme.of(ctx).textTheme.bodyMedium),
            const SizedBox(height: 16),
            // IAP only: prices come from the App Store sheet itself (no hardcoded $ anywhere)
            ...['plus', 'pro'].map(
              (plan) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(plan == 'plus' ? 'MeshPoke Plus' : 'MeshPoke Pro'),
                subtitle: Text(plan == 'plus'
                    ? 'More rooms, RSVPs & pokes'
                    : 'Everything in Plus, top express, longer notes'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  // ponytail: purchases_flutter wiring lands with RevenueCat keys (T17.3 deferred note);
                  // sheet points at Settings → Manage subscription until then.
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Subscriptions open in App Store at launch')),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Extracts {capType, detail} from a DioException caused by a 402, else null.
UpgradeHit? upgradeHitFrom(Object error) {
  if (error is! DioException) return null;
  final code = error.response?.statusCode;
  final body = error.response?.data;
  if (code != 402 || body is! Map<String, dynamic>) return null;
  final problem = body['problem'] as Map<String, dynamic>?;
  return UpgradeHit(
    problem?['type'] as String? ?? '',
    problem?['detail'] as String? ?? body['title'] as String? ?? '',
  );
}

class UpgradeHit {
  final String capType;
  final String detail;
  UpgradeHit(this.capType, this.detail);
}
