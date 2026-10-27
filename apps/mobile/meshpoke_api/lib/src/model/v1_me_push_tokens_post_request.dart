//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_me_push_tokens_post_request.g.dart';

/// V1MePushTokensPostRequest
///
/// Properties:
/// * [token] 
/// * [platform] 
@BuiltValue()
abstract class V1MePushTokensPostRequest implements Built<V1MePushTokensPostRequest, V1MePushTokensPostRequestBuilder> {
  @BuiltValueField(wireName: r'token')
  String get token;

  @BuiltValueField(wireName: r'platform')
  V1MePushTokensPostRequestPlatformEnum get platform;
  // enum platformEnum {  ios,  android,  web,  };

  V1MePushTokensPostRequest._();

  factory V1MePushTokensPostRequest([void updates(V1MePushTokensPostRequestBuilder b)]) = _$V1MePushTokensPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MePushTokensPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MePushTokensPostRequest> get serializer => _$V1MePushTokensPostRequestSerializer();
}

class _$V1MePushTokensPostRequestSerializer implements PrimitiveSerializer<V1MePushTokensPostRequest> {
  @override
  final Iterable<Type> types = const [V1MePushTokensPostRequest, _$V1MePushTokensPostRequest];

  @override
  final String wireName = r'V1MePushTokensPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MePushTokensPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'token';
    yield serializers.serialize(
      object.token,
      specifiedType: const FullType(String),
    );
    yield r'platform';
    yield serializers.serialize(
      object.platform,
      specifiedType: const FullType(V1MePushTokensPostRequestPlatformEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MePushTokensPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MePushTokensPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'token':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.token = valueDes;
          break;
        case r'platform':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1MePushTokensPostRequestPlatformEnum),
          ) as V1MePushTokensPostRequestPlatformEnum;
          result.platform = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MePushTokensPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MePushTokensPostRequestBuilder();
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

class V1MePushTokensPostRequestPlatformEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'ios')
  static const V1MePushTokensPostRequestPlatformEnum ios = _$v1MePushTokensPostRequestPlatformEnum_ios;
  @BuiltValueEnumConst(wireName: r'android')
  static const V1MePushTokensPostRequestPlatformEnum android = _$v1MePushTokensPostRequestPlatformEnum_android;
  @BuiltValueEnumConst(wireName: r'web')
  static const V1MePushTokensPostRequestPlatformEnum web = _$v1MePushTokensPostRequestPlatformEnum_web;

  static Serializer<V1MePushTokensPostRequestPlatformEnum> get serializer => _$v1MePushTokensPostRequestPlatformEnumSerializer;

  const V1MePushTokensPostRequestPlatformEnum._(String name): super(name);

  static BuiltSet<V1MePushTokensPostRequestPlatformEnum> get values => _$v1MePushTokensPostRequestPlatformEnumValues;
  static V1MePushTokensPostRequestPlatformEnum valueOf(String name) => _$v1MePushTokensPostRequestPlatformEnumValueOf(name);
}

