/**
 * Engine-owned meaning tables (EN/TE/HI): nakshatra, tithi, yoga, tara, hora and sub-period
 * lord themes. They give every day, slot and chapter its own grounded hook, feed the Explain
 * sheet's traditional layer and the deterministic day cards past the written range.
 * Pure data + tiny helpers; no I/O.
 */
export type L3 = { en: string; te: string; hi: string };
export type MeaningLocale = keyof L3;

type Nak = { nature: string; meaning: L3; good_for: L3 };
export const NAK_MEANING: Record<string, Nak> = {
  "Ashwini": { nature: "swift", meaning: { en: "the healers' star: quick, fresh beginnings", te: "అశ్విని దేవతల నక్షత్రం: వేగంగా, కొత్తగా మొదలుపెట్టే రోజు", hi: "अश्विनी कुमारों का नक्षत्र: तेज़, ताज़ी शुरुआत" }, good_for: { en: "a quick start, short trips, a health habit", te: "చిన్న ప్రయాణం, కొత్త హెల్త్ అలవాటు, త్వరగా మొదలయ్యే పని", hi: "जल्दी शुरुआत, छोटी यात्रा, सेहत की नई आदत" } },
  "Bharani": { nature: "fierce", meaning: { en: "Yama's star: carrying a load to the end", te: "యముడి నక్షత్రం: బరువును చివరి వరకు మోసే శక్తి", hi: "यम का नक्षत्र: बोझ को अंत तक निभाने की ताकत" }, good_for: { en: "finishing hard tasks, discipline, clearing dues", te: "కష్టమైన పని పూర్తి చేయడం, బాకీలు తీర్చడం, క్రమశిక్షణ", hi: "कठिन काम पूरा करना, बकाया निपटाना, अनुशासन" } },
  "Krittika": { nature: "mixed", meaning: { en: "Agni's star: the blade that cuts through", te: "అగ్ని నక్షత్రం: సూటిగా తేల్చే పదును", hi: "अग्नि का नक्षत्र: सीधे काटने वाली धार" }, good_for: { en: "clear decisions, cooking, cleaning out clutter", te: "స్పష్టమైన నిర్ణయం, వంట, ఇల్లు శుభ్రం చేయడం", hi: "साफ़ फ़ैसला, खाना पकाना, कबाड़ हटाना" } },
  "Rohini": { nature: "steady", meaning: { en: "Brahma's star: growth that takes root", te: "బ్రహ్మ నక్షత్రం: వేళ్లూనుకునే ఎదుగుదల", hi: "ब्रह्मा का नक्षत्र: जड़ पकड़ने वाली बढ़त" }, good_for: { en: "home plans, planting, starting something to keep", te: "ఇంటి ప్లాన్లు, మొక్కలు నాటడం, నిలిచే పని మొదలుపెట్టడం", hi: "घर की योजना, पौधे लगाना, टिकने वाला काम शुरू करना" } },
  "Mrigashira": { nature: "gentle", meaning: { en: "Soma's star: the curious search", te: "సోముడి నక్షత్రం: ఆసక్తితో వెతికే స్వభావం", hi: "सोम का नक्षत्र: जिज्ञासा भरी खोज" }, good_for: { en: "comparing options, learning, a gentle outing", te: "ఆప్షన్లు పోల్చడం, కొత్తది నేర్చుకోవడం, చిన్న విహారం", hi: "विकल्प परखना, सीखना, हल्की सैर" } },
  "Ardra": { nature: "sharp", meaning: { en: "Rudra's star: the storm that clears the air", te: "రుద్రుడి నక్షత్రం: తుఫాను తర్వాత వచ్చే స్పష్టత", hi: "रुद्र का नक्षत्र: तूफ़ान जो हवा साफ़ कर दे" }, good_for: { en: "honest talks, research, fixing what is broken", te: "నిజాయితీగా మాట్లాడటం, రీసెర్చ్, పాడైనది బాగుచేయడం", hi: "खरी बात, खोजबीन, टूटी चीज़ ठीक करना" } },
  "Punarvasu": { nature: "moving", meaning: { en: "Aditi's star: returning and renewing", te: "అదితి నక్షత్రం: మళ్లీ ప్రయత్నించే, తిరిగి వచ్చే శక్తి", hi: "अदिति का नक्षत्र: लौटना और नया होना" }, good_for: { en: "a second attempt, travel, reconnecting", te: "రెండో ప్రయత్నం, ప్రయాణం, పాత పరిచయాలు కలుపుకోవడం", hi: "दूसरी कोशिश, यात्रा, पुराने लोगों से जुड़ना" } },
  "Pushya": { nature: "swift", meaning: { en: "Brihaspati's star: the most nourishing in the sky", te: "బృహస్పతి నక్షత్రం: అన్నింటికంటే పోషించే నక్షత్రం", hi: "बृहस्पति का नक्षत्र: सबसे पोषण देने वाला" }, good_for: { en: "starting good habits, learning, prayer, feeding others", te: "మంచి అలవాటు మొదలు, చదువు, పూజ, ఇతరులకు భోజనం", hi: "अच्छी आदत शुरू करना, पढ़ाई, पूजा, किसी को खिलाना" } },
  "Ashlesha": { nature: "sharp", meaning: { en: "the serpent's star: watchful and strategic", te: "నాగుల నక్షత్రం: జాగ్రత్త, వ్యూహం", hi: "नाग का नक्षत्र: चौकन्ना और सोच-समझकर" }, good_for: { en: "planning, guarding money, reading the fine print", te: "ప్లానింగ్, డబ్బు జాగ్రత్త, చిన్న అక్షరాలు చదవడం", hi: "योजना, पैसे की हिफ़ाज़त, बारीक शर्तें पढ़ना" } },
  "Magha": { nature: "fierce", meaning: { en: "the ancestors' star: roots, lineage and respect", te: "పితృదేవతల నక్షత్రం: వంశం, గౌరవం", hi: "पितरों का नक्षत्र: जड़ें, वंश और सम्मान" }, good_for: { en: "honouring elders, family traditions, a dignified ask", te: "పెద్దలను గౌరవించడం, ఇంటి ఆచారాలు, హుందాగా అడగడం", hi: "बड़ों का सम्मान, घर की परंपरा, गरिमा से माँगना" } },
  "Purva Phalguni": { nature: "fierce", meaning: { en: "Bhaga's star: rest, pleasure and affection", te: "భగుడి నక్షత్రం: విశ్రాంతి, ఆనందం, ప్రేమ", hi: "भग का नक्षत्र: आराम, आनंद और स्नेह" }, good_for: { en: "rest, a date, creative play", te: "విశ్రాంతి, ఇష్టమైనవారితో టైమ్, క్రియేటివ్ పని", hi: "आराम, किसी खास के साथ समय, रचनात्मक काम" } },
  "Uttara Phalguni": { nature: "steady", meaning: { en: "Aryaman's star: promises and partnerships", te: "అర్యముడి నక్షత్రం: మాట ఇవ్వడం, భాగస్వామ్యం", hi: "अर्यमा का नक्षत्र: वादे और साझेदारी" }, good_for: { en: "agreements, commitments, helping a friend", te: "ఒప్పందాలు, మాట నిలబెట్టుకోవడం, స్నేహితుడికి సాయం", hi: "समझौते, वादे निभाना, दोस्त की मदद" } },
  "Hasta": { nature: "swift", meaning: { en: "Savitar's star: skill in the hands", te: "సవిత నక్షత్రం: చేతి నైపుణ్యం", hi: "सविता का नक्षत्र: हाथों का हुनर" }, good_for: { en: "handiwork, quick tasks, small repairs", te: "చేతి పనులు, చిన్న రిపేర్లు, త్వరగా అయ్యే పనులు", hi: "हाथ का काम, छोटी मरम्मत, फुर्ती वाले काम" } },
  "Chitra": { nature: "gentle", meaning: { en: "the celestial architect's star: making things beautiful", te: "త్వష్ట నక్షత్రం: అందంగా తీర్చిదిద్దే కళ", hi: "त्वष्टा का नक्षत्र: चीज़ों को सुंदर गढ़ना" }, good_for: { en: "design, decorating, dressing up, building", te: "డిజైన్, ఇల్లు అలంకరించడం, కొత్త బట్టలు, నిర్మాణం", hi: "डिज़ाइन, सजावट, सजना-संवरना, निर्माण" } },
  "Swati": { nature: "moving", meaning: { en: "the wind's star: independence and trade", te: "వాయుదేవుడి నక్షత్రం: స్వతంత్రం, వ్యాపారం", hi: "वायु का नक्षत्र: आज़ादी और व्यापार" }, good_for: { en: "buying and selling, flexible plans, going solo", te: "కొనడం అమ్మడం, ఫ్లెక్సిబుల్ ప్లాన్లు, ఒంటరిగా చేసే పని", hi: "खरीद-बिक्री, लचीली योजना, अकेले का काम" } },
  "Vishakha": { nature: "mixed", meaning: { en: "the star of one fixed goal", te: "ఒకే లక్ష్యంపై దృష్టి పెట్టించే నక్షత్రం", hi: "एक लक्ष्य पर टिके रहने का नक्षत्र" }, good_for: { en: "pushing a goal forward, applications, persistence", te: "లక్ష్యం వైపు అడుగు, అప్లికేషన్లు, పట్టుదల", hi: "लक्ष्य की ओर बढ़ना, आवेदन, लगन" } },
  "Anuradha": { nature: "gentle", meaning: { en: "Mitra's star: friendship and devotion", te: "మిత్రుడి నక్షత్రం: స్నేహం, భక్తి", hi: "मित्र देवता का नक्षत्र: दोस्ती और भक्ति" }, good_for: { en: "team efforts, friends, keeping a promise", te: "కలిసి చేసే పని, స్నేహితులు, ఇచ్చిన మాట", hi: "मिलकर काम, दोस्त, दिया हुआ वचन" } },
  "Jyeshtha": { nature: "sharp", meaning: { en: "Indra's star: the eldest who takes charge", te: "ఇంద్రుడి నక్షత్రం: పెద్దరికంతో బాధ్యత తీసుకునే స్వభావం", hi: "इंद्र का नक्षत्र: बड़े की तरह ज़िम्मेदारी लेना" }, good_for: { en: "taking responsibility, protecting someone, a firm ask", te: "బాధ్యత తీసుకోవడం, ఎవరికైనా అండగా నిలవడం, గట్టిగా అడగడం", hi: "ज़िम्मेदारी लेना, किसी की रक्षा, दृढ़ता से माँगना" } },
  "Mula": { nature: "sharp", meaning: { en: "the root star: getting to the bottom of things", te: "మూల నక్షత్రం: విషయం మూలానికి వెళ్లడం", hi: "मूल नक्षत्र: बात की जड़ तक जाना" }, good_for: { en: "root-cause fixes, letting go, deep study", te: "అసలు కారణం సరిచేయడం, వదిలేయాల్సినది వదలడం, లోతైన చదువు", hi: "असली कारण सुधारना, छोड़ देना, गहरी पढ़ाई" } },
  "Purva Ashadha": { nature: "fierce", meaning: { en: "the waters' star: invigorating and persuasive", te: "జలదేవతల నక్షత్రం: ఉత్సాహం, ఒప్పించే శక్తి", hi: "जल देवता का नक्षत्र: ताज़गी और मनाने की ताकत" }, good_for: { en: "making your case, a cleansing routine, fresh energy", te: "మీ వాదన చెప్పడం, శుభ్రత, కొత్త ఉత్సాహం", hi: "अपनी बात रखना, सफ़ाई की आदत, नई ऊर्जा" } },
  "Uttara Ashadha": { nature: "steady", meaning: { en: "the star of the lasting win", te: "నిలిచే విజయాన్ని ఇచ్చే నక్షత్రం", hi: "टिकाऊ जीत का नक्षत्र" }, good_for: { en: "important requests, long-term commitments", te: "ముఖ్యమైన రిక్వెస్ట్‌లు, దీర్ఘకాల నిర్ణయాలు", hi: "ज़रूरी अनुरोध, लंबे समय के वादे" } },
  "Shravana": { nature: "moving", meaning: { en: "Vishnu's star: listening and learning", te: "విష్ణువు నక్షత్రం: వినడం, నేర్చుకోవడం", hi: "विष्णु का नक्षत्र: सुनना और सीखना" }, good_for: { en: "listening well, classes, advice from elders", te: "శ్రద్ధగా వినడం, క్లాసులు, పెద్దల సలహా", hi: "ध्यान से सुनना, कक्षा, बड़ों की सलाह" } },
  "Dhanishta": { nature: "moving", meaning: { en: "the Vasus' star: rhythm, music and wealth", te: "వసువుల నక్షత్రం: లయ, సంగీతం, సంపద", hi: "वसुओं का नक्षत्र: लय, संगीत और धन" }, good_for: { en: "group plans, music, practical money gains", te: "గ్రూప్ ప్లాన్లు, సంగీతం, డబ్బు పనులు", hi: "सामूहिक योजना, संगीत, पैसों का लाभ" } },
  "Shatabhisha": { nature: "moving", meaning: { en: "Varuna's star: the hundred healers", te: "వరుణుడి నక్షత్రం: వంద వైద్యుల శక్తి", hi: "वरुण का नक्षत्र: सौ वैद्यों की शक्ति" }, good_for: { en: "healing routines, quiet research, sorting a mess", te: "ఆరోగ్య అలవాట్లు, నిశ్శబ్దంగా రీసెర్చ్, గందరగోళం సర్దడం", hi: "सेहत की दिनचर्या, शांत खोज, उलझन सुलझाना" } },
  "Purva Bhadrapada": { nature: "fierce", meaning: { en: "the one-footed goat's star: intense and inward", te: "అజైకపాదుడి నక్షత్రం: తీవ్రత, లోపలి దృష్టి", hi: "अजैकपाद का नक्षत्र: तीव्र और भीतर की ओर" }, good_for: { en: "prayer, fasting, a serious decision you have weighed", te: "పూజ, ఉపవాసం, బాగా ఆలోచించిన గంభీర నిర్ణయం", hi: "पूजा, व्रत, सोचा-समझा गंभीर फ़ैसला" } },
  "Uttara Bhadrapada": { nature: "steady", meaning: { en: "the deep-sea serpent's star: calm depth and patience", te: "అహిర్బుధ్న్య నక్షత్రం: ప్రశాంతమైన లోతు, ఓర్పు", hi: "अहिर्बुध्न्य का नक्षत्र: शांत गहराई और धैर्य" }, good_for: { en: "steady long work, saving, a calm family talk", te: "నిలకడైన పెద్ద పని, పొదుపు, ఇంట్లో ప్రశాంతంగా మాట్లాడటం", hi: "लंबा स्थिर काम, बचत, घर में शांत बातचीत" } },
  "Revati": { nature: "gentle", meaning: { en: "Pushan's star: safe passage and completion", te: "పూషుడి నక్షత్రం: సురక్షిత ప్రయాణం, పూర్తి చేయడం", hi: "पूषा का नक्षत्र: सुरक्षित यात्रा और पूर्णता" }, good_for: { en: "journeys, caring for animals or kids, wrapping up", te: "ప్రయాణాలు, పిల్లలు లేదా పెంపుడు జంతువుల సంరక్షణ, పని ముగించడం", hi: "यात्रा, बच्चों या जानवरों की देखभाल, काम समेटना" } },
};

type Tithi = { group: string; meaning: L3; good_for: L3; name: L3 };
export const TITHI_MEANING: Record<string, Tithi> = {
  Pratipada: { group: "nanda", name: { en: "Pratipada", te: "పాడ్యమి", hi: "प्रतिपदा" }, meaning: { en: "the first lunar day: a fresh start", te: "చంద్రుడి మొదటి తిథి: కొత్త మొదలు", hi: "पहली तिथि: नई शुरुआत" }, good_for: { en: "setting an intention, a small first step", te: "సంకల్పం పెట్టుకోవడం, చిన్న మొదటి అడుగు", hi: "संकल्प लेना, छोटा पहला कदम" } },
  Dwitiya: { group: "bhadra", name: { en: "Dwitiya", te: "విదియ", hi: "द्वितीया" }, meaning: { en: "a building day: lay foundations", te: "పునాది వేసే తిథి", hi: "नींव रखने की तिथि" }, good_for: { en: "steady work, setting up a routine", te: "నిలకడైన పని, రొటీన్ సెట్ చేయడం", hi: "स्थिर काम, दिनचर्या बनाना" } },
  Tritiya: { group: "jaya", name: { en: "Tritiya", te: "తదియ", hi: "तृतीया" }, meaning: { en: "a winning day: effort pays", te: "గెలుపు తిథి: కష్టానికి ఫలితం", hi: "जीत की तिथि: मेहनत का फल" }, good_for: { en: "asks, arts, looking after your appearance", te: "అడగడం, కళలు, మిమ్మల్ని మీరు చూసుకోవడం", hi: "माँगना, कला, खुद को सँवारना" } },
  Chaturthi: { group: "rikta", name: { en: "Chaturthi", te: "చవితి", hi: "चतुर्थी" }, meaning: { en: "an emptying day: clear obstacles first", te: "ఖాళీ చేసే తిథి: ముందు అడ్డంకులు తొలగించాలి", hi: "रिक्त तिथि: पहले रुकावट हटाएँ" }, good_for: { en: "removing a blocker, prayer to Ganesha", te: "అడ్డు తొలగించడం, వినాయకుడి పూజ", hi: "रुकावट हटाना, गणेश पूजा" } },
  Panchami: { group: "purna", name: { en: "Panchami", te: "పంచమి", hi: "पंचमी" }, meaning: { en: "a full day for knowledge and healing", te: "జ్ఞానం, ఆరోగ్యానికి మంచి తిథి", hi: "ज्ञान और सेहत की पूर्ण तिथि" }, good_for: { en: "study, a doctor-approved health step", te: "చదువు, డాక్టర్ చెప్పిన హెల్త్ పని", hi: "पढ़ाई, डॉक्टर की सलाह वाला सेहत का कदम" } },
  Shashthi: { group: "nanda", name: { en: "Shashthi", te: "షష్ఠి", hi: "षष्ठी" }, meaning: { en: "Skanda's day: small brave wins", te: "సుబ్రహ్మణ్యుడి తిథి: చిన్న ధైర్య విజయాలు", hi: "स्कंद की तिथि: छोटी बहादुर जीत" }, good_for: { en: "a bold small step, meeting people", te: "ధైర్యంగా చిన్న అడుగు, మనుషుల్ని కలవడం", hi: "हिम्मत का छोटा कदम, लोगों से मिलना" } },
  Saptami: { group: "bhadra", name: { en: "Saptami", te: "సప్తమి", hi: "सप्तमी" }, meaning: { en: "the Sun's day: movement and travel", te: "సూర్యుడి తిథి: కదలిక, ప్రయాణం", hi: "सूर्य की तिथि: गति और यात्रा" }, good_for: { en: "travel, errands that need moving around", te: "ప్రయాణం, తిరిగి చేయాల్సిన పనులు", hi: "यात्रा, घूम-फिर कर होने वाले काम" } },
  Ashtami: { group: "jaya", name: { en: "Ashtami", te: "అష్టమి", hi: "अष्टमी" }, meaning: { en: "an effortful day: hold the line", te: "శ్రమ ఉండే తిథి: నిలకడగా ఉండాలి", hi: "मेहनत की तिथि: डटे रहें" }, good_for: { en: "essentials, discipline, protecting what you have", te: "అవసరమైన పనులు, క్రమశిక్షణ, ఉన్నది కాపాడుకోవడం", hi: "ज़रूरी काम, अनुशासन, जो है उसे बचाना" } },
  Navami: { group: "rikta", name: { en: "Navami", te: "నవమి", hi: "नवमी" }, meaning: { en: "an emptying day for tough clearing", te: "కష్టమైన క్లియరింగ్ తిథి", hi: "कठिन सफ़ाई की रिक्त तिथि" }, good_for: { en: "hard conversations you must have, cleaning", te: "తప్పని కఠిన మాటలు, శుభ్రత", hi: "ज़रूरी कठिन बात, सफ़ाई" } },
  Dashami: { group: "purna", name: { en: "Dashami", te: "దశమి", hi: "दशमी" }, meaning: { en: "a full day for right action", te: "ధర్మంగా చేసే పనులకు మంచి తిథి", hi: "सही काम की पूर्ण तिथि" }, good_for: { en: "official work, finishing a duty", te: "ఆఫీస్ పని, బాధ్యత పూర్తి చేయడం", hi: "सरकारी या दफ़्तरी काम, कर्तव्य पूरा करना" } },
  Ekadashi: { group: "nanda", name: { en: "Ekadashi", te: "ఏకాదశి", hi: "एकादशी" }, meaning: { en: "Vishnu's day: lightness and discipline", te: "విష్ణువు తిథి: తేలికదనం, నియమం", hi: "विष्णु की तिथि: हल्कापन और संयम" }, good_for: { en: "light food, focus, prayer", te: "తేలికపాటి భోజనం, ఏకాగ్రత, పూజ", hi: "हल्का भोजन, ध्यान, पूजा" } },
  Dwadashi: { group: "bhadra", name: { en: "Dwadashi", te: "ద్వాదశి", hi: "द्वादशी" }, meaning: { en: "a day of duty and giving", te: "బాధ్యత, దానం తిథి", hi: "कर्तव्य और दान की तिथि" }, good_for: { en: "charity, keeping commitments", te: "దానం, ఇచ్చిన మాట నిలబెట్టడం", hi: "दान, वादा निभाना" } },
  Trayodashi: { group: "jaya", name: { en: "Trayodashi", te: "త్రయోదశి", hi: "त्रयोदशी" }, meaning: { en: "a day for friendship and celebration", te: "స్నేహం, సంబరాల తిథి", hi: "दोस्ती और उत्सव की तिथि" }, good_for: { en: "meeting friends, a small celebration", te: "స్నేహితుల్ని కలవడం, చిన్న వేడుక", hi: "दोस्तों से मिलना, छोटा जश्न" } },
  Chaturdashi: { group: "rikta", name: { en: "Chaturdashi", te: "చతుర్దశి", hi: "चतुर्दशी" }, meaning: { en: "a fierce emptying day before the moon turns", te: "చంద్రుడు మారే ముందు వచ్చే గట్టి తిథి", hi: "चंद्र बदलने से पहले की तीखी तिथि" }, good_for: { en: "finishing, clearing out, Shiva prayer", te: "పనులు ముగించడం, శుభ్రం చేయడం, శివ పూజ", hi: "काम समेटना, सफ़ाई, शिव पूजा" } },
  Purnima: { group: "purna", name: { en: "Purnima", te: "పౌర్ణమి", hi: "पूर्णिमा" }, meaning: { en: "the full moon: fullness and gratitude", te: "పౌర్ణమి: నిండుదనం, కృతజ్ఞత", hi: "पूर्णिमा: पूर्णता और कृतज्ञता" }, good_for: { en: "family time, gratitude, completing a cycle", te: "కుటుంబంతో టైమ్, కృతజ్ఞత, ఒక పని పూర్తి", hi: "परिवार का समय, आभार, एक चक्र पूरा करना" } },
  Amavasya: { group: "dark", name: { en: "Amavasya", te: "అమావాస్య", hi: "अमावस्या" }, meaning: { en: "the new moon: a quiet reset", te: "అమావాస్య: నిశ్శబ్ద రీసెట్", hi: "अमावस्या: शांत विराम" }, good_for: { en: "rest, remembering ancestors, planning", te: "విశ్రాంతి, పెద్దల్ని తలచుకోవడం, ప్లానింగ్", hi: "आराम, पितरों को याद करना, योजना" } },
};

type Yoga = { tone: "supportive" | "mixed" | "careful"; meaning: L3 };
const y = (tone: Yoga["tone"], en: string, te: string, hi: string): Yoga => ({ tone, meaning: { en, te, hi } });
export const YOGA_MEANING: Record<string, Yoga> = {
  Vishkambha: y("careful", "a propped-up start: expect a snag", "ఆటంకంతో మొదలయ్యే యోగం", "रुकावट वाली शुरुआत"),
  Priti: y("supportive", "affection: people warm up", "ప్రీతి: మనుషులు దగ్గరవుతారు", "प्रीति: लोग अपनापन दिखाते हैं"),
  Ayushman: y("supportive", "long life: things last", "ఆయుష్మాన్: చేసినది నిలుస్తుంది", "आयुष्मान: काम टिकता है"),
  Saubhagya: y("supportive", "good fortune: a lucky turn", "సౌభాగ్యం: అదృష్టం తోడు", "सौभाग्य: किस्मत का साथ"),
  Shobhana: y("supportive", "splendour: things look good", "శోభనం: అందంగా సాగుతుంది", "शोभन: रौनक"),
  Atiganda: y("careful", "a big knot: move carefully", "అతిగండం: జాగ్రత్తగా అడుగు", "अतिगंड: संभलकर चलें"),
  Sukarma: y("supportive", "good deeds: honest work rewarded", "సుకర్మ: మంచి పనికి ఫలం", "सुकर्मा: अच्छे काम का फल"),
  Dhriti: y("supportive", "steadiness: patience holds", "ధృతి: ఓర్పు నిలుస్తుంది", "धृति: धैर्य टिकता है"),
  Shula: y("careful", "a spike: avoid needless fights", "శూలం: అనవసర గొడవలు వద్దు", "शूल: बेवजह की टकराहट से बचें"),
  Ganda: y("careful", "a knot: untangle before adding", "గండం: ముందు చిక్కు విప్పాలి", "गंड: पहले गाँठ खोलें"),
  Vriddhi: y("supportive", "growth: what you add grows", "వృద్ధి: మొదలుపెట్టింది పెరుగుతుంది", "वृद्धि: जो जोड़ें वो बढ़े"),
  Dhruva: y("supportive", "fixed: good for lasting things", "ధ్రువం: స్థిరమైన పనులకు మంచిది", "ध्रुव: टिकाऊ काम के लिए अच्छा"),
  Vyaghata: y("careful", "a jolt: expect surprises", "వ్యాఘాతం: అనుకోని మార్పులు", "व्याघात: अचानक झटके"),
  Harshana: y("supportive", "joy: a cheerful day", "హర్షణం: సంతోషం", "हर्षण: खुशी"),
  Vajra: y("mixed", "the diamond: strong but hard-edged", "వజ్రం: బలమైనది కానీ కఠినం", "वज्र: मज़बूत पर कठोर"),
  Siddhi: y("supportive", "accomplishment: efforts land", "సిద్ధి: ప్రయత్నం ఫలిస్తుంది", "सिद्धि: मेहनत सफल"),
  Vyatipata: y("careful", "a slip: double-check big moves", "వ్యతీపాతం: పెద్ద నిర్ణయం రెండుసార్లు చూడండి", "व्यतीपात: बड़े कदम दोबारा जाँचें"),
  Variyan: y("supportive", "comfort: ease and plenty", "వరీయాన్: సౌకర్యం", "वरीयान: आराम और भरपूरी"),
  Parigha: y("careful", "a barrier: wait for the gate to open", "పరిఘ: అడ్డు ఉంటుంది, ఓపిక", "परिघ: रुकावट, धैर्य रखें"),
  Shiva: y("supportive", "auspicious calm: good for prayer and study", "శివ: ప్రశాంతత, పూజ, చదువు", "शिव: शांति, पूजा और पढ़ाई"),
  Siddha: y("supportive", "ready success: plans click", "సిద్ధ: ప్లాన్లు కుదురుతాయి", "सिद्ध: योजना बैठती है"),
  Sadhya: y("supportive", "achievable: steady effort works", "సాధ్య: నిలకడ ఫలిస్తుంది", "साध्य: लगन काम करती है"),
  Shubha: y("supportive", "good: a kindly day", "శుభ: మంచి రోజు", "शुभ: भला दिन"),
  Shukla: y("supportive", "bright: clear thinking", "శుక్ల: స్పష్టమైన ఆలోచన", "शुक्ल: साफ़ सोच"),
  Brahma: y("supportive", "wisdom: good for learning and advice", "బ్రహ్మ: చదువు, సలహాకు మంచిది", "ब्रह्म: सीखने और सलाह के लिए अच्छा"),
  Indra: y("supportive", "leadership: take the lead", "ఇంద్ర: ముందుండి నడిపించండి", "इंद्र: आगे बढ़कर नेतृत्व"),
  Vaidhriti: y("careful", "discord: keep plans simple", "వైధృతి: విభేదాలు, ప్లాన్లు సింపుల్‌గా", "वैधृति: अनबन, योजना सरल रखें"),
};

/** The nine taras (birth star -> today's star), in plain words; no "hint" labels. */
export const TARA_MEANING: Record<string, L3> = {
  "Janma": { en: "today's star echoes your birth star: keep the day light and look after yourself", te: "ఈరోజు నక్షత్రం మీ జన్మ నక్షత్రమే: రోజు తేలికగా, మీ మీద శ్రద్ధగా", hi: "आज का नक्षत्र आपका जन्म नक्षत्र है: दिन हल्का रखें, खुद का ध्यान रखें" },
  "Sampat": { en: "a wealth tara: money tasks and asking for what you need go well", te: "సంపత్ తార: డబ్బు పనులు, కావాల్సింది అడగడం బాగా సాగుతాయి", hi: "संपत तारा: पैसे के काम और ज़रूरत की माँग अच्छी चलती है" },
  "Vipat": { en: "a friction tara: small snags, so double-check before you send or pay", te: "విపత్ తార: చిన్న చిక్కులు, పంపే ముందు చెల్లించే ముందు ఒకసారి చూడండి", hi: "विपत तारा: छोटी अड़चनें, भेजने या देने से पहले जाँचें" },
  "Kshema": { en: "a well-being tara: health, home and steady progress", te: "క్షేమ తార: ఆరోగ్యం, ఇల్లు, నిలకడ పురోగతి", hi: "क्षेम तारा: सेहत, घर और स्थिर तरक्की" },
  "Pratyak": { en: "an obstacle tara: finish what is open rather than starting fresh", te: "ప్రత్యక్ తార: కొత్తది కాకుండా ఉన్నది పూర్తి చేయండి", hi: "प्रत्यक तारा: नया शुरू करने के बजाय अधूरा पूरा करें" },
  "Sadhana": { en: "an achievement tara: push the one thing that matters", te: "సాధన తార: ముఖ్యమైన పని మీద గట్టిగా", hi: "साधना तारा: सबसे ज़रूरी काम पर ज़ोर" },
  "Naidhana": { en: "a low tara: save energy, skip big promises and arguments", te: "నైధన తార: ఎనర్జీ దాచుకోండి, పెద్ద మాటలు, గొడవలు వద్దు", hi: "नैधन तारा: ऊर्जा बचाएँ, बड़े वादे और बहस छोड़ें" },
  "Mitra": { en: "a friendly tara: people, favours and teamwork", te: "మిత్ర తార: మనుషులు, సహాయాలు, కలిసి పని", hi: "मित्र तारा: लोग, मदद और साथ का काम" },
  "Parama Mitra": { en: "the best-friend tara: very supportive for important asks", te: "పరమ మిత్ర తార: ముఖ్యమైన రిక్వెస్ట్‌లకు చాలా సపోర్ట్", hi: "परम मित्र तारा: ज़रूरी माँग के लिए बहुत साथ" },
};

/** Planetary hour (hora) themes: what a slot ruled by that planet traditionally suits. */
export const HORA_THEME: Record<string, L3> = {
  sun: { en: "official work, a talk with someone senior, self-respect", te: "ఆఫీస్ పని, పెద్దవారితో మాట, ఆత్మగౌరవం", hi: "दफ़्तरी काम, बड़ों से बात, आत्मसम्मान" },
  moon: { en: "family, food, caring calls", te: "కుటుంబం, భోజనం, ప్రేమగా కాల్స్", hi: "परिवार, भोजन, अपनों को फ़ोन" },
  mars: { en: "physical effort, repairs, property tasks", te: "శారీరక శ్రమ, రిపేర్లు, ఇల్లు-స్థలం పనులు", hi: "मेहनत का काम, मरम्मत, ज़मीन-घर के काम" },
  mercury: { en: "writing, calls, study, small trade", te: "రాయడం, కాల్స్, చదువు, చిన్న లావాదేవీలు", hi: "लिखना, फ़ोन, पढ़ाई, छोटा लेन-देन" },
  jupiter: { en: "advice, learning, money planning, prayer", te: "సలహా, నేర్చుకోవడం, డబ్బు ప్లానింగ్, పూజ", hi: "सलाह, सीखना, पैसों की योजना, पूजा" },
  venus: { en: "relationships, beauty, comforts, art", te: "అనుబంధాలు, అందం, సౌకర్యాలు, కళలు", hi: "रिश्ते, सुंदरता, सुख-सुविधा, कला" },
  saturn: { en: "routine, cleaning, old pending work", te: "రొటీన్, శుభ్రత, పాత పెండింగ్ పనులు", hi: "रोज़ का काम, सफ़ाई, पुराने अटके काम" },
};
export const RAHU_NOTE: L3 = {
  en: "Rahu Kalam: tradition keeps this stretch free of new starts; routine is fine",
  te: "రాహుకాలం: ఈ టైమ్‌లో కొత్త పనులు మొదలుపెట్టరు; రొటీన్ పనులు ఓకే",
  hi: "राहु काल: परंपरा में इस समय नई शुरुआत नहीं; रोज़ के काम ठीक",
};

/** What a sub-period (antardasha) lord brings, so each chapter has its own themes. */
export const AD_THEME: Record<string, { support: string[]; pressure: string[] }> = {
  sun: { support: ["recognition for your effort", "confidence with authority figures"], pressure: ["ego clashes with seniors", "running yourself down"] },
  moon: { support: ["home and emotional comfort", "care from and for mother figures"], pressure: ["mood swings", "worrying about family"] },
  mars: { support: ["drive to act", "property or sibling matters moving"], pressure: ["short temper", "rushing into disputes"] },
  mercury: { support: ["learning and clear communication", "trade and friendships"], pressure: ["overthinking", "scattered attention"] },
  jupiter: { support: ["wise guidance and blessings from elders", "savings and good counsel"], pressure: ["overcommitting to help", "complacency"] },
  venus: { support: ["relationships and comforts", "creativity and good taste"], pressure: ["overspending on comforts", "avoiding hard talks"] },
  saturn: { support: ["patient, lasting results", "respect earned through duty"], pressure: ["delays and heavy duties", "loneliness under responsibility"] },
  rahu: { support: ["bold, unusual opportunities", "ambition and new circles"], pressure: ["restlessness", "chasing too many things"] },
  ketu: { support: ["inner clarity and letting go", "spiritual interest"], pressure: ["detachment from people", "sudden shifts of interest"] },
};

/** Chaldean hora order and the day's first hora lord (= weekday lord, 0=Sunday). */
const CHALDEAN = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];
const DAY_LORD = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];
/** Lord of the daytime hora containing `minuteOfDay`, given sunrise/sunset minutes. */
export function horaLord(weekday: number, sunriseMin: number, sunsetMin: number, minuteOfDay: number): string {
  const len = Math.max(1, (sunsetMin - sunriseMin) / 12);
  const idx = Math.max(0, Math.min(11, Math.floor((minuteOfDay - sunriseMin) / len)));
  const start = CHALDEAN.indexOf(DAY_LORD[((weekday % 7) + 7) % 7]);
  return CHALDEAN[(start + idx) % 7];
}

export function tithiBase(tithi: string): string {
  const t = (tithi ?? "").trim().split(/\s+/).slice(-1)[0] ?? "";
  return TITHI_MEANING[t] ? t : "";
}
export function nakMeaning(n: string, l: MeaningLocale): string { return NAK_MEANING[n]?.meaning[l] ?? ""; }
export function nakGoodFor(n: string, l: MeaningLocale): string { return NAK_MEANING[n]?.good_for[l] ?? ""; }
export function tithiMeaning(t: string, l: MeaningLocale): string { return TITHI_MEANING[tithiBase(t)]?.meaning[l] ?? ""; }
export function tithiGoodFor(t: string, l: MeaningLocale): string { return TITHI_MEANING[tithiBase(t)]?.good_for[l] ?? ""; }
export function yogaMeaning(y0: string, l: MeaningLocale): string { return YOGA_MEANING[y0]?.meaning[l] ?? ""; }
export function taraMeaning(t: string | null | undefined, l: MeaningLocale): string { return t ? TARA_MEANING[t]?.[l] ?? "" : ""; }
export function horaTheme(p: string | undefined, l: MeaningLocale): string { return p ? HORA_THEME[p]?.[l] ?? "" : ""; }
