import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/data/active_chart_profile.dart';
import '../../core/data/chart_profile_models.dart';
import '../../core/data/chart_profile_repository.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/data/nakshatras.dart';
import '../../core/engine/engine_resolution.dart';
import '../../design_system/design_system.dart';
import '../../features/onboarding/birth_draft.dart';
import '../../shared/widgets/muh_choice_card.dart';
import '../../shared/widgets/muh_primary_button.dart';

class ChartProfileSwitcher extends ConsumerWidget {
  const ChartProfileSwitcher({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final activeId = ref.watch(activeChartProfileIdProvider);
    final profilesAsync = ref.watch(chartProfileListProvider);

    return profilesAsync.when(
      data: (profiles) {
        if (activeId != null && !profiles.any((p) => p.id == activeId)) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            selectOwnChart(ref);
          });
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.chartProfilesTitle,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: MuhSpace.sm),
            Text(
              l10n.chartProfilesSubtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: MuhColors.creamMuted,
                  ),
            ),
            const SizedBox(height: MuhSpace.md),
            Wrap(
              spacing: MuhSpace.sm,
              runSpacing: MuhSpace.sm,
              children: [
                _ChartChip(
                  label: l10n.chartProfileMe,
                  selected: activeId == null,
                  onTap: () => selectOwnChart(ref),
                ),
                for (final profile in profiles)
                  _ChartChip(
                    label: profile.label,
                    selected: activeId == profile.id,
                    onLongPress: () => _confirmDelete(context, ref, profile),
                    onTap: () => selectChartProfile(ref, profile),
                  ),
                ActionChip(
                  avatar: const Icon(Icons.add_rounded, size: 18),
                  label: Text(l10n.chartProfileAdd),
                  onPressed: () => _openAddSheet(context, ref),
                ),
              ],
            ),
          ],
        );
      },
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: MuhSpace.md),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
      error: (_, __) => Text(
        l10n.errorGeneric,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.error,
            ),
      ),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    ChartProfileSummary profile,
  ) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: MuhColors.surface,
        title: Text(l10n.chartProfileDeleteTitle),
        content: Text(l10n.chartProfileDeleteBody(profile.label)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(l10n.profileCancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(l10n.chartProfileDelete),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final repo = ref.read(chartProfileRepositoryProvider);
    if (repo == null) return;
    await repo.delete(profile.id);
    if (ref.read(activeChartProfileIdProvider) == profile.id) {
      selectOwnChart(ref);
    } else {
      invalidateChartScopedCaches(ref);
    }
  }

  Future<void> _openAddSheet(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: MuhColors.surface,
      showDragHandle: true,
      builder: (ctx) => const _AddChartProfileSheet(),
    );
    ref.invalidate(chartProfileListProvider);
  }
}

class _ChartChip extends StatelessWidget {
  const _ChartChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.onLongPress,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? MuhColors.surfaceSoft : MuhColors.surface,
      borderRadius: BorderRadius.circular(MuhRadius.chip),
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(MuhRadius.chip),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: MuhSpace.md,
            vertical: MuhSpace.sm,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(MuhRadius.chip),
            border: Border.all(
              color: selected ? MuhColors.gold : MuhColors.line,
            ),
          ),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: selected ? MuhColors.gold : MuhColors.cream,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
          ),
        ),
      ),
    );
  }
}

class _AddChartProfileSheet extends ConsumerStatefulWidget {
  const _AddChartProfileSheet();

  @override
  ConsumerState<_AddChartProfileSheet> createState() =>
      _AddChartProfileSheetState();
}

class _AddChartProfileSheetState extends ConsumerState<_AddChartProfileSheet> {
  final _name = TextEditingController();
  final _place = TextEditingController();
  DateTime? _dob;
  TimeBucketOption? _bucket;
  TimeOfDay? _exactTime;
  String? _nakshatra;
  var _saving = false;

  static const _timeChoices = [
    TimeBucketOption.earlyMorning,
    TimeBucketOption.morning,
    TimeBucketOption.afternoon,
    TimeBucketOption.evening,
    TimeBucketOption.night,
    TimeBucketOption.lateNight,
    TimeBucketOption.exact,
    TimeBucketOption.unknown,
  ];

  @override
  void dispose() {
    _name.dispose();
    _place.dispose();
    super.dispose();
  }

  String _bucketLabel(AppLocalizations l10n, TimeBucketOption o) {
    return switch (o) {
      TimeBucketOption.earlyMorning => l10n.bucketEarlyMorning,
      TimeBucketOption.morning => l10n.bucketMorning,
      TimeBucketOption.afternoon => l10n.bucketAfternoon,
      TimeBucketOption.evening => l10n.bucketEvening,
      TimeBucketOption.night => l10n.bucketNight,
      TimeBucketOption.lateNight => l10n.bucketLateNight,
      TimeBucketOption.exact => l10n.bucketExact,
      TimeBucketOption.unknown => l10n.bucketUnknown,
    };
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(1920),
      lastDate: now,
    );
    if (picked != null) setState(() => _dob = picked);
  }

  Future<void> _pickExactTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _exactTime ?? const TimeOfDay(hour: 12, minute: 0),
    );
    if (picked != null) setState(() => _exactTime = picked);
  }

  String? _formatTime(TimeOfDay? t) {
    if (t == null) return null;
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m:00';
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final label = _name.text.trim();
    final place = _place.text.trim();
    if (label.isEmpty || _dob == null || place.isEmpty || _bucket == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.chartProfileFormIncomplete)),
      );
      return;
    }
    if (_bucket == TimeBucketOption.exact && _exactTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.chartProfileFormIncomplete)),
      );
      return;
    }

    final repo = ref.read(chartProfileRepositoryProvider);
    final api = ref.read(muhurthaEngineApiProvider);
    if (repo == null || api == null) return;

    setState(() => _saving = true);
    try {
      PlaceResolveResult? resolved;
      try {
        resolved = await api.resolvePlace(place: place);
      } catch (_) {}

      final useExact = _bucket == TimeBucketOption.exact;
      final saved = await repo.save(
        label: label,
        dateOfBirth: _dob!.toIso8601String().split('T').first,
        birthPlace: resolved?.label ?? place,
        birthInputMode: useExact
            ? BirthInputMode.exactTime.apiValue
            : (_nakshatra != null
                ? BirthInputMode.timeBucketPlusNakshatra.apiValue
                : BirthInputMode.timeBucket.apiValue),
        exactBirthTime: useExact ? _formatTime(_exactTime) : null,
        timeBucket: useExact ? null : _bucket!.apiValue,
        janmaNakshatra: useExact ? null : _nakshatra,
        birthLat: resolved?.lat,
        birthLng: resolved?.lng,
        birthTimezone: resolved?.timezone,
      );
      final birthInputId = saved.birthInputId;
      if (birthInputId != null && birthInputId.isNotEmpty) {
        await api.chartInitialize(birthInputId);
      }
      if (!mounted) return;
      selectChartProfile(ref, saved);
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    final showNakshatra = _bucket != null &&
        _bucket != TimeBucketOption.exact &&
        _bucket != TimeBucketOption.unknown;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        MuhSpace.page,
        MuhSpace.sm,
        MuhSpace.page,
        MuhSpace.page + bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l10n.chartProfileAdd,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: MuhSpace.lg),
            TextField(
              controller: _name,
              decoration: InputDecoration(labelText: l10n.chartProfileNameLabel),
            ),
            const SizedBox(height: MuhSpace.md),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                _dob == null
                    ? l10n.fieldDob
                    : MaterialLocalizations.of(context).formatMediumDate(_dob!),
              ),
              trailing: const Icon(Icons.calendar_month_rounded),
              onTap: _pickDob,
            ),
            const SizedBox(height: MuhSpace.md),
            TextField(
              controller: _place,
              decoration: InputDecoration(labelText: l10n.fieldBirthPlace),
            ),
            const SizedBox(height: MuhSpace.md),
            Text(
              l10n.timeTitle,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: MuhSpace.sm),
            ..._timeChoices.map(
              (o) => MuhChoiceCard(
                title: _bucketLabel(l10n, o),
                selected: _bucket == o,
                onTap: () {
                  setState(() {
                    _bucket = o;
                    if (o != TimeBucketOption.exact) {
                      _exactTime = null;
                    } else {
                      _nakshatra = null;
                    }
                  });
                },
              ),
            ),
            if (_bucket == TimeBucketOption.exact) ...[
              ListTile(
                tileColor: MuhColors.surfaceSoft,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(MuhRadius.input),
                ),
                title: Text(
                  _exactTime == null
                      ? l10n.bucketExact
                      : _exactTime!.format(context),
                  style: theme.textTheme.titleSmall,
                ),
                trailing:
                    const Icon(Icons.schedule_rounded, color: MuhColors.gold),
                onTap: _pickExactTime,
              ),
              const SizedBox(height: MuhSpace.md),
            ],
            if (showNakshatra) ...[
              DropdownButtonFormField<String>(
                decoration: InputDecoration(labelText: l10n.nakshatraPick),
                items: [
                  const DropdownMenuItem<String>(
                    value: null,
                    child: Text('—'),
                  ),
                  ...kNakshatras.map(
                    (n) => DropdownMenuItem(value: n, child: Text(n)),
                  ),
                ],
                onChanged: (v) => setState(() => _nakshatra = v),
              ),
              const SizedBox(height: MuhSpace.md),
            ],
            MuhPrimaryButton(
              label: _saving ? l10n.paywallProcessing : l10n.chartProfileSave,
              onPressed: _saving ? null : _save,
            ),
          ],
        ),
      ),
    );
  }
}

class ChartProfileBanner extends ConsumerWidget {
  const ChartProfileBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeId = ref.watch(activeChartProfileIdProvider);
    if (activeId == null) return const SizedBox.shrink();

    final l10n = AppLocalizations.of(context)!;
    final label = ref.watch(activeChartLabelProvider) ?? l10n.chartProfileGuest;

    return Material(
      color: MuhColors.surfaceSoft,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: MuhSpace.page,
          vertical: MuhSpace.sm,
        ),
        child: Row(
          children: [
            const Icon(Icons.people_outline_rounded,
                size: 18, color: MuhColors.goldSoft),
            const SizedBox(width: MuhSpace.sm),
            Expanded(
              child: Text(
                l10n.chartProfileViewing(label),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: MuhColors.creamMuted,
                    ),
              ),
            ),
            TextButton(
              onPressed: () => selectOwnChart(ref),
              child: Text(l10n.chartProfileBackToMine),
            ),
          ],
        ),
      ),
    );
  }
}
