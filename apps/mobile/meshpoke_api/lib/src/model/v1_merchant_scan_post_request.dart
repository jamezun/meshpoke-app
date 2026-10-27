//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_merchant_scan_post_request.g.dart';

/// V1MerchantScanPostRequest
///
/// Properties:
/// * [qrPayload] 
/// * [context] 
/// * [dropId] 
/// * [spotId] 
@BuiltValue()
abstract class V1MerchantScanPostRequest implements Built<V1MerchantScanPostRequest, V1MerchantScanPostRequestBuilder> {
  @BuiltValueField(wireName: r'qrPayload')
  String get qrPayload;

  @BuiltValueField(wireName: r'context')
  V1MerchantScanPostRequestContextEnum? get context;
  // enum contextEnum {  drop,  group_drop,  member_visit,  };

  @BuiltValueField(wireName: r'dropId')
  String? get dropId;

  @BuiltValueField(wireName: r'spotId')
  String? get spotId;

  V1MerchantScanPostRequest._();

  factory V1MerchantScanPostRequest([void updates(V1MerchantScanPostRequestBuilder b)]) = _$V1MerchantScanPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantScanPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantScanPostRequest> get serializer => _$V1MerchantScanPostRequestSerializer();
}

class _$V1MerchantScanPostRequestSerializer implements PrimitiveSerializer<V1MerchantScanPostRequest> {
  @override
  final Iterable<Type> types = const [V1MerchantScanPostRequest, _$V1MerchantScanPostRequest];

  @override
  final String wireName = r'V1MerchantScanPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantScanPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'qrPayload';
    yield serializers.serialize(
      object.qrPayload,
      specifiedType: const FullType(String),
    );
    if (object.context != null) {
      yield r'context';
      yield serializers.serialize(
        object.context,
        specifiedType: const FullType(V1MerchantScanPostRequestContextEnum),
      );
    }
    if (object.dropId != null) {
      yield r'dropId';
      yield serializers.serialize(
        object.dropId,
        specifiedType: const FullType(String),
      );
    }
    if (object.spotId != null) {
      yield r'spotId';
      yield serializers.serialize(
        object.spotId,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantScanPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MerchantScanPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'qrPayload':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.qrPayload = valueDes;
          break;
        case r'context':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1MerchantScanPostRequestContextEnum),
          ) as V1MerchantScanPostRequestContextEnum;
          result.context = valueDes;
          break;
        case r'dropId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.dropId = valueDes;
          break;
        case r'spotId':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.spotId = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MerchantScanPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantScanPostRequestBuilder();
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

class V1MerchantScanPostRequestContextEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'drop')
  static const V1MerchantScanPostRequestContextEnum drop = _$v1MerchantScanPostRequestContextEnum_drop;
  @BuiltValueEnumConst(wireName: r'group_drop')
  static const V1MerchantScanPostRequestContextEnum groupDrop = _$v1MerchantScanPostRequestContextEnum_groupDrop;
  @BuiltValueEnumConst(wireName: r'member_visit')
  static const V1MerchantScanPostRequestContextEnum memberVisit = _$v1MerchantScanPostRequestContextEnum_memberVisit;

  static Serializer<V1MerchantScanPostRequestContextEnum> get serializer => _$v1MerchantScanPostRequestContextEnumSerializer;

  const V1MerchantScanPostRequestContextEnum._(String name): super(name);

  static BuiltSet<V1MerchantScanPostRequestContextEnum> get values => _$v1MerchantScanPostRequestContextEnumValues;
  static V1MerchantScanPostRequestContextEnum valueOf(String name) => _$v1MerchantScanPostRequestContextEnumValueOf(name);
}

