import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../core/share/share_card_service.dart';
import 'home_copy.dart';

Future<void> shareExactCard(
  WidgetRef ref,
  BuildContext context, {
  required String title,
  required String body,
  String contextLine = '',
  String sourceType = 'generic_card',
  String? sourceId,
}) async {
  try {
    await ref.read(shareCardServiceProvider).shareExact(
          context: context,
          title: title,
          body: body,
          contextLine: contextLine,
          sourceType: sourceType,
          sourceId: sourceId,
        );
  } catch (e) {
    if (!context.mounted) return;
    final l10n = AppLocalizations.of(context)!;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${HomeCopy(l10n).failed}: $e')),
    );
  }
}
