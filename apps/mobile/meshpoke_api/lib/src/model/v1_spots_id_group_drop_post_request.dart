//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_spots_id_group_drop_post_request.g.dart';

/// V1SpotsIdGroupDropPostRequest
///
/// Properties:
/// * [dropId] 
@BuiltValue()
abstract class V1SpotsIdGroupDropPostRequest implements Built<V1SpotsIdGroupDropPostRequest, V1SpotsIdGroupDropPostRequestBuilder> {
  @BuiltValueField(wireName: r'dropId')
  String get dropId;

  V1SpotsIdGroupDropPostRequest._();

  factory V1SpotsIdGroupDropPostRequest([void updates(V1SpotsIdGroupDropPostRequestBuilder b)]) = _$V1SpotsIdGroupDropPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1SpotsIdGroupDropPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1SpotsIdGroupDropPostRequest> get serializer => _$V1SpotsIdGroupDropPostRequestSerializer();
}

class _$V1SpotsIdGroupDropPostRequestSerializer implements PrimitiveSerializer<V1SpotsIdGroupDropPostRequest> {
  @override
  final Iterable<Type> types = const [V1SpotsIdGroupDropPostRequest, _$V1SpotsIdGroupDropPostRequest];

  @override
  final String wireName = r'V1SpotsIdGroupDropPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1SpotsIdGroupDropPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'dropId';
    yield serializers.serialize(
      object.dropId,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1SpotsIdGroupDropPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1SpotsIdGroupDropPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'dropId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.dropId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1SpotsIdGroupDropPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1SpotsIdGroupDropPostRequestBuilder();
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

