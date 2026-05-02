// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appTitle => 'मुहूर्त';

  @override
  String get welcomeTagline =>
      'पहले अपना बीता हुआ समय देखें।\nफिर सही समय चुनें।';

  @override
  String get welcomeCta => 'शुरू करें';

  @override
  String get welcomeFootnote => 'शांत समय-निर्णय। न डर, न दिखावा।';

  @override
  String get authTitle => 'फ़ोन से साइन इन';

  @override
  String get authSubtitle =>
      'हम एक बार का कोड SMS करेंगे — ईमेल या पासवर्ड नहीं।';

  @override
  String get authPhone => 'मोबाइल नंबर';

  @override
  String get authPhoneHint => 'E.164 (+ देश कोड)। संकेत मिले तो नंबर चुनें।';

  @override
  String get authSendCode => 'कोड भेजें';

  @override
  String get authOtpLabel => 'सत्यापन कोड';

  @override
  String get authVerify => 'सत्यापित करें';

  @override
  String get authChangeNumber => 'गलत नंबर?';

  @override
  String get authResendCode => 'कोड दोबारा भेजें';

  @override
  String get onboardingBirthTitle => 'जन्म विवरण';

  @override
  String get onboardingBirthSubtitle =>
      'यह केवल लय समझने के लिए है — चार्ट पढ़ाने के लिए नहीं।';

  @override
  String get fieldName => 'नाम (वैकल्पिक)';

  @override
  String get fieldDob => 'जन्म तिथि';

  @override
  String get fieldBirthPlace => 'जन्म स्थान';

  @override
  String get fieldCurrentCity => 'वर्तमान शहर';

  @override
  String get fieldLanguage => 'भाषा';

  @override
  String get langEnglish => 'अंग्रेज़ी';

  @override
  String get langTelugu => 'तेलुगु';

  @override
  String get langHindi => 'हिन्दी';

  @override
  String get continueLabel => 'जारी रखें';

  @override
  String get timeTitle => 'आपका जन्म किस समय के आसपास था?';

  @override
  String get timeSubtitle => 'अनुमान भी चलेगा। सटीक समय और बारीकियाँ देता है।';

  @override
  String get nakshatraTitle => 'जन्म नक्षत्र';

  @override
  String get nakshatraSubtitle =>
      'क्या आप जानते हैं? बड़े जीवन-चरण साफ़ होते हैं।';

  @override
  String get nakshatraPick => 'नक्षत्र चुनें';

  @override
  String get nakshatraUnknown => 'नहीं पता';

  @override
  String get accuracyTitle => 'आपकी सटीकता स्थिति';

  @override
  String get accuracySubtitle => 'आज मुहूर्त क्या दिखा सकता है — संक्षेप में।';

  @override
  String get accuracyFullChart =>
      'आपकी कुण्डली में अच्छी गहराई है। जीवन के चरण, पैटर्न और व्यक्तिगत समय दिखा सकते हैं।';

  @override
  String get accuracyStrongPhase =>
      'अच्छा विवरण है। सटीक समय थोड़ा बदल सकता है, पर मुख्य जीवन-चरण पढ़े जा सकते हैं।';

  @override
  String get accuracyNakshatraDasha =>
      'नक्षत्र मुख्य जीवन-चरणों के लिए काफ़ी है। और गहराई के लिए बाद में जन्म समय जोड़ें।';

  @override
  String get accuracyWindowChart =>
      'जन्म की समय-खिड़की से अंदाज़ा लगा सकते हैं। नक्षत्र या सटीक समय मिलने तक मार्गदर्शन कम निश्चित रहेगा।';

  @override
  String get accuracyPanchanga =>
      'आज के सामान्य अच्छे और सावधानी वाले समय दिखा सकते हैं। व्यक्तिगत चरणों के लिए बाद में नक्षत्र या जन्म समय जोड़ें।';

  @override
  String get accuracyContinue => 'सहेजकर आगे बढ़ें';

  @override
  String get navToday => 'आज';

  @override
  String get navPurpose => 'कार्य';

  @override
  String get navJourney => 'यात्रा';

  @override
  String get navRemedies => 'उपाय';

  @override
  String get todayEmptyHeadline => 'आज';

  @override
  String get todayEmptyMessage =>
      'आपकी प्रोफ़ाइल के लिए अभी कोई समय-डेटा नहीं है। सर्वर दैनिक समय-खिड़कियाँ बनाने के बाद ही अच्छे और सावधानी वाले समय यहाँ दिखेंगे।';

  @override
  String get purposeEmptyHeadline => 'कार्य';

  @override
  String get purposeEmptyMessage =>
      'अभी उद्देश्य-समय उपलब्ध नहीं है। चार्ट रन और उद्देश्य-जाँच सेवा सक्रिय होने के बाद यह उपलब्ध होगा।';

  @override
  String get journeyEmptyHeadline => 'यात्रा';

  @override
  String get journeyEmptyMessage =>
      'जीवन-चरण कार्ड्स के लिए जन्म नक्षत्र चाहिए (केवल समय-खिड़की या पंचांग-only मोड में नहीं)। नक्षत्र जोड़कर इस टैब को फिर खोलें।';

  @override
  String get remediesEmptyHeadline => 'उपाय';

  @override
  String get remediesEmptyMessage =>
      'अभी कोई उपाय नहीं है। खाता पूरी तरह प्रारंभ होने पर कैटलॉग से लोड होंगे।';

  @override
  String get bucketEarlyMorning => 'सुबह जल्दी — 4 से 8 बजे';

  @override
  String get bucketMorning => 'सुबह — 8 से 12 बजे';

  @override
  String get bucketAfternoon => 'दोपहर — 12 से 4 बजे';

  @override
  String get bucketEvening => 'शाम — 4 से 8 बजे';

  @override
  String get bucketNight => 'रात — 8 से 12 बजे';

  @override
  String get bucketLateNight => 'आधी रात — 12 से 4 बजे';

  @override
  String get bucketExact => 'सटीक समय मालूम है';

  @override
  String get bucketUnknown => 'नहीं पता';

  @override
  String get errorGeneric => 'कुछ गड़बड़ हो गई। फिर कोशिश करें।';

  @override
  String get errorNeedSupabase =>
      'प्रोफ़ाइल सिंक के लिए Supabase URL और anon कुंजी सेट करें।';

  @override
  String get splashLoading => 'खुल रहा है…';

  @override
  String get quickProofTitle => 'त्वरित जाँच';

  @override
  String get quickProofSubtitle =>
      'ये हाल के जीवन-खिंचाव हैं — आपके जन्म-लय से; भविष्यवाणी का नाटक नहीं। जो आपके अनुभव से मिलता हो उसे चुनें।';

  @override
  String get quickProofNoCards =>
      'व्यक्तिगत कार्ड्स के लिए नक्षत्र चाहिए (केवल समय-खिड़की वाला मोड नहीं)। आज टैब पर अभी भी दिनचर्या मिलेगी।';

  @override
  String get quickProofGoHome => 'आज पर जाएँ';

  @override
  String get validationExactlyThis => 'बिल्कुल ऐसा ही';

  @override
  String get validationPartlyTrue => 'कुछ हद तक सच';

  @override
  String get validationWrongTiming => 'गलत समय-मिलान';

  @override
  String get validationDidntHappen => 'नहीं हुआ';

  @override
  String get validationThankYou => 'नोट किया। यह समय-संतुलन में मदद करता है।';

  @override
  String get validationRecorded => 'प्रतिक्रिया सहेजी गई';

  @override
  String get todayHeader => 'आज';

  @override
  String get todayDateLabel => 'तिथि';

  @override
  String get todayBetterFor => 'आज बेहतर रहेगा';

  @override
  String get todayBeCareful => 'थोड़ी सावधानी';

  @override
  String get todayGoodWindows => 'अच्छे समय-खंड';

  @override
  String get todayGoodWindowsHint =>
      'ये खंड सूर्योदय से सूर्यास्त के बीच दिन को आठ हिस्सों में बाँटते हैं। “राहु काल” (सावधानी) इस दिन का असुविधाजनक आठवाँ हिस्सा है।';

  @override
  String get todayWindowDaytimeSlice => 'दिन का खंड (राहु के सिवा)';

  @override
  String get todayWindowRahuKalam => 'राहु काल';

  @override
  String get todayWindowPreferredDaylight => 'पसंदीदा दिन-प्रकाश खिड़की';

  @override
  String get todayCautionWindows => 'सावधानी वाले खंड';

  @override
  String get todayCurrentRhythm => 'वर्तमान जीवन-लय';

  @override
  String get purposeScreenTitle => 'उद्देश्य जाँच';

  @override
  String get purposeChoose => 'क्या करने की योजना है?';

  @override
  String get purposeCheck => 'समय जाँचें';

  @override
  String get purposeStatus => 'स्थिति';

  @override
  String get purposeBetterOptions => 'बेहतर विकल्प';

  @override
  String get purposeCareerInterview => 'करियर / इंटरव्यू';

  @override
  String get purposeBusinessLaunch => 'व्यवसाय आरंभ';

  @override
  String get purposeMoneyTalk => 'पैसे की बात';

  @override
  String get purposePropertyVehicle => 'संपत्ति / वाहन';

  @override
  String get purposeRelationship => 'रिश्ता / शादी की बात';

  @override
  String get purposeFamily => 'परिवार चर्चा';

  @override
  String get purposeTravel => 'यात्रा';

  @override
  String get purposeStudy => 'पढ़ाई / परीक्षा';

  @override
  String get purposeHealth => 'स्वास्थ्य दिनचर्या';

  @override
  String get purposeLegal => 'कानूनी / विवाद';

  @override
  String get purposeSpiritual => 'आध्यात्मिक / पूजा';

  @override
  String get purposeCreative => 'रचनात्मक / सार्वजनिक';

  @override
  String get moonSignToday => 'चंद्र राशि (आज · लाहिरी)';

  @override
  String get profileTuneTitle => 'प्रोफ़ाइल और समय';

  @override
  String get profileTuneHint =>
      'नाम, भाषा, जन्म समय या नक्षत्र बदलें। सहेजने के बाद सभी टैब अपडेट हो जाते हैं।';

  @override
  String get profileSaveRefresh => 'सहेजें और सब रीफ़्रेश करें';

  @override
  String get profileSaved => 'समय जानकारी अपडेट हो गई।';
}
