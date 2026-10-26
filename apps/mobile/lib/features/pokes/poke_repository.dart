import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';

/// T11.4 pokes / inbox / connections / people-you-met repository.

class IncomingPoke {
  final String id;
  final String fromUserId;
  final String? note;
  final String source;
  final String displayName;
  final double score;
  final String plan;
  final Map<String, dynamic>? trust;
  final String createdAt;
  IncomingPoke({
    required this.id,
    required this.fromUserId,
    required this.note,
    required this.source,
    required this.displayName,
    required this.score,
    required this.plan,
    required this.trust,
    required this.createdAt,
  });

  factory IncomingPoke.fromJson(Map<String, dynamic> j) => IncomingPoke(
    id: j['id'],
    fromUserId: j['fromUserId'],
    note: j['note'] as String?,
    source: j['source'] ?? 'profile',
    displayName: j['displayName'] ?? '',
    score: (j['score'] as num?)?.toDouble() ?? 0,
    plan: j['plan'] ?? 'free',
    trust: j['trust'] as Map<String, dynamic>?,
    createdAt: j['createdAt'] ?? '',
  );
}

class ConnectionRow {
  final String id;
  final bool active;
  final String userId;
  final String displayName;
  final String? roomId;
  ConnectionRow({required this.id, required this.active, required this.userId, required this.displayName, this.roomId});

  factory ConnectionRow.fromJson(Map<String, dynamic> j) => ConnectionRow(
    id: j['id'],
    active: j['active'] == true,
    userId: j['userId'],
    displayName: j['displayName'] ?? '',
    roomId: j['roomId'],
  );
}

class PersonYouMet {
  final String userId;
  final String displayName;
  final Map<String, dynamic>? trust;
  PersonYouMet({required this.userId, required this.displayName, this.trust});
  factory PersonYouMet.fromJson(Map<String, dynamic> j) => PersonYouMet(
    userId: j['userId'], displayName: j['displayName'] ?? '', trust: j['trust'] as Map<String, dynamic>?);
}

class PokeBalance {
  final int allowance;
  final int weeklyUsed;
  final int credits;
  PokeBalance({required this.allowance, required this.weeklyUsed, required this.credits});
  int get leftThisWeek => (allowance - weeklyUsed).clamp(0, allowance);
  factory PokeBalance.fromJson(Map<String, dynamic> j) => PokeBalance(
    allowance: (j['allowance'] as num?)?.toInt() ?? 5,
    weeklyUsed: (j['weeklyUsed'] as num?)?.toInt() ?? 0,
    credits: (j['credits'] as num?)?.toInt() ?? 0,
  );
}

final pokeBalanceProvider = FutureProvider.autoDispose<PokeBalance>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/me/poke-balance');
  return PokeBalance.fromJson(res.data as Map<String, dynamic>);
});

final incomingPokesProvider =
    FutureProvider.autoDispose.family<List<IncomingPoke>, String>((ref, sort) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/pokes/incoming', queryParameters: {'sort': sort});
  return [for (final p in (res.data['pokes'] ?? []) as List) IncomingPoke.fromJson(p as Map<String, dynamic>)];
});

final connectionsProvider = FutureProvider.autoDispose<List<ConnectionRow>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/connections');
  return [for (final c in (res.data['connections'] ?? []) as List) ConnectionRow.fromJson(c as Map<String, dynamic>)];
});

final peopleYouMetProvider =
    FutureProvider.autoDispose.family<List<PersonYouMet>, String>((ref, spotId) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/people-you-met/$spotId');
  return [for (final p in (res.data['people'] ?? []) as List) PersonYouMet.fromJson(p as Map<String, dynamic>)];
});

class PokeService {
  PokeService(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> poke(String toUserId, {String? note, String source = 'profile', String? spotId}) async {
    final res = await _dio.post('/pokes', data: {
      'to': toUserId,
      if (note != null && note.isNotEmpty) 'note': note,
      'source': source,
      'spotId': spotId,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<void> disconnect(String connectionId) => _dio.post('/connections/$connectionId/disconnect');
}
