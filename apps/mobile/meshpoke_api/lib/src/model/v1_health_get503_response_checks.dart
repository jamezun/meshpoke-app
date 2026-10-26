//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_health_get503_response_checks.g.dart';

/// V1HealthGet503ResponseChecks
///
/// Properties:
/// * [db] 
/// * [redis] 
@BuiltValue()
abstract class V1HealthGet503ResponseChecks implements Built<V1HealthGet503ResponseChecks, V1HealthGet503ResponseChecksBuilder> {
  @BuiltValueField(wireName: r'db')
  bool get db;

  @BuiltValueField(wireName: r'redis')
  bool get redis;

  V1HealthGet503ResponseChecks._();

  factory V1HealthGet503ResponseChecks([void updates(V1HealthGet503ResponseChecksBuilder b)]) = _$V1HealthGet503ResponseChecks;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1HealthGet503ResponseChecksBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1HealthGet503ResponseChecks> get serializer => _$V1HealthGet503ResponseChecksSerializer();
}

class _$V1HealthGet503ResponseChecksSerializer implements PrimitiveSerializer<V1HealthGet503ResponseChecks> {
  @override
  final Iterable<Type> types = const [V1HealthGet503ResponseChecks, _$V1HealthGet503ResponseChecks];

  @override
  final String wireName = r'V1HealthGet503ResponseChecks';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1HealthGet503ResponseChecks object, {
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
    V1HealthGet503ResponseChecks object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1HealthGet503ResponseChecksBuilder result,
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
  V1HealthGet503ResponseChecks deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1HealthGet503ResponseChecksBuilder();
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

