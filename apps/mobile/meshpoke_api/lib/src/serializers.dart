//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_import

import 'package:one_of_serializer/any_of_serializer.dart';
import 'package:one_of_serializer/one_of_serializer.dart';
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/serializer.dart';
import 'package:built_value/standard_json_plugin.dart';
import 'package:built_value/iso_8601_date_time_serializer.dart';
import 'package:meshpoke_api/src/date_serializer.dart';
import 'package:meshpoke_api/src/model/date.dart';

import 'package:meshpoke_api/src/model/v1_admin_merchant_finance_band_audit_venue_id_post_request.dart';
import 'package:meshpoke_api/src/model/v1_admin_merchant_finance_disputes_id_resolve_post_request.dart';
import 'package:meshpoke_api/src/model/v1_health_get200_response.dart';
import 'package:meshpoke_api/src/model/v1_health_get200_response_checks.dart';
import 'package:meshpoke_api/src/model/v1_health_get503_response.dart';
import 'package:meshpoke_api/src/model/v1_health_get503_response_checks.dart';
import 'package:meshpoke_api/src/model/v1_me_activity_read_post_request.dart';
import 'package:meshpoke_api/src/model/v1_me_location_ping_post_request.dart';
import 'package:meshpoke_api/src/model/v1_me_notification_prefs_patch_request.dart';
import 'package:meshpoke_api/src/model/v1_me_push_tokens_post_request.dart';
import 'package:meshpoke_api/src/model/v1_merchant_coupons_issue_post_request.dart';
import 'package:meshpoke_api/src/model/v1_merchant_drops_id_patch_request.dart';
import 'package:meshpoke_api/src/model/v1_merchant_drops_post_request.dart';
import 'package:meshpoke_api/src/model/v1_merchant_founding_circle_post_request.dart';
import 'package:meshpoke_api/src/model/v1_merchant_ladder_put_request.dart';
import 'package:meshpoke_api/src/model/v1_merchant_ladder_put_request_inactivity_days.dart';
import 'package:meshpoke_api/src/model/v1_merchant_ladder_put_request_levels_inner.dart';
import 'package:meshpoke_api/src/model/v1_merchant_scan_coupon_post_request.dart';
import 'package:meshpoke_api/src/model/v1_merchant_scan_post_request.dart';
import 'package:meshpoke_api/src/model/v1_reports_post_request.dart';
import 'package:meshpoke_api/src/model/v1_spots_id_group_drop_post_request.dart';
import 'package:meshpoke_api/src/model/v1_spots_id_safety_rating_post_request.dart';

part 'serializers.g.dart';

@SerializersFor([
  V1AdminMerchantFinanceBandAuditVenueIdPostRequest,
  V1AdminMerchantFinanceDisputesIdResolvePostRequest,
  V1HealthGet200Response,
  V1HealthGet200ResponseChecks,
  V1HealthGet503Response,
  V1HealthGet503ResponseChecks,
  V1MeActivityReadPostRequest,
  V1MeLocationPingPostRequest,
  V1MeNotificationPrefsPatchRequest,
  V1MePushTokensPostRequest,
  V1MerchantCouponsIssuePostRequest,
  V1MerchantDropsIdPatchRequest,
  V1MerchantDropsPostRequest,
  V1MerchantFoundingCirclePostRequest,
  V1MerchantLadderPutRequest,
  V1MerchantLadderPutRequestInactivityDays,
  V1MerchantLadderPutRequestLevelsInner,
  V1MerchantScanCouponPostRequest,
  V1MerchantScanPostRequest,
  V1ReportsPostRequest,
  V1SpotsIdGroupDropPostRequest,
  V1SpotsIdSafetyRatingPostRequest,
])
Serializers serializers = (_$serializers.toBuilder()
      ..add(const OneOfSerializer())
      ..add(const AnyOfSerializer())
      ..add(const DateSerializer())
      ..add(Iso8601DateTimeSerializer()))
    .build();

Serializers standardSerializers =
    (serializers.toBuilder()..addPlugin(StandardJsonPlugin())).build();
