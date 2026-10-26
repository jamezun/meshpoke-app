import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';

/// T9.5 spot list + detail repository (GET /districts, /districts/:id/spots, /spots/:id).
class DistrictInfo {
  final String id;
  final String nameEn;
  DistrictInfo({required this.id, required this.nameEn});
  factory DistrictInfo.fromJson(Map<String, dynamic> j) => DistrictInfo(id: j['id'], nameEn: j['name_en'] ?? '');
}

final districtListProvider = FutureProvider.autoDispose<List<DistrictInfo>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final res = await dio.get('/districts');
  return [for (final d in (res.data['districts'] ?? []) as List) DistrictInfo.fromJson(d as Map<String, dynamic>)];
});

class SpotSummary {
  final String id;
  final String name;
  final String template;
  final String? state;
  final int memberCount;
  final int maxHeadcount;
  final String joinMode;
  final DateTime? startsAt;
  SpotSummary({
    required this.id,
    required this.name,
    required this.template,
    this.state,
    required this.memberCount,
    required this.maxHeadcount,
    required this.joinMode,
    this.startsAt,
  });

  factory SpotSummary.fromJson(Map<String, dynamic> j) => SpotSummary(
    id: j['id'],
    name: j['name'],
    template: j['template'] ?? 'open',
    state: j['state'],
    memberCount: (j['member_count'] as num?)?.toInt() ?? 0,
    maxHeadcount: (j['max_headcount'] as num?)?.toInt() ?? 0,
    joinMode: j['join_mode'] ?? 'application',
    startsAt: j['starts_at'] != null ? DateTime.parse(j['starts_at'] as String) : null,
  );
}

final spotsProvider = FutureProvider.autoDispose
    .family<List<SpotSummary>, (String, String)>((ref, params) async {
      final dio = ref.watch(apiClientProvider);
      final res = await dio.get('/districts/${params.$1}/spots', queryParameters: {'time': params.$2});
      return [for (final s in (res.data['spots'] ?? []) as List) SpotSummary.fromJson(s as Map<String, dynamic>)];
    });

class SpotDetail {
  final String id;
  final String name;
  final String kind;
  final String template;
  final String? state;
  final String joinMode;
  final List<String> requiredKeywords;
  final String? minScore;
  final String? priceRange;
  final int minHeadcount;
  final int maxHeadcount;
  final DateTime? startsAt;
  final String? venueName;
  final String? district;
  final int memberCount;
  final String? myRole;
  final String? myApplication;
  SpotDetail({
    required this.id,
    required this.name,
    required this.kind,
    required this.template,
    this.state,
    required this.joinMode,
    required this.requiredKeywords,
    this.minScore,
    this.priceRange,
    required this.minHeadcount,
    required this.maxHeadcount,
    this.startsAt,
    this.venueName,
    this.district,
    required this.memberCount,
    this.myRole,
    this.myApplication,
  });

  factory SpotDetail.fromJson(Map<String, dynamic> j) => SpotDetail(
    id: j['id'],
    name: j['name'],
    kind: j['kind'],
    template: j['template'] ?? 'open',
    state: j['state'],
    joinMode: j['join_mode'] ?? 'application',
    requiredKeywords: [for (final k in (j['required_keywords'] ?? []) as List) k.toString()],
    minScore: j['min_score']?.toString(),
    priceRange: j['price_range'],
    minHeadcount: (j['min_headcount'] as num?)?.toInt() ?? 2,
    maxHeadcount: (j['max_headcount'] as num?)?.toInt() ?? 0,
    startsAt: j['starts_at'] != null ? DateTime.parse(j['starts_at'] as String) : null,
    venueName: j['venue_name'],
    district: j['district'],
    memberCount: (j['member_count'] as num?)?.toInt() ?? 0,
    myRole: j['my_role'],
    myApplication: j['my_application'],
  );
}

final spotDetailProvider = FutureProvider.autoDispose
    .family<SpotDetail, String>((ref, id) async {
      final dio = ref.watch(apiClientProvider);
      final res = await dio.get('/spots/$id');
      return SpotDetail.fromJson(res.data as Map<String, dynamic>);
    });
