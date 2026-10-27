//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_merchant_ladder_put_request_levels_inner.g.dart';

/// V1MerchantLadderPutRequestLevelsInner
///
/// Properties:
/// * [position] 
/// * [name] 
/// * [minVisits] 
/// * [minMonths] 
/// * [discountPct] 
/// * [perkText] 
@BuiltValue()
abstract class V1MerchantLadderPutRequestLevelsInner implements Built<V1MerchantLadderPutRequestLevelsInner, V1MerchantLadderPutRequestLevelsInnerBuilder> {
  @BuiltValueField(wireName: r'position')
  int get position;

  @BuiltValueField(wireName: r'name')
  String get name;

  @BuiltValueField(wireName: r'minVisits')
  int get minVisits;

  @BuiltValueField(wireName: r'minMonths')
  int get minMonths;

  @BuiltValueField(wireName: r'discountPct')
  num? get discountPct;

  @BuiltValueField(wireName: r'perkText')
  String? get perkText;

  V1MerchantLadderPutRequestLevelsInner._();

  factory V1MerchantLadderPutRequestLevelsInner([void updates(V1MerchantLadderPutRequestLevelsInnerBuilder b)]) = _$V1MerchantLadderPutRequestLevelsInner;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantLadderPutRequestLevelsInnerBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantLadderPutRequestLevelsInner> get serializer => _$V1MerchantLadderPutRequestLevelsInnerSerializer();
}

class _$V1MerchantLadderPutRequestLevelsInnerSerializer implements PrimitiveSerializer<V1MerchantLadderPutRequestLevelsInner> {
  @override
  final Iterable<Type> types = const [V1MerchantLadderPutRequestLevelsInner, _$V1MerchantLadderPutRequestLevelsInner];

  @override
  final String wireName = r'V1MerchantLadderPutRequestLevelsInner';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantLadderPutRequestLevelsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    yield r'position';
    yield serializers.serialize(
      object.position,
      specifiedType: const FullType(int),
    );
    yield r'name';
    yield serializers.serialize(
      object.name,
      specifiedType: const FullType(String),
    );
    yield r'minVisits';
    yield serializers.serialize(
      object.minVisits,
      specifiedType: const FullType(int),
    );
    yield r'minMonths';
    yield serializers.serialize(
      object.minMonths,
      specifiedType: const FullType(int),
    );
    if (object.discountPct != null) {
      yield r'discountPct';
      yield serializers.serialize(
        object.discountPct,
        specifiedType: const FullType.nullable(num),
      );
    }
    if (object.perkText != null) {
      yield r'perkText';
      yield serializers.serialize(
        object.perkText,
        specifiedType: const FullType(String),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantLadderPutRequestLevelsInner object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MerchantLadderPutRequestLevelsInnerBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'position':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.position = valueDes;
          break;
        case r'name':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.name = valueDes;
          break;
        case r'minVisits':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.minVisits = valueDes;
          break;
        case r'minMonths':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(int),
          ) as int;
          result.minMonths = valueDes;
          break;
        case r'discountPct':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType.nullable(num),
          ) as num?;
          if (valueDes == null) continue;
          result.discountPct = valueDes;
          break;
        case r'perkText':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(String),
          ) as String;
          result.perkText = valueDes;
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MerchantLadderPutRequestLevelsInner deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantLadderPutRequestLevelsInnerBuilder();
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

