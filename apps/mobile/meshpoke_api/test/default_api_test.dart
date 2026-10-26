import 'package:test/test.dart';
import 'package:meshpoke_api/meshpoke_api.dart';


/// tests for DefaultApi
void main() {
  final instance = MeshpokeApi().getDefaultApi();

  group(DefaultApi, () {
    //Future<V1HealthGet200Response> v1HealthGet() async
    test('test v1HealthGet', () async {
      // TODO
    });

  });
}
