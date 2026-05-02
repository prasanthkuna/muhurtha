import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Maps device locale → supported `en` | `te` | `hi` (PRD).
Locale normalizeAppLocale(Locale system) {
  final c = system.languageCode.toLowerCase();
  if (c == 'te') return const Locale('te');
  if (c == 'hi') return const Locale('hi');
  return const Locale('en');
}

final localeProvider = NotifierProvider<LocaleNotifier, Locale>(LocaleNotifier.new);

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() {
    final dispatcher = WidgetsBinding.instance.platformDispatcher;
    return normalizeAppLocale(dispatcher.locale);
  }

  void setLanguageCode(String code) {
    state = Locale(code);
  }
}
