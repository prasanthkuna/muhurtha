import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Local persistence for exposures, saved chapters, reflections, intentions (Retention §7).
class UserEngagementStore {
  UserEngagementStore._(this._prefs);

  final SharedPreferences _prefs;

  static UserEngagementStore? _cached;

  static UserEngagementStore get instance {
    final cached = _cached;
    if (cached != null) return cached;
    throw StateError('Call UserEngagementStore.ensureInitialized() first');
  }

  static Future<UserEngagementStore> ensureInitialized() async {
    if (_cached != null) return _cached!;
    final prefs = await SharedPreferences.getInstance();
    _cached = UserEngagementStore._(prefs);
    return _cached!;
  }

  static const _exposuresKey = 'muh_reading_exposures_v1';
  static const _savedChaptersKey = 'muh_saved_chapters_v1';
  static const _reflectionsKey = 'muh_reflections_v1';
  static const _intentionsKey = 'muh_saved_intentions_v1';

  Map<String, dynamic> _readMap(String key) {
    final raw = _prefs.getString(key);
    if (raw == null || raw.isEmpty) return {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    } catch (_) {}
    return {};
  }

  Future<void> _writeMap(String key, Map<String, dynamic> map) async {
    await _prefs.setString(key, jsonEncode(map));
  }

  Future<void> recordExposure({
    required String contentKey,
    required String screen,
    bool completed = false,
  }) async {
    final map = _readMap(_exposuresKey);
    map[contentKey] = {
      'screen': screen,
      'last_viewed_ms': DateTime.now().millisecondsSinceEpoch,
      'completed': completed,
    };
    await _writeMap(_exposuresKey, map);
  }

  bool hasSeenContent(String contentKey) => _readMap(_exposuresKey).containsKey(contentKey);

  Future<void> setChapterSaved(String chapterKey, {required bool saved}) async {
    final map = _readMap(_savedChaptersKey);
    if (saved) {
      map[chapterKey] = DateTime.now().millisecondsSinceEpoch;
    } else {
      map.remove(chapterKey);
    }
    await _writeMap(_savedChaptersKey, map);
  }

  bool isChapterSaved(String chapterKey) => _readMap(_savedChaptersKey).containsKey(chapterKey);

  Future<void> saveReflection({
    required String contentKey,
    required String feedback,
  }) async {
    final map = _readMap(_reflectionsKey);
    map[contentKey] = {
      'feedback': feedback,
      'saved_ms': DateTime.now().millisecondsSinceEpoch,
    };
    await _writeMap(_reflectionsKey, map);
  }

  String? reflectionFor(String contentKey) {
    final entry = _readMap(_reflectionsKey)[contentKey];
    if (entry is Map) return entry['feedback']?.toString();
    return null;
  }

  Future<void> saveIntention({
    required String id,
    required String purpose,
    required String dateIso,
    bool reminder = false,
  }) async {
    final map = _readMap(_intentionsKey);
    map[id] = {
      'purpose': purpose,
      'date': dateIso,
      'reminder': reminder,
      'created_ms': DateTime.now().millisecondsSinceEpoch,
    };
    await _writeMap(_intentionsKey, map);
  }

  List<Map<String, dynamic>> listIntentions() {
    final map = _readMap(_intentionsKey);
    return map.entries.map((e) {
      final extra = e.value is Map
          ? Map<String, dynamic>.from(e.value as Map)
          : <String, dynamic>{};
      return <String, dynamic>{'id': e.key, ...extra};
    }).toList();
  }
}
