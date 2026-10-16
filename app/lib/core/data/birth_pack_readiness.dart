import 'muhurtha_engine_api.dart';

/// Home tabs that unlock progressively as birth-pack phases complete.
enum BirthPackScreen {
  decode,
  lifeMap,
  today,
  timing,
  ask,
}

extension BirthPackScreenIds on BirthPackScreen {
  String get apiId => switch (this) {
        BirthPackScreen.decode => 'decode',
        BirthPackScreen.lifeMap => 'life_map',
        BirthPackScreen.today => 'today',
        BirthPackScreen.timing => 'timing',
        BirthPackScreen.ask => 'ask',
      };
}

const _llmProviders = {'openai', 'openrouter', 'gemini'};

extension BirthPackPayloadReadiness on BirthPackPayload {
  bool get isComplete => status == 'ready';

  bool get isGenerating => status == 'generating';

  /// True when the server returned an LLM pack body (partial or complete).
  bool get hasLlmPack =>
      isComplete ||
      (_llmProviders.contains(provider.toLowerCase()) &&
          model.isNotEmpty &&
          content.isNotEmpty);

  /// Tabs show GPT output as-is; no strict count/quality gates.
  bool isScreenReady(BirthPackScreen screen) {
    if (!hasLlmPack) return false;
    if (isComplete) return true;
    return _inferScreenReadyFromContent(screen) || isGenerating;
  }

  bool _inferScreenReadyFromContent(BirthPackScreen screen) {
    final c = content;
    bool hasMap(dynamic raw) => raw is Map && raw.isNotEmpty;
    bool hasList(dynamic raw) => raw is List && raw.isNotEmpty;
    switch (screen) {
      case BirthPackScreen.decode:
        return hasMap(c['user_identity']) ||
            hasMap(c['me_profile']) ||
            hasMap(c['person']) ||
            hasMap(c['free_preview']);
      case BirthPackScreen.lifeMap:
        final lm = c['life_map'];
        return hasList(c['journey_phases']) ||
            hasList(c['chapters']) ||
            (hasMap(lm) &&
                (hasList((lm as Map)['past_chapters']) ||
                    hasMap((lm)['current_chapter'])));
      case BirthPackScreen.today:
        return hasMap(c['today_guidance']) ||
            hasList(c['today_cards']) ||
            hasMap(c['playbook']);
      case BirthPackScreen.timing:
        return hasMap(c['timing_plan']) ||
            hasMap(c['horizons']) ||
            hasList(c['weekly_cards']) ||
            hasList(c['monthly_cards']);
      case BirthPackScreen.ask:
        return hasList(c['ask_templates']) || hasMap(c['ask_knowledge']);
    }
  }
}
