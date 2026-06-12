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
  String get authPhoneHint => 'Include country code, e.g. +91…';

  @override
  String get authSendCode => 'Send code';

  @override
  String get authPickingNumber => 'Choose your number in the popup…';

  @override
  String get authSendingCode => 'Sending verification code…';

  @override
  String get authWaitingForSms =>
      'Waiting for your SMS — code will fill automatically.';

  @override
  String get authVerifying => 'Signing you in…';

  @override
  String get authOtpLabel => 'Verification code';

  @override
  String get authOtpAutoHint =>
      'When Android asks, tap Allow once to read the code. No typing needed.';

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
  String get navPurpose => 'Ask';

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

  @override
  String get luckyTitle => 'Your natal luck';

  @override
  String get luckyNumbers => 'Lucky numbers';

  @override
  String get luckyDays => 'Lucky days';

  @override
  String get luckyColours => 'Lucky colours';

  @override
  String get locationDetectAction => 'Detect location';

  @override
  String get locationDetectedHint =>
      'City and language detected from your location. You can edit either.';

  @override
  String get concernTitle => 'What matters most?';

  @override
  String get concernSubtitle =>
      'Pick what you want Muhūrta to focus on first. This shapes your personalised copy.';

  @override
  String get concernMainLabel => 'Main concern';

  @override
  String get concernRoleLabel => 'Life role';

  @override
  String get concernLifeStuck => 'Why life feels stuck';

  @override
  String get concernCareerTiming => 'Career timing';

  @override
  String get concernMoneyGrowth => 'Money growth';

  @override
  String get concernMarriage => 'Marriage / relationship';

  @override
  String get concernFamilyPressure => 'Family pressure';

  @override
  String get concernBusiness => 'Business direction';

  @override
  String get concernHealth => 'Health / routine';

  @override
  String get concernGoodBadTiming => 'Good / bad time today';

  @override
  String get roleStudent => 'Student / fresher';

  @override
  String get roleEarlyCareer => 'Early career (job)';

  @override
  String get roleManager => 'Manager / senior IC';

  @override
  String get roleBusinessOwner => 'Business owner';

  @override
  String get roleHomemaker => 'Homemaker / family-first';

  @override
  String get roleBetweenJobs => 'Between jobs / pivoting';

  @override
  String get lifeContextTitle => 'A little about your life';

  @override
  String get lifeContextSubtitle =>
      'Marriage, children, and job shape how we phrase timing — especially for family and career questions.';

  @override
  String get lifeContextGenderLabel => 'You are';

  @override
  String get lifeContextMaritalLabel => 'Marital status';

  @override
  String get lifeContextMarriageIntentLabel => 'Marriage plans';

  @override
  String get lifeContextChildrenLabel => 'Children';

  @override
  String get lifeContextJobLabel => 'Work / study';

  @override
  String get lifeContextJobFieldLabel => 'Field (optional)';

  @override
  String get genderMale => 'Male';

  @override
  String get genderFemale => 'Female';

  @override
  String get genderPreferNot => 'Prefer not to say';

  @override
  String get maritalSingle => 'Single';

  @override
  String get maritalMarried => 'Married';

  @override
  String get maritalInRelationship => 'In a relationship';

  @override
  String get maritalDivorced => 'Divorced';

  @override
  String get maritalWidowed => 'Widowed';

  @override
  String get marriageLooking => 'Looking for match';

  @override
  String get marriageNotNow => 'Not now';

  @override
  String get marriageEngaged => 'Engaged / fixed';

  @override
  String get marriageNa => 'Not applicable';

  @override
  String get childrenNone => 'No children';

  @override
  String get childrenSon => 'Have son(s)';

  @override
  String get childrenDaughter => 'Have daughter(s)';

  @override
  String get childrenBoth => 'Son and daughter';

  @override
  String get childrenExpecting => 'Expecting';

  @override
  String get jobEmployed => 'Job / salaried';

  @override
  String get jobSelfEmployed => 'Self-employed / business';

  @override
  String get jobStudent => 'Student';

  @override
  String get jobHomemaker => 'Homemaker';

  @override
  String get jobBetweenJobs => 'Between jobs';

  @override
  String get jobRetired => 'Retired';

  @override
  String get jobFieldIt => 'IT / tech';

  @override
  String get jobFieldGovt => 'Government';

  @override
  String get jobFieldBusiness => 'Business / trade';

  @override
  String get jobFieldTeaching => 'Teaching';

  @override
  String get jobFieldHealth => 'Healthcare';

  @override
  String get jobFieldOther => 'Other';

  @override
  String get paywallTitle => 'Unlock full timing';

  @override
  String get paywallSubtitle =>
      'Plus gives daily power use. Pro unlocks future phases, month plan, and full Life Map.';

  @override
  String get paywallCta => 'Upgrade to Pro';

  @override
  String get paywallCtaPlus => 'Start Plus — ₹99/month';

  @override
  String get paywallCtaPro => 'Unlock muhurtha Pro';

  @override
  String get paywallPlusLabel => 'Plus';

  @override
  String get paywallProLabel => 'Pro';

  @override
  String get paywallPlusPrice => '₹99/month';

  @override
  String get paywallProPrice => '₹199/month';

  @override
  String get paywallMonthlyLabel => 'Monthly';

  @override
  String get paywallYearlyLabel => 'Yearly';

  @override
  String get paywallMonthlyPrice => 'Billed monthly';

  @override
  String get paywallYearlyPrice => 'Best value yearly';

  @override
  String get profileManageSubscription => 'Manage subscription';

  @override
  String get paywallProcessing => 'Processing...';

  @override
  String get paywallRestore => 'Restore purchases';

  @override
  String get paywallBillingNote =>
      'Billed through Play Store or App Store. Cancel anytime.';

  @override
  String get paywallStorePending =>
      'Add products in RevenueCat to enable purchases.';

  @override
  String get paywallDevNote =>
      'Purchases activate when RevenueCat keys are configured. Server grants still work for testing.';

  @override
  String get paywallLockedTeaser =>
      'Pro unlocks the full picture for this phase.';

  @override
  String get errorAskLimitReached =>
      'You\'ve used today\'s free question. Come back tomorrow or upgrade for more.';

  @override
  String get loadingOpening => 'Opening Muhurtha...';

  @override
  String get loadingDecode => 'Preparing your Decode...';

  @override
  String get loadingToday => 'Preparing today...';

  @override
  String get loadingProfile => 'Loading your profile...';

  @override
  String get loadingTodayWindows => 'Checking today\'s useful windows...';

  @override
  String get loadingTimingPlan => 'Building your timing plan...';

  @override
  String get loadingLifeMap => 'Building your Life Map...';

  @override
  String get loadingBoot => 'Opening your timing space...';

  @override
  String get loadingAuth => 'Checking your profile...';

  @override
  String get loadingGenerate => 'Preparing your life timing map...';

  @override
  String get loadingAsk => 'Reading your question with your timing map...';

  @override
  String get loadingShare => 'Creating your share card...';

  @override
  String get loadingCompact => 'Reading the timing...';

  @override
  String get loadingScreen => 'Reading your Moon rhythm...';

  @override
  String get loadingBootSub => 'Moon sign, phase, and today are lining up.';

  @override
  String get loadingAuthSub => 'Keeping your decode ready.';

  @override
  String get loadingGenerateSub => 'This can take a moment the first time.';

  @override
  String get loadingAskSub => 'One clean answer, not a long horoscope.';

  @override
  String get loadingShareSub => 'Branding it before it leaves the app.';

  @override
  String get loadingScreenSub => 'Good windows and cautions are being checked.';

  @override
  String get v3DecodeTitle => 'Your Decode';

  @override
  String get v3DecodeSub =>
      'First it should feel like \"okay, this is me\". Then timing earns trust.';

  @override
  String get v3MoonLabel => 'Moon-led reading';

  @override
  String get v3MoonExplainer =>
      'Indian astrology reads your mind, timing, and life rhythm mainly from your birth Moon. Sun sign is just the familiar anchor.';

  @override
  String get v3SunSign => 'Sun sign';

  @override
  String get v3ThisSounds => 'This sounds like you';

  @override
  String get v3Strengths => 'Strengths';

  @override
  String get v3Watchouts => 'Watchouts';

  @override
  String get v3WorkMoney => 'Work / money pattern';

  @override
  String get v3Relationship => 'Relationship pattern';

  @override
  String get v3TodayTitle => 'Today';

  @override
  String get v3TodaySub => 'One main line, one useful window, one caution.';

  @override
  String get v3MainAdvice => 'Main advice today';

  @override
  String get v3GoodWindow => 'Use this window';

  @override
  String get v3CautionWindow => 'Keep this light';

  @override
  String get v3BetterFor => 'Better for';

  @override
  String get v3CarefulWith => 'Be careful with';

  @override
  String get v3TimingTitle => 'Your Timing Plan';

  @override
  String get v3TimingSub => 'Week focus, month strategy, and what to use now.';

  @override
  String get v3Week => 'This week';

  @override
  String get v3Month => 'This month';

  @override
  String get v3CurrentPhase => 'Current phase';

  @override
  String get v3LifeTitle => 'Life Map';

  @override
  String get v3LifeSub =>
      'Check the past first, then understand the chapter you are in now.';

  @override
  String get v3PastCheck => 'Past check';

  @override
  String get v3Coming => 'Coming chapters';

  @override
  String get v3Ask => 'Ask';

  @override
  String get v3ShareFailed => 'Share failed';
}
