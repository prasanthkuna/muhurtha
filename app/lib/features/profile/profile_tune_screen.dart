import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/data/engine_cache_invalidate.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/data/profile_repository.dart';
import '../../core/data/nakshatras.dart';
import '../../core/locale/locale_provider.dart';
import '../../design_system/design_system.dart';
import '../../features/onboarding/birth_draft.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';

/// Edit display name, language, birth time window, nakshatra — then hard-refresh engine content.
class ProfileTuneScreen extends ConsumerStatefulWidget {
  const ProfileTuneScreen({super.key});

  @override
  ConsumerState<ProfileTuneScreen> createState() => _ProfileTuneScreenState();
}

class _ProfileTuneScreenState extends ConsumerState<ProfileTuneScreen> {
  final _name = TextEditingController();
  final _city = TextEditingController();
  BirthDraft _draft = const BirthDraft();
  String? _birthInputId;
  var _loading = true;
  var _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final repo = ref.read(profileRepositoryProvider);
    if (repo == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    final bundle = await repo.loadEditableProfile();
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (bundle != null) {
        _draft = bundle.draft;
        _birthInputId = bundle.birthInputId;
        _name.text = bundle.draft.displayName ?? '';
        _city.text = bundle.draft.currentCity ?? '';
      }
    });
  }

  String _bucketLabel(AppLocalizations l, TimeBucketOption o) {
    return switch (o) {
      TimeBucketOption.earlyMorning => l.bucketEarlyMorning,
      TimeBucketOption.morning => l.bucketMorning,
      TimeBucketOption.afternoon => l.bucketAfternoon,
      TimeBucketOption.evening => l.bucketEvening,
      TimeBucketOption.night => l.bucketNight,
      TimeBucketOption.lateNight => l.bucketLateNight,
      TimeBucketOption.exact => l.bucketExact,
      TimeBucketOption.unknown => l.bucketUnknown,
    };
  }

  Future<void> _pickExact(BuildContext context) async {
    final t = await showTimePicker(
      context: context,
      initialTime: _draft.exactBirthTime ?? const TimeOfDay(hour: 6, minute: 0),
    );
    if (t != null) {
      setState(() {
        _draft = _draft.copyWith(exactBirthTime: t);
      });
    }
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final repo = ref.read(profileRepositoryProvider);
    if (repo == null || _draft.dateOfBirth == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric)),
      );
      return;
    }
    if ((_draft.currentCity?.trim().isEmpty ?? true)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric)),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final ids = await repo.saveOnboardingDraft(_draft);
      _birthInputId = ids.birthInputId;
      final api = ref.read(muhurthaEngineApiProvider);
      if (api != null) {
        try {
          await api.chartInitialize(ids.birthInputId);
        } catch (_) {}
      }
      ref.read(localeProvider.notifier).setLanguageCode(_draft.languageCode);
      invalidateAllEngineCaches(ref);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.profileSaved)),
        );
        context.pop();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorGeneric)),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final buckets = [
      TimeBucketOption.earlyMorning,
      TimeBucketOption.morning,
      TimeBucketOption.afternoon,
      TimeBucketOption.evening,
      TimeBucketOption.night,
      TimeBucketOption.lateNight,
      TimeBucketOption.exact,
      TimeBucketOption.unknown,
    ];

    if (_loading) {
      return OrbitalBackdrop(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(title: Text(l10n.profileTuneTitle)),
          body: const Center(
            child: CircularProgressIndicator(color: MuhColors.gold),
          ),
        ),
      );
    }

    if (_birthInputId == null) {
      return OrbitalBackdrop(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          appBar: AppBar(title: Text(l10n.profileTuneTitle)),
          body: Center(child: Text(l10n.errorGeneric)),
        ),
      );
    }

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(l10n.profileTuneTitle),
          foregroundColor: MuhColors.cream,
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(MuhSpace.page),
            children: [
              Text(
                l10n.profileTuneHint,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.creamMuted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: MuhSpace.lg),
              TextField(
                controller: _name,
                decoration: InputDecoration(labelText: l10n.fieldName),
                onChanged: (v) => setState(() {
                  _draft = _draft.copyWith(displayName: v.isEmpty ? null : v);
                }),
              ),
              const SizedBox(height: MuhSpace.md),
              TextField(
                controller: _city,
                decoration: InputDecoration(labelText: l10n.fieldCurrentCity),
                onChanged: (v) => setState(() {
                  _draft = _draft.copyWith(currentCity: v);
                }),
              ),
              const SizedBox(height: MuhSpace.md),
              DropdownButtonFormField<String>(
                initialValue: _draft.languageCode,
                dropdownColor: MuhColors.surface,
                decoration: InputDecoration(labelText: l10n.fieldLanguage),
                items: [
                  DropdownMenuItem(value: 'en', child: Text(l10n.langEnglish)),
                  DropdownMenuItem(value: 'te', child: Text(l10n.langTelugu)),
                  DropdownMenuItem(value: 'hi', child: Text(l10n.langHindi)),
                ],
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _draft = _draft.copyWith(languageCode: v));
                },
              ),
              const SizedBox(height: MuhSpace.lg),
              Text(l10n.timeTitle, style: theme.textTheme.titleSmall),
              const SizedBox(height: MuhSpace.sm),
              ...buckets.map(
                (o) => Padding(
                  padding: const EdgeInsets.only(bottom: MuhSpace.sm),
                  child: ChoiceChip(
                    label: Text(_bucketLabel(l10n, o)),
                    selected: _draft.timeBucket == o,
                    onSelected: (_) {
                      setState(() {
                        _draft = _draft.copyWith(
                          timeBucket: o,
                          clearExactBirthTime: o != TimeBucketOption.exact,
                        );
                      });
                    },
                  ),
                ),
              ),
              if (_draft.timeBucket == TimeBucketOption.exact)
                ListTile(
                  tileColor: MuhColors.surfaceSoft,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(MuhRadius.input),
                  ),
                  title: Text(
                    _draft.exactBirthTime == null
                        ? l10n.bucketExact
                        : _draft.exactBirthTime!.format(context),
                  ),
                  trailing: const Icon(Icons.schedule_rounded,
                      color: MuhColors.gold),
                  onTap: () => _pickExact(context),
                ),
              const SizedBox(height: MuhSpace.lg),
              Text(l10n.nakshatraTitle, style: theme.textTheme.titleSmall),
              const SizedBox(height: MuhSpace.sm),
              FilterChip(
                label: Text(l10n.nakshatraUnknown),
                selected: _draft.nakshatraUnknown,
                onSelected: (s) => setState(() {
                  _draft = _draft.copyWith(
                    nakshatraUnknown: s,
                    clearJanmaNakshatra: s,
                  );
                }),
              ),
              if (!_draft.nakshatraUnknown)
                RadioGroup<String>(
                  groupValue:
                      (_draft.janmaNakshatra?.isNotEmpty ?? false)
                          ? _draft.janmaNakshatra
                          : null,
                  onChanged: (v) => setState(() {
                    _draft = _draft.copyWith(
                      janmaNakshatra: v,
                      nakshatraUnknown: false,
                    );
                  }),
                  child: Column(
                    children: kNakshatras
                        .map(
                          (n) => RadioListTile<String>(
                            title:
                                Text(n, style: theme.textTheme.bodyMedium),
                            value: n,
                          ),
                        )
                        .toList(),
                  ),
                ),
              const SizedBox(height: MuhSpace.xl),
              MuhPrimaryButton(
                label: l10n.profileSaveRefresh,
                onPressed: _saving ? null : _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
