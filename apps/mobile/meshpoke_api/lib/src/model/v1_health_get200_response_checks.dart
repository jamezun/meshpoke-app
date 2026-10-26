//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_health_get200_response_checks.g.dart';

/// V1HealthGet200ResponseChecks
///
/// Properties:
/// * [db] 
/// * [redis] 
@BuiltValue()
abstract class V1HealthGet200ResponseChecks implements Built<V1HealthGet200ResponseChecks, V1HealthGet200ResponseChecksBuilder> {
  @BuiltValueField(wireName: r'db')
  bool get db;

  @BuiltValueField(wireName: r'redis')
  bool get redis;

  V1HealthGet200ResponseChecks._();

  factory V1HealthGet200ResponseChecks([void updates(V1HealthGet200ResponseChecksBuilder b)]) = _$V1HealthGet200ResponseChecks;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1HealthGet200ResponseChecksBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1HealthGet200ResponseChecks> get serializer => _$V1HealthGet200ResponseChecksSerializer();
}

class _$V1HealthGet200ResponseChecksSerializer implements PrimitiveSerializer<V1HealthGet200ResponseChecks> {
  @override
  final Iterable<Type> types = const [V1HealthGet200ResponseChecks, _$V1HealthGet200ResponseChecks];

  @override
  final String wireName = r'V1HealthGet200ResponseChecks';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1HealthGet200ResponseChecks object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'db';
    yield serializers.serialize(
      object.db,
      specifiedType: const FullType(bool),
    );
    yield r'redis';
    yield serializers.serialize(
      object.redis,
      specifiedType: const FullType(bool),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1HealthGet200ResponseChecks object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1HealthGet200ResponseChecksBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'db':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.db = valueDes;
          break;
        case r'redis':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.redis = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1HealthGet200ResponseChecks deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1HealthGet200ResponseChecksBuilder();
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

