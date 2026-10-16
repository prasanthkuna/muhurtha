import 'package:flutter/material.dart';

import '../../../design_system/design_system.dart';
import '../muh_primary_button.dart';

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
        TextField(
          controller: controller,
          minLines: 2,
          maxLines: 5,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: MuhColors.paper,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(MuhRadius.card),
              borderSide: const BorderSide(color: MuhColors.line),
            ),
          ),
        ),
        if (errorText != null && errorText!.trim().isNotEmpty) ...[
          const SizedBox(height: MuhSpace.xs),
          Text(
            errorText!,
            style: theme.textTheme.bodySmall?.copyWith(color: MuhColors.errorInk),
          ),
        ],
        const SizedBox(height: MuhSpace.md),
        MuhPrimaryButton(
          label: sending ? '…' : sendLabel,
          onPressed: sending ? null : onSend,
        ),
      ],
    );
  }
}
