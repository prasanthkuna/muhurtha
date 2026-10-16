import 'package:intl/intl.dart';

/// User-facing calendar line (no astrology labels).
String formatTodayDateLabel(String isoDate) {
  try {
    final parsed = DateTime.parse(isoDate);
    return DateFormat('EEEE, d MMMM y').format(parsed);
  } catch (_) {
    return isoDate;
  }
}
