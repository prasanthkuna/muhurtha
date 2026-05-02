import 'package:muhurta/l10n/app_localizations.dart';

/// Maps API window labels (English from edge function) to localized copy.
String localizeWindowLabel(AppLocalizations l10n, String label) {
  switch (label) {
    case 'Daytime slice':
    case 'Daylight segment':
      return l10n.todayWindowDaytimeSlice;
    case 'Rahu Kalam':
      return l10n.todayWindowRahuKalam;
    case 'Preferred daylight segment':
      return l10n.todayWindowPreferredDaylight;
    default:
      return label;
  }
}
