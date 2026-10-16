import 'package:flutter/material.dart';

import '../../design_system/design_system.dart';
import '../../shared/widgets/editorial/muh_editorial_hero.dart';
import '../../shared/widgets/muh_enter.dart';

class HomeEditorialScroll extends StatelessWidget {
  const HomeEditorialScroll({
    super.key,
    required this.title,
    required this.subtitle,
    required this.children,
    this.onRefresh,
    this.footer,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;
  final Future<void> Function()? onRefresh;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final list = ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        MuhSpace.page,
        MuhSpace.lg,
        MuhSpace.page,
        MuhSpace.xl,
      ),
      children: [
        MuhEditorialHero(title: title, subtitle: subtitle).muhEnter(0),
        const SizedBox(height: MuhSpace.md),
        ...children.asMap().entries.expand(
              (entry) => [
                entry.value.muhEnter((entry.key + 1).clamp(0, 2)),
                const SizedBox(height: MuhSpace.md),
              ],
            ),
        if (footer != null) footer!,
      ],
    );
    if (onRefresh == null) return list;
    return RefreshIndicator(
      color: MuhColors.goldDeep,
      onRefresh: onRefresh!,
      child: list,
    );
  }
}
