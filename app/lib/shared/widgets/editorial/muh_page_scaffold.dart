import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

/// Ivory reading canvas — no orbital decoration behind body text.
class MuhPageScaffold extends StatelessWidget {
  const MuhPageScaffold({
    super.key,
    this.title,
    required this.body,
    this.bottom,
    this.appBarActions,
    this.centerTitle = false,
  });

  final String? title;
  final Widget body;
  final Widget? bottom;
  final List<Widget>? appBarActions;
  final bool centerTitle;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MuhColors.canvas,
      appBar: title == null
          ? null
          : AppBar(
              title: Text(title!),
              centerTitle: centerTitle,
              actions: appBarActions,
            ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: body),
            if (bottom != null) bottom!,
          ],
        ),
      ),
    );
  }
}
