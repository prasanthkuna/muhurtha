class ChartProfileSummary {
  const ChartProfileSummary({
    required this.id,
    required this.label,
    this.birthInputId,
    this.dateOfBirth,
    this.birthPlace,
    this.nakshatra,
  });

  final String id;
  final String label;
  final String? birthInputId;
  final String? dateOfBirth;
  final String? birthPlace;
  final String? nakshatra;

  factory ChartProfileSummary.fromJson(Map<String, dynamic> json) {
    final birth = json['birth_inputs'];
    final birthMap = birth is Map ? Map<String, dynamic>.from(birth) : null;
    return ChartProfileSummary(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      dateOfBirth: birthMap?['date_of_birth']?.toString(),
      birthPlace: birthMap?['birth_place']?.toString(),
      nakshatra: birthMap?['janma_nakshatra']?.toString(),
    );
  }
}
