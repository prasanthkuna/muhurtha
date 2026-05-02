import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'birth_draft.dart';

final birthDraftProvider =
    NotifierProvider<BirthDraftNotifier, BirthDraft>(BirthDraftNotifier.new);

class BirthDraftNotifier extends Notifier<BirthDraft> {
  @override
  BirthDraft build() => const BirthDraft();

  void replace(BirthDraft draft) => state = draft;

  void update(BirthDraft Function(BirthDraft d) cb) => state = cb(state);
}
