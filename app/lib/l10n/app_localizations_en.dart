// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Muhūrta';

  @override
  String get welcomeTagline =>
      'First check your past.\nThen choose the right time.';

  @override
  String get welcomeCta => 'Begin';

  @override
  String get welcomeFootnote => 'Calm timing. No fear, no theatrics.';

  @override
  String get authTitle => 'Sign in with phone';

  @override
  String get authSubtitle =>
      'We’ll text you a one-time code — no email or password.';

  @override
  String get authPhone => 'Mobile number';

  @override
  String get authPhoneHint =>
      'E.164 (+country code). Tap the field to pick your number when offered.';

  @override
  String get authSendCode => 'Send code';

  @override
  String get authOtpLabel => 'Verification code';

  @override
  String get authVerify => 'Verify';

  @override
  String get authChangeNumber => 'Wrong number?';

  @override
  String get authResendCode => 'Resend code';

  @override
  String get onboardingBirthTitle => 'Birth basics';

  @override
  String get onboardingBirthSubtitle =>
      'We only use this to read rhythm, not to lecture you on charts.';

  @override
  String get fieldName => 'Name (optional)';

  @override
  String get fieldDob => 'Date of birth';

  @override
  String get fieldBirthPlace => 'Birth place';

  @override
  String get fieldCurrentCity => 'Current city';

  @override
  String get fieldLanguage => 'Language';

  @override
  String get langEnglish => 'English';

  @override
  String get langTelugu => 'Telugu';

  @override
  String get langHindi => 'Hindi';

  @override
  String get continueLabel => 'Continue';

  @override
  String get timeTitle => 'What time were you born?';

  @override
  String get timeSubtitle =>
      'Approximate is fine. Exact time unlocks more precision.';

  @override
  String get nakshatraTitle => 'Janma Nakshatra';

  @override
  String get nakshatraSubtitle =>
      'Do you know it? It sharpens major life-periods.';

  @override
  String get nakshatraPick => 'Choose Nakshatra';

  @override
  String get nakshatraUnknown => 'I don’t know';

  @override
  String get accuracyTitle => 'Your accuracy mode';

  @override
  String get accuracySubtitle =>
      'Here is what Muhūrta can responsibly show today.';

  @override
  String get accuracyFullChart =>
      'Your chart has high detail. Muhūrta can show life periods, past patterns, and personal timing.';

  @override
  String get accuracyStrongPhase =>
      'Your chart has good detail. Some exact timing may shift, but major life periods can still be read.';

  @override
  String get accuracyNakshatraDasha =>
      'Your Nakshatra is enough to read major life periods. Add birth time later for deeper chart detail.';

  @override
  String get accuracyWindowChart =>
      'We can estimate ranges from your birth window. Guidance will be less specific until you add Nakshatra or exact time.';

  @override
  String get accuracyPanchanga =>
      'Muhūrta can still show today’s general good and caution times. Add Nakshatra or birth time later for personal life periods.';

  @override
  String get accuracyContinue => 'Save and continue';

  @override
  String get navToday => 'Today';

  @override
  String get navPurpose => 'Purpose';

  @override
  String get navJourney => 'Journey';

  @override
  String get navRemedies => 'Remedies';

  @override
  String get todayEmptyHeadline => 'Today';

  @override
  String get todayEmptyMessage =>
      'There is no timing data for your profile yet. Good and caution windows will show here only after the server generates daily windows for you.';

  @override
  String get purposeEmptyHeadline => 'Purpose';

  @override
  String get purposeEmptyMessage =>
      'No purpose timing is available yet. This will require an active chart run and the purpose-check service.';

  @override
  String get journeyEmptyHeadline => 'Journey';

  @override
  String get journeyEmptyMessage =>
      'Life-phase cards need your Janma Nakshatra (and a chart mode other than “window only” or panchanga-only). Add Nakshatra under profile settings when you can — then reopen this tab.';

  @override
  String get remediesEmptyHeadline => 'Remedies';

  @override
  String get remediesEmptyMessage =>
      'No remedies are available yet. They load from the remedy catalog once your account is fully initialized.';

  @override
  String get bucketEarlyMorning => 'Early morning — 4 AM to 8 AM';

  @override
  String get bucketMorning => 'Morning — 8 AM to 12 PM';

  @override
  String get bucketAfternoon => 'Afternoon — 12 PM to 4 PM';

  @override
  String get bucketEvening => 'Evening — 4 PM to 8 PM';

  @override
  String get bucketNight => 'Night — 8 PM to 12 AM';

  @override
  String get bucketLateNight => 'Late night — 12 AM to 4 AM';

  @override
  String get bucketExact => 'I know exact time';

  @override
  String get bucketUnknown => 'I don’t know';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorNeedSupabase =>
      'Configure Supabase URL and anon key to sync your profile.';

  @override
  String get splashLoading => 'Opening…';

  @override
  String get quickProofTitle => 'Quick proof';

  @override
  String get quickProofSubtitle =>
      'These are recent life stretches inferred from your birth rhythm—not fortune theatre. Tap what feels closest to your lived experience.';

  @override
  String get quickProofNoCards =>
      'Personal stretch cards need your Nakshatra (and avoid time-window-only mode). You still get today’s daylight guidance on the Today tab.';

  @override
  String get quickProofGoHome => 'Continue to Today';

  @override
  String get validationExactlyThis => 'Exactly this';

  @override
  String get validationPartlyTrue => 'Partly true';

  @override
  String get validationWrongTiming => 'Wrong timing';

  @override
  String get validationDidntHappen => 'Didn’t happen';

  @override
  String get validationThankYou => 'Noted. This helps calibrate your timing.';

  @override
  String get validationRecorded => 'Feedback saved';

  @override
  String get todayHeader => 'Today';

  @override
  String get todayDateLabel => 'Date';

  @override
  String get todayBetterFor => 'Today leans better for';

  @override
  String get todayBeCareful => 'Be a little careful with';

  @override
  String get todayGoodWindows => 'Good windows';

  @override
  String get todayGoodWindowsHint =>
      'These slots divide daylight between sunrise and sunset. “Rahu Kalam” (under Caution) is the inauspicious eighth for this weekday.';

  @override
  String get todayWindowDaytimeSlice => 'Daytime slice (non–Rahu)';

  @override
  String get todayWindowRahuKalam => 'Rahu Kalam';

  @override
  String get todayWindowPreferredDaylight => 'Preferred daylight window';

  @override
  String get todayCautionWindows => 'Caution windows';

  @override
  String get todayCurrentRhythm => 'Current life rhythm';

  @override
  String get purposeScreenTitle => 'Purpose check';

  @override
  String get purposeChoose => 'What are you planning?';

  @override
  String get purposeCheck => 'Check timing';

  @override
  String get purposeStatus => 'Status';

  @override
  String get purposeBetterOptions => 'Better options';

  @override
  String get purposeCareerInterview => 'Career / interview';

  @override
  String get purposeBusinessLaunch => 'Business launch';

  @override
  String get purposeMoneyTalk => 'Money conversation';

  @override
  String get purposePropertyVehicle => 'Property / vehicle';

  @override
  String get purposeRelationship => 'Relationship / marriage talk';

  @override
  String get purposeFamily => 'Family discussion';

  @override
  String get purposeTravel => 'Travel';

  @override
  String get purposeStudy => 'Study / exam';

  @override
  String get purposeHealth => 'Health routine';

  @override
  String get purposeLegal => 'Legal / dispute';

  @override
  String get purposeSpiritual => 'Spiritual / puja';

  @override
  String get purposeCreative => 'Creative / public';

  @override
  String get moonSignToday => 'Moon sign (today · Lahiri)';

  @override
  String get profileTuneTitle => 'Profile & timing';

  @override
  String get profileTuneHint =>
      'Adjust name, language, birth time, or nakshatra. We recompute every tab after you save.';

  @override
  String get profileSaveRefresh => 'Save & refresh all';

  @override
  String get profileSaved => 'Timing refreshed for all tabs.';
}
