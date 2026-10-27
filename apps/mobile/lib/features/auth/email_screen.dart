import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Email + password sign-in / sign-up (GoTrue).
/// Signup keeps the 18+ DOB from the previous screen (passed as extra) and
/// continues to /onboard/phone — phone verification is compulsory (PRD §3.2).
class EmailAuthScreen extends ConsumerStatefulWidget {
  const EmailAuthScreen({super.key, this.dob, this.mode = 'signup'});
  final String? dob; // YYYY-MM-DD when registering
  final String mode; // 'signup' | 'signin'

  @override
  ConsumerState<EmailAuthScreen> createState() => _EmailAuthScreenState();
}

class _EmailAuthScreenState extends ConsumerState<EmailAuthScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  bool get _signin => widget.mode == 'signin';

  Future<void> _submit() async {
    if (_email.text.isEmpty || _password.text.length < 8) {
      setState(() => _error = 'Enter an email and a password of 8+ characters.');
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      if (_signin) {
        await Supabase.instance.client.auth.signInWithPassword(
          email: _email.text.trim(), password: _password.text);
        if (mounted) context.go('/map');
      } else {
        await Supabase.instance.client.auth.signUp(
          email: _email.text.trim(),
          password: _password.text,
          data: {'dob': widget.dob},
        );
        if (mounted) context.go('/onboard/phone');
      }
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not reach the sign-in service. Try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_signin ? 'Sign in with email' : 'Create your account')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _signin
                  ? 'Welcome back — the map has been waiting.'
                  : 'One account, one phone number. Free tier included, no card required.',
              style: const TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Password (8+ chars)', border: OutlineInputBorder()),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
              ),
            const Spacer(),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? 'One moment…' : (_signin ? 'Sign in' : 'Create account')),
            ),
            const SizedBox(height: 12),
            Text(
              'By continuing you agree to the Terms and Privacy Policy.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.white38),
            ),
          ],
        ),
      ),
    );
  }
}
