import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../design_system/design_system.dart';

/// White WhatsApp glyph on a subtle dark chip — same 30px tap target as before.
class WhatsAppShareButton extends StatelessWidget {
  const WhatsAppShareButton({
    super.key,
    required this.onTap,
    this.size = 30,
  });

  final VoidCallback onTap;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: MuhColors.surfaceGold.withValues(alpha: 0.4),
            shape: BoxShape.circle,
            border: Border.all(color: MuhColors.line),
          ),
          child: SvgPicture.asset(
            'assets/icons/whatsapp.svg',
            width: 14,
            height: 14,
            colorFilter: const ColorFilter.mode(
              MuhColors.cream,
              BlendMode.srcIn,
            ),
            semanticsLabel: 'Share on WhatsApp',
          ),
        ),
      ),
    );
  }
}
