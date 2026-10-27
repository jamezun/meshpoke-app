//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_admin_merchant_finance_band_audit_venue_id_post_request.g.dart';

/// V1AdminMerchantFinanceBandAuditVenueIdPostRequest
///
/// Properties:
/// * [newBand] 
/// * [note] 
@BuiltValue()
abstract class V1AdminMerchantFinanceBandAuditVenueIdPostRequest implements Built<V1AdminMerchantFinanceBandAuditVenueIdPostRequest, V1AdminMerchantFinanceBandAuditVenueIdPostRequestBuilder> {
  @BuiltValueField(wireName: r'newBand')
  int get newBand;

  @BuiltValueField(wireName: r'note')
  String? get note;

  V1AdminMerchantFinanceBandAuditVenueIdPostRequest._();

  factory V1AdminMerchantFinanceBandAuditVenueIdPostRequest([void updates(V1AdminMerchantFinanceBandAuditVenueIdPostRequestBuilder b)]) = _$V1AdminMerchantFinanceBandAuditVenueIdPostRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1AdminMerchantFinanceBandAuditVenueIdPostRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1AdminMerchantFinanceBandAuditVenueIdPostRequest> get serializer => _$V1AdminMerchantFinanceBandAuditVenueIdPostRequestSerializer();
}

class _$V1AdminMerchantFinanceBandAuditVenueIdPostRequestSerializer implements PrimitiveSerializer<V1AdminMerchantFinanceBandAuditVenueIdPostRequest> {
  @override
  final Iterable<Type> types = const [V1AdminMerchantFinanceBandAuditVenueIdPostRequest, _$V1AdminMerchantFinanceBandAuditVenueIdPostRequest];

  @override
  final String wireName = r'V1AdminMerchantFinanceBandAuditVenueIdPostRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1AdminMerchantFinanceBandAuditVenueIdPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'newBand';
    yield serializers.serialize(
      object.newBand,
      specifiedType: const FullType(int),
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
    V1AdminMerchantFinanceBandAuditVenueIdPostRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1AdminMerchantFinanceBandAuditVenueIdPostRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'newBand':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.newBand = valueDes;
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
  V1AdminMerchantFinanceBandAuditVenueIdPostRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1AdminMerchantFinanceBandAuditVenueIdPostRequestBuilder();
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

