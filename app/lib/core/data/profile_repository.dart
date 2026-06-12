import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'onboarding_save_ids.dart';
import '../../features/onboarding/birth_draft.dart';
import '../config/env.dart';
import '../engine/engine_resolution.dart';

class ProfileRepository {
  ProfileRepository(this._client);

  final SupabaseClient _client;

  Future<String> ensureSignedInProfile() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw StateError('Not signed in');
    }

    final existing = await _client
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
    if (existing != null) {
      return existing['id'] as String;
    }

    try {
      final profileRow = await _client
          .from('profiles')
          .upsert(
            {
              'user_id': user.id,
              'updated_at': DateTime.now().toUtc().toIso8601String(),
            },
            onConflict: 'user_id',
          )
          .select('id')
          .single();
      return profileRow['id'] as String;
    } on PostgrestException catch (e) {
      if (e.code != '23505' && e.code != '409') rethrow;
      final fallback = await _client
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
      return fallback['id'] as String;
    }
  }

  /// Inserts or updates profile and upserts birth_input; returns stable IDs for engine calls.
  Future<OnboardingSaveIds> saveOnboardingDraft(BirthDraft draft) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw StateError('Not signed in');
    }

    final profileId = await ensureSignedInProfile();

    final locationMeta = <String, dynamic>{
      if (draft.currentLat != null) 'current_lat': draft.currentLat,
      if (draft.currentLng != null) 'current_lng': draft.currentLng,
      if (draft.currentTimezone != null) 'timezone': draft.currentTimezone,
      'detected': draft.locationDetected,
    };

    await _client.from('profiles').upsert(
      {
        'id': profileId,
        'user_id': user.id,
        'display_name': draft.displayName,
        'current_city': draft.currentCity,
        'language_code': draft.languageCode,
        'onboarding_intent': draft.intent.toJson(),
        'location_meta': locationMeta,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      },
      onConflict: 'user_id',
    );

    final resolvedBirthPlace = await _resolveBirthPlace(draft.birthPlace);
    final birthPayload = {
      'profile_id': profileId,
      'date_of_birth': draft.dateOfBirth!.toIso8601String().split('T').first,
      'birth_place': draft.birthPlace,
      if (resolvedBirthPlace != null) ...{
        'birth_lat': resolvedBirthPlace.lat,
        'birth_lng': resolvedBirthPlace.lng,
        'birth_timezone': resolvedBirthPlace.timezone,
      },
      'birth_input_mode': draft.resolution.birthInputMode.apiValue,
      'exact_birth_time': _formatTime(draft.exactBirthTime),
      'time_bucket': draft.timeBucket?.apiValue,
      'janma_nakshatra': draft.nakshatraUnknown ? null : draft.janmaNakshatra,
      'nakshatra_pada': draft.nakshatraPada,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    };

    final existingBirth = await _client
        .from('birth_inputs')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();

    late final String birthInputId;

    if (existingBirth != null) {
      birthInputId = existingBirth['id'] as String;
      await _client
          .from('birth_inputs')
          .update(birthPayload)
          .eq('id', birthInputId);
    } else {
      final row = await _client
          .from('birth_inputs')
          .insert(birthPayload)
          .select('id')
          .single();
      birthInputId = row['id'] as String;
    }

    return OnboardingSaveIds(profileId: profileId, birthInputId: birthInputId);
  }

  static String? _formatTime(TimeOfDay? t) {
    if (t == null) return null;
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m:00';
  }

  Future<_ResolvedBirthPlace?> _resolveBirthPlace(String? place) async {
    final trimmed = place?.trim();
    if (trimmed == null || trimmed.isEmpty) return null;
    try {
      final res = await _client.functions.invoke(
        'muhurtha-api',
        body: {
          'action': 'birth_place_resolve',
          'place': trimmed,
        },
      );
      final data = res.data;
      if (data is! Map) return null;
      final lat = num.tryParse(data['lat']?.toString() ?? '')?.toDouble();
      final lng = num.tryParse(data['lng']?.toString() ?? '')?.toDouble();
      final timezone = data['timezone']?.toString();
      if (lat == null || lng == null || timezone == null || timezone.isEmpty) {
        return null;
      }
      return _ResolvedBirthPlace(lat: lat, lng: lng, timezone: timezone);
    } catch (_) {
      return null;
    }
  }

  static TimeOfDay? parseDbTime(String? t) {
    if (t == null || t.isEmpty) return null;
    final p = t.split(':');
    if (p.length < 2) return null;
    return TimeOfDay(
      hour: int.tryParse(p[0]) ?? 0,
      minute: int.tryParse(p[1]) ?? 0,
    );
  }

  static TimeBucketOption? _bucketFromDb(
    String? timeBucket,
    String birthInputMode,
    String? exactTime,
  ) {
    if (exactTime != null &&
        exactTime.isNotEmpty &&
        birthInputMode == BirthInputMode.exactTime.apiValue) {
      return TimeBucketOption.exact;
    }
    if (timeBucket == null) return TimeBucketOption.unknown;
    return switch (timeBucket) {
      'early_morning' => TimeBucketOption.earlyMorning,
      'morning' => TimeBucketOption.morning,
      'afternoon' => TimeBucketOption.afternoon,
      'evening' => TimeBucketOption.evening,
      'night' => TimeBucketOption.night,
      'late_night' => TimeBucketOption.lateNight,
      _ => TimeBucketOption.unknown,
    };
  }

  /// Latest profile + most recent birth row for editing.
  Future<EditableProfileBundle?> loadEditableProfile() async {
    final user = _client.auth.currentUser;
    if (user == null) return null;

    final profile = await _client
        .from('profiles')
        .select('id, display_name, current_city, language_code')
        .eq('user_id', user.id)
        .maybeSingle();
    if (profile == null) return null;

    final profileId = profile['id'] as String;
    final birth = await _client
        .from('birth_inputs')
        .select()
        .eq('profile_id', profileId)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();
    if (birth == null) return null;

    final b = Map<String, dynamic>.from(birth as Map);
    final birthInputId = b['id'] as String;
    final dobStr = b['date_of_birth']?.toString() ?? '';
    final dob = DateTime.tryParse(
      dobStr.length >= 10 ? dobStr.substring(0, 10) : dobStr,
    );

    final mode =
        b['birth_input_mode'] as String? ?? BirthInputMode.unknown.apiValue;
    final bucket = _bucketFromDb(
      b['time_bucket'] as String?,
      mode,
      b['exact_birth_time'] as String?,
    );
    final jak = b['janma_nakshatra'] as String?;

    final draft = BirthDraft(
      displayName: profile['display_name'] as String?,
      dateOfBirth: dob,
      birthPlace: b['birth_place'] as String?,
      currentCity: profile['current_city'] as String?,
      languageCode: (profile['language_code'] as String?) ?? 'en',
      timeBucket: bucket,
      exactBirthTime: parseDbTime(b['exact_birth_time'] as String?),
      janmaNakshatra: jak,
      nakshatraPada: b['nakshatra_pada'] as int?,
      nakshatraUnknown: jak == null || jak.isEmpty,
    );

    return EditableProfileBundle(draft: draft, birthInputId: birthInputId);
  }

  /// Merges behavioral intent (purpose chips, Ask) without a full onboarding resave.
  Future<void> patchOnboardingIntent(Map<String, dynamic> patch) async {
    if (patch.isEmpty) return;
    final profileId = await ensureSignedInProfile();
    final row = await _client
        .from('profiles')
        .select('onboarding_intent')
        .eq('id', profileId)
        .single();
    final current = row['onboarding_intent'];
    final merged = <String, dynamic>{
      if (current is Map) ...Map<String, dynamic>.from(current),
      ...patch,
    };
    await _client.from('profiles').update({
      'onboarding_intent': merged,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', profileId);
  }

  Future<String?> loadProfileLanguageCode() async {
    final user = _client.auth.currentUser;
    if (user == null) return null;
    final profile = await _client
        .from('profiles')
        .select('language_code')
        .eq('user_id', user.id)
        .maybeSingle();
    return profile?['language_code'] as String?;
  }

  /// Returns: `welcome` | `onboarding` | `home`.
  Future<String> initialSignedInRoute() async {
    final user = _client.auth.currentUser;
    if (user == null) return 'welcome';

    final profile = await _client
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (profile == null) return 'onboarding';

    final profileId = profile['id'] as String;

    final birth = await _client
        .from('birth_inputs')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();

    if (birth == null) return 'onboarding';
    return 'home';
  }
}

class _ResolvedBirthPlace {
  const _ResolvedBirthPlace({
    required this.lat,
    required this.lng,
    required this.timezone,
  });

  final double lat;
  final double lng;
  final String timezone;
}

class EditableProfileBundle {
  const EditableProfileBundle({
    required this.draft,
    required this.birthInputId,
  });

  final BirthDraft draft;
  final String birthInputId;
}

final profileRepositoryProvider = Provider<ProfileRepository?>((ref) {
  if (!Env.hasSupabase) return null;
  return ProfileRepository(Supabase.instance.client);
});
