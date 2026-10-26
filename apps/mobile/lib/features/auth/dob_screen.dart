import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// DOB gate: 18+ by HKT calendar date. Blocks < 18 with a friendly message.
class DobScreen extends StatefulWidget {
  const DobScreen({super.key});

  @override
  State<DobScreen> createState() => _DobScreenState();
}

class _DobScreenState extends State<DobScreen> {
  DateTime? _dob;
  String? _error;

  bool get _is18 {
    if (_dob == null) return false;
    final now = DateTime.now();
    final eighteenAgo = DateTime(now.year - 18, now.month, now.day);
    return !_dob!.isAfter(eighteenAgo);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('When were you born?')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'MeshPoke is for adults only. We use this to check your age — it stays private.',
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: DateTime(2000),
                  firstDate: DateTime(1930),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  setState(() {
                    _dob = picked;
                    _error = null;
                  });
                }
              },
              child: Text(
                _dob == null
                    ? 'Pick your date of birth'
                    : '${_dob!.year}-${_dob!.month.toString().padLeft(2, '0')}-${_dob!.day.toString().padLeft(2, '0')}',
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.redAccent),
                ),
              ),
            const Spacer(),
            FilledButton(
              onPressed: () {
                if (_dob == null) {
                  setState(() => _error = 'Pick your date of birth first.');
                  return;
                }
                if (!_is18) {
                  setState(
                    () => _error =
                        'You need to be 18 or older to join MeshPoke. See you in a few years!',
                  );
                  return;
                }
                context.go('/onboard/phone');
              },
              child: const Text('Continue'),
            ),
          ],
        ),
      ),
    );
  }
}
