//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_reports_post_request.g.dart';

/// V1ReportsPostRequest
///
/// Properties:
/// * [targetType] 
/// * [targetId] 
/// * [reason] 
@BuiltValue()
abstract class V1ReportsPostRequest implements Built<V1ReportsPostRequest, V1ReportsPostRequestBuilder> {
  @BuiltValueField(wireName: r'targetType')
  V1ReportsPostRequestTargetTypeEnum get targetType;
  // enum targetTypeEnum {  user,  message,  spot,  venue,  };

  @BuiltValueField(wireName: r'targetId')
  String get targetId;

  @BuiltValueField(wireName: r'reason')
  String get reason;

  V1ReportsPostRequest._();

  factory V1ReportsPostRequest([void updates(V1ReportsPostRequestBuilder b)]) = _$V1ReportsPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1ReportsPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1ReportsPostRequest> get serializer => _$V1ReportsPostRequestSerializer();
}

class _$V1ReportsPostRequestSerializer implements PrimitiveSerializer<V1ReportsPostRequest> {
  @override
  final Iterable<Type> types = const [V1ReportsPostRequest, _$V1ReportsPostRequest];

  @override
  final String wireName = r'V1ReportsPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1ReportsPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'targetType';
    yield serializers.serialize(
      object.targetType,
      specifiedType: const FullType(V1ReportsPostRequestTargetTypeEnum),
    );
    yield r'targetId';
    yield serializers.serialize(
      object.targetId,
      specifiedType: const FullType(String),
    );
    yield r'reason';
    yield serializers.serialize(
      object.reason,
      specifiedType: const FullType(String),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1ReportsPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1ReportsPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'targetType':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1ReportsPostRequestTargetTypeEnum),
          ) as V1ReportsPostRequestTargetTypeEnum;
          result.targetType = valueDes;
          break;
        case r'targetId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.targetId = valueDes;
          break;
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
  V1ReportsPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1ReportsPostRequestBuilder();
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

class V1ReportsPostRequestTargetTypeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'user')
  static const V1ReportsPostRequestTargetTypeEnum user = _$v1ReportsPostRequestTargetTypeEnum_user;
  @BuiltValueEnumConst(wireName: r'message')
  static const V1ReportsPostRequestTargetTypeEnum message = _$v1ReportsPostRequestTargetTypeEnum_message;
  @BuiltValueEnumConst(wireName: r'spot')
  static const V1ReportsPostRequestTargetTypeEnum spot = _$v1ReportsPostRequestTargetTypeEnum_spot;
  @BuiltValueEnumConst(wireName: r'venue')
  static const V1ReportsPostRequestTargetTypeEnum venue = _$v1ReportsPostRequestTargetTypeEnum_venue;

  static Serializer<V1ReportsPostRequestTargetTypeEnum> get serializer => _$v1ReportsPostRequestTargetTypeEnumSerializer;

  const V1ReportsPostRequestTargetTypeEnum._(String name): super(name);

  static BuiltSet<V1ReportsPostRequestTargetTypeEnum> get values => _$v1ReportsPostRequestTargetTypeEnumValues;
  static V1ReportsPostRequestTargetTypeEnum valueOf(String name) => _$v1ReportsPostRequestTargetTypeEnumValueOf(name);
}

