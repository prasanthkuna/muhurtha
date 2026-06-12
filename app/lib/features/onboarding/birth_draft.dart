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

class OnboardingIntent {
  const OnboardingIntent({
    this.mainConcern,
    this.lifeRole,
    this.upcomingEvent,
    this.upcomingEventDate,
    this.userGender,
    this.maritalStatus,
    this.marriageIntent,
    this.childrenContext,
    this.jobStatus,
    this.jobField,
  });

  final String? mainConcern;
  final String? lifeRole;
  final String? upcomingEvent;
  final DateTime? upcomingEventDate;
  final String? userGender;
  final String? maritalStatus;
  final String? marriageIntent;
  final String? childrenContext;
  final String? jobStatus;
  final String? jobField;

  Map<String, dynamic> toJson() => {
        if (mainConcern != null) 'main_concern': mainConcern,
        if (lifeRole != null) 'life_role': lifeRole,
        if (upcomingEvent != null) 'upcoming_event': upcomingEvent,
        if (upcomingEventDate != null)
          'upcoming_event_date':
              upcomingEventDate!.toIso8601String().split('T').first,
        if (userGender != null) 'user_gender': userGender,
        if (maritalStatus != null) 'marital_status': maritalStatus,
        if (marriageIntent != null) 'marriage_intent': marriageIntent,
        if (childrenContext != null) 'children_context': childrenContext,
        if (jobStatus != null) 'job_status': jobStatus,
        if (jobField != null) 'job_field': jobField,
      };

  factory OnboardingIntent.fromJson(Map<String, dynamic>? j) {
    if (j == null) return const OnboardingIntent();
    final dateRaw = j['upcoming_event_date']?.toString();
    return OnboardingIntent(
      mainConcern: j['main_concern']?.toString(),
      lifeRole: j['life_role']?.toString(),
      upcomingEvent: j['upcoming_event']?.toString(),
      upcomingEventDate:
          dateRaw == null ? null : DateTime.tryParse(dateRaw),
      userGender: j['user_gender']?.toString(),
      maritalStatus: j['marital_status']?.toString(),
      marriageIntent: j['marriage_intent']?.toString(),
      childrenContext: j['children_context']?.toString(),
      jobStatus: j['job_status']?.toString(),
      jobField: j['job_field']?.toString(),
    );
  }

  OnboardingIntent copyWith({
    String? mainConcern,
    String? lifeRole,
    String? upcomingEvent,
    DateTime? upcomingEventDate,
    bool clearUpcomingEventDate = false,
    String? userGender,
    String? maritalStatus,
    String? marriageIntent,
    String? childrenContext,
    String? jobStatus,
    String? jobField,
  }) {
    return OnboardingIntent(
      mainConcern: mainConcern ?? this.mainConcern,
      lifeRole: lifeRole ?? this.lifeRole,
      upcomingEvent: upcomingEvent ?? this.upcomingEvent,
      upcomingEventDate: clearUpcomingEventDate
          ? null
          : (upcomingEventDate ?? this.upcomingEventDate),
      userGender: userGender ?? this.userGender,
      maritalStatus: maritalStatus ?? this.maritalStatus,
      marriageIntent: marriageIntent ?? this.marriageIntent,
      childrenContext: childrenContext ?? this.childrenContext,
      jobStatus: jobStatus ?? this.jobStatus,
      jobField: jobField ?? this.jobField,
    );
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
    this.currentLat,
    this.currentLng,
    this.currentTimezone,
    this.locationDetected = false,
    this.intent = const OnboardingIntent(),
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
  final double? currentLat;
  final double? currentLng;
  final String? currentTimezone;
  final bool locationDetected;
  final OnboardingIntent intent;

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
    double? currentLat,
    double? currentLng,
    String? currentTimezone,
    bool? locationDetected,
    OnboardingIntent? intent,
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
      currentLat: currentLat ?? this.currentLat,
      currentLng: currentLng ?? this.currentLng,
      currentTimezone: currentTimezone ?? this.currentTimezone,
      locationDetected: locationDetected ?? this.locationDetected,
      intent: intent ?? this.intent,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'displayName': displayName,
      'dateOfBirth': dateOfBirth?.toIso8601String(),
      'birthPlace': birthPlace,
      'currentCity': currentCity,
      'languageCode': languageCode,
      'timeBucket': timeBucket?.name,
      'exactBirthTime': exactBirthTime != null
          ? '${exactBirthTime!.hour}:${exactBirthTime!.minute}'
          : null,
      'janmaNakshatra': janmaNakshatra,
      'nakshatraPada': nakshatraPada,
      'nakshatraUnknown': nakshatraUnknown,
    };
  }
}
