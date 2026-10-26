# meshpoke_api.api.DefaultApi

## Load the API package
```dart
import 'package:meshpoke_api/api.dart';
```

All URIs are relative to *https://api.meshpoke.com*

Method | HTTP request | Description
------------- | ------------- | -------------
[**v1HealthGet**](DefaultApi.md#v1healthget) | **GET** /v1/health | 


# **v1HealthGet**
> V1HealthGet200Response v1HealthGet()



### Example
```dart
import 'package:meshpoke_api/api.dart';

final api = MeshpokeApi().getDefaultApi();

try {
    final response = api.v1HealthGet();
    print(response);
} catch on DioException (e) {
    print('Exception when calling DefaultApi->v1HealthGet: $e\n');
}
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**V1HealthGet200Response**](V1HealthGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

