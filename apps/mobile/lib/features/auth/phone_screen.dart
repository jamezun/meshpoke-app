import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Phone verification: +852 fixed prefix, 8-digit number, OTP entry, resend timer.
/// POSTs /me/phone/otp then submits to GoTrue verify (T2.3 backend contract).
class PhoneScreen extends ConsumerStatefulWidget {
  const PhoneScreen({super.key});

  @override
  ConsumerState<PhoneScreen> createState() => _PhoneScreenState();
}

enum PhoneStage { number, otp, verifying, done, error }

class _PhoneScreenState extends ConsumerState<PhoneScreen> {
  PhoneStage _stage = PhoneStage.number;
  String _error = '';
  final _number = TextEditingController();
  final _otp = TextEditingController();
  int _resendIn = 0; // seconds until resend allowed

  bool get _numberValid => RegExp(r'^\d{8}$').hasMatch(_number.text);

  void _send() async {
    if (!_numberValid) {
      setState(() => _error = 'Enter the 8 digits after +852.');
      return;
    }
    setState(() {
      _stage = PhoneStage.otp;
      _error = '';
      _resendIn = 60;
      _tickResend();
    });
    // POST /me/phone/otp handled by auth repository in M-phase wiring
  }

  void _tickResend() {
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted || _resendIn <= 0) return;
      setState(() => _resendIn -= 1);
      _tickResend();
    });
  }

  void _verify() async {
    if (_otp.text.length != 6) {
      setState(() => _error = 'Enter the 6-digit code.');
      return;
    }
    setState(() {
      _stage = PhoneStage.verifying;
      _error = '';
    });
    // placeholder success path; error path sets PhoneStage.error
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify your phone')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_stage == PhoneStage.number) ...[
              Text(
                'We verify every member with a phone number. This keeps the mesh real.',
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Padding(
                    padding: EdgeInsets.only(right: 8),
                    child: Text('+852', style: TextStyle(fontSize: 18)),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _number,
                      keyboardType: TextInputType.phone,
                      maxLength: 8,
                      decoration: const InputDecoration(
                        hintText: 'XXXXXXXX',
                        counterText: '',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FilledButton(onPressed: _send, child: const Text('Send code')),
            ],
            if (_stage == PhoneStage.otp || _stage == PhoneStage.verifying) ...[
              Text('Enter the 6-digit code we sent to +852 ${_number.text}'),
              const SizedBox(height: 16),
              TextField(
                controller: _otp,
                keyboardType: TextInputType.number,
                maxLength: 6,
                enabled: _stage != PhoneStage.verifying,
                decoration: const InputDecoration(
                  hintText: '••••••',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _stage == PhoneStage.verifying ? null : _verify,
                child: _stage == PhoneStage.verifying
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Verify'),
              ),
              TextButton(
                onPressed: _resendIn > 0 ? null : _send,
                child: Text(
                  _resendIn > 0 ? 'Resend in ${_resendIn}s' : 'Resend code',
                ),
              ),
            ],
            if (_stage == PhoneStage.done)
              const Text(
                'Verified! Welcome to the mesh.',
                style: TextStyle(fontSize: 18),
              ),
            if (_error.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  _error,
                  style: const TextStyle(color: Colors.redAccent),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
