import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../design_system/design_system.dart';
import 'muh_progress_loader.dart';

enum MuhurthaLoadingMode { boot, auth, generate, screen, ask, share, compact }

class MuhurthaLoadingView extends StatelessWidget {
  const MuhurthaLoadingView({
    super.key,
    this.mode = MuhurthaLoadingMode.screen,
    this.message,
    this.compact = false,
  });

  final MuhurthaLoadingMode mode;
  final String? message;
  final bool compact;

  String _message(AppLocalizations? l10n) {
    if (message?.trim().isNotEmpty ?? false) {
      return message!.trim();
    }
    if (l10n == null) return _fallbackMessage();
    return switch (mode) {
      MuhurthaLoadingMode.boot => l10n.loadingBoot,
      MuhurthaLoadingMode.auth => l10n.loadingAuth,
      MuhurthaLoadingMode.generate => l10n.loadingGenerate,
      MuhurthaLoadingMode.ask => l10n.loadingAsk,
      MuhurthaLoadingMode.share => l10n.loadingShare,
      MuhurthaLoadingMode.compact => l10n.loadingCompact,
      MuhurthaLoadingMode.screen => l10n.loadingScreen,
    };
  }

  String _fallbackMessage() => switch (mode) {
        MuhurthaLoadingMode.boot => 'Opening your timing space...',
        MuhurthaLoadingMode.auth => 'Checking your profile...',
        MuhurthaLoadingMode.generate => 'Preparing your life timing map...',
        MuhurthaLoadingMode.ask =>
          'Reading your question with your timing map...',
        MuhurthaLoadingMode.share => 'Creating your share card...',
        MuhurthaLoadingMode.compact => 'Reading the timing...',
        MuhurthaLoadingMode.screen => 'Loading your view...',
      };

  String _subline(AppLocalizations? l10n) {
    if (l10n == null) return '';
    return switch (mode) {
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
    final headline = _message(l10n);
    final subline = _subline(l10n);
    final loader = MuhProgressLoader(size: compact ? 56 : 88);

    if (compact) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          loader,
          const SizedBox(width: MuhSpace.md),
          Flexible(
            child: Text(
              headline,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: MuhColors.ink,
                height: 1.3,
              ),
            ),
          ),
        ],
      );
    }

    return ColoredBox(
      color: MuhColors.canvas,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(MuhSpace.page),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              loader,
              const SizedBox(height: MuhSpace.xl),
              Text(
                headline,
                textAlign: TextAlign.center,
                style: GoogleFonts.instrumentSans(
                  color: MuhColors.ink,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  height: 1.15,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: MuhSpace.lg),
              const _ReadingSkeletonSubline(),
              if (subline.isNotEmpty) ...[
                const SizedBox(height: MuhSpace.md),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 340),
                  child: Text(
                    subline,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: MuhColors.inkSecondary,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ReadingSkeletonSubline extends StatelessWidget {
  const _ReadingSkeletonSubline();

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 280),
      child: Column(
        children: [
          _skeletonBar(widthFactor: 1),
          const SizedBox(height: MuhSpace.sm),
          _skeletonBar(widthFactor: 0.92),
          const SizedBox(height: MuhSpace.sm),
          _skeletonBar(widthFactor: 0.76),
        ],
      ),
    );
  }

  Widget _skeletonBar({required double widthFactor}) {
    return Align(
      alignment: Alignment.centerLeft,
      child: FractionallySizedBox(
        widthFactor: widthFactor,
        child: Container(
          height: 10,
          decoration: BoxDecoration(
            color: MuhColors.line,
            borderRadius: BorderRadius.circular(MuhRadius.chip),
          ),
        ),
      ),
    );
  }
}
