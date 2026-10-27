//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_admin_merchant_finance_disputes_id_resolve_post_request.g.dart';

/// V1AdminMerchantFinanceDisputesIdResolvePostRequest
///
/// Properties:
/// * [resolution] 
/// * [note] 
@BuiltValue()
abstract class V1AdminMerchantFinanceDisputesIdResolvePostRequest implements Built<V1AdminMerchantFinanceDisputesIdResolvePostRequest, V1AdminMerchantFinanceDisputesIdResolvePostRequestBuilder> {
  @BuiltValueField(wireName: r'resolution')
  V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum get resolution;
  // enum resolutionEnum {  credit_note,  rejected,  };

  @BuiltValueField(wireName: r'note')
  String? get note;

  V1AdminMerchantFinanceDisputesIdResolvePostRequest._();

  factory V1AdminMerchantFinanceDisputesIdResolvePostRequest([void updates(V1AdminMerchantFinanceDisputesIdResolvePostRequestBuilder b)]) = _$V1AdminMerchantFinanceDisputesIdResolvePostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1AdminMerchantFinanceDisputesIdResolvePostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1AdminMerchantFinanceDisputesIdResolvePostRequest> get serializer => _$V1AdminMerchantFinanceDisputesIdResolvePostRequestSerializer();
}

class _$V1AdminMerchantFinanceDisputesIdResolvePostRequestSerializer implements PrimitiveSerializer<V1AdminMerchantFinanceDisputesIdResolvePostRequest> {
  @override
  final Iterable<Type> types = const [V1AdminMerchantFinanceDisputesIdResolvePostRequest, _$V1AdminMerchantFinanceDisputesIdResolvePostRequest];

  @override
  final String wireName = r'V1AdminMerchantFinanceDisputesIdResolvePostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1AdminMerchantFinanceDisputesIdResolvePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'resolution';
    yield serializers.serialize(
      object.resolution,
      specifiedType: const FullType(V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum),
    );
    if (object.note != null) {
      yield r'note';
      yield serializers.serialize(
        object.note,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    V1AdminMerchantFinanceDisputesIdResolvePostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1AdminMerchantFinanceDisputesIdResolvePostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'resolution':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum),
          ) as V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum;
          result.resolution = valueDes;
          break;
        case r'note':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.note = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1AdminMerchantFinanceDisputesIdResolvePostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1AdminMerchantFinanceDisputesIdResolvePostRequestBuilder();
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

class V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum extends EnumClass {

  @BuiltValueEnumConst(wireName: r'credit_note')
  static const V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum creditNote = _$v1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum_creditNote;
  @BuiltValueEnumConst(wireName: r'rejected')
  static const V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum rejected = _$v1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum_rejected;

  static Serializer<V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum> get serializer => _$v1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnumSerializer;

  const V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum._(String name): super(name);

  static BuiltSet<V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum> get values => _$v1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnumValues;
  static V1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnum valueOf(String name) => _$v1AdminMerchantFinanceDisputesIdResolvePostRequestResolutionEnumValueOf(name);
}

