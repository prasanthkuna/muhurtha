/// Maps user birth inputs → engine mode (TRD §3).
enum BirthInputMode {
  exactTime('exact_time'),
  timeBucket('time_bucket'),
  nakshatraOnly('nakshatra_only'),
  timeBucketPlusNakshatra('time_bucket_plus_nakshatra'),
  unknown('unknown');

  const BirthInputMode(this.apiValue);
  final String apiValue;
}

enum EngineMode {
  fullChart('full_chart'),
  strongPhase('strong_phase'),
  windowChart('window_chart'),
  nakshatraDasha('nakshatra_dasha'),
  generalPanchanga('general_panchanga');

  const EngineMode(this.apiValue);
  final String apiValue;
}

class EngineResolution {
  const EngineResolution({
    required this.birthInputMode,
    required this.engineMode,
  });

  final BirthInputMode birthInputMode;
  final EngineMode engineMode;
}

/// Resolver aligned with TRD engine mode table.
EngineResolution resolveEngine({
  required bool hasExactBirthTime,
  required bool hasTimeBucket,
  required bool hasNakshatra,
}) {
  if (hasExactBirthTime) {
    return const EngineResolution(
      birthInputMode: BirthInputMode.exactTime,
      engineMode: EngineMode.fullChart,
    );
  }
  if (hasTimeBucket && hasNakshatra) {
    return const EngineResolution(
      birthInputMode: BirthInputMode.timeBucketPlusNakshatra,
      engineMode: EngineMode.strongPhase,
    );
  }
  if (hasTimeBucket && !hasNakshatra) {
    return const EngineResolution(
      birthInputMode: BirthInputMode.timeBucket,
      engineMode: EngineMode.windowChart,
    );
  }
  if (!hasTimeBucket && hasNakshatra) {
    return const EngineResolution(
      birthInputMode: BirthInputMode.nakshatraOnly,
      engineMode: EngineMode.nakshatraDasha,
    );
  }
  return const EngineResolution(
    birthInputMode: BirthInputMode.unknown,
    engineMode: EngineMode.generalPanchanga,
  );
}
