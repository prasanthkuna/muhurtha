import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';

class MuhPromptComposer extends StatelessWidget {
  const MuhPromptComposer({
    super.key,
    required this.controller,
    required this.hint,
    required this.sendLabel,
    required this.onSend,
    this.sending = false,
    this.errorText,
  });

  final TextEditingController controller;
  final String hint;
  final String sendLabel;
  final VoidCallback onSend;
  final bool sending;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          decoration: BoxDecoration(
            color: MuhColors.paper,
            borderRadius: BorderRadius.circular(MuhRadius.card),
            border: Border.all(color: MuhColors.line),
          ),
          padding: const EdgeInsets.fromLTRB(
            MuhSpace.md, MuhSpace.xs, MuhSpace.xs, MuhSpace.xs),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) {
                    if (!sending) onSend();
                  },
                  decoration: InputDecoration(
                    hintText: hint,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    fillColor: MuhColors.paper,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                      vertical: MuhSpace.md),
                  ),
                ),
              ),
              const SizedBox(width: MuhSpace.sm),
              IconButton.filled(
                tooltip: sendLabel,
                onPressed: sending ? null : onSend,
                style: IconButton.styleFrom(
                  backgroundColor: MuhColors.goldButton,
                  foregroundColor: MuhColors.ink,
                ),
                icon: sending
                    ? const SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.arrow_upward_rounded),
              ),
            ],
          ),
        ),
        if (errorText != null && errorText!.trim().isNotEmpty) ...[
          const SizedBox(height: MuhSpace.xs),
          Text(errorText!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.errorInk)),
        ],
      ],
    );
  }
}
