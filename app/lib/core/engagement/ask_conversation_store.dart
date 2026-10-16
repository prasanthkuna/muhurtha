import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class AskTurn {
  const AskTurn({
    required this.question,
    required this.directAnswer,
    required this.askedMs,
    this.sessionId,
  });

  final String question;
  final String directAnswer;
  final int askedMs;
  final String? sessionId;

  Map<String, dynamic> toJson() => {
        'question': question,
        'directAnswer': directAnswer,
        'asked_ms': askedMs,
        if (sessionId != null) 'session_id': sessionId,
      };

  factory AskTurn.fromJson(Map<String, dynamic> j) => AskTurn(
        question: j['question']?.toString() ?? '',
        directAnswer: j['directAnswer']?.toString() ?? '',
        askedMs: j['asked_ms'] is num
            ? (j['asked_ms'] as num).toInt()
            : DateTime.now().millisecondsSinceEpoch,
        sessionId: j['session_id']?.toString(),
      );
}

/// Persists Ask thread per engagement [scope].
class AskConversationStore {
  AskConversationStore._(this._prefs);

  final SharedPreferences _prefs;
  static const _key = 'muh_ask_threads_v1';

  static AskConversationStore? _cached;

  static Future<AskConversationStore> ensureInitialized() async {
    _cached ??= AskConversationStore._(await SharedPreferences.getInstance());
    return _cached!;
  }

  static AskConversationStore get instance {
    final c = _cached;
    if (c != null) return c;
    throw StateError('Call AskConversationStore.ensureInitialized() first');
  }

  String _sessionKey(String scope) => '$scope::session_id';

  Map<String, dynamic> _readAll() {
    final raw = _prefs.getString(_key);
    if (raw == null || raw.isEmpty) return {};
    try {
      final d = jsonDecode(raw);
      if (d is Map) return Map<String, dynamic>.from(d);
    } catch (_) {}
    return {};
  }

  Future<void> _writeAll(Map<String, dynamic> map) async {
    await _prefs.setString(_key, jsonEncode(map));
  }

  String? sessionIdFor(String scope) {
    final map = _readAll();
    return map[_sessionKey(scope)]?.toString();
  }

  Future<void> saveSessionId(String scope, String sessionId) async {
    final map = _readAll();
    map[_sessionKey(scope)] = sessionId;
    await _writeAll(map);
  }

  List<AskTurn> turnsFor(String scope) {
    final map = _readAll();
    final raw = map['$scope::turns'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => AskTurn.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> appendTurn(String scope, AskTurn turn) async {
    final map = _readAll();
    final list = turnsFor(scope).map((t) => t.toJson()).toList()
      ..add(turn.toJson());
    map['$scope::turns'] = list;
    await _writeAll(map);
  }
}
