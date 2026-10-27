//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_merchant_drops_post_request.g.dart';

/// V1MerchantDropsPostRequest
///
/// Properties:
/// * [kind] 
/// * [title] 
/// * [offerText] 
/// * [perkCostEstimate] 
/// * [capacity] 
/// * [minGroupSize] 
/// * [sponsored] 
/// * [startsAt] 
/// * [endsAt] 
/// * [discountPct] 
@BuiltValue()
abstract class V1MerchantDropsPostRequest implements Built<V1MerchantDropsPostRequest, V1MerchantDropsPostRequestBuilder> {
  @BuiltValueField(wireName: r'kind')
  V1MerchantDropsPostRequestKindEnum get kind;
  // enum kindEnum {  individual,  group,  };

  @BuiltValueField(wireName: r'title')
  String get title;

  @BuiltValueField(wireName: r'offerText')
  String get offerText;

  @BuiltValueField(wireName: r'perkCostEstimate')
  num? get perkCostEstimate;

  @BuiltValueField(wireName: r'capacity')
  int get capacity;

  @BuiltValueField(wireName: r'minGroupSize')
  int? get minGroupSize;

  @BuiltValueField(wireName: r'sponsored')
  bool? get sponsored;

  @BuiltValueField(wireName: r'startsAt')
  DateTime get startsAt;

  @BuiltValueField(wireName: r'endsAt')
  DateTime get endsAt;

  @BuiltValueField(wireName: r'discountPct')
  num? get discountPct;

  V1MerchantDropsPostRequest._();

  factory V1MerchantDropsPostRequest([void updates(V1MerchantDropsPostRequestBuilder b)]) = _$V1MerchantDropsPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantDropsPostRequestBuilder b) => b
      ..sponsored = false;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantDropsPostRequest> get serializer => _$V1MerchantDropsPostRequestSerializer();
}

class _$V1MerchantDropsPostRequestSerializer implements PrimitiveSerializer<V1MerchantDropsPostRequest> {
  @override
  final Iterable<Type> types = const [V1MerchantDropsPostRequest, _$V1MerchantDropsPostRequest];

  @override
  final String wireName = r'V1MerchantDropsPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantDropsPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'kind';
    yield serializers.serialize(
      object.kind,
      specifiedType: const FullType(V1MerchantDropsPostRequestKindEnum),
    );
    yield r'title';
    yield serializers.serialize(
      object.title,
      specifiedType: const FullType(String),
    );
    yield r'offerText';
    yield serializers.serialize(
      object.offerText,
      specifiedType: const FullType(String),
    );
    if (object.perkCostEstimate != null) {
      yield r'perkCostEstimate';
      yield serializers.serialize(
        object.perkCostEstimate,
        specifiedType: const FullType(num),
      );
    }
    yield r'capacity';
    yield serializers.serialize(
      object.capacity,
      specifiedType: const FullType(int),
    );
    if (object.minGroupSize != null) {
      yield r'minGroupSize';
      yield serializers.serialize(
        object.minGroupSize,
        specifiedType: const FullType(int),
      );
    }
    if (object.sponsored != null) {
      yield r'sponsored';
      yield serializers.serialize(
        object.sponsored,
        specifiedType: const FullType(bool),
      );
    }
    yield r'startsAt';
    yield serializers.serialize(
      object.startsAt,
      specifiedType: const FullType(DateTime),
    );
    yield r'endsAt';
    yield serializers.serialize(
      object.endsAt,
      specifiedType: const FullType(DateTime),
    );
    if (object.discountPct != null) {
      yield r'discountPct';
      yield serializers.serialize(
        object.discountPct,
        specifiedType: const FullType(num),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantDropsPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MerchantDropsPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'kind':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1MerchantDropsPostRequestKindEnum),
          ) as V1MerchantDropsPostRequestKindEnum;
          result.kind = valueDes;
          break;
        case r'title':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.title = valueDes;
          break;
        case r'offerText':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.offerText = valueDes;
          break;
        case r'perkCostEstimate':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.perkCostEstimate = valueDes;
          break;
        case r'capacity':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.capacity = valueDes;
          break;
        case r'minGroupSize':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.minGroupSize = valueDes;
          break;
        case r'sponsored':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.sponsored = valueDes;
          break;
        case r'startsAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.startsAt = valueDes;
          break;
        case r'endsAt':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(DateTime),
          ) as DateTime;
          result.endsAt = valueDes;
          break;
        case r'discountPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(num),
          ) as num;
          result.discountPct = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MerchantDropsPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantDropsPostRequestBuilder();
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

class V1MerchantDropsPostRequestKindEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'individual')
  static const V1MerchantDropsPostRequestKindEnum individual = _$v1MerchantDropsPostRequestKindEnum_individual;
  @BuiltValueEnumConst(wireName: r'group')
  static const V1MerchantDropsPostRequestKindEnum group = _$v1MerchantDropsPostRequestKindEnum_group;

  static Serializer<V1MerchantDropsPostRequestKindEnum> get serializer => _$v1MerchantDropsPostRequestKindEnumSerializer;

  const V1MerchantDropsPostRequestKindEnum._(String name): super(name);

  static BuiltSet<V1MerchantDropsPostRequestKindEnum> get values => _$v1MerchantDropsPostRequestKindEnumValues;
  static V1MerchantDropsPostRequestKindEnum valueOf(String name) => _$v1MerchantDropsPostRequestKindEnumValueOf(name);
}

