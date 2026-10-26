//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:meshpoke_api/src/model/v1_health_get503_response_checks.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_health_get503_response.g.dart';

/// V1HealthGet503Response
///
/// Properties:
/// * [status] 
/// * [checks] 
/// * [time] 
@BuiltValue()
abstract class V1HealthGet503Response implements Built<V1HealthGet503Response, V1HealthGet503ResponseBuilder> {
  @BuiltValueField(wireName: r'status')
  V1HealthGet503ResponseStatusEnum get status;
  // enum statusEnum {  ok,  };

  @BuiltValueField(wireName: r'checks')
  V1HealthGet503ResponseChecks get checks;

  @BuiltValueField(wireName: r'time')
  String get time;

  V1HealthGet503Response._();

  factory V1HealthGet503Response([void updates(V1HealthGet503ResponseBuilder b)]) = _$V1HealthGet503Response;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1HealthGet503ResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1HealthGet503Response> get serializer => _$V1HealthGet503ResponseSerializer();
}

class _$V1HealthGet503ResponseSerializer implements PrimitiveSerializer<V1HealthGet503Response> {
  @override
  final Iterable<Type> types = const [V1HealthGet503Response, _$V1HealthGet503Response];

  @override
  final String wireName = r'V1HealthGet503Response';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1HealthGet503Response object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(V1HealthGet503ResponseStatusEnum),
    );
    yield r'checks';
    yield serializers.serialize(
      object.checks,
      specifiedType: const FullType(V1HealthGet503ResponseChecks),
    );
    yield r'time';
    yield serializers.serialize(
      object.time,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1HealthGet503Response object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1HealthGet503ResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1HealthGet503ResponseStatusEnum),
          ) as V1HealthGet503ResponseStatusEnum;
          result.status = valueDes;
          break;
        case r'checks':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1HealthGet503ResponseChecks),
          ) as V1HealthGet503ResponseChecks;
          result.checks.replace(valueDes);
          break;
        case r'time':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.time = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1HealthGet503Response deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1HealthGet503ResponseBuilder();
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

class V1HealthGet503ResponseStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'ok')
  static const V1HealthGet503ResponseStatusEnum ok = _$v1HealthGet503ResponseStatusEnum_ok;

  static Serializer<V1HealthGet503ResponseStatusEnum> get serializer => _$v1HealthGet503ResponseStatusEnumSerializer;

  const V1HealthGet503ResponseStatusEnum._(String name): super(name);

  static BuiltSet<V1HealthGet503ResponseStatusEnum> get values => _$v1HealthGet503ResponseStatusEnumValues;
  static V1HealthGet503ResponseStatusEnum valueOf(String name) => _$v1HealthGet503ResponseStatusEnumValueOf(name);
}

