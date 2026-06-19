import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../design_system/design_system.dart';

/// WhatsApp share glyph — no background chip. Size comes from [MuhIcons].
class WhatsAppShareButton extends StatelessWidget {
  const WhatsAppShareButton({
    super.key,
    required this.onTap,
  });

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(MuhRadius.chip),
        child: Padding(
          padding: const EdgeInsets.all(MuhIcons.whatsAppSharePadding),
          child: SvgPicture.asset(
            'assets/icons/whatsapp.svg',
            width: MuhIcons.whatsAppShare,
            height: MuhIcons.whatsAppShare,
            colorFilter: const ColorFilter.mode(
              MuhColors.goldSoft,
              BlendMode.srcIn,
            ),
            semanticsLabel: 'Share on WhatsApp',
          ),
        ),
      ),
    );
  }
}
