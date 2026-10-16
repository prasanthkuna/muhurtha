/// Compare a chapter period with an event candidate without fuzzy matching.
/// English and Telugu month names are normalized; unrelated dates stay hidden.
const _teluguMonths = <String, String>{
  'జనవరి': 'jan', 'ఫిబ్రవరి': 'feb', 'ఫిబ్రవరీ': 'feb',
  'మార్చి': 'mar', 'ఏప్రిల్': 'apr', 'మే': 'may',
  'జూన్': 'jun', 'జూలై': 'jul', 'ఆగస్టు': 'aug',
  'సెప్టెంబర్': 'sep', 'అక్టోబర్': 'oct',
  'నవంబర్': 'nov', 'డిసెంబర్': 'dec',
};

String canonicalLifePeriod(String raw) {
  var value = raw.toLowerCase().trim().replaceAll('–', '-').replaceAll('—', '-');
  for (final entry in _teluguMonths.entries) {
    value = value.replaceAll(entry.key, entry.value);
  }
  const months = <String, String>{
    'january': 'jan', 'february': 'feb', 'march': 'mar',
    'april': 'apr', 'june': 'jun', 'july': 'jul',
    'august': 'aug', 'september': 'sep', 'sept': 'sep',
    'october': 'oct', 'november': 'nov', 'december': 'dec',
  };
  for (final entry in months.entries) {
    value = value.replaceAll(entry.key, entry.value);
  }
  return value.replaceAll(RegExp(r'\s+'), '');
}

bool lifeEventMatchesChapter(String eventPeriod, String chapterPeriod) =>
    eventPeriod.trim().isNotEmpty &&
    canonicalLifePeriod(eventPeriod) == canonicalLifePeriod(chapterPeriod);
