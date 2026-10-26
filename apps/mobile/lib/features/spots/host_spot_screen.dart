import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:meshpoke/core/api_client.dart';
import 'spot_repository.dart';

/// T9.6 host flow: create-spot stepper → queue review → schedule → cancel.
class HostSpotScreen extends ConsumerStatefulWidget {
  const HostSpotScreen({super.key});
  @override
  ConsumerState<HostSpotScreen> createState() => _HostSpotScreenState();
}

class _HostSpotScreenState extends ConsumerState<HostSpotScreen> {
  int _step = 0;
  final _formKey = GlobalKey<FormState>();
  String _template = 'dinner';
  final _name = TextEditingController();
  final List<TextEditingController> _keywords = [];
  double _minScore = 0;
  String _priceRange = 'free';
  String? _districtId;
  int _minHeadcount = 3;
  int _maxHeadcount = 6;
  int _overbook = 1;
  DateTime _dateStart = DateTime.now().add(const Duration(days: 3));
  DateTime _dateEnd = DateTime.now().add(const Duration(days: 10));
  String? _error;

  @override
  Widget build(BuildContext context) {
    final districts = ref.watch(districtListProvider);
    return Scaffold(
      appBar: AppBar(title: Text('Host a spot (${_step + 1}/3)')),
      body: Stepper(
        currentStep: _step,
        onStepContinue: _step == 2 ? _submit : () => setState(() => _step++),
        onStepCancel: _step == 0 ? null : () => setState(() => _step--),
        steps: [
          Step(
            title: const Text('Basics'),
            isActive: _step >= 0,
            state: _step > 0 ? StepState.complete : StepState.indexed,
            content: Form(
              key: _formKey,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                DropdownButtonFormField<String>(
                  initialValue: _template,
                  decoration: const InputDecoration(labelText: 'Template'),
                  items: [for (final t in ['dinner', 'drinks', 'coffee', 'hike', 'run', 'tennis', 'pickleball', 'badminton', 'board_games', 'industry_mingle', 'open_sport']) DropdownMenuItem(value: t, child: Text(t))],
                  onChanged: (v) => setState(() => _template = v!),
                ),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Spot name (3–60 chars)'),
                  validator: (v) => (v ?? '').trim().length < 3 ? 'At least 3 characters' : null,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  children: [
                    for (int i = 0; i < _keywords.length; i++)
                      Chip(
                        label: Text(_keywords[i].text),
                        onDeleted: () => setState(() => _keywords.removeAt(i)),
                      ),
                    ActionChip(
                      label: const Text('+ Keyword'),
                      onPressed: _keywords.length >= 3
                          ? null
                          : () => setState(() => _keywords.add(TextEditingController())),
                    ),
                  ],
                ),
                if (_keywords.isNotEmpty)
                  ..._keywords.map((c) => TextField(
                        controller: c,
                        decoration: const InputDecoration(labelText: 'Required keyword', isDense: true),
                      )),
                DropdownButtonFormField<String>(
                  initialValue: _priceRange,
                  decoration: const InputDecoration(labelText: 'Price range (informational)'),
                  items: const [
                    DropdownMenuItem(value: 'free', child: Text('Free')),
                    DropdownMenuItem(value: '\$', child: Text('\$ (<100)')),
                    DropdownMenuItem(value: '\$\$', child: Text('\$\$ (100–300)')),
                    DropdownMenuItem(value: '\$\$\$', child: Text('\$\$\$ (300+)')),
                  ],
                  onChanged: (v) => setState(() => _priceRange = v!),
                ),
              ]),
            ),
          ),
          Step(
            title: const Text('Who & where'),
            isActive: _step >= 1,
            state: _step > 1 ? StepState.complete : StepState.indexed,
            content: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              districts.when(
                loading: () => const LinearProgressIndicator(),
                error: (e, _) => Text('$e'),
                data: (list) => DropdownButtonFormField<String>(
                  initialValue: _districtId,
                  decoration: const InputDecoration(labelText: 'District anchor'),
                  items: [for (final d in list) DropdownMenuItem(value: d.id, child: Text(d.nameEn))],
                  onChanged: (v) => setState(() => _districtId = v),
                  validator: (v) => v == null ? 'Pick a district' : null,
                ),
              ),
              Slider(
                value: _minScore,
                divisions: 10,
                label: 'Min Show-up Score ${_minScore.toStringAsFixed(1)}',
                onChanged: (v) => setState(() => _minScore = v),
              ),
              Row(children: [
                Expanded(child: _counter('Min', _minHeadcount, 2, (v) => _minHeadcount = v)),
                Expanded(child: _counter('Max', _maxHeadcount, _minHeadcount, (v) => _maxHeadcount = v)),
                Expanded(child: _counter('Buffer', _overbook, 0, (v) => _overbook = v)),
              ]),
            ]),
          ),
          Step(
            title: const Text('Date window'),
            isActive: _step >= 2,
            content: Column(children: [
              ListTile(
                title: const Text('From'),
                subtitle: Text(_dateStart.toLocal().toString().substring(0, 16)),
                trailing: const Icon(Icons.calendar_month),
                onTap: () async {
                  final d = await showDatePicker(context: context, initialDate: _dateStart, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 90)));
                  if (d != null) setState(() => _dateStart = d);
                },
              ),
              ListTile(
                title: const Text('To'),
                subtitle: Text(_dateEnd.toLocal().toString().substring(0, 16)),
                trailing: const Icon(Icons.calendar_month),
                onTap: () async {
                  final d = await showDatePicker(context: context, initialDate: _dateEnd, firstDate: _dateStart, lastDate: DateTime.now().add(const Duration(days: 120)));
                  if (d != null) setState(() => _dateEnd = d);
                },
              ),
              const Text('Date is pinned only when the spot fills — members confirm within 48h.', style: TextStyle(fontSize: 12)),
              if (_error != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_error!, style: const TextStyle(color: Colors.red))),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _counter(String label, int value, int min, void Function(int) set) {
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      IconButton(icon: const Icon(Icons.remove), onPressed: value > min ? () => setState(() => set(value - 1)) : null),
      Text('$label $value'),
      IconButton(icon: const Icon(Icons.add), onPressed: () => setState(() => set(value + 1))),
    ]);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _districtId == null) {
      setState(() { _step = 1; _error = 'Pick a district'; });
      return;
    }
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/spots/events', data: {
        'template': _template,
        'name': _name.text.trim(),
        'requiredKeywords': [for (final k in _keywords) if (k.text.trim().isNotEmpty) k.text.trim()],
        'minScore': _minScore,
        'priceRange': _priceRange,
        'districtId': _districtId,
        'minHeadcount': _minHeadcount,
        'maxHeadcount': _maxHeadcount,
        'overbookBuffer': _overbook,
        'dateStart': _dateStart.toUtc().toIso8601String(),
        'dateEnd': _dateEnd.toUtc().toIso8601String(),
      });
      if (!mounted) return;
      Navigator.of(context).pop(res.data['id']);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    }
  }
}
