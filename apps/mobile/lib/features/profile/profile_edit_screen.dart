import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:meshpoke/core/api_client.dart';
import 'package:meshpoke/core/constants.g.dart';

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
  final Set<String> _dietary = {};
  // 3 optional vibe-prompt slots: picked question (full 'en|zh' string) + answer.
  final List<String?> _promptKeys = [null, null, null];
  final List<TextEditingController> _promptAnswers = [
    TextEditingController(), TextEditingController(), TextEditingController(),
  ];
  final _dietaryNote = TextEditingController();
  bool _saving = false;

  String? _error;

  static const _dietaryTags = [
    'vegetarian', 'vegan', 'halal', 'no_alcohol', 'no_spicy', 'other',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final me = (await dio.get('/me')).data as Map;
      final kws = ((await dio.get('/me/keywords')).data['keywords'] as List? ?? []);
      if (!mounted) return;
      setState(() {
        _industry = me['industry'] as String?;
        _oneliner.text = me['role_oneliner'] as String? ?? '';
        _dietaryNote.text = me['dietary_note'] as String? ?? '';
        _dietary
          ..clear()
          ..addAll([for (final d in (me['dietary'] as List? ?? [])) d.toString()]);
        final pr = (me['prompts'] as List? ?? []);
        for (var i = 0; i < 3 && i < pr.length; i++) {
          final e = pr[i] as Map;
          final q = e['prompt'] as String? ?? '';
          _promptKeys[i] = VibePrompts.all.where((v) => v.startsWith(q)).firstOrNull;
          _promptAnswers[i].text = e['answer'] as String? ?? '';
        }
        _keywords
          ..clear()
          ..addEntries([
            for (final k in kws)
              MapEntry((k as Map)['keyword'].toString(), (k['level'] as num).toInt()),
          ]);
      });
    } catch (_) {/* first-run / offline: blank form */}
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/me', data: {
        if (_industry != null) 'industry': _industry,
        'role_oneliner': _oneliner.text.trim(),
        'dietary': _dietary.toList(),
        if (_dietaryNote.text.trim().isNotEmpty) 'dietary_note': _dietaryNote.text.trim(),
        'prompts': [
          for (var i = 0; i < 3; i++)
            if (_promptKeys[i] != null && _promptAnswers[i].text.trim().isNotEmpty)
              {'prompt': _promptKeys[i]!.split('|').first, 'answer': _promptAnswers[i].text.trim()},
        ],
      });
      await dio.put('/me/keywords', data: {
        'keywords': [
          for (final e in _keywords.entries) {'keyword': e.key, 'level': e.value},
        ],
      });
      if (mounted) context.pop(true);
    } catch (e) {
      if (mounted) setState(() { _error = '$e'; _saving = false; });
    }
  }

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
            initialValue: _industry,
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
          const SizedBox(height: 16),
          Text('Dietary (hosts see counts before picking a restaurant)',
              style: const TextStyle(fontWeight: FontWeight.bold)),
          Wrap(
            spacing: 6,
            children: [
              for (final t in _dietaryTags)
                FilterChip(
                  label: Text(t.replaceAll('_', ' ')),
                  selected: _dietary.contains(t),
                  onSelected: (on) => setState(
                    () => on ? _dietary.add(t) : _dietary.remove(t),
                  ),
                ),
            ],
          ),
          TextField(
            controller: _dietaryNote,
            maxLength: 80,
            decoration: const InputDecoration(
              labelText: 'Dietary note (optional, e.g. "allergic to shellfish")',
              counterText: '',
            ),
          ),
          const SizedBox(height: 24),
          Text('Vibe prompts (pick up to 3 — shown on your sketch)',
              style: const TextStyle(fontWeight: FontWeight.bold)),
          for (var i = 0; i < 3; i++)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                DropdownButtonFormField<String>(
                  initialValue: _promptKeys[i],
                  decoration: InputDecoration(labelText: 'Prompt ${i + 1}', isDense: true),
                  items: [
                    for (final v in VibePrompts.all)
                      DropdownMenuItem(value: v, child: Text(v.split('|').last, overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (v) => setState(() => _promptKeys[i] = v),
                ),
                if (_promptKeys[i] != null)
                  TextField(
                    controller: _promptAnswers[i],
                    maxLength: 80,
                    decoration: const InputDecoration(labelText: 'Your answer', counterText: '', isDense: true),
                  ),
              ]),
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
            onPressed: _error == null && !_saving ? _save : null,
            child: _saving
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save'),
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
            key: const ValueKey('keyword-input'),
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
