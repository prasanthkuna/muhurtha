/// Normalizes API wall-clock strings to HH:mm (drops seconds if present).
String clockHm(String raw) {
  final t = raw.trim();
  final segs = t.split(':');
  if (segs.length >= 3) {
    return '${segs[0].padLeft(2, '0')}:${segs[1].padLeft(2, '0')}';
  }
  if (segs.length == 2) return t;
  return t;
}

/// 12-hour clock with AM/PM for display (expects `HH:mm` or `HH:mm:ss`).
String clock12h(String raw) {
  final hm = clockHm(raw);
  final segs = hm.split(':');
  if (segs.length < 2) return raw;
  var h = int.tryParse(segs[0]) ?? 0;
  final m = int.tryParse(segs[1]) ?? 0;
  final ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h == 0) h = 12;
  return '$h:${m.toString().padLeft(2, '0')} $ap';
}
