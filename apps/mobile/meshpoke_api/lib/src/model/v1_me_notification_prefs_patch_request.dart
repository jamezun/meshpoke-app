//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:built_collection/built_collection.dart';
import 'package:built_value/built_value.dart';
import 'package:built_value/serializer.dart';

part 'v1_me_notification_prefs_patch_request.g.dart';

/// V1MeNotificationPrefsPatchRequest
///
/// Properties:
/// * [promoOptIn] 
/// * [proximityOptIn] 
/// * [quietHours] 
/// * [categories] 
@BuiltValue()
abstract class V1MeNotificationPrefsPatchRequest implements Built<V1MeNotificationPrefsPatchRequest, V1MeNotificationPrefsPatchRequestBuilder> {
  @BuiltValueField(wireName: r'promoOptIn')
  bool? get promoOptIn;

  @BuiltValueField(wireName: r'proximityOptIn')
  bool? get proximityOptIn;

  @BuiltValueField(wireName: r'quietHours')
  bool? get quietHours;

  @BuiltValueField(wireName: r'categories')
  BuiltMap<String, bool>? get categories;

  V1MeNotificationPrefsPatchRequest._();

  factory V1MeNotificationPrefsPatchRequest([void updates(V1MeNotificationPrefsPatchRequestBuilder b)]) = _$V1MeNotificationPrefsPatchRequest;

  @BuiltValueHook(initializeBuilder: true)
  static void _defaults(V1MeNotificationPrefsPatchRequestBuilder b) => b;

  @BuiltValueSerializer(custom: true)
  static Serializer<V1MeNotificationPrefsPatchRequest> get serializer => _$V1MeNotificationPrefsPatchRequestSerializer();
}

class _$V1MeNotificationPrefsPatchRequestSerializer implements PrimitiveSerializer<V1MeNotificationPrefsPatchRequest> {
  @override
  final Iterable<Type> types = const [V1MeNotificationPrefsPatchRequest, _$V1MeNotificationPrefsPatchRequest];

  @override
  final String wireName = r'V1MeNotificationPrefsPatchRequest';

  Iterable<Object?> _serializeProperties(
    Serializers serializers,
    V1MeNotificationPrefsPatchRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) sync* {
    if (object.promoOptIn != null) {
      yield r'promoOptIn';
      yield serializers.serialize(
        object.promoOptIn,
        specifiedType: const FullType(bool),
      );
    }
    if (object.proximityOptIn != null) {
      yield r'proximityOptIn';
      yield serializers.serialize(
        object.proximityOptIn,
        specifiedType: const FullType(bool),
      );
    }
    if (object.quietHours != null) {
      yield r'quietHours';
      yield serializers.serialize(
        object.quietHours,
        specifiedType: const FullType(bool),
      );
    }
    if (object.categories != null) {
      yield r'categories';
      yield serializers.serialize(
        object.categories,
        specifiedType: const FullType(BuiltMap, [FullType(String), FullType(bool)]),
      );
    }
  }

  @override
  Object serialize(
    Serializers serializers,
    V1MeNotificationPrefsPatchRequest object, {
    FullType specifiedType = FullType.unspecified,
  }) {
    return _serializeProperties(serializers, object, specifiedType: specifiedType).toList();
  }

  void _deserializeProperties(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
    required List<Object?> serializedList,
    required V1MeNotificationPrefsPatchRequestBuilder result,
    required List<Object?> unhandled,
  }) {
    for (var i = 0; i < serializedList.length; i += 2) {
      final key = serializedList[i] as String;
      final value = serializedList[i + 1];
      switch (key) {
        case r'promoOptIn':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.promoOptIn = valueDes;
          break;
        case r'proximityOptIn':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.proximityOptIn = valueDes;
          break;
        case r'quietHours':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(bool),
          ) as bool;
          result.quietHours = valueDes;
          break;
        case r'categories':
          final valueDes = serializers.deserialize(
            value,
            specifiedType: const FullType(BuiltMap, [FullType(String), FullType(bool)]),
          ) as BuiltMap<String, bool>;
          result.categories.replace(valueDes);
          break;
        default:
          unhandled.add(key);
          unhandled.add(value);
          break;
      }
    }
  }

  @override
  V1MeNotificationPrefsPatchRequest deserialize(
    Serializers serializers,
    Object serialized, {
    FullType specifiedType = FullType.unspecified,
  }) {
    final result = V1MeNotificationPrefsPatchRequestBuilder();
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

