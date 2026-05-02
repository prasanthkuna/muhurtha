import 'package:flutter/material.dart';

import '../../core/engine/engine_resolution.dart';

enum TimeBucketOption {
  earlyMorning,
  morning,
  afternoon,
  evening,
  night,
  lateNight,
  exact,
  unknown,
}

extension TimeBucketApi on TimeBucketOption {
  String? get apiValue {
    switch (this) {
      case TimeBucketOption.earlyMorning:
        return 'early_morning';
      case TimeBucketOption.morning:
        return 'morning';
      case TimeBucketOption.afternoon:
        return 'afternoon';
      case TimeBucketOption.evening:
        return 'evening';
      case TimeBucketOption.night:
        return 'night';
      case TimeBucketOption.lateNight:
        return 'late_night';
      case TimeBucketOption.exact:
      case TimeBucketOption.unknown:
        return null;
    }
  }
}

class BirthDraft {
  const BirthDraft({
    this.displayName,
    this.dateOfBirth,
    this.birthPlace,
    this.currentCity,
    this.languageCode = 'en',
    this.timeBucket,
    this.exactBirthTime,
    this.janmaNakshatra,
    this.nakshatraPada,
    this.nakshatraUnknown = false,
  });

  final String? displayName;
  final DateTime? dateOfBirth;
  final String? birthPlace;
  final String? currentCity;
  final String languageCode;
  final TimeBucketOption? timeBucket;
  final TimeOfDay? exactBirthTime;
  final String? janmaNakshatra;
  final int? nakshatraPada;
  final bool nakshatraUnknown;

  bool get hasExactBirthTime => exactBirthTime != null;
  bool get hasTimeBucket =>
      timeBucket != null &&
      timeBucket != TimeBucketOption.exact &&
      timeBucket != TimeBucketOption.unknown;
  bool get hasNakshatra =>
      !nakshatraUnknown && (janmaNakshatra?.isNotEmpty ?? false);

  EngineResolution get resolution => resolveEngine(
        hasExactBirthTime: hasExactBirthTime,
        hasTimeBucket: hasTimeBucket,
        hasNakshatra: hasNakshatra,
      );

  BirthDraft copyWith({
    String? displayName,
    DateTime? dateOfBirth,
    String? birthPlace,
    String? currentCity,
    String? languageCode,
    TimeBucketOption? timeBucket,
    bool clearTimeBucket = false,
    TimeOfDay? exactBirthTime,
    bool clearExactBirthTime = false,
    String? janmaNakshatra,
    int? nakshatraPada,
    bool clearJanmaNakshatra = false,
    bool? nakshatraUnknown,
  }) {
    return BirthDraft(
      displayName: displayName ?? this.displayName,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      birthPlace: birthPlace ?? this.birthPlace,
      currentCity: currentCity ?? this.currentCity,
      languageCode: languageCode ?? this.languageCode,
      timeBucket: clearTimeBucket ? null : (timeBucket ?? this.timeBucket),
      exactBirthTime:
          clearExactBirthTime ? null : (exactBirthTime ?? this.exactBirthTime),
      janmaNakshatra: clearJanmaNakshatra
          ? null
          : (janmaNakshatra ?? this.janmaNakshatra),
      nakshatraPada: nakshatraPada ?? this.nakshatraPada,
      nakshatraUnknown: nakshatraUnknown ?? this.nakshatraUnknown,
    );
  }
}
