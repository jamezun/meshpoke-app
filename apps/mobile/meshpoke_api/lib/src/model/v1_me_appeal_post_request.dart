//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_me_appeal_post_request.g.dart';

/// V1MeAppealPostRequest
///
/// Properties:
/// * [reason] 
@BuiltValue()
abstract class V1MeAppealPostRequest implements Built<V1MeAppealPostRequest, V1MeAppealPostRequestBuilder> {
  @BuiltValueField(wireName: r'reason')
  String get reason;

  V1MeAppealPostRequest._();

  factory V1MeAppealPostRequest([void updates(V1MeAppealPostRequestBuilder b)]) = _$V1MeAppealPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MeAppealPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MeAppealPostRequest> get serializer => _$V1MeAppealPostRequestSerializer();
}

class _$V1MeAppealPostRequestSerializer implements PrimitiveSerializer<V1MeAppealPostRequest> {
  @override
  final Iterable<Type> types = const [V1MeAppealPostRequest, _$V1MeAppealPostRequest];

  @override
  final String wireName = r'V1MeAppealPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MeAppealPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MeAppealPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MeAppealPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'reason':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.reason = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MeAppealPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MeAppealPostRequestBuilder();
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

