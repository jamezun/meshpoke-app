import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Thin API client: dio → Fastify (api.meshpoke.com in prod; API_BASE_URL override for dev).
/// Auth token comes from the GoTrue (Supabase) session.
final apiClientProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://localhost:3000/v1',
      ),
      connectTimeout: const Duration(seconds: 10),
    ),
  );
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final session = Supabase.instance.client.auth.currentSession;
        if (session != null) {
          options.headers['Authorization'] = 'Bearer ${session.accessToken}';
        }
        handler.next(options);
      },
    ),
  );
  return dio;
});

/// GoTrue session stream (null = signed out).
final authStateProvider = StreamProvider<String?>((ref) async* {
  yield* Supabase.instance.client.auth.onAuthStateChange.map(
    (s) => s.session?.accessToken,
  );
});
