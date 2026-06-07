import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../design_system/design_system.dart';

String _lc(BuildContext context) =>
    Localizations.localeOf(context).languageCode.toLowerCase();

String _txt(BuildContext context, String key) {
  final lc = _lc(context);
  const te = {
    'no_windows': 'ఇంకా సమయ విభాగాలు లేవు.',
    'big_chapter': 'పెద్ద దశ',
    'sub_phase': 'ప్రస్తుత ఉపదశ',
    'most_visible': 'ఎక్కువగా కనిపించేది',
    'tone': 'స్వభావం',
    'pressure': 'ఒత్తిడి చూపిన చోటు',
    'why_now': 'ఇది ఇప్పుడు ఎందుకు కనిపిస్తోంది',
    'what_to_do': 'ఏం చేయాలి',
    'keep_simple': 'సులభంగా ఉంచండి',
    'chapter': 'దశ',
    'episode': 'భాగం',
  };
  const hi = {
    'no_windows': 'अभी समय-खिड़कियां उपलब्ध नहीं हैं।',
    'big_chapter': 'बड़ा चरण',
    'sub_phase': 'मौजूदा उप-चरण',
    'most_visible': 'सबसे ज्यादा दिखेगा',
    'tone': 'स्वर',
    'pressure': 'दबाव यहां दिखा',
    'why_now': 'यह अभी क्यों दिख रहा है',
    'what_to_do': 'क्या करें',
    'keep_simple': 'इसे सरल रखें',
    'chapter': 'चरण',
    'episode': 'हिस्सा',
  };
  const en = {
    'no_windows': 'No timing windows available yet.',
    'big_chapter': 'Big chapter',
    'sub_phase': 'Current sub-phase',
    'most_visible': 'Most visible in',
    'tone': 'Tone',
    'pressure': 'Pressure showed up in',
    'why_now': 'Why this is showing now',
    'what_to_do': 'What to do',
    'keep_simple': 'Keep it simple',
    'chapter': 'chapter',
    'episode': 'episode',
  };
  if (lc == 'te') return te[key] ?? en[key] ?? key;
  if (lc == 'hi') return hi[key] ?? en[key] ?? key;
  return en[key] ?? key;
}

class CelestialHeaderCard extends StatelessWidget {
  const CelestialHeaderCard({
    super.key,
    required this.heroLabel,
    required this.heroTitle,
    required this.heroSymbol,
    this.heroSubline,
    required this.explainer,
    this.supportingPills = const <MoonSunPillData>[],
    this.disclaimer,
    this.trailingAction,
  });

  final String heroLabel;
  final String heroTitle;
  final String heroSymbol;
  final String? heroSubline;
  final String explainer;
  final List<MoonSunPillData> supportingPills;
  final String? disclaimer;
  final Widget? trailingAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: MuhSpace.lg),
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.gold.withValues(alpha: 0.34)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            MuhColors.surface.withValues(alpha: 0.98),
            MuhColors.surfaceSoft.withValues(alpha: 0.92),
            MuhColors.bgElevated.withValues(alpha: 0.96),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: MuhColors.gold.withValues(alpha: 0.08),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          const Positioned.fill(child: _OrbitLines()),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SignMedallion(
                    symbol: heroSymbol,
                    size: 86,
                  ),
                  const SizedBox(width: MuhSpace.lg),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          heroLabel,
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: MuhColors.creamMuted,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: MuhSpace.xs),
                        Text(
                          heroTitle,
                          style: theme.textTheme.titleLarge?.copyWith(
                            color: MuhColors.goldSoft,
                            fontWeight: FontWeight.w700,
                            height: 1.1,
                          ),
                        ),
                        if (heroSubline != null &&
                            heroSubline!.trim().isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: MuhSpace.xs),
                            child: Text(
                              heroSubline!,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: MuhColors.creamMuted,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.1,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (trailingAction != null) ...[
                    const SizedBox(width: MuhSpace.sm),
                    trailingAction!,
                  ],
                ],
              ),
              const SizedBox(height: MuhSpace.md),
              Text(
                explainer,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: MuhColors.cream,
                  height: 1.45,
                ),
              ),
              if (supportingPills.isNotEmpty) ...[
                const SizedBox(height: MuhSpace.md),
                Wrap(
                  spacing: MuhSpace.sm,
                  runSpacing: MuhSpace.sm,
                  children: supportingPills
                      .map((pill) => MoonSunPill(data: pill))
                      .toList(),
                ),
              ],
              if (disclaimer != null && disclaimer!.trim().isNotEmpty) ...[
                const SizedBox(height: MuhSpace.md),
                Container(
                  padding: const EdgeInsets.all(MuhSpace.sm),
                  decoration: BoxDecoration(
                    color: MuhColors.gold.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(MuhRadius.sm),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded,
                          size: 14, color: MuhColors.goldSoft),
                      const SizedBox(width: MuhSpace.sm),
                      Expanded(
                        child: Text(
                          disclaimer!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: MuhColors.goldSoft.withValues(alpha: 0.8),
                            fontSize: 11,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class MoonSunPillData {
  const MoonSunPillData({
    required this.label,
    required this.value,
    required this.symbol,
    this.subtitle,
  });

  final String label;
  final String value;
  final String symbol;
  final String? subtitle;
}

class MoonSunPill extends StatelessWidget {
  const MoonSunPill({
    super.key,
    required this.data,
  });

  final MoonSunPillData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: MuhSpace.md,
        vertical: MuhSpace.sm,
      ),
      decoration: BoxDecoration(
        color: MuhColors.surfaceGold.withValues(alpha: 0.56),
        borderRadius: BorderRadius.circular(MuhRadius.button),
        border: Border.all(color: MuhColors.gold.withValues(alpha: 0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            data.symbol,
            style: const TextStyle(
              color: MuhColors.goldSoft,
              fontSize: 16,
              height: 1,
            ),
          ),
          const SizedBox(width: MuhSpace.sm),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                data.label,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: MuhColors.muted,
                ),
              ),
              Text(
                data.value,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: MuhColors.cream,
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (data.subtitle != null && data.subtitle!.isNotEmpty)
                Text(
                  data.subtitle!,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: MuhColors.muted,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class TimeWindowRail extends StatelessWidget {
  const TimeWindowRail({
    super.key,
    required this.title,
    this.subtitle,
    required this.windows,
    this.tone = WindowTone.good,
    this.trailingAction,
  });

  final String title;
  final String? subtitle;
  final List<TimeWindowData> windows;
  final WindowTone tone;
  final Widget? trailingAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = switch (tone) {
      WindowTone.good => MuhColors.emerald,
      WindowTone.caution => MuhColors.amber,
    };
    final surface = switch (tone) {
      WindowTone.good => MuhColors.emeraldBg.withValues(alpha: 0.72),
      WindowTone.caution => MuhColors.amberBg.withValues(alpha: 0.72),
    };
    return Container(
      margin: const EdgeInsets.only(bottom: MuhSpace.lg),
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: accent.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (trailingAction != null) ...[
                const SizedBox(width: MuhSpace.sm),
                trailingAction!,
              ],
            ],
          ),
          if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
            const SizedBox(height: MuhSpace.xs),
            Text(
              subtitle!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.creamMuted,
                height: 1.45,
              ),
            ),
          ],
          const SizedBox(height: MuhSpace.md),
          if (windows.isEmpty)
            Text(
              _txt(context, 'no_windows'),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: MuhColors.creamMuted,
              ),
            )
          else
            ...windows.map(
              (window) => Padding(
                padding: const EdgeInsets.only(bottom: MuhSpace.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Text(
                            window.timeText,
                            style: GoogleFonts.jetBrainsMono(
                              color: MuhColors.cream,
                              fontSize: MuhType.bodyL,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        if (window.tag != null && window.tag!.trim().isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: MuhSpace.sm,
                              vertical: MuhSpace.xs,
                            ),
                            decoration: BoxDecoration(
                              color: accent.withValues(alpha: 0.14),
                              borderRadius:
                                  BorderRadius.circular(MuhRadius.chip),
                            ),
                            child: Text(
                              window.tag!,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: accent,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                      ],
                    ),
                    if (window.note != null &&
                        window.note!.trim().isNotEmpty) ...[
                      const SizedBox(height: MuhSpace.xs),
                      Text(
                        window.note!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: MuhColors.creamMuted,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class TimeWindowData {
  const TimeWindowData({
    required this.timeText,
    this.tag,
    this.note,
  });

  final String timeText;
  final String? tag;
  final String? note;
}

class DashaTimelineCard extends StatelessWidget {
  const DashaTimelineCard({
    super.key,
    required this.periodLabel,
    required this.title,
    required this.highlight,
    required this.mahadashaLord,
    required this.antardashaLord,
    required this.focusAreas,
    required this.tone,
    required this.pressureThemes,
    required this.phasePulse,
    required this.transitionNote,
    required this.evidenceLine,
    required this.sentences,
    this.trailingAction,
  });

  final String periodLabel;
  final String title;
  final String highlight;
  final String mahadashaLord;
  final String antardashaLord;
  final List<String> focusAreas;
  final List<String> tone;
  final List<String> pressureThemes;
  final String phasePulse;
  final String transitionNote;
  final String evidenceLine;
  final List<String> sentences;
  final Widget? trailingAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: MuhSpace.lg),
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
            periodLabel,
            style: theme.textTheme.labelMedium?.copyWith(
              color: MuhColors.creamMuted,
              letterSpacing: 0.2,
            ),
          ),
          ...[
            const SizedBox(height: MuhSpace.sm),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: MuhColors.cream,
                    ),
                  ),
                ),
                if (trailingAction != null) ...[
                  const SizedBox(width: MuhSpace.sm),
                  trailingAction!,
                ],
              ],
            ),
            if (highlight.trim().isNotEmpty) ...[
              const SizedBox(height: MuhSpace.sm),
              Text(
                highlight,
                style: theme.textTheme.titleMedium?.copyWith(
                  color: MuhColors.gold,
                  fontWeight: FontWeight.w700,
                  height: 1.35,
                ),
              ),
            ],
            const SizedBox(height: MuhSpace.md),
            ...sentences.map(
              (sentence) => Padding(
                padding: const EdgeInsets.only(bottom: MuhSpace.sm),
                child: Text(
                  sentence,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                    color: MuhColors.cream,
                  ),
                ),
              ),
            ),
            const SizedBox(height: MuhSpace.sm),
            Text(
              '$mahadashaLord ${_txt(context, 'chapter')} • $antardashaLord ${_txt(context, 'episode')}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.creamMuted,
                height: 1.4,
              ),
            ),
          ],
          if (phasePulse.trim().isNotEmpty) ...[
            const SizedBox(height: MuhSpace.xs),
            Text(
              phasePulse,
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.goldSoft,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class RitualCard extends StatelessWidget {
  const RitualCard({
    super.key,
    required this.typeLabel,
    required this.title,
    required this.whyNow,
    required this.whatToDo,
    required this.keepItSimple,
    this.trailingAction,
  });

  final String typeLabel;
  final String title;
  final String whyNow;
  final String whatToDo;
  final String keepItSimple;
  final Widget? trailingAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: MuhSpace.lg),
      padding: const EdgeInsets.all(MuhSpace.lg),
      decoration: BoxDecoration(
        color: MuhColors.surface,
        borderRadius: BorderRadius.circular(MuhRadius.card),
        border: Border.all(color: MuhColors.line),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            MuhColors.surfaceSoft.withValues(alpha: 0.96),
            MuhColors.surface.withValues(alpha: 0.96),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: MuhSpace.sm,
              vertical: MuhSpace.xs,
            ),
            decoration: BoxDecoration(
              color: MuhColors.gold.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(MuhRadius.chip),
            ),
            child: Text(
              typeLabel,
              style: theme.textTheme.labelSmall?.copyWith(
                color: MuhColors.gold,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: MuhSpace.md),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (trailingAction != null) ...[
                const SizedBox(width: MuhSpace.sm),
                trailingAction!,
              ],
            ],
          ),
          const SizedBox(height: MuhSpace.md),
          _RitualSection(title: _txt(context, 'what_to_do'), body: whatToDo),
          const SizedBox(height: MuhSpace.md),
          _RitualSection(
              title: _txt(context, 'keep_simple'), body: keepItSimple),
        ],
      ),
    );
  }
}

class _RitualSection extends StatelessWidget {
  const _RitualSection({
    required this.title,
    required this.body,
  });

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.labelLarge?.copyWith(
            color: MuhColors.gold,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: MuhSpace.xs),
        Text(
          body,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: MuhColors.cream,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

class _SignMedallion extends StatelessWidget {
  const _SignMedallion({
    required this.symbol,
    required this.size,
  });

  final String symbol;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            MuhColors.gold.withValues(alpha: 0.22),
            MuhColors.surfaceGold.withValues(alpha: 0.78),
            MuhColors.surface.withValues(alpha: 0.96),
          ],
        ),
        border: Border.all(color: MuhColors.gold.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: MuhColors.gold.withValues(alpha: 0.12),
            blurRadius: 22,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Center(
        child: Text(
          symbol,
          style: TextStyle(
            color: MuhColors.goldSoft,
            fontSize: size * 0.44,
            fontWeight: FontWeight.w700,
            height: 1,
          ),
        ),
      ),
    );
  }
}

class _OrbitLines extends StatelessWidget {
  const _OrbitLines();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: _OrbitPainter(),
      ),
    );
  }
}

class _OrbitPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = MuhColors.gold.withValues(alpha: 0.06);
    canvas.drawCircle(
        Offset(size.width * 0.8, size.height * 0.18), size.width * 0.32, paint);
    canvas.drawCircle(Offset(size.width * 0.78, size.height * 0.16),
        size.width * 0.22, paint);
    canvas.drawCircle(Offset(size.width * 0.18, size.height * 0.84),
        size.width * 0.28, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

enum WindowTone { good, caution }
