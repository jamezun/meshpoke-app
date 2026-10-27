//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_me_activity_read_post_request.g.dart';

/// V1MeActivityReadPostRequest
///
/// Properties:
/// * [ids] 
@BuiltValue()
abstract class V1MeActivityReadPostRequest implements Built<V1MeActivityReadPostRequest, V1MeActivityReadPostRequestBuilder> {
  @BuiltValueField(wireName: r'ids')
  BuiltList<String> get ids;

  V1MeActivityReadPostRequest._();

  factory V1MeActivityReadPostRequest([void updates(V1MeActivityReadPostRequestBuilder b)]) = _$V1MeActivityReadPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MeActivityReadPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MeActivityReadPostRequest> get serializer => _$V1MeActivityReadPostRequestSerializer();
}

class _$V1MeActivityReadPostRequestSerializer implements PrimitiveSerializer<V1MeActivityReadPostRequest> {
  @override
  final Iterable<Type> types = const [V1MeActivityReadPostRequest, _$V1MeActivityReadPostRequest];

  @override
  final String wireName = r'V1MeActivityReadPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MeActivityReadPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'ids';
    yield serializers.serialize(
      object.ids,
      specifiedType: const FullType(BuiltList, [FullType(String)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MeActivityReadPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MeActivityReadPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'ids':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(String)]),
          ) as BuiltList<String>;
          result.ids.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MeActivityReadPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MeActivityReadPostRequestBuilder();
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

