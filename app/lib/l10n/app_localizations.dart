import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';
import 'app_localizations_te.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
    Locale('te')
  ];

  /// App name
  ///
  /// In en, this message translates to:
  /// **'Muhūrta'**
  String get appTitle;

  /// No description provided for @welcomeTagline.
  ///
  /// In en, this message translates to:
  /// **'First check your past.\nThen choose the right time.'**
  String get welcomeTagline;

  /// No description provided for @welcomeCta.
  ///
  /// In en, this message translates to:
  /// **'Begin'**
  String get welcomeCta;

  /// No description provided for @welcomeFootnote.
  ///
  /// In en, this message translates to:
  /// **'Calm timing. No fear, no theatrics.'**
  String get welcomeFootnote;

  /// No description provided for @authTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in with phone'**
  String get authTitle;

  /// No description provided for @authSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We’ll text you a one-time code — no email or password.'**
  String get authSubtitle;

  /// No description provided for @authPhone.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get authPhone;

  /// No description provided for @authPhoneHint.
  ///
  /// In en, this message translates to:
  /// **'Include country code, e.g. +91…'**
  String get authPhoneHint;

  /// No description provided for @authSendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get authSendCode;

  /// No description provided for @authPickingNumber.
  ///
  /// In en, this message translates to:
  /// **'Choose your number in the popup…'**
  String get authPickingNumber;

  /// No description provided for @authSendingCode.
  ///
  /// In en, this message translates to:
  /// **'Sending verification code…'**
  String get authSendingCode;

  /// No description provided for @authWaitingForSms.
  ///
  /// In en, this message translates to:
  /// **'Waiting for your SMS — code will fill automatically.'**
  String get authWaitingForSms;

  /// No description provided for @authVerifying.
  ///
  /// In en, this message translates to:
  /// **'Signing you in…'**
  String get authVerifying;

  /// No description provided for @authOtpLabel.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get authOtpLabel;

  /// No description provided for @authOtpAutoHint.
  ///
  /// In en, this message translates to:
  /// **'When Android asks, tap Allow once to read the code. No typing needed.'**
  String get authOtpAutoHint;

  /// No description provided for @authVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get authVerify;

  /// No description provided for @authChangeNumber.
  ///
  /// In en, this message translates to:
  /// **'Wrong number?'**
  String get authChangeNumber;

  /// No description provided for @authResendCode.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get authResendCode;

  /// No description provided for @onboardingBirthTitle.
  ///
  /// In en, this message translates to:
  /// **'Birth basics'**
  String get onboardingBirthTitle;

  /// No description provided for @onboardingBirthSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We only use this to read rhythm, not to lecture you on charts.'**
  String get onboardingBirthSubtitle;

  /// No description provided for @fieldName.
  ///
  /// In en, this message translates to:
  /// **'Name (optional)'**
  String get fieldName;

  /// No description provided for @fieldDob.
  ///
  /// In en, this message translates to:
  /// **'Date of birth'**
  String get fieldDob;

  /// No description provided for @fieldBirthPlace.
  ///
  /// In en, this message translates to:
  /// **'Birth place'**
  String get fieldBirthPlace;

  /// No description provided for @fieldCurrentCity.
  ///
  /// In en, this message translates to:
  /// **'Current city'**
  String get fieldCurrentCity;

  /// No description provided for @fieldLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get fieldLanguage;

  /// No description provided for @langEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get langEnglish;

  /// No description provided for @langTelugu.
  ///
  /// In en, this message translates to:
  /// **'Telugu'**
  String get langTelugu;

  /// No description provided for @langHindi.
  ///
  /// In en, this message translates to:
  /// **'Hindi'**
  String get langHindi;

  /// No description provided for @continueLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueLabel;

  /// No description provided for @timeTitle.
  ///
  /// In en, this message translates to:
  /// **'What time were you born?'**
  String get timeTitle;

  /// No description provided for @timeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Approximate is fine. Exact time unlocks more precision.'**
  String get timeSubtitle;

  /// No description provided for @nakshatraTitle.
  ///
  /// In en, this message translates to:
  /// **'Janma Nakshatra'**
  String get nakshatraTitle;

  /// No description provided for @nakshatraSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Do you know it? It sharpens major life-periods.'**
  String get nakshatraSubtitle;

  /// No description provided for @nakshatraPick.
  ///
  /// In en, this message translates to:
  /// **'Choose Nakshatra'**
  String get nakshatraPick;

  /// No description provided for @nakshatraUnknown.
  ///
  /// In en, this message translates to:
  /// **'I don’t know'**
  String get nakshatraUnknown;

  /// No description provided for @accuracyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your accuracy mode'**
  String get accuracyTitle;

  /// No description provided for @accuracySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Here is what Muhūrta can responsibly show today.'**
  String get accuracySubtitle;

  /// No description provided for @accuracyFullChart.
  ///
  /// In en, this message translates to:
  /// **'Your chart has high detail. Muhūrta can show life periods, past patterns, and personal timing.'**
  String get accuracyFullChart;

  /// No description provided for @accuracyStrongPhase.
  ///
  /// In en, this message translates to:
  /// **'Your chart has good detail. Some exact timing may shift, but major life periods can still be read.'**
  String get accuracyStrongPhase;

  /// No description provided for @accuracyNakshatraDasha.
  ///
  /// In en, this message translates to:
  /// **'Your Nakshatra is enough to read major life periods. Add birth time later for deeper chart detail.'**
  String get accuracyNakshatraDasha;

  /// No description provided for @accuracyWindowChart.
  ///
  /// In en, this message translates to:
  /// **'We can estimate ranges from your birth window. Guidance will be less specific until you add Nakshatra or exact time.'**
  String get accuracyWindowChart;

  /// No description provided for @accuracyPanchanga.
  ///
  /// In en, this message translates to:
  /// **'Muhūrta can still show today’s general good and caution times. Add Nakshatra or birth time later for personal life periods.'**
  String get accuracyPanchanga;

  /// No description provided for @accuracyContinue.
  ///
  /// In en, this message translates to:
  /// **'Save and continue'**
  String get accuracyContinue;

  /// No description provided for @navToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get navToday;

  /// No description provided for @navPurpose.
  ///
  /// In en, this message translates to:
  /// **'Ask'**
  String get navPurpose;

  /// No description provided for @navJourney.
  ///
  /// In en, this message translates to:
  /// **'Journey'**
  String get navJourney;

  /// No description provided for @navRemedies.
  ///
  /// In en, this message translates to:
  /// **'Remedies'**
  String get navRemedies;

  /// No description provided for @todayEmptyHeadline.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get todayEmptyHeadline;

  /// No description provided for @todayEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'There is no timing data for your profile yet. Good and caution windows will show here only after the server generates daily windows for you.'**
  String get todayEmptyMessage;

  /// No description provided for @purposeEmptyHeadline.
  ///
  /// In en, this message translates to:
  /// **'Purpose'**
  String get purposeEmptyHeadline;

  /// No description provided for @purposeEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'No purpose timing is available yet. This will require an active chart run and the purpose-check service.'**
  String get purposeEmptyMessage;

  /// No description provided for @journeyEmptyHeadline.
  ///
  /// In en, this message translates to:
  /// **'Journey'**
  String get journeyEmptyHeadline;

  /// No description provided for @journeyEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'Life-phase cards need your Janma Nakshatra (and a chart mode other than “window only” or panchanga-only). Add Nakshatra under profile settings when you can — then reopen this tab.'**
  String get journeyEmptyMessage;

  /// No description provided for @remediesEmptyHeadline.
  ///
  /// In en, this message translates to:
  /// **'Remedies'**
  String get remediesEmptyHeadline;

  /// No description provided for @remediesEmptyMessage.
  ///
  /// In en, this message translates to:
  /// **'No remedies are available yet. They load from the remedy catalog once your account is fully initialized.'**
  String get remediesEmptyMessage;

  /// No description provided for @bucketEarlyMorning.
  ///
  /// In en, this message translates to:
  /// **'Early morning — 4 AM to 8 AM'**
  String get bucketEarlyMorning;

  /// No description provided for @bucketMorning.
  ///
  /// In en, this message translates to:
  /// **'Morning — 8 AM to 12 PM'**
  String get bucketMorning;

  /// No description provided for @bucketAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Afternoon — 12 PM to 4 PM'**
  String get bucketAfternoon;

  /// No description provided for @bucketEvening.
  ///
  /// In en, this message translates to:
  /// **'Evening — 4 PM to 8 PM'**
  String get bucketEvening;

  /// No description provided for @bucketNight.
  ///
  /// In en, this message translates to:
  /// **'Night — 8 PM to 12 AM'**
  String get bucketNight;

  /// No description provided for @bucketLateNight.
  ///
  /// In en, this message translates to:
  /// **'Late night — 12 AM to 4 AM'**
  String get bucketLateNight;

  /// No description provided for @bucketExact.
  ///
  /// In en, this message translates to:
  /// **'I know exact time'**
  String get bucketExact;

  /// No description provided for @bucketUnknown.
  ///
  /// In en, this message translates to:
  /// **'I don’t know'**
  String get bucketUnknown;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @errorNeedSupabase.
  ///
  /// In en, this message translates to:
  /// **'Configure Supabase URL and anon key to sync your profile.'**
  String get errorNeedSupabase;

  /// No description provided for @splashLoading.
  ///
  /// In en, this message translates to:
  /// **'Opening…'**
  String get splashLoading;

  /// No description provided for @quickProofTitle.
  ///
  /// In en, this message translates to:
  /// **'Quick proof'**
  String get quickProofTitle;

  /// No description provided for @quickProofSubtitle.
  ///
  /// In en, this message translates to:
  /// **'These are recent life stretches inferred from your birth rhythm—not fortune theatre. Tap what feels closest to your lived experience.'**
  String get quickProofSubtitle;

  /// No description provided for @quickProofNoCards.
  ///
  /// In en, this message translates to:
  /// **'Personal stretch cards need your Nakshatra (and avoid time-window-only mode). You still get today’s daylight guidance on the Today tab.'**
  String get quickProofNoCards;

  /// No description provided for @quickProofGoHome.
  ///
  /// In en, this message translates to:
  /// **'Continue to Today'**
  String get quickProofGoHome;

  /// No description provided for @validationExactlyThis.
  ///
  /// In en, this message translates to:
  /// **'Exactly this'**
  String get validationExactlyThis;

  /// No description provided for @validationPartlyTrue.
  ///
  /// In en, this message translates to:
  /// **'Partly true'**
  String get validationPartlyTrue;

  /// No description provided for @validationWrongTiming.
  ///
  /// In en, this message translates to:
  /// **'Wrong timing'**
  String get validationWrongTiming;

  /// No description provided for @validationDidntHappen.
  ///
  /// In en, this message translates to:
  /// **'Didn’t happen'**
  String get validationDidntHappen;

  /// No description provided for @validationThankYou.
  ///
  /// In en, this message translates to:
  /// **'Noted. This helps calibrate your timing.'**
  String get validationThankYou;

  /// No description provided for @validationRecorded.
  ///
  /// In en, this message translates to:
  /// **'Feedback saved'**
  String get validationRecorded;

  /// No description provided for @todayHeader.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get todayHeader;

  /// No description provided for @todayDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get todayDateLabel;

  /// No description provided for @todayBetterFor.
  ///
  /// In en, this message translates to:
  /// **'Today leans better for'**
  String get todayBetterFor;

  /// No description provided for @todayBeCareful.
  ///
  /// In en, this message translates to:
  /// **'Be a little careful with'**
  String get todayBeCareful;

  /// No description provided for @todayGoodWindows.
  ///
  /// In en, this message translates to:
  /// **'Good windows'**
  String get todayGoodWindows;

  /// No description provided for @todayGoodWindowsHint.
  ///
  /// In en, this message translates to:
  /// **'These slots divide daylight between sunrise and sunset. “Rahu Kalam” (under Caution) is the inauspicious eighth for this weekday.'**
  String get todayGoodWindowsHint;

  /// No description provided for @todayWindowDaytimeSlice.
  ///
  /// In en, this message translates to:
  /// **'Daytime slice (non–Rahu)'**
  String get todayWindowDaytimeSlice;

  /// No description provided for @todayWindowRahuKalam.
  ///
  /// In en, this message translates to:
  /// **'Rahu Kalam'**
  String get todayWindowRahuKalam;

  /// No description provided for @todayWindowPreferredDaylight.
  ///
  /// In en, this message translates to:
  /// **'Preferred daylight window'**
  String get todayWindowPreferredDaylight;

  /// No description provided for @todayCautionWindows.
  ///
  /// In en, this message translates to:
  /// **'Caution windows'**
  String get todayCautionWindows;

  /// No description provided for @todayCurrentRhythm.
  ///
  /// In en, this message translates to:
  /// **'Current life rhythm'**
  String get todayCurrentRhythm;

  /// No description provided for @purposeScreenTitle.
  ///
  /// In en, this message translates to:
  /// **'Purpose check'**
  String get purposeScreenTitle;

  /// No description provided for @purposeChoose.
  ///
  /// In en, this message translates to:
  /// **'What are you planning?'**
  String get purposeChoose;

  /// No description provided for @purposeCheck.
  ///
  /// In en, this message translates to:
  /// **'Check timing'**
  String get purposeCheck;

  /// No description provided for @purposeStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get purposeStatus;

  /// No description provided for @purposeBetterOptions.
  ///
  /// In en, this message translates to:
  /// **'Better options'**
  String get purposeBetterOptions;

  /// No description provided for @purposeCareerInterview.
  ///
  /// In en, this message translates to:
  /// **'Career / interview'**
  String get purposeCareerInterview;

  /// No description provided for @purposeBusinessLaunch.
  ///
  /// In en, this message translates to:
  /// **'Business launch'**
  String get purposeBusinessLaunch;

  /// No description provided for @purposeMoneyTalk.
  ///
  /// In en, this message translates to:
  /// **'Money conversation'**
  String get purposeMoneyTalk;

  /// No description provided for @purposePropertyVehicle.
  ///
  /// In en, this message translates to:
  /// **'Property / vehicle'**
  String get purposePropertyVehicle;

  /// No description provided for @purposeRelationship.
  ///
  /// In en, this message translates to:
  /// **'Relationship / marriage talk'**
  String get purposeRelationship;

  /// No description provided for @purposeFamily.
  ///
  /// In en, this message translates to:
  /// **'Family discussion'**
  String get purposeFamily;

  /// No description provided for @purposeTravel.
  ///
  /// In en, this message translates to:
  /// **'Travel'**
  String get purposeTravel;

  /// No description provided for @purposeStudy.
  ///
  /// In en, this message translates to:
  /// **'Study / exam'**
  String get purposeStudy;

  /// No description provided for @purposeHealth.
  ///
  /// In en, this message translates to:
  /// **'Health routine'**
  String get purposeHealth;

  /// No description provided for @purposeLegal.
  ///
  /// In en, this message translates to:
  /// **'Legal / dispute'**
  String get purposeLegal;

  /// No description provided for @purposeSpiritual.
  ///
  /// In en, this message translates to:
  /// **'Spiritual / puja'**
  String get purposeSpiritual;

  /// No description provided for @purposeCreative.
  ///
  /// In en, this message translates to:
  /// **'Creative / public'**
  String get purposeCreative;

  /// No description provided for @moonSignToday.
  ///
  /// In en, this message translates to:
  /// **'Moon sign (today · Lahiri)'**
  String get moonSignToday;

  /// No description provided for @profileTuneTitle.
  ///
  /// In en, this message translates to:
  /// **'Profile & timing'**
  String get profileTuneTitle;

  /// No description provided for @profileTuneHint.
  ///
  /// In en, this message translates to:
  /// **'Adjust name, language, birth time, or nakshatra. We recompute every tab after you save.'**
  String get profileTuneHint;

  /// No description provided for @profileSaveRefresh.
  ///
  /// In en, this message translates to:
  /// **'Save & refresh all'**
  String get profileSaveRefresh;

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Timing refreshed for all tabs.'**
  String get profileSaved;

  /// No description provided for @luckyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your natal luck'**
  String get luckyTitle;

  /// No description provided for @luckyNumbers.
  ///
  /// In en, this message translates to:
  /// **'Lucky numbers'**
  String get luckyNumbers;

  /// No description provided for @luckyDays.
  ///
  /// In en, this message translates to:
  /// **'Lucky days'**
  String get luckyDays;

  /// No description provided for @luckyColours.
  ///
  /// In en, this message translates to:
  /// **'Lucky colours'**
  String get luckyColours;

  /// No description provided for @locationDetectAction.
  ///
  /// In en, this message translates to:
  /// **'Detect location'**
  String get locationDetectAction;

  /// No description provided for @locationDetectedHint.
  ///
  /// In en, this message translates to:
  /// **'City and language detected from your location. You can edit either.'**
  String get locationDetectedHint;

  /// No description provided for @concernTitle.
  ///
  /// In en, this message translates to:
  /// **'What matters most?'**
  String get concernTitle;

  /// No description provided for @concernSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Pick what you want Muhūrta to focus on first. This shapes your personalised copy.'**
  String get concernSubtitle;

  /// No description provided for @concernMainLabel.
  ///
  /// In en, this message translates to:
  /// **'Main concern'**
  String get concernMainLabel;

  /// No description provided for @concernRoleLabel.
  ///
  /// In en, this message translates to:
  /// **'Life role'**
  String get concernRoleLabel;

  /// No description provided for @concernLifeStuck.
  ///
  /// In en, this message translates to:
  /// **'Why life feels stuck'**
  String get concernLifeStuck;

  /// No description provided for @concernCareerTiming.
  ///
  /// In en, this message translates to:
  /// **'Career timing'**
  String get concernCareerTiming;

  /// No description provided for @concernMoneyGrowth.
  ///
  /// In en, this message translates to:
  /// **'Money growth'**
  String get concernMoneyGrowth;

  /// No description provided for @concernMarriage.
  ///
  /// In en, this message translates to:
  /// **'Marriage / relationship'**
  String get concernMarriage;

  /// No description provided for @concernFamilyPressure.
  ///
  /// In en, this message translates to:
  /// **'Family pressure'**
  String get concernFamilyPressure;

  /// No description provided for @concernBusiness.
  ///
  /// In en, this message translates to:
  /// **'Business direction'**
  String get concernBusiness;

  /// No description provided for @concernHealth.
  ///
  /// In en, this message translates to:
  /// **'Health / routine'**
  String get concernHealth;

  /// No description provided for @concernGoodBadTiming.
  ///
  /// In en, this message translates to:
  /// **'Good / bad time today'**
  String get concernGoodBadTiming;

  /// No description provided for @roleStudent.
  ///
  /// In en, this message translates to:
  /// **'Student / fresher'**
  String get roleStudent;

  /// No description provided for @roleEarlyCareer.
  ///
  /// In en, this message translates to:
  /// **'Early career (job)'**
  String get roleEarlyCareer;

  /// No description provided for @roleManager.
  ///
  /// In en, this message translates to:
  /// **'Manager / senior IC'**
  String get roleManager;

  /// No description provided for @roleBusinessOwner.
  ///
  /// In en, this message translates to:
  /// **'Business owner'**
  String get roleBusinessOwner;

  /// No description provided for @roleHomemaker.
  ///
  /// In en, this message translates to:
  /// **'Homemaker / family-first'**
  String get roleHomemaker;

  /// No description provided for @roleBetweenJobs.
  ///
  /// In en, this message translates to:
  /// **'Between jobs / pivoting'**
  String get roleBetweenJobs;

  /// No description provided for @errorAskLimitReached.
  ///
  /// In en, this message translates to:
  /// **'You\'ve used today\'s free question. Come back tomorrow or upgrade for more.'**
  String get errorAskLimitReached;

  /// No description provided for @loadingOpening.
  ///
  /// In en, this message translates to:
  /// **'Opening Muhurtha...'**
  String get loadingOpening;

  /// No description provided for @loadingDecode.
  ///
  /// In en, this message translates to:
  /// **'Preparing your Decode...'**
  String get loadingDecode;

  /// No description provided for @loadingToday.
  ///
  /// In en, this message translates to:
  /// **'Preparing today...'**
  String get loadingToday;

  /// No description provided for @loadingProfile.
  ///
  /// In en, this message translates to:
  /// **'Loading your profile...'**
  String get loadingProfile;

  /// No description provided for @loadingTodayWindows.
  ///
  /// In en, this message translates to:
  /// **'Checking today\'s useful windows...'**
  String get loadingTodayWindows;

  /// No description provided for @loadingTimingPlan.
  ///
  /// In en, this message translates to:
  /// **'Building your timing plan...'**
  String get loadingTimingPlan;

  /// No description provided for @loadingLifeMap.
  ///
  /// In en, this message translates to:
  /// **'Building your Life Map...'**
  String get loadingLifeMap;

  /// No description provided for @loadingBoot.
  ///
  /// In en, this message translates to:
  /// **'Opening your timing space...'**
  String get loadingBoot;

  /// No description provided for @loadingAuth.
  ///
  /// In en, this message translates to:
  /// **'Checking your profile...'**
  String get loadingAuth;

  /// No description provided for @loadingGenerate.
  ///
  /// In en, this message translates to:
  /// **'Preparing your life timing map...'**
  String get loadingGenerate;

  /// No description provided for @loadingAsk.
  ///
  /// In en, this message translates to:
  /// **'Reading your question with your timing map...'**
  String get loadingAsk;

  /// No description provided for @loadingShare.
  ///
  /// In en, this message translates to:
  /// **'Creating your share card...'**
  String get loadingShare;

  /// No description provided for @loadingCompact.
  ///
  /// In en, this message translates to:
  /// **'Reading the timing...'**
  String get loadingCompact;

  /// No description provided for @loadingScreen.
  ///
  /// In en, this message translates to:
  /// **'Reading your Moon rhythm...'**
  String get loadingScreen;

  /// No description provided for @loadingBootSub.
  ///
  /// In en, this message translates to:
  /// **'Moon sign, phase, and today are lining up.'**
  String get loadingBootSub;

  /// No description provided for @loadingAuthSub.
  ///
  /// In en, this message translates to:
  /// **'Keeping your decode ready.'**
  String get loadingAuthSub;

  /// No description provided for @loadingGenerateSub.
  ///
  /// In en, this message translates to:
  /// **'This can take a moment the first time.'**
  String get loadingGenerateSub;

  /// No description provided for @loadingAskSub.
  ///
  /// In en, this message translates to:
  /// **'One clean answer, not a long horoscope.'**
  String get loadingAskSub;

  /// No description provided for @loadingShareSub.
  ///
  /// In en, this message translates to:
  /// **'Branding it before it leaves the app.'**
  String get loadingShareSub;

  /// No description provided for @loadingScreenSub.
  ///
  /// In en, this message translates to:
  /// **'Good windows and cautions are being checked.'**
  String get loadingScreenSub;

  /// No description provided for @v3DecodeTitle.
  ///
  /// In en, this message translates to:
  /// **'Your Decode'**
  String get v3DecodeTitle;

  /// No description provided for @v3DecodeSub.
  ///
  /// In en, this message translates to:
  /// **'First it should feel like \"okay, this is me\". Then timing earns trust.'**
  String get v3DecodeSub;

  /// No description provided for @v3MoonLabel.
  ///
  /// In en, this message translates to:
  /// **'Moon-led reading'**
  String get v3MoonLabel;

  /// No description provided for @v3MoonExplainer.
  ///
  /// In en, this message translates to:
  /// **'Indian astrology reads your mind, timing, and life rhythm mainly from your birth Moon. Sun sign is just the familiar anchor.'**
  String get v3MoonExplainer;

  /// No description provided for @v3SunSign.
  ///
  /// In en, this message translates to:
  /// **'Sun sign'**
  String get v3SunSign;

  /// No description provided for @v3ThisSounds.
  ///
  /// In en, this message translates to:
  /// **'This sounds like you'**
  String get v3ThisSounds;

  /// No description provided for @v3Strengths.
  ///
  /// In en, this message translates to:
  /// **'Strengths'**
  String get v3Strengths;

  /// No description provided for @v3Watchouts.
  ///
  /// In en, this message translates to:
  /// **'Watchouts'**
  String get v3Watchouts;

  /// No description provided for @v3WorkMoney.
  ///
  /// In en, this message translates to:
  /// **'Work / money pattern'**
  String get v3WorkMoney;

  /// No description provided for @v3Relationship.
  ///
  /// In en, this message translates to:
  /// **'Relationship pattern'**
  String get v3Relationship;

  /// No description provided for @v3TodayTitle.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get v3TodayTitle;

  /// No description provided for @v3TodaySub.
  ///
  /// In en, this message translates to:
  /// **'One main line, one useful window, one caution.'**
  String get v3TodaySub;

  /// No description provided for @v3MainAdvice.
  ///
  /// In en, this message translates to:
  /// **'Main advice today'**
  String get v3MainAdvice;

  /// No description provided for @v3GoodWindow.
  ///
  /// In en, this message translates to:
  /// **'Use this window'**
  String get v3GoodWindow;

  /// No description provided for @v3CautionWindow.
  ///
  /// In en, this message translates to:
  /// **'Keep this light'**
  String get v3CautionWindow;

  /// No description provided for @v3BetterFor.
  ///
  /// In en, this message translates to:
  /// **'Better for'**
  String get v3BetterFor;

  /// No description provided for @v3CarefulWith.
  ///
  /// In en, this message translates to:
  /// **'Be careful with'**
  String get v3CarefulWith;

  /// No description provided for @v3TimingTitle.
  ///
  /// In en, this message translates to:
  /// **'Your Timing Plan'**
  String get v3TimingTitle;

  /// No description provided for @v3TimingSub.
  ///
  /// In en, this message translates to:
  /// **'Week focus, month strategy, and what to use now.'**
  String get v3TimingSub;

  /// No description provided for @v3Week.
  ///
  /// In en, this message translates to:
  /// **'This week'**
  String get v3Week;

  /// No description provided for @v3Month.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get v3Month;

  /// No description provided for @v3CurrentPhase.
  ///
  /// In en, this message translates to:
  /// **'Current phase'**
  String get v3CurrentPhase;

  /// No description provided for @v3LifeTitle.
  ///
  /// In en, this message translates to:
  /// **'Life Map'**
  String get v3LifeTitle;

  /// No description provided for @v3LifeSub.
  ///
  /// In en, this message translates to:
  /// **'Check the past first, then understand the chapter you are in now.'**
  String get v3LifeSub;

  /// No description provided for @v3PastCheck.
  ///
  /// In en, this message translates to:
  /// **'Past check'**
  String get v3PastCheck;

  /// No description provided for @v3Coming.
  ///
  /// In en, this message translates to:
  /// **'Coming chapters'**
  String get v3Coming;

  /// No description provided for @v3Ask.
  ///
  /// In en, this message translates to:
  /// **'Ask'**
  String get v3Ask;

  /// No description provided for @v3ShareFailed.
  ///
  /// In en, this message translates to:
  /// **'Share failed'**
  String get v3ShareFailed;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi', 'te'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
    case 'te':
      return AppLocalizationsTe();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
