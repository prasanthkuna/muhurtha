import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Purpose chosen on Today, evaluated on Timing. Synced with `/home?purpose=`.
final homeSelectedPurposeProvider = StateProvider<String?>((ref) => null);

/// Target date for purpose evaluation (ISO date). Defaults to today from caller.
final homeTimingTargetDateProvider = StateProvider<String?>((ref) => null);

const homePurposeQueryKey = 'purpose';
const homeTimingDateQueryKey = 'date';

String? purposeFromUri(Map<String, String> query) {
  final raw = query[homePurposeQueryKey];
  if (raw == null || raw.trim().isEmpty) return null;
  return Uri.decodeComponent(raw.trim());
}

String? timingDateFromUri(Map<String, String> query) {
  final raw = query[homeTimingDateQueryKey];
  if (raw == null || raw.trim().isEmpty) return null;
  return raw.trim();
}
