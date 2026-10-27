//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_merchant_founding_circle_post_request.g.dart';

/// V1MerchantFoundingCirclePostRequest
///
/// Properties:
/// * [userId] 
@BuiltValue()
abstract class V1MerchantFoundingCirclePostRequest implements Built<V1MerchantFoundingCirclePostRequest, V1MerchantFoundingCirclePostRequestBuilder> {
  @BuiltValueField(wireName: r'userId')
  String get userId;

  V1MerchantFoundingCirclePostRequest._();

  factory V1MerchantFoundingCirclePostRequest([void updates(V1MerchantFoundingCirclePostRequestBuilder b)]) = _$V1MerchantFoundingCirclePostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantFoundingCirclePostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantFoundingCirclePostRequest> get serializer => _$V1MerchantFoundingCirclePostRequestSerializer();
}

class _$V1MerchantFoundingCirclePostRequestSerializer implements PrimitiveSerializer<V1MerchantFoundingCirclePostRequest> {
  @override
  final Iterable<Type> types = const [V1MerchantFoundingCirclePostRequest, _$V1MerchantFoundingCirclePostRequest];

  @override
  final String wireName = r'V1MerchantFoundingCirclePostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantFoundingCirclePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'userId';
    yield serializers.serialize(
      object.userId,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantFoundingCirclePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MerchantFoundingCirclePostRequestBuilder result,
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MerchantFoundingCirclePostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantFoundingCirclePostRequestBuilder();
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

