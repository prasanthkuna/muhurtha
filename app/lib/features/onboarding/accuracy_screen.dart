import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../design_system/design_system.dart';
import '../../core/engine/accuracy_copy.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';
import 'birth_draft_notifier.dart';
import 'onboarding_finish.dart';

class AccuracyScreen extends ConsumerStatefulWidget {
  const AccuracyScreen({super.key});

  @override
  ConsumerState<AccuracyScreen> createState() => _AccuracyScreenState();
}

class _AccuracyScreenState extends ConsumerState<AccuracyScreen> {
  var _saving = false;

  Future<void> _finish() async {
    setState(() => _saving = true);
    try {
      await finishOnboardingToHome(context: context, ref: ref);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final draft = ref.watch(birthDraftProvider);
    final mode = draft.resolution.engineMode;
    final body = accuracyLocalizedBody(l10n, mode);

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: Text(l10n.accuracyTitle)),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(MuhSpace.page),
            children: [
              Text(
                l10n.accuracySubtitle,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.creamMuted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: MuhSpace.md),
              Text(
                _accuracyProfileNote(context),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: MuhColors.goldSoft,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: MuhSpace.xl),
              Container(
                padding: const EdgeInsets.all(MuhSpace.xl),
                decoration: BoxDecoration(
                  color: MuhColors.surface,
                  borderRadius: BorderRadius.circular(MuhRadius.card),
                  border: Border.all(color: MuhColors.line),
                ),
                child: Text(
                  body,
                  style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
                ),
              ),
              const SizedBox(height: MuhSpace.xl),
              MuhPrimaryButton(
                label: _saving ? l10n.loadingGenerate : l10n.accuracyContinue,
                onPressed: _saving ? null : _finish,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _accuracyProfileNote(BuildContext context) {
  final lang = Localizations.localeOf(context).languageCode.toLowerCase();
  if (lang == 'te') {
    return 'ఖచ్చితమైన సమయం లేదా నక్షత్రం లేకపోవడంతో కొన్ని ఫలితాలు తక్కువ స్పష్టంగా ఉండవచ్చు. తర్వాత Profile లో మార్చవచ్చు.';
  }
  if (lang == 'hi') {
    return 'सटीक जन्म समय या नक्षत्र न होने पर कुछ परिणाम कम निश्चित हो सकते हैं। आप इसे बाद में Profile में बदल सकते हैं।';
  }
  return 'Because exact birth time or Nakshatra is missing, some results may be less precise. You can update this anytime in Profile.';
}
