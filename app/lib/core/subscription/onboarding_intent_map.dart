const purposeToConcern = <String, String>{
  'career_interview': 'career_timing',
  'business_launch': 'business_timing',
  'money_talk': 'money_timing',
  'property_vehicle': 'property_timing',
  'relationship_marriage_talk': 'relationship_timing',
  'family_discussion': 'family_timing',
  'travel': 'travel_timing',
  'study_exam': 'study_timing',
  'health_routine': 'health_timing',
};

Map<String, dynamic> intentPatchForPurpose(String purposeValue) {
  return {
    'last_purpose': purposeValue,
    if (purposeToConcern.containsKey(purposeValue))
      'main_concern': purposeToConcern[purposeValue],
    'intent_source': 'ask_purpose_chip',
    'intent_updated_at': DateTime.now().toUtc().toIso8601String(),
  };
}
