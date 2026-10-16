import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/legal_urls.dart';
import '../../design_system/design_system.dart';
import '../../l10n/app_localizations.dart';

/// Opens privacy / terms in the system browser (Play policy).
Future<void> openExternalUrl(String url) async {
  final uri = Uri.parse(url);
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    throw Exception('Could not open $url');
  }
}

/// Privacy · Terms row for profile, paywall, and sign-in.
class LegalLinksRow extends StatelessWidget {
  const LegalLinksRow({
    super.key,
    this.center = true,
    this.dense = false,
  });

  final bool center;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final style = theme.textTheme.bodySmall?.copyWith(
      color: MuhColors.creamMuted,
      height: dense ? 1.35 : 1.45,
    );
    final linkStyle = style?.copyWith(
      color: MuhColors.goldSoft,
      decoration: TextDecoration.underline,
      decorationColor: MuhColors.gold.withValues(alpha: 0.5),
    );

    Widget link(String label, String url) => InkWell(
          onTap: () => openExternalUrl(url),
          child: Text(label, style: linkStyle),
        );

    final row = Wrap(
      alignment: center ? WrapAlignment.center : WrapAlignment.start,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: MuhSpace.sm,
      children: [
        link(l10n.legalPrivacy, LegalUrls.privacy),
        Text('·', style: style),
        link(l10n.legalTerms, LegalUrls.terms),
      ],
    );

    if (center) {
      return Center(child: row);
    }
    return row;
  }
}

/// Sign-in consent line with tappable links.
class LegalSignInNotice extends StatelessWidget {
  const LegalSignInNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final base = theme.textTheme.bodySmall?.copyWith(
      color: MuhColors.creamMuted,
      height: 1.45,
    );
    final link = base?.copyWith(
      color: MuhColors.goldSoft,
      decoration: TextDecoration.underline,
      decorationColor: MuhColors.gold.withValues(alpha: 0.45),
    );

    return Text.rich(
      TextSpan(
        style: base,
        children: [
          const TextSpan(text: 'By continuing, you agree to our '),
          WidgetSpan(
            alignment: PlaceholderAlignment.baseline,
            baseline: TextBaseline.alphabetic,
            child: GestureDetector(
              onTap: () => openExternalUrl(LegalUrls.terms),
              child: Text('Terms', style: link),
            ),
          ),
          const TextSpan(text: ' and '),
          WidgetSpan(
            alignment: PlaceholderAlignment.baseline,
            baseline: TextBaseline.alphabetic,
            child: GestureDetector(
              onTap: () => openExternalUrl(LegalUrls.privacy),
              child: Text('Privacy Policy', style: link),
            ),
          ),
          const TextSpan(text: '.'),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }
}
