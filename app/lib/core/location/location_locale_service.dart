import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../config/env.dart';
import '../data/muhurtha_engine_api.dart';
import '../locale/locale_provider.dart';
import '../../features/onboarding/birth_draft_notifier.dart';

final locationLocaleServiceProvider = Provider<LocationLocaleService>((ref) {
  return LocationLocaleService(ref);
});

class LocationDetectResult {
  const LocationDetectResult({
    this.city,
    this.languageCode,
    this.lat,
    this.lng,
    this.timezone,
    this.detected = false,
  });

  final String? city;
  final String? languageCode;
  final double? lat;
  final double? lng;
  final String? timezone;
  final bool detected;
}

class LocationLocaleService {
  LocationLocaleService(this._ref);

  final Ref _ref;

  String inferLanguageCode({String? adminArea}) {
    final device = PlatformDispatcher.instance.locale;
    final lang = device.languageCode.toLowerCase();
    if (lang == 'te' || lang == 'hi' || lang == 'en') return lang;

    final area = (adminArea ?? '').toLowerCase();
    if (area.contains('telangana') || area.contains('andhra')) return 'te';
    if (area.contains('bihar') ||
        area.contains('uttar') ||
        area.contains('madhya') ||
        area.contains('rajasthan') ||
        area.contains('haryana') ||
        area.contains('delhi')) {
      return 'hi';
    }
    return 'en';
  }

  Future<LocationDetectResult> detectAndApply({bool applyDraft = true}) async {
    final languageCode = inferLanguageCode();
    if (!Env.hasSupabase) {
      return LocationDetectResult(languageCode: languageCode);
    }

    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return LocationDetectResult(languageCode: languageCode);
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 12),
        ),
      );

      final api = _ref.read(muhurthaEngineApiProvider);
      if (api == null) {
        return LocationDetectResult(languageCode: languageCode);
      }

      final resolved = await api.resolvePlace(
        lat: position.latitude,
        lng: position.longitude,
      );
      final lang = inferLanguageCode(adminArea: resolved.label);
      if (applyDraft) {
        _ref.read(birthDraftProvider.notifier).update(
              (d) => d.copyWith(
                currentCity: resolved.label.split(',').first.trim(),
                languageCode: lang,
                currentLat: resolved.lat,
                currentLng: resolved.lng,
                currentTimezone: resolved.timezone,
                locationDetected: true,
              ),
            );
        _ref.read(localeProvider.notifier).setLanguageCode(lang);
      }

      return LocationDetectResult(
        city: resolved.label.split(',').first.trim(),
        languageCode: lang,
        lat: resolved.lat,
        lng: resolved.lng,
        timezone: resolved.timezone,
        detected: true,
      );
    } catch (_) {
      return LocationDetectResult(languageCode: languageCode);
    }
  }
}
