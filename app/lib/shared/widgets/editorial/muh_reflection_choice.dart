import 'package:flutter/material.dart';
import 'package:muhurta/l10n/app_localizations.dart';

import '../../../design_system/design_system.dart';

/// Match / Partly / No — shared across Decode, Life Map, Quick Proof successor flows.
class MuhReflectionChoice extends StatelessWidget {
  const MuhReflectionChoice({
    super.key,
    required this.onSelected,
    this.selected,
  });

  final void Function(String value) onSelected;
  final String? selected;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final options = <({String id, String label})>[
      (id: 'exactly_this', label: l10n.validationExactlyThis),
      (id: 'partly_true', label: l10n.validationPartlyTrue),
      (id: 'didnt_happen', label: l10n.validationDidntHappen),
    ];

    return Wrap(
      spacing: MuhSpace.sm,
      runSpacing: MuhSpace.sm,
      children: options.map((o) {
        final on = selected == o.id;
        return ChoiceChip(
          label: Text(o.label),
          selected: on,
          onSelected: (_) => onSelected(o.id),
          labelStyle: TextStyle(
            color: on ? MuhColors.ink : MuhColors.inkSecondary,
            fontWeight: on ? FontWeight.w600 : FontWeight.w500,
            fontSize: MuhType.chip,
          ),
          selectedColor: MuhColors.goldWash,
          backgroundColor: MuhColors.paper,
          side: BorderSide(color: on ? MuhColors.goldText : MuhColors.line),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(MuhRadius.chip),
          ),
        );
      }).toList(),
    );
  }
}
