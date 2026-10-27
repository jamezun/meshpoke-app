//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_me_location_ping_post_request.g.dart';

/// V1MeLocationPingPostRequest
///
/// Properties:
/// * [lat] 
/// * [lng] 
/// * [accuracyM] 
/// * [purpose] 
@BuiltValue()
abstract class V1MeLocationPingPostRequest implements Built<V1MeLocationPingPostRequest, V1MeLocationPingPostRequestBuilder> {
  @BuiltValueField(wireName: r'lat')
  num get lat;

  @BuiltValueField(wireName: r'lng')
  num get lng;

  @BuiltValueField(wireName: r'accuracyM')
  num? get accuracyM;

  @BuiltValueField(wireName: r'purpose')
  V1MeLocationPingPostRequestPurposeEnum get purpose;
  // enum purposeEnum {  qr,  proximity,  };

  V1MeLocationPingPostRequest._();

  factory V1MeLocationPingPostRequest([void updates(V1MeLocationPingPostRequestBuilder b)]) = _$V1MeLocationPingPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MeLocationPingPostRequestBuilder b) => b
      ..accuracyM = 50;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MeLocationPingPostRequest> get serializer => _$V1MeLocationPingPostRequestSerializer();
}

class _$V1MeLocationPingPostRequestSerializer implements PrimitiveSerializer<V1MeLocationPingPostRequest> {
  @override
  final Iterable<Type> types = const [V1MeLocationPingPostRequest, _$V1MeLocationPingPostRequest];

  @override
  final String wireName = r'V1MeLocationPingPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MeLocationPingPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'lat';
    yield serializers.serialize(
      object.lat,
      specifiedType: const FullType(num),
    );
    yield r'lng';
    yield serializers.serialize(
      object.lng,
      specifiedType: const FullType(num),
    );
    if (object.accuracyM != null) {
      yield r'accuracyM';
      yield serializers.serialize(
        object.accuracyM,
        specifiedType: const FullType(num),
      );
    }
    yield r'purpose';
    yield serializers.serialize(
      object.purpose,
      specifiedType: const FullType(V1MeLocationPingPostRequestPurposeEnum),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MeLocationPingPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MeLocationPingPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'lat':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.lat = valueDes;
          break;
        case r'lng':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.lng = valueDes;
          break;
        case r'accuracyM':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.accuracyM = valueDes;
          break;
        case r'purpose':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1MeLocationPingPostRequestPurposeEnum),
          ) as V1MeLocationPingPostRequestPurposeEnum;
          result.purpose = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MeLocationPingPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MeLocationPingPostRequestBuilder();
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

class V1MeLocationPingPostRequestPurposeEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'qr')
  static const V1MeLocationPingPostRequestPurposeEnum qr = _$v1MeLocationPingPostRequestPurposeEnum_qr;
  @BuiltValueEnumConst(wireName: r'proximity')
  static const V1MeLocationPingPostRequestPurposeEnum proximity = _$v1MeLocationPingPostRequestPurposeEnum_proximity;

  static Serializer<V1MeLocationPingPostRequestPurposeEnum> get serializer => _$v1MeLocationPingPostRequestPurposeEnumSerializer;

  const V1MeLocationPingPostRequestPurposeEnum._(String name): super(name);

  static BuiltSet<V1MeLocationPingPostRequestPurposeEnum> get values => _$v1MeLocationPingPostRequestPurposeEnumValues;
  static V1MeLocationPingPostRequestPurposeEnum valueOf(String name) => _$v1MeLocationPingPostRequestPurposeEnumValueOf(name);
}

