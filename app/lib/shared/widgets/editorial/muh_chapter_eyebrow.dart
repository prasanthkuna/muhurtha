import 'package:flutter/material.dart';

import '../../../app/muh_theme.dart';
class MuhChapterEyebrow extends StatelessWidget {
  const MuhChapterEyebrow(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    if (label.trim().isEmpty) return const SizedBox.shrink();
    return Text(label.trim().toUpperCase(), style: MuhTheme.eyebrow(context));
  }
}
