import 'package:muhurta/l10n/app_localizations.dart';

import 'engine_resolution.dart';

String accuracyLocalizedBody(AppLocalizations l10n, EngineMode mode) {
  switch (mode) {
    case EngineMode.fullChart:
      return l10n.accuracyFullChart;
    case EngineMode.strongPhase:
      return l10n.accuracyStrongPhase;
    case EngineMode.windowChart:
      return l10n.accuracyWindowChart;
    case EngineMode.nakshatraDasha:
      return l10n.accuracyNakshatraDasha;
    case EngineMode.generalPanchanga:
      return l10n.accuracyPanchanga;
  }
}
