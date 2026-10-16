import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

class MuhPeriodRailItem {
  const MuhPeriodRailItem({
    required this.id,
    required this.label,
    this.selected = false,
  });

  final String id;
  final String label;
  final bool selected;
}

class MuhPeriodRail extends StatelessWidget {
  const MuhPeriodRail({
    super.key,
    required this.items,
    required this.onSelected,
  });

  final List<MuhPeriodRailItem> items;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: MuhSpace.sm),
        itemBuilder: (context, i) {
          final item = items[i];
          final selected = item.selected;
          return ChoiceChip(
            label: Text(item.label),
            selected: selected,
            onSelected: (_) => onSelected(item.id),
            labelStyle: theme.textTheme.labelLarge?.copyWith(
              color: selected ? MuhColors.ink : MuhColors.inkSecondary,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            ),
            selectedColor: MuhColors.goldWash,
            backgroundColor: MuhColors.paper,
            side: BorderSide(
              color: selected ? MuhColors.goldDeep : MuhColors.line,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(MuhRadius.chip),
            ),
          );
        },
      ),
    );
  }
}
