//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_merchant_coupons_issue_post_request.g.dart';

/// V1MerchantCouponsIssuePostRequest
///
/// Properties:
/// * [userId] 
/// * [offer] 
/// * [validDays] 
@BuiltValue()
abstract class V1MerchantCouponsIssuePostRequest implements Built<V1MerchantCouponsIssuePostRequest, V1MerchantCouponsIssuePostRequestBuilder> {
  @BuiltValueField(wireName: r'userId')
  String get userId;

  @BuiltValueField(wireName: r'offer')
  String get offer;

  @BuiltValueField(wireName: r'validDays')
  int? get validDays;

  V1MerchantCouponsIssuePostRequest._();

  factory V1MerchantCouponsIssuePostRequest([void updates(V1MerchantCouponsIssuePostRequestBuilder b)]) = _$V1MerchantCouponsIssuePostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantCouponsIssuePostRequestBuilder b) => b
      ..validDays = 30;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantCouponsIssuePostRequest> get serializer => _$V1MerchantCouponsIssuePostRequestSerializer();
}

class _$V1MerchantCouponsIssuePostRequestSerializer implements PrimitiveSerializer<V1MerchantCouponsIssuePostRequest> {
  @override
  final Iterable<Type> types = const [V1MerchantCouponsIssuePostRequest, _$V1MerchantCouponsIssuePostRequest];

  @override
  final String wireName = r'V1MerchantCouponsIssuePostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantCouponsIssuePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
    yield r'offer';
    yield serializers.serialize(
      object.offer,
      specifiedType: const FullType(String),
    );
    if (object.validDays != null) {
      yield r'validDays';
      yield serializers.serialize(
        object.validDays,
        specifiedType: const FullType(int),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantCouponsIssuePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MerchantCouponsIssuePostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'userId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.userId = valueDes;
          break;
        case r'offer':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.offer = valueDes;
          break;
        case r'validDays':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.validDays = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MerchantCouponsIssuePostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantCouponsIssuePostRequestBuilder();
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

