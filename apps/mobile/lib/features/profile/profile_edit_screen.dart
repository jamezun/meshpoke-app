import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Sketch + keywords editor (PRD §3.1, §5.3).
/// Industry dropdown, 40-char one-liner, 10 keywords with 1–10 levels (max 3 at 8+).
class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

const kIndustries = [
  'Finance',
  'Tech',
  'Design',
  'Media',
  'Medical',
  'Legal',
  'Education',
  'Hospitality',
  'Student',
  'Other',
];

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  String? _industry;
  final _oneliner = TextEditingController();
  final Map<String, int> _keywords = {}; // keyword → level

  String? _error;

  /// Mirrors the DB trigger (T1.1): max 10 keywords, max 3 at level ≥ 8.
  static String? validateKeywords(Map<String, int> kws) {
    if (kws.length > 10) return 'Max 10 keywords (you have ${kws.length}).';
    final high = kws.values.where((l) => l >= 8).length;
    if (high > 3) return 'Max 3 keywords at level 8+ (you have $high).';
    return null;
  }

  void _setLevel(String kw, int level) {
    setState(() {
      _keywords[kw] = level;
      _error = validateKeywords(_keywords);
    });
  }

  void _add(String raw) {
    final kw = raw.trim().toLowerCase();
    if (kw.isEmpty || _keywords.containsKey(kw)) return;
    setState(() {
      _keywords[kw] = 1;
      _error = validateKeywords(_keywords);
    });
  }

  void _remove(String kw) {
    setState(() {
      _keywords.remove(kw);
      _error = validateKeywords(_keywords);
    });
  }

  @override
  Widget build(BuildContext context) {
    final highCount = _keywords.values.where((l) => l >= 8).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DropdownButtonFormField<String>(
            value: _industry,
            items: [
              for (final i in kIndustries)
                DropdownMenuItem(value: i, child: Text(i)),
            ],
            onChanged: (v) => setState(() => _industry = v),
            decoration: const InputDecoration(labelText: 'Industry'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _oneliner,
            maxLength: 40,
            decoration: const InputDecoration(
              labelText: 'One-liner (what do you do?)',
              counterText: '',
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Keywords — what are you about? (${_keywords.length}/10, $highCount/3 at 8+)',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _KeywordInput(onAdd: _add),
          const SizedBox(height: 8),
          for (final kw in _keywords.keys)
            _KeywordRow(
              keyword: kw,
              level: _keywords[kw]!,
              onChanged: (l) => _setLevel(kw, l),
              onRemove: () => _remove(kw),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.redAccent),
              ),
            ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _error == null
                ? () =>
                      context.pop(
                        true,
                      ) // caller persists via PATCH /me + PUT /me/keywords
                : null,
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }
}

class _KeywordInput extends StatefulWidget {
  const _KeywordInput({required this.onAdd});
  final void Function(String) onAdd;
  @override
  State<_KeywordInput> createState() => _KeywordInputState();
}

class _KeywordInputState extends State<_KeywordInput> {
  final _c = TextEditingController();
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _c,
            decoration: const InputDecoration(
              hintText: 'e.g. tennis, coffee, fintech',
            ),
            onSubmitted: (v) {
              widget.onAdd(v);
              _c.clear();
            },
          ),
        ),
        IconButton(
          icon: const Icon(Icons.add),
          onPressed: () {
            widget.onAdd(_c.text);
            _c.clear();
          },
        ),
      ],
    );
  }
}

class _KeywordRow extends StatelessWidget {
  const _KeywordRow({
    required this.keyword,
    required this.level,
    required this.onChanged,
    required this.onRemove,
  });
  final String keyword;
  final int level;
  final ValueChanged<int> onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(keyword, style: const TextStyle(fontSize: 16)),
            ),
            Text(
              'Lv $level',
              style: TextStyle(
                color: level >= 8 ? Colors.amber : Colors.white54,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              onPressed: onRemove,
            ),
          ],
        ),
        Slider(
          value: level.toDouble(),
          min: 1,
          max: 10,
          divisions: 9,
          label: '$level',
          activeColor: level >= 8 ? Colors.amber : null,
          onChanged: (v) => onChanged(v.round()),
        ),
      ],
    );
  }
}
