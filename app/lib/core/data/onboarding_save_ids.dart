/// Result of persisting onboarding draft + birth input row.
class OnboardingSaveIds {
  const OnboardingSaveIds({
    required this.profileId,
    required this.birthInputId,
  });

  final String profileId;
  final String birthInputId;
}
