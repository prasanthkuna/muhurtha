import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';

/// Story card for screenshot capture — grows to fit full copy (no ellipsis).
class ShareStoryCard extends StatelessWidget {
  const ShareStoryCard({
    super.key,
    required this.title,
    required this.body,
    required this.brandLabel,
    required this.downloadLink,
    required this.footerTagline,
    this.sectionLabel,
    this.eyebrow,
  });

  final String title;
  final String body;
  final String brandLabel;
  final String downloadLink;
  final String footerTagline;
  final String? sectionLabel;
  /// Period label / card eyebrow (e.g. "Jan 2019 - Jul 2020").
  final String? eyebrow;

  static const cardWidth = 360.0;

  List<String> get _lines => body
      .split(RegExp(r'[\n\r]+'))
      .map((line) => line.trim().replaceFirst(RegExp(r'^[-•*]\s*'), ''))
      .where((line) => line.isNotEmpty)
      .toList();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lines = _lines;

    return SizedBox(
      width: cardWidth,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(36),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              MuhColors.bgElevated,
              MuhColors.surface,
              MuhColors.surfaceSoft,
            ],
          ),
          border: Border.all(color: MuhColors.gold.withValues(alpha: 0.34)),
          boxShadow: [
            BoxShadow(
              color: MuhColors.gold.withValues(alpha: 0.14),
              blurRadius: 28,
              offset: const Offset(0, 16),
            ),
          ],
        ),
        child: Stack(
          children: [
            const Positioned.fill(child: _ShareOrbitBackdrop()),
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 24, 28, 22),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const _ShareMedallion(),
                      const SizedBox(width: MuhSpace.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              brandLabel,
                              style: theme.textTheme.labelLarge?.copyWith(
                                color: MuhColors.goldSoft,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.4,
                              ),
                            ),
                            if (sectionLabel != null &&
                                sectionLabel!.trim().isNotEmpty)
                              Text(
                                sectionLabel!,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: MuhColors.creamMuted,
                                  height: 1.3,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: MuhSpace.xl),
                  if (eyebrow != null && eyebrow!.trim().isNotEmpty) ...[
                    Text(
                      eyebrow!.trim(),
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: MuhColors.goldSoft,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.xs),
                  ],
                  if (title.trim().isNotEmpty) ...[
                    Text(
                      title.trim(),
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: MuhColors.cream,
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        height: 1.12,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.lg),
                  ],
                  if (lines.isNotEmpty)
                    ...lines.map(
                      (line) => Padding(
                        padding: const EdgeInsets.only(bottom: MuhSpace.sm),
                        child: Text(
                          line,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: MuhColors.cream,
                            height: 1.45,
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: MuhSpace.md),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: MuhSpace.md,
                      vertical: MuhSpace.sm,
                    ),
                    decoration: BoxDecoration(
                      color: MuhColors.surfaceGold.withValues(alpha: 0.45),
                      borderRadius: BorderRadius.circular(MuhRadius.chip),
                      border: Border.all(
                        color: MuhColors.gold.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Text(
                      downloadLink,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: MuhColors.goldSoft,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  const SizedBox(height: MuhSpace.sm),
                  Text(
                    footerTagline,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: MuhColors.creamMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShareMedallion extends StatelessWidget {
  const _ShareMedallion();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [
            MuhColors.gold.withValues(alpha: 0.32),
            MuhColors.surfaceGold.withValues(alpha: 0.8),
            MuhColors.surface,
          ],
        ),
        border: Border.all(color: MuhColors.gold.withValues(alpha: 0.5)),
      ),
      child: const Center(
        child: Text(
          '☽',
          style: TextStyle(
            color: MuhColors.goldSoft,
            fontSize: 24,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _ShareOrbitBackdrop extends StatelessWidget {
  const _ShareOrbitBackdrop();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        painter: _ShareOrbitPainter(),
      ),
    );
  }
}

class _ShareOrbitPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1
      ..color = MuhColors.gold.withValues(alpha: 0.08);
    canvas.drawCircle(
      Offset(size.width * 0.82, size.height * 0.14),
      size.width * 0.24,
      paint,
    );
    canvas.drawCircle(
      Offset(size.width * 0.22, size.height * 0.85),
      size.width * 0.3,
      paint,
    );
    canvas.drawCircle(
      Offset(size.width * 0.68, size.height * 0.74),
      size.width * 0.16,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
