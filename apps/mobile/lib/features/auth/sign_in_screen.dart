import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Sign-in: Apple / Google OAuth (GoTrue) + email/password.
/// Browse-only mode = signed out; guarded actions surface verify prompts later.
class SignInScreen extends StatelessWidget {
  const SignInScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
              const Text(
                'Watch your network ripple.',
                style: TextStyle(fontSize: 20, color: Colors.white70),
              ),
              const SizedBox(height: 48),
              FilledButton.icon(
                icon: const Icon(Icons.apple),
                label: const Text('Continue with Apple'),
                onPressed: () {}, // GoTrue OAuth — wired in M-phase env setup
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                icon: const Icon(Icons.android),
                label: const Text('Continue with Google'),
                onPressed: () {},
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/onboard/dob'),
                child: const Text('Continue with email'),
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () {}, // browse-only: map preview without account
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
