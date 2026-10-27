//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_spots_id_safety_rating_post_request.g.dart';

/// V1SpotsIdSafetyRatingPostRequest
///
/// Properties:
/// * [ratedUserId] 
/// * [rating] 
/// * [flag] 
@BuiltValue()
abstract class V1SpotsIdSafetyRatingPostRequest implements Built<V1SpotsIdSafetyRatingPostRequest, V1SpotsIdSafetyRatingPostRequestBuilder> {
  @BuiltValueField(wireName: r'ratedUserId')
  String get ratedUserId;

  @BuiltValueField(wireName: r'rating')
  int get rating;

  @BuiltValueField(wireName: r'flag')
  bool? get flag;

  V1SpotsIdSafetyRatingPostRequest._();

  factory V1SpotsIdSafetyRatingPostRequest([void updates(V1SpotsIdSafetyRatingPostRequestBuilder b)]) = _$V1SpotsIdSafetyRatingPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1SpotsIdSafetyRatingPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1SpotsIdSafetyRatingPostRequest> get serializer => _$V1SpotsIdSafetyRatingPostRequestSerializer();
}

class _$V1SpotsIdSafetyRatingPostRequestSerializer implements PrimitiveSerializer<V1SpotsIdSafetyRatingPostRequest> {
  @override
  final Iterable<Type> types = const [V1SpotsIdSafetyRatingPostRequest, _$V1SpotsIdSafetyRatingPostRequest];

  @override
  final String wireName = r'V1SpotsIdSafetyRatingPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1SpotsIdSafetyRatingPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'ratedUserId';
    yield serializers.serialize(
      object.ratedUserId,
      specifiedType: const FullType(String),
    );
    yield r'rating';
    yield serializers.serialize(
      object.rating,
      specifiedType: const FullType(int),
    );
    if (object.flag != null) {
      yield r'flag';
      yield serializers.serialize(
        object.flag,
        specifiedType: const FullType(bool),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    V1SpotsIdSafetyRatingPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1SpotsIdSafetyRatingPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'ratedUserId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.ratedUserId = valueDes;
          break;
        case r'rating':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.rating = valueDes;
          break;
        case r'flag':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.flag = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1SpotsIdSafetyRatingPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1SpotsIdSafetyRatingPostRequestBuilder();
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

