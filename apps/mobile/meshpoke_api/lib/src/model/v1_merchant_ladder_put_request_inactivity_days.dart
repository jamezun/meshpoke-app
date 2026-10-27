//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'dart:core';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';
import 'package:one_of/any_of.dart';

part 'v1_merchant_ladder_put_request_inactivity_days.g.dart';

/// V1MerchantLadderPutRequestInactivityDays
@BuiltValue()
abstract class V1MerchantLadderPutRequestInactivityDays implements Built<V1MerchantLadderPutRequestInactivityDays, V1MerchantLadderPutRequestInactivityDaysBuilder> {
  /// Any Of [num]
  AnyOf get anyOf;

  V1MerchantLadderPutRequestInactivityDays._();

  factory V1MerchantLadderPutRequestInactivityDays([void updates(V1MerchantLadderPutRequestInactivityDaysBuilder b)]) = _$V1MerchantLadderPutRequestInactivityDays;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MerchantLadderPutRequestInactivityDaysBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MerchantLadderPutRequestInactivityDays> get serializer => _$V1MerchantLadderPutRequestInactivityDaysSerializer();
}

class _$V1MerchantLadderPutRequestInactivityDaysSerializer implements PrimitiveSerializer<V1MerchantLadderPutRequestInactivityDays> {
  @override
  final Iterable<Type> types = const [V1MerchantLadderPutRequestInactivityDays, _$V1MerchantLadderPutRequestInactivityDays];

  @override
  final String wireName = r'V1MerchantLadderPutRequestInactivityDays';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MerchantLadderPutRequestInactivityDays object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MerchantLadderPutRequestInactivityDays object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final anyOf = object.anyOf;
    return serializers.serialize(anyOf, specifiedType: FullType(AnyOf, anyOf.valueTypes.map((type) => FullType(type)).toList()))!;
  }

  @override
  V1MerchantLadderPutRequestInactivityDays deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MerchantLadderPutRequestInactivityDaysBuilder();
    Object? anyOfDataSrc;
    final targetType = const FullType(AnyOf, [FullType(AnyOf0Enum), FullType(AnyOf1Enum), FullType(AnyOf2Enum), ]);
    anyOfDataSrc = serialized;
    result.anyOf = serializers.deserialize(anyOfDataSrc, specifiedType: targetType) as AnyOf;
    return result.build();
  }
}

