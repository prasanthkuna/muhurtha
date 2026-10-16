import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Local persistence for exposures, saved chapters, reflections, intentions.
/// Keys are namespaced by [scope] (active chart profile id or `own`).
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

  static const _exposuresKey = 'muh_reading_exposures_v2';
  static const _savedChaptersKey = 'muh_saved_chapters_v2';
  static const _reflectionsKey = 'muh_reflections_v2';
  static const _intentionsKey = 'muh_saved_intentions_v2';

  String _scoped(String scope, String key) => '$scope::$key';

  Map<String, dynamic> _readMap(String storageKey) {
    final raw = _prefs.getString(storageKey);
    if (raw == null || raw.isEmpty) return {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
    } catch (_) {}
    return {};
  }

  Future<void> _writeMap(String storageKey, Map<String, dynamic> map) async {
    await _prefs.setString(storageKey, jsonEncode(map));
  }

  Future<void> recordExposure({
    required String scope,
    required String contentKey,
    required String screen,
    bool completed = false,
  }) async {
    final map = _readMap(_exposuresKey);
    map[_scoped(scope, contentKey)] = {
      'screen': screen,
      'last_viewed_ms': DateTime.now().millisecondsSinceEpoch,
      'completed': completed,
    };
    await _writeMap(_exposuresKey, map);
  }

  bool hasSeenContent(String scope, String contentKey) =>
      _readMap(_exposuresKey).containsKey(_scoped(scope, contentKey));

  Future<void> setChapterSaved(
    String scope,
    String chapterKey, {
    required bool saved,
  }) async {
    final map = _readMap(_savedChaptersKey);
    final key = _scoped(scope, chapterKey);
    if (saved) {
      map[key] = DateTime.now().millisecondsSinceEpoch;
    } else {
      map.remove(key);
    }
    await _writeMap(_savedChaptersKey, map);
  }

  bool isChapterSaved(String scope, String chapterKey) =>
      _readMap(_savedChaptersKey).containsKey(_scoped(scope, chapterKey));

  Future<void> saveReflection({
    required String scope,
    required String contentKey,
    required String feedback,
  }) async {
    final map = _readMap(_reflectionsKey);
    map[_scoped(scope, contentKey)] = {
      'feedback': feedback,
      'saved_ms': DateTime.now().millisecondsSinceEpoch,
    };
    await _writeMap(_reflectionsKey, map);
  }

  String? reflectionFor(String scope, String contentKey) {
    final entry = _readMap(_reflectionsKey)[_scoped(scope, contentKey)];
    if (entry is Map) return entry['feedback']?.toString();
    return null;
  }

  Future<void> saveIntention({
    required String scope,
    required String id,
    required String purpose,
    required String dateIso,
    bool reminder = false,
    String? note,
  }) async {
    final map = _readMap(_intentionsKey);
    map[_scoped(scope, id)] = {
      'purpose': purpose,
      'date': dateIso,
      'reminder': reminder,
      if (note != null && note.isNotEmpty) 'note': note,
      'created_ms': DateTime.now().millisecondsSinceEpoch,
    };
    await _writeMap(_intentionsKey, map);
  }

  List<Map<String, dynamic>> listIntentions(String scope) {
    final map = _readMap(_intentionsKey);
    final prefix = '$scope::';
    return map.entries
        .where((e) => e.key.startsWith(prefix))
        .map((e) {
      final extra = e.value is Map
          ? Map<String, dynamic>.from(e.value as Map)
          : <String, dynamic>{};
      return <String, dynamic>{
        'id': e.key.substring(prefix.length),
        ...extra,
      };
    }).toList();
  }
}
