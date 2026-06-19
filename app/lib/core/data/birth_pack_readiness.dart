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

extension BirthPackPayloadReadiness on BirthPackPayload {
  bool get isComplete => status == 'ready';

  bool get isGenerating => status == 'generating';

  /// True when at least one tab has real LLM copy.
  bool get hasLlmContent =>
      isComplete ||
      (screensReady.isNotEmpty &&
          (provider == 'openai' ||
              provider == 'openrouter' ||
              provider == 'gemini') &&
          model.isNotEmpty);

  /// Unlock tabs as LLM phases land; never show deterministic seed/fallback.
  bool isScreenReady(BirthPackScreen screen) {
    if (isComplete) return true;
    if (!hasLlmContent) return false;
    return screensReady.contains(screen.apiId);
  }
}
