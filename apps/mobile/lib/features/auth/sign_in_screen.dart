import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Sign-in: Apple / Google OAuth (GoTrue) + email/password.
/// Browse-only mode = signed out; guarded actions surface verify prompts later.
class SignInScreen extends ConsumerWidget {
  const SignInScreen({super.key});

  Future<void> _oauth(BuildContext context, String provider) async {
    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.values.firstWhere((p) => p.name == provider),
        redirectTo: 'io.supabase.meshpoke://login-cb/',
      );
    } on AuthException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$provider sign-in unavailable: ${e.message}')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$provider not configured on this build yet.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Poke the mesh.',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
              ),
              Text(
                'Watch your network ripple.',
                style: TextStyle(fontSize: 20, color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 48),
              FilledButton.icon(
                icon: const Icon(Icons.apple),
                label: const Text('Continue with Apple'),
                onPressed: () => _oauth(context, 'apple'),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                icon: const Icon(Icons.android),
                label: const Text('Continue with Google'),
                onPressed: () => _oauth(context, 'google'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/onboard/dob'),
                child: const Text('Sign up with email'),
              ),
              const SizedBox(height: 4),
              TextButton(
                onPressed: () => context.go('/signin/email'),
                child: const Text('Sign in with email'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/map'), // browse-only: map without account
                child: const Text(
                  'Just browse the map first',
                  style: TextStyle(decoration: TextDecoration.underline),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
