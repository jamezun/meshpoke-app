//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:meshpoke_api/src/model/v1_health_get200_response_checks.dart';
import 'package:built_value/json_object.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_health_get200_response.g.dart';

/// V1HealthGet200Response
///
/// Properties:
/// * [status] 
/// * [checks] 
/// * [time] 
@BuiltValue()
abstract class V1HealthGet200Response implements Built<V1HealthGet200Response, V1HealthGet200ResponseBuilder> {
  @BuiltValueField(wireName: r'status')
  V1HealthGet200ResponseStatusEnum get status;
  // enum statusEnum {  ok,  };

  @BuiltValueField(wireName: r'checks')
  V1HealthGet200ResponseChecks get checks;

  @BuiltValueField(wireName: r'time')
  String get time;

  V1HealthGet200Response._();

  factory V1HealthGet200Response([void updates(V1HealthGet200ResponseBuilder b)]) = _$V1HealthGet200Response;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1HealthGet200ResponseBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1HealthGet200Response> get serializer => _$V1HealthGet200ResponseSerializer();
}

class _$V1HealthGet200ResponseSerializer implements PrimitiveSerializer<V1HealthGet200Response> {
  @override
  final Iterable<Type> types = const [V1HealthGet200Response, _$V1HealthGet200Response];

  @override
  final String wireName = r'V1HealthGet200Response';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1HealthGet200Response object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'status';
    yield serializers.serialize(
      object.status,
      specifiedType: const FullType(V1HealthGet200ResponseStatusEnum),
    );
    yield r'checks';
    yield serializers.serialize(
      object.checks,
      specifiedType: const FullType(V1HealthGet200ResponseChecks),
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
    V1HealthGet200Response object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1HealthGet200ResponseBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1HealthGet200ResponseStatusEnum),
          ) as V1HealthGet200ResponseStatusEnum;
          result.status = valueDes;
          break;
        case r'checks':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1HealthGet200ResponseChecks),
          ) as V1HealthGet200ResponseChecks;
          result.checks = valueDes;
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
  V1HealthGet200Response deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1HealthGet200ResponseBuilder();
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

class V1HealthGet200ResponseStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'ok')
  static const V1HealthGet200ResponseStatusEnum ok = _$v1HealthGet200ResponseStatusEnum_ok;

  static Serializer<V1HealthGet200ResponseStatusEnum> get serializer => _$v1HealthGet200ResponseStatusEnumSerializer;

  const V1HealthGet200ResponseStatusEnum._(String name): super(name);

  static BuiltSet<V1HealthGet200ResponseStatusEnum> get values => _$v1HealthGet200ResponseStatusEnumValues;
  static V1HealthGet200ResponseStatusEnum valueOf(String name) => _$v1HealthGet200ResponseStatusEnumValueOf(name);
}

