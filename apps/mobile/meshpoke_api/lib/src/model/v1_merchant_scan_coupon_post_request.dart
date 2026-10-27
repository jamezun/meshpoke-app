//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_merchant_scan_coupon_post_request.g.dart';

/// V1MerchantScanCouponPostRequest
///
/// Properties:
/// * [qrPayload] 
/// * [couponId] 
@BuiltValue()
abstract class V1MerchantScanCouponPostRequest implements Built<V1MerchantScanCouponPostRequest, V1MerchantScanCouponPostRequestBuilder> {
  @BuiltValueField(wireName: r'qrPayload')
  String get qrPayload;

  @BuiltValueField(wireName: r'couponId')
  String get couponId;

  V1MerchantScanCouponPostRequest._();

  factory V1MerchantScanCouponPostRequest([void updates(V1MerchantScanCouponPostRequestBuilder b)]) = _$V1MerchantScanCouponPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantScanCouponPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantScanCouponPostRequest> get serializer => _$V1MerchantScanCouponPostRequestSerializer();
}

class _$V1MerchantScanCouponPostRequestSerializer implements PrimitiveSerializer<V1MerchantScanCouponPostRequest> {
  @override
  final Iterable<Type> types = const [V1MerchantScanCouponPostRequest, _$V1MerchantScanCouponPostRequest];

  @override
  final String wireName = r'V1MerchantScanCouponPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantScanCouponPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'qrPayload';
    yield serializers.serialize(
      object.qrPayload,
      specifiedType: const FullType(String),
    );
    yield r'couponId';
    yield serializers.serialize(
      object.couponId,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantScanCouponPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MerchantScanCouponPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'qrPayload':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.qrPayload = valueDes;
          break;
        case r'couponId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.couponId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MerchantScanCouponPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantScanCouponPostRequestBuilder();
    final serializedList = (serialized as Iterable<Object?>).toList();
    final unhandled = <Object?>[];
    _deserializeProperties(
      serializers,
      serialized,
      specifiedType: specifiedType,
      serializedList: serializedList,
      unhandled: unhandled,
      result: result,
    );
    return result.build();
  }
}

