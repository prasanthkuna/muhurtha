import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';
import '../../shared/widgets/editorial/muh_inline_status.dart';

class HomeEmptyState extends StatelessWidget {
  const HomeEmptyState({
    super.key,
    required this.headline,
    required this.message,
    required this.icon,
    this.onRetry,
  });

  final String headline;
  final String message;
  final IconData icon;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(MuhSpace.page),
      children: [
        MuhInlineStatus(
          message: '$headline\n$message',
          kind: MuhInlineStatusKind.empty,
          onRetry: onRetry,
        ),
      ],
    );
  }
}
