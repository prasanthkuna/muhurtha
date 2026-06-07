import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../design_system/design_system.dart';
import 'orbital_backdrop.dart';

enum MuhurthaLoadingMode { boot, auth, generate, screen, ask, share, compact }

class MuhurthaLoadingView extends StatefulWidget {
  const MuhurthaLoadingView({
    super.key,
    this.mode = MuhurthaLoadingMode.screen,
    this.moonSymbol = '☽',
    this.moonLabel,
    this.message,
    this.compact = false,
  });

  final MuhurthaLoadingMode mode;
  final String moonSymbol;
  final String? moonLabel;
  final String? message;
  final bool compact;

  @override
  State<MuhurthaLoadingView> createState() => _MuhurthaLoadingViewState();
}

class _MuhurthaLoadingViewState extends State<MuhurthaLoadingView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _message(AppLocalizations? l10n) {
    if (widget.message?.trim().isNotEmpty ?? false) {
      return widget.message!.trim();
    }
    if (l10n == null) return _fallbackMessage();
    return switch (widget.mode) {
      MuhurthaLoadingMode.boot => l10n.loadingBoot,
      MuhurthaLoadingMode.auth => l10n.loadingAuth,
      MuhurthaLoadingMode.generate => l10n.loadingGenerate,
      MuhurthaLoadingMode.ask => l10n.loadingAsk,
      MuhurthaLoadingMode.share => l10n.loadingShare,
      MuhurthaLoadingMode.compact => l10n.loadingCompact,
      MuhurthaLoadingMode.screen => l10n.loadingScreen,
    };
  }

  String _fallbackMessage() => switch (widget.mode) {
        MuhurthaLoadingMode.boot => 'Opening your timing space...',
        MuhurthaLoadingMode.auth => 'Checking your profile...',
        MuhurthaLoadingMode.generate => 'Preparing your life timing map...',
        MuhurthaLoadingMode.ask =>
          'Reading your question with your timing map...',
        MuhurthaLoadingMode.share => 'Creating your share card...',
        MuhurthaLoadingMode.compact => 'Reading the timing...',
        MuhurthaLoadingMode.screen => 'Reading your Moon rhythm...',
      };

  String _subline(AppLocalizations? l10n) {
    if (l10n == null) return '';
    return switch (widget.mode) {
      MuhurthaLoadingMode.boot => l10n.loadingBootSub,
      MuhurthaLoadingMode.auth => l10n.loadingAuthSub,
      MuhurthaLoadingMode.generate => l10n.loadingGenerateSub,
      MuhurthaLoadingMode.ask => l10n.loadingAskSub,
      MuhurthaLoadingMode.share => l10n.loadingShareSub,
      MuhurthaLoadingMode.compact => '',
      MuhurthaLoadingMode.screen => l10n.loadingScreenSub,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final message = _message(l10n);
    final subline = _subline(l10n);
    final medallion = AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => CustomPaint(
        painter: _MoonMedallionPainter(_controller.value),
        child: SizedBox(
          width: widget.compact ? 74 : 132,
          height: widget.compact ? 74 : 132,
          child: Center(
            child: Text(
              widget.moonSymbol,
              style: GoogleFonts.notoSansSymbols2(
                color: MuhColors.goldSoft,
                fontSize: widget.compact ? 30 : 54,
                fontWeight: FontWeight.w700,
                shadows: [
                  Shadow(
                    color: MuhColors.gold.withValues(alpha: 0.45),
                    blurRadius: 22,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    if (widget.compact) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          medallion,
          const SizedBox(width: MuhSpace.md),
          Flexible(
            child: Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: MuhColors.cream,
                height: 1.3,
              ),
            ),
          ),
        ],
      );
    }

    return OrbitalBackdrop(
      intensity: 0.82,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(MuhSpace.page),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              medallion,
              const SizedBox(height: MuhSpace.xl),
              if (widget.moonLabel?.trim().isNotEmpty ?? false) ...[
                Text(
                  widget.moonLabel!.trim(),
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: MuhColors.goldSoft,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: MuhSpace.sm),
              ],
              Text(
                message,
                textAlign: TextAlign.center,
                style: GoogleFonts.fraunces(
                  color: MuhColors.cream,
                  fontSize: 25,
                  fontWeight: FontWeight.w700,
                  height: 1.15,
                ),
              ),
              if (subline.isNotEmpty) ...[
                const SizedBox(height: MuhSpace.md),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 340),
                  child: Text(
                    subline,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: MuhColors.creamMuted,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: MuhSpace.xl),
              _PulseDots(animation: _controller),
            ],
          ),
        ),
      ),
    );
  }
}

class _PulseDots extends StatelessWidget {
  const _PulseDots({required this.animation});

  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final wave =
                (math.sin((animation.value * math.pi * 2) + index) + 1) / 2;
            return Container(
              width: 7 + (wave * 4),
              height: 7 + (wave * 4),
              margin: const EdgeInsets.symmetric(horizontal: 5),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: MuhColors.gold.withValues(alpha: 0.28 + wave * 0.48),
              ),
            );
          }),
        );
      },
    );
  }
}

class _MoonMedallionPainter extends CustomPainter {
  const _MoonMedallionPainter(this.progress);

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2;
    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          MuhColors.gold.withValues(alpha: 0.22),
          MuhColors.surfaceGold.withValues(alpha: 0.16),
          Colors.transparent,
        ],
      ).createShader(Offset.zero & size);
    canvas.drawCircle(center, radius, glow);

    final shell = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = MuhColors.gold.withValues(alpha: 0.28);
    final shell2 = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = MuhColors.creamMuted.withValues(alpha: 0.16);

    canvas.drawCircle(center, radius * 0.72, shell);
    canvas.drawCircle(center, radius * 0.48, shell2);

    final orbit = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..color = MuhColors.goldSoft.withValues(alpha: 0.75);
    final start = progress * math.pi * 2;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius * 0.86),
      start,
      math.pi * 0.62,
      false,
      orbit,
    );
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius * 0.60),
      -start * 0.72,
      math.pi * 0.42,
      false,
      orbit..color = MuhColors.emerald.withValues(alpha: 0.52),
    );

    final marker = Paint()..color = MuhColors.gold.withValues(alpha: 0.9);
    for (var i = 0; i < 9; i++) {
      final angle = (math.pi * 2 * i / 9) + start * 0.25;
      final pos =
          center + Offset(math.cos(angle), math.sin(angle)) * (radius * 0.73);
      canvas.drawCircle(pos, i % 3 == 0 ? 2.4 : 1.5, marker);
    }
  }

  @override
  bool shouldRepaint(covariant _MoonMedallionPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
