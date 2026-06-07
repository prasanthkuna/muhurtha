import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/location/location_locale_service.dart';
import '../../design_system/design_system.dart';
import '../../core/locale/locale_provider.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';
import 'birth_draft_notifier.dart';

class BirthBasicsScreen extends ConsumerStatefulWidget {
  const BirthBasicsScreen({super.key});

  @override
  ConsumerState<BirthBasicsScreen> createState() => _BirthBasicsScreenState();
}

class _BirthBasicsScreenState extends ConsumerState<BirthBasicsScreen> {
  late final TextEditingController _name;
  late final TextEditingController _city;
  late final TextEditingController _place;
  var _detectingLocation = false;

  @override
  void initState() {
    super.initState();
    final d = ref.read(birthDraftProvider);
    _name = TextEditingController(text: d.displayName ?? '');
    _city = TextEditingController(text: d.currentCity ?? '');
    _place = TextEditingController(text: d.birthPlace ?? '');
    WidgetsBinding.instance.addPostFrameCallback((_) => _autoDetectLocation());
  }

  Future<void> _autoDetectLocation() async {
    if (!mounted || ref.read(birthDraftProvider).locationDetected) return;
    setState(() => _detectingLocation = true);
    try {
      final result =
          await ref.read(locationLocaleServiceProvider).detectAndApply();
      if (!mounted) return;
      if (result.city != null) _city.text = result.city!;
    } finally {
      if (mounted) setState(() => _detectingLocation = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    _place.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final draft = ref.watch(birthDraftProvider);
    final notifier = ref.read(birthDraftProvider.notifier);

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(l10n.onboardingBirthTitle),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(MuhSpace.page),
            children: [
              Text(
                l10n.onboardingBirthSubtitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.creamMuted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: MuhSpace.xl),
              TextField(
                controller: _name,
                onChanged: (v) =>
                    notifier.update((d) => d.copyWith(displayName: v)),
                decoration: InputDecoration(labelText: l10n.fieldName),
              ),
              const SizedBox(height: MuhSpace.md),
              _DateTile(
                label: l10n.fieldDob,
                date: draft.dateOfBirth,
                onPick: () async {
                  final now = DateTime.now();
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: draft.dateOfBirth ?? DateTime(now.year - 25),
                    firstDate: DateTime(1900),
                    lastDate: now,
                  );
                  if (picked != null) {
                    notifier.update((d) => d.copyWith(dateOfBirth: picked));
                  }
                },
              ),
              const SizedBox(height: MuhSpace.md),
              TextField(
                controller: _place,
                onChanged: (v) =>
                    notifier.update((d) => d.copyWith(birthPlace: v)),
                decoration: InputDecoration(labelText: l10n.fieldBirthPlace),
              ),
              const SizedBox(height: MuhSpace.md),
              TextField(
                controller: _city,
                onChanged: (v) =>
                    notifier.update((d) => d.copyWith(currentCity: v)),
                decoration: InputDecoration(
                  labelText: l10n.fieldCurrentCity,
                  suffixIcon: _detectingLocation
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : IconButton(
                          tooltip: l10n.locationDetectAction,
                          icon: const Icon(Icons.my_location_rounded),
                          onPressed: _autoDetectLocation,
                        ),
                ),
              ),
              if (draft.locationDetected)
                Padding(
                  padding: const EdgeInsets.only(top: MuhSpace.xs),
                  child: Text(
                    l10n.locationDetectedHint,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: MuhColors.goldSoft,
                    ),
                  ),
                ),
              const SizedBox(height: MuhSpace.md),
              DropdownButtonFormField<String>(
                initialValue: draft.languageCode,
                dropdownColor: MuhColors.surface,
                decoration: InputDecoration(labelText: l10n.fieldLanguage),
                items: [
                  DropdownMenuItem(value: 'en', child: Text(l10n.langEnglish)),
                  DropdownMenuItem(value: 'te', child: Text(l10n.langTelugu)),
                  DropdownMenuItem(value: 'hi', child: Text(l10n.langHindi)),
                ],
                onChanged: (v) {
                  if (v == null) return;
                  ref.read(localeProvider.notifier).setLanguageCode(v);
                  notifier.update((d) => d.copyWith(languageCode: v));
                },
              ),
              const SizedBox(height: MuhSpace.xl),
              MuhPrimaryButton(
                label: l10n.continueLabel,
                onPressed: () {
                  if (draft.dateOfBirth == null ||
                      (draft.currentCity?.trim().isEmpty ?? true)) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(l10n.errorGeneric)),
                    );
                    return;
                  }
                  context.push('/onboarding/time');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DateTile extends StatelessWidget {
  const _DateTile({
    required this.label,
    required this.date,
    required this.onPick,
  });

  final String label;
  final DateTime? date;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = date == null
        ? '—'
        : DateFormat.yMMMd(Localizations.localeOf(context).toString())
            .format(date!);

    return Material(
      color: MuhColors.surfaceSoft,
      borderRadius: BorderRadius.circular(MuhRadius.input),
      child: InkWell(
        onTap: onPick,
        borderRadius: BorderRadius.circular(MuhRadius.input),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: MuhSpace.lg,
            vertical: MuhSpace.lg,
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: MuhColors.creamMuted,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.xs),
                    Text(text, style: theme.textTheme.titleMedium),
                  ],
                ),
              ),
              const Icon(Icons.calendar_month_rounded, color: MuhColors.gold),
            ],
          ),
        ),
      ),
    );
  }
}
