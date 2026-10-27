//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:meshpoke_api/src/model/v1_merchant_ladder_put_request_inactivity_days.dart';
import 'package:meshpoke_api/src/model/v1_merchant_ladder_put_request_levels_inner.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_merchant_ladder_put_request.g.dart';

/// V1MerchantLadderPutRequest
///
/// Properties:
/// * [template] 
/// * [inactivityDays] 
/// * [levels] 
@BuiltValue()
abstract class V1MerchantLadderPutRequest implements Built<V1MerchantLadderPutRequest, V1MerchantLadderPutRequestBuilder> {
  @BuiltValueField(wireName: r'template')
  V1MerchantLadderPutRequestTemplateEnum get template;
  // enum templateEnum {  cafe,  bar,  restaurant,  fine_dining,  custom,  };

  @BuiltValueField(wireName: r'inactivityDays')
  V1MerchantLadderPutRequestInactivityDays get inactivityDays;

  @BuiltValueField(wireName: r'levels')
  BuiltList<V1MerchantLadderPutRequestLevelsInner> get levels;

  V1MerchantLadderPutRequest._();

  factory V1MerchantLadderPutRequest([void updates(V1MerchantLadderPutRequestBuilder b)]) = _$V1MerchantLadderPutRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantLadderPutRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantLadderPutRequest> get serializer => _$V1MerchantLadderPutRequestSerializer();
}

class _$V1MerchantLadderPutRequestSerializer implements PrimitiveSerializer<V1MerchantLadderPutRequest> {
  @override
  final Iterable<Type> types = const [V1MerchantLadderPutRequest, _$V1MerchantLadderPutRequest];

  @override
  final String wireName = r'V1MerchantLadderPutRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantLadderPutRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'template';
    yield serializers.serialize(
      object.template,
      specifiedType: const FullType(V1MerchantLadderPutRequestTemplateEnum),
    );
    yield r'inactivityDays';
    yield serializers.serialize(
      object.inactivityDays,
      specifiedType: const FullType(V1MerchantLadderPutRequestInactivityDays),
    );
    yield r'levels';
    yield serializers.serialize(
      object.levels,
      specifiedType: const FullType(BuiltList, [FullType(V1MerchantLadderPutRequestLevelsInner)]),
    );
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantLadderPutRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MerchantLadderPutRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'template':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1MerchantLadderPutRequestTemplateEnum),
          ) as V1MerchantLadderPutRequestTemplateEnum;
          result.template = valueDes;
          break;
        case r'inactivityDays':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1MerchantLadderPutRequestInactivityDays),
          ) as V1MerchantLadderPutRequestInactivityDays;
          result.inactivityDays.replace(valueDes);
          break;
        case r'levels':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltList, [FullType(V1MerchantLadderPutRequestLevelsInner)]),
          ) as BuiltList<V1MerchantLadderPutRequestLevelsInner>;
          result.levels.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MerchantLadderPutRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantLadderPutRequestBuilder();
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

class V1MerchantLadderPutRequestTemplateEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'cafe')
  static const V1MerchantLadderPutRequestTemplateEnum cafe = _$v1MerchantLadderPutRequestTemplateEnum_cafe;
  @BuiltValueEnumConst(wireName: r'bar')
  static const V1MerchantLadderPutRequestTemplateEnum bar = _$v1MerchantLadderPutRequestTemplateEnum_bar;
  @BuiltValueEnumConst(wireName: r'restaurant')
  static const V1MerchantLadderPutRequestTemplateEnum restaurant = _$v1MerchantLadderPutRequestTemplateEnum_restaurant;
  @BuiltValueEnumConst(wireName: r'fine_dining')
  static const V1MerchantLadderPutRequestTemplateEnum fineDining = _$v1MerchantLadderPutRequestTemplateEnum_fineDining;
  @BuiltValueEnumConst(wireName: r'custom')
  static const V1MerchantLadderPutRequestTemplateEnum custom = _$v1MerchantLadderPutRequestTemplateEnum_custom;

  static Serializer<V1MerchantLadderPutRequestTemplateEnum> get serializer => _$v1MerchantLadderPutRequestTemplateEnumSerializer;

  const V1MerchantLadderPutRequestTemplateEnum._(String name): super(name);

  static BuiltSet<V1MerchantLadderPutRequestTemplateEnum> get values => _$v1MerchantLadderPutRequestTemplateEnumValues;
  static V1MerchantLadderPutRequestTemplateEnum valueOf(String name) => _$v1MerchantLadderPutRequestTemplateEnumValueOf(name);
}

