//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_merchant_drops_id_patch_request.g.dart';

/// V1MerchantDropsIdPatchRequest
///
/// Properties:
/// * [status] 
/// * [title] 
/// * [offerText] 
@BuiltValue()
abstract class V1MerchantDropsIdPatchRequest implements Built<V1MerchantDropsIdPatchRequest, V1MerchantDropsIdPatchRequestBuilder> {
  @BuiltValueField(wireName: r'status')
  V1MerchantDropsIdPatchRequestStatusEnum? get status;
  // enum statusEnum {  paused,  active,  ended,  };

  @BuiltValueField(wireName: r'title')
  String? get title;

  @BuiltValueField(wireName: r'offerText')
  String? get offerText;

  V1MerchantDropsIdPatchRequest._();

  factory V1MerchantDropsIdPatchRequest([void updates(V1MerchantDropsIdPatchRequestBuilder b)]) = _$V1MerchantDropsIdPatchRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantDropsIdPatchRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantDropsIdPatchRequest> get serializer => _$V1MerchantDropsIdPatchRequestSerializer();
}

class _$V1MerchantDropsIdPatchRequestSerializer implements PrimitiveSerializer<V1MerchantDropsIdPatchRequest> {
  @override
  final Iterable<Type> types = const [V1MerchantDropsIdPatchRequest, _$V1MerchantDropsIdPatchRequest];

  @override
  final String wireName = r'V1MerchantDropsIdPatchRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantDropsIdPatchRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.status != null) {
      yield r'status';
      yield serializers.serialize(
        object.status,
        specifiedType: const FullType(V1MerchantDropsIdPatchRequestStatusEnum),
      );
    }
    if (object.title != null) {
      yield r'title';
      yield serializers.serialize(
        object.title,
        specifiedType: const FullType(String),
      );
    }
    if (object.offerText != null) {
      yield r'offerText';
      yield serializers.serialize(
        object.offerText,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantDropsIdPatchRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MerchantDropsIdPatchRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'status':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1MerchantDropsIdPatchRequestStatusEnum),
          ) as V1MerchantDropsIdPatchRequestStatusEnum;
          result.status = valueDes;
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
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MerchantDropsIdPatchRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantDropsIdPatchRequestBuilder();
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

class V1MerchantDropsIdPatchRequestStatusEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'paused')
  static const V1MerchantDropsIdPatchRequestStatusEnum paused = _$v1MerchantDropsIdPatchRequestStatusEnum_paused;
  @BuiltValueEnumConst(wireName: r'active')
  static const V1MerchantDropsIdPatchRequestStatusEnum active = _$v1MerchantDropsIdPatchRequestStatusEnum_active;
  @BuiltValueEnumConst(wireName: r'ended')
  static const V1MerchantDropsIdPatchRequestStatusEnum ended = _$v1MerchantDropsIdPatchRequestStatusEnum_ended;

  static Serializer<V1MerchantDropsIdPatchRequestStatusEnum> get serializer => _$v1MerchantDropsIdPatchRequestStatusEnumSerializer;

  const V1MerchantDropsIdPatchRequestStatusEnum._(String name): super(name);

  static BuiltSet<V1MerchantDropsIdPatchRequestStatusEnum> get values => _$v1MerchantDropsIdPatchRequestStatusEnumValues;
  static V1MerchantDropsIdPatchRequestStatusEnum valueOf(String name) => _$v1MerchantDropsIdPatchRequestStatusEnumValueOf(name);
}

