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

  /// Inserts or updates profile and upserts birth_input; returns stable IDs for engine calls.
  Future<OnboardingSaveIds> saveOnboardingDraft(BirthDraft draft) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      throw StateError('Not signed in');
    }

    final profileRow = await _client
        .from('profiles')
        .upsert(
          {
            'user_id': user.id,
            'display_name': draft.displayName,
            'current_city': draft.currentCity,
            'language_code': draft.languageCode,
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          },
          onConflict: 'user_id',
        )
        .select('id')
        .single();

    final profileId = profileRow['id'] as String;

    final birthPayload = {
      'profile_id': profileId,
      'date_of_birth': draft.dateOfBirth!.toIso8601String().split('T').first,
      'birth_place': draft.birthPlace,
      'birth_input_mode': draft.resolution.birthInputMode.apiValue,
      'exact_birth_time': _formatTime(draft.exactBirthTime),
      'time_bucket': draft.timeBucket?.apiValue,
      'janma_nakshatra':
          draft.nakshatraUnknown ? null : draft.janmaNakshatra,
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
