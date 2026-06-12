import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/data/engine_cache_invalidate.dart';
import '../../core/data/muhurtha_engine_api.dart';
import '../../core/data/profile_repository.dart';
import '../../core/location/location_locale_service.dart';
import '../../core/data/nakshatra_labels.dart';
import '../../core/data/nakshatras.dart';
import '../../core/locale/locale_provider.dart';
import '../../core/subscription/subscription_access.dart';
import '../../core/subscription/subscription_service.dart';
import '../../shared/widgets/paywall_sheet.dart';
import '../../design_system/design_system.dart';
import '../../features/onboarding/birth_draft.dart';
import '../../shared/widgets/muhurtha_loading_view.dart';
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
  var _detectingLocation = false;

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

  Future<void> _redetectLocation() async {
    setState(() => _detectingLocation = true);
    try {
      final result = await ref
          .read(locationLocaleServiceProvider)
          .detectAndApply(applyDraft: false);
      if (!mounted) return;
      if (result.city != null) {
        setState(() {
          _city.text = result.city!;
          _draft = _draft.copyWith(
            currentCity: result.city,
            currentLat: result.lat,
            currentLng: result.lng,
            currentTimezone: result.timezone,
            locationDetected: result.detected,
            languageCode: result.languageCode ?? _draft.languageCode,
          );
        });
        if (result.languageCode != null) {
          ref.read(localeProvider.notifier).setLanguageCode(result.languageCode!);
        }
      }
    } finally {
      if (mounted) setState(() => _detectingLocation = false);
    }
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
          body: MuhurthaLoadingView(
            mode: MuhurthaLoadingMode.auth,
            message: l10n.loadingProfile,
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
              _ProfileSection(
                title: l10n.profileTuneTitle,
                subtitle: l10n.profileTuneHint,
                child: Column(
                  children: [
                    TextField(
                      controller: _name,
                      decoration: InputDecoration(labelText: l10n.fieldName),
                      onChanged: (v) => setState(() {
                        _draft =
                            _draft.copyWith(displayName: v.isEmpty ? null : v);
                      }),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    TextFormField(
                      initialValue: _draft.birthPlace ?? '',
                      readOnly: true,
                      enabled: false,
                      decoration: InputDecoration(
                        labelText: l10n.fieldBirthPlace,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    TextField(
                      controller: _city,
                      decoration: InputDecoration(
                        labelText: l10n.fieldCurrentCity,
                        suffixIcon: _detectingLocation
                            ? const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox(
                                  width: 18,
                                  height: 18,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                ),
                              )
                            : IconButton(
                                tooltip: l10n.locationDetectAction,
                                icon:
                                    const Icon(Icons.my_location_rounded),
                                onPressed: _redetectLocation,
                              ),
                      ),
                      onChanged: (v) => setState(() {
                        _draft = _draft.copyWith(currentCity: v);
                      }),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    DropdownButtonFormField<String>(
                      initialValue: _draft.languageCode,
                      dropdownColor: MuhColors.surface,
                      decoration:
                          InputDecoration(labelText: l10n.fieldLanguage),
                      items: [
                        DropdownMenuItem(
                            value: 'en', child: Text(l10n.langEnglish)),
                        DropdownMenuItem(
                            value: 'te', child: Text(l10n.langTelugu)),
                        DropdownMenuItem(
                            value: 'hi', child: Text(l10n.langHindi)),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setState(
                            () => _draft = _draft.copyWith(languageCode: v));
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: MuhSpace.lg),
              _ProfileSection(
                title: l10n.timeTitle,
                subtitle: l10n.timeSubtitle,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Wrap(
                      spacing: MuhSpace.sm,
                      runSpacing: MuhSpace.sm,
                      children: buckets
                          .map(
                            (o) => ChoiceChip(
                              label: Text(_bucketLabel(l10n, o)),
                              selected: _draft.timeBucket == o,
                              onSelected: (_) {
                                setState(() {
                                  _draft = _draft.copyWith(
                                    timeBucket: o,
                                    clearExactBirthTime:
                                        o != TimeBucketOption.exact,
                                  );
                                });
                              },
                            ),
                          )
                          .toList(),
                    ),
                    if (_draft.timeBucket == TimeBucketOption.exact) ...[
                      const SizedBox(height: MuhSpace.md),
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
                    ],
                  ],
                ),
              ),
              const SizedBox(height: MuhSpace.lg),
              _ProfileSection(
                title: l10n.nakshatraTitle,
                subtitle: l10n.nakshatraSubtitle,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(l10n.nakshatraUnknown),
                      value: _draft.nakshatraUnknown,
                      onChanged: (s) => setState(() {
                        _draft = _draft.copyWith(
                          nakshatraUnknown: s,
                          clearJanmaNakshatra: s,
                        );
                      }),
                    ),
                    if (!_draft.nakshatraUnknown) ...[
                      const SizedBox(height: MuhSpace.sm),
                      DropdownButtonFormField<String>(
                        initialValue:
                            (_draft.janmaNakshatra?.isNotEmpty ?? false)
                                ? _draft.janmaNakshatra
                                : null,
                        dropdownColor: MuhColors.surface,
                        decoration:
                            InputDecoration(labelText: l10n.nakshatraPick),
                        items: kNakshatras
                            .map((n) => DropdownMenuItem(
                                  value: n,
                                  child: Text(
                                    localizeNakshatra(
                                      _draft.languageCode,
                                      n,
                                    ),
                                  ),
                                ))
                            .toList(),
                        onChanged: (v) => setState(() {
                          _draft = _draft.copyWith(
                            janmaNakshatra: v,
                            nakshatraUnknown: false,
                          );
                        }),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: MuhSpace.lg),
              _ProfileSection(
                title: l10n.paywallProLabel,
                subtitle: l10n.paywallSubtitle,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (ref.watch(subscriptionAccessProvider).isPro)
                      Padding(
                        padding: const EdgeInsets.only(bottom: MuhSpace.sm),
                        child: Text(
                          l10n.paywallBillingNote,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: MuhColors.goldSoft,
                          ),
                        ),
                      ),
                    OutlinedButton(
                      onPressed: () => PaywallSheet.show(
                        context,
                        onlyIfNeeded: false,
                      ),
                      child: Text(
                        ref.watch(subscriptionAccessProvider).isPro
                            ? l10n.profileManageSubscription
                            : l10n.paywallCtaPro,
                      ),
                    ),
                    if (ref.read(subscriptionServiceProvider).isAvailable &&
                        ref.watch(subscriptionAccessProvider).isPro) ...[
                      const SizedBox(height: MuhSpace.sm),
                      TextButton(
                        onPressed: () => ref
                            .read(subscriptionServiceProvider)
                            .presentCustomerCenter(),
                        child: Text(l10n.profileManageSubscription),
                      ),
                    ],
                  ],
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

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.surface,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              color: MuhColors.gold,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: MuhSpace.xs),
          Text(
            subtitle,
            style: theme.textTheme.bodySmall?.copyWith(
              color: MuhColors.creamMuted,
              height: 1.45,
            ),
          ),
          const SizedBox(height: MuhSpace.lg),
          child,
        ],
      ),
    );
  }
}
