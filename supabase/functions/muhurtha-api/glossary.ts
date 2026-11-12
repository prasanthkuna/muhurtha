/**
 * Three-layer glossary for every traditional term the app shows (simple, traditional,
 * practical). The traditional names stay (Rahu Kalam, Mahadasha, Tara Bala): users learn
 * the real word plus what it means for them. Used as grounding for Luna explanations and
 * as the deterministic fallback when the model is unavailable. Pure module.
 */
export type GlossLocale = "en" | "te" | "hi";
export type GlossEntry = { title: string; simple: string; traditional: string; practical: string };
export type GlossTerm =
  | "rahu_kalam" | "yamagandam" | "gulika" | "good_slot" | "mahadasha" | "antardasha" | "tara_bala"
  | "nakshatra" | "tithi" | "moon_sign" | "chandrashtama" | "koota" | "varna" | "vashya" | "koota_tara"
  | "yoni" | "graha_maitri" | "gana" | "bhakoot" | "nadi" | "life_chapter" | "day_card";

export const GLOSS_TERMS: GlossTerm[] = [
  "rahu_kalam", "yamagandam", "gulika", "good_slot", "mahadasha", "antardasha", "tara_bala", "nakshatra", "tithi",
  "moon_sign", "chandrashtama", "koota", "varna", "vashya", "koota_tara", "yoni", "graha_maitri", "gana", "bhakoot",
  "nadi", "life_chapter", "day_card",
];

/** Bond / matching terms: explain the factor, never predict how the relationship turns out. */
export const BOND_TERMS = new Set<GlossTerm>(["koota", "varna", "vashya", "koota_tara", "yoni", "graha_maitri", "gana", "bhakoot", "nadi"]);

type Row = Record<GlossLocale, GlossEntry>;

export const GLOSSARY: Record<GlossTerm, Row> = {
  rahu_kalam: {
    en: { title: "Rahu Kalam", simple: "A roughly 90-minute stretch each day that tradition keeps free of new starts.", traditional: "The daytime is split into eight parts and, depending on the weekday, one part belongs to Rahu. That is why the time moves every day.", practical: "Routine work and finishing things are fine. Keep a new deal, a big purchase or a ceremony for after it ends." },
    te: { title: "రాహుకాలం", simple: "రోజూ వచ్చే సుమారు గంటన్నర టైమ్. ఈ టైమ్‌లో కొత్త పనులు మొదలు పెట్టకపోవడం మన సంప్రదాయం.", traditional: "పగటిని 8 భాగాలు చేసి, వారాన్ని బట్టి ఒక భాగం రాహువుది అంటారు. అందుకే రోజూ టైమ్ మారుతుంది.", practical: "రొటీన్ పనులు, పాత పనులు ఫినిష్ చేయడం ఓకే. కొత్త డీల్, పెద్ద కొనుగోలు, శుభకార్యం మాత్రం ఈ టైమ్ అయిపోయాక పెట్టుకోండి." },
    hi: { title: "राहुकाल", simple: "हर दिन का करीब डेढ़ घंटे का समय, जिसमें परंपरा के हिसाब से नया काम शुरू नहीं करते।", traditional: "दिन को आठ हिस्सों में बाँटते हैं और वार के हिसाब से एक हिस्सा राहु का माना जाता है। इसीलिए इसका समय रोज़ बदलता है।", practical: "रोज़ के काम और पुराना काम निपटाना ठीक है। नई डील, बड़ी खरीदारी या कोई शुभ काम इसके बाद रखिए।" },
  },
  yamagandam: {
    en: { title: "Yamagandam", simple: "Another daily slot that tradition treats as a go-slow time.", traditional: "Like Rahu Kalam, it is one of the eight daytime parts, assigned by weekday, linked with Yama.", practical: "Avoid starting long trips or new commitments in it if you can; normal work carries on." },
    te: { title: "యమగండం", simple: "రోజూ వచ్చే ఇంకో జాగ్రత్త టైమ్. ఈ టైమ్‌లో కొంచెం నెమ్మదిగా ఉండమంటారు.", traditional: "రాహుకాలం లాగానే పగటిలో 8 భాగాల్లో ఒకటి, వారాన్ని బట్టి యముడికి కేటాయించారు.", practical: "వీలైతే లాంగ్ జర్నీ, కొత్త కమిట్‌మెంట్ ఈ టైమ్‌లో స్టార్ట్ చేయకండి. మామూలు పనులు ఓకే." },
    hi: { title: "यमगंड", simple: "दिन का एक और समय, जिसे परंपरा में धीमे चलने का समय माना जाता है।", traditional: "राहुकाल की तरह यह भी दिन के आठ हिस्सों में से एक है, जो वार के हिसाब से यम से जुड़ा है।", practical: "हो सके तो लंबी यात्रा या नया वादा इसमें शुरू न करें। बाकी काम चलते रहें।" },
  },
  gulika: {
    en: { title: "Gulika Kalam", simple: "A daily slot that tradition says repeats whatever you start in it.", traditional: "Gulika (Mandi) is a sub-period ruled by Saturn's son; things begun now are said to recur.", practical: "Good for things you want more of (saving, a habit), not for anything you'd hate to repeat." },
    te: { title: "గుళిక కాలం", simple: "ఈ టైమ్‌లో మొదలు పెట్టిన పని మళ్లీ మళ్లీ జరుగుతుంది అని నమ్మకం.", traditional: "గుళిక (మాంది) శని కుమారుడికి చెందిన టైమ్ అంటారు. ఇప్పుడు స్టార్ట్ చేసింది రిపీట్ అవుతుంది అని సంప్రదాయం.", practical: "సేవింగ్, మంచి అలవాటు లాంటివి ఓకే. అప్పు తీసుకోవడం లాంటివి మాత్రం వద్దు." },
    hi: { title: "गुलिक काल", simple: "माना जाता है कि इस समय शुरू किया काम दोहराया जाता है।", traditional: "गुलिक (मांदी) शनि के पुत्र का समय माना जाता है; इसमें शुरू हुई बात फिर लौटती है।", practical: "बचत या अच्छी आदत शुरू करने के लिए ठीक, पर उधार लेने जैसा काम मत रखिए।" },
  },
  good_slot: {
    en: { title: "Good time", simple: "The strongest stretch of your day for something that matters.", traditional: "Picked from the day's muhurta divisions, skipping Rahu Kalam, Yamagandam and Gulika.", practical: "Put your one important call, mail or meeting here." },
    te: { title: "మంచి టైమ్", simple: "ఈరోజు ముఖ్యమైన పనికి బెస్ట్ టైమ్ ఇదే.", traditional: "రోజులోని ముహూర్త భాగాల్లోంచి, రాహుకాలం, యమగండం, గుళిక వదిలేసి ఎంచుకున్నది.", practical: "ఆ ముఖ్యమైన కాల్, మెయిల్, మీటింగ్ ఈ టైమ్‌లో పెట్టుకోండి." },
    hi: { title: "अच्छा समय", simple: "आज किसी ज़रूरी काम के लिए सबसे अच्छा समय।", traditional: "दिन के मुहूर्त भागों में से, राहुकाल, यमगंड और गुलिक को छोड़कर चुना गया।", practical: "वो ज़रूरी कॉल, मेल या मीटिंग इसी समय रखिए।" },
  },
  mahadasha: {
    en: { title: "Mahadasha", simple: "Your big life chapter, ruled by one planet for several years.", traditional: "Vimshottari dasha: nine planets take turns over 120 years, starting from your birth star's lord.", practical: "Read it as the season you're in: lean into what it supports, plan around what it presses on." },
    te: { title: "మహాదశ", simple: "కొన్ని సంవత్సరాల పాటు ఒక గ్రహం నడిపించే మీ పెద్ద లైఫ్ చాప్టర్.", traditional: "వింశోత్తరి దశ: 9 గ్రహాలు 120 ఏళ్లలో వరుసగా వస్తాయి. మొదటిది మీ జన్మ నక్షత్రం అధిపతి.", practical: "ఇది మీరు ఉన్న సీజన్ అనుకోండి. అది సపోర్ట్ చేసేవాటిపై ఫోకస్ పెట్టండి, ఒత్తిడి ఉన్న చోట ముందే ప్లాన్ చేసుకోండి." },
    hi: { title: "महादशा", simple: "आपकी ज़िंदगी का बड़ा दौर, जिसे कई साल तक एक ग्रह चलाता है।", traditional: "विंशोत्तरी दशा: नौ ग्रह 120 साल में बारी-बारी आते हैं, शुरुआत जन्म नक्षत्र के स्वामी से।", practical: "इसे अपना मौसम समझिए: जिसमें साथ मिल रहा है उस पर ज़ोर दीजिए, जहाँ दबाव है वहाँ पहले से तैयारी रखिए।" },
  },
  antardasha: {
    en: { title: "Antardasha", simple: "The sub-chapter inside your big chapter, usually months to a couple of years.", traditional: "Each Mahadasha splits into nine sub-periods in the same planet order.", practical: "This is what colours the current months; it is why the same chapter feels different over time." },
    te: { title: "అంతర్దశ", simple: "పెద్ద చాప్టర్ లోపల వచ్చే చిన్న చాప్టర్. కొన్ని నెలల నుంచి రెండు మూడేళ్లు ఉంటుంది.", traditional: "ప్రతి మహాదశ అదే గ్రహాల వరుసలో 9 చిన్న దశలుగా విడిపోతుంది.", practical: "ఇప్పటి నెలలు ఎలా అనిపిస్తాయో చెప్పేది ఇదే. అందుకే ఒకే చాప్టర్ టైమ్‌తో మారుతూ అనిపిస్తుంది." },
    hi: { title: "अंतर्दशा", simple: "बड़े दौर के अंदर का छोटा दौर, आमतौर पर कुछ महीने से दो-तीन साल।", traditional: "हर महादशा उसी ग्रह क्रम में नौ छोटे हिस्सों में बँटती है।", practical: "आज के महीनों का रंग यही तय करती है, इसलिए एक ही दौर समय के साथ अलग लगता है।" },
  },
  tara_bala: {
    en: { title: "Tara Bala", simple: "How today's star treats your birth star: supportive, mixed or careful.", traditional: "Count from your birth star to today's star; the count falls into one of nine groups (Janma, Sampat, Vipat and so on).", practical: "On a supportive day, start or ask. On a careful day, finish and prepare instead." },
    te: { title: "తారాబలం", simple: "ఈరోజు నక్షత్రం మీ జన్మ నక్షత్రంతో ఎలా కలుస్తుందో చెప్పేది.", traditional: "మీ జన్మ నక్షత్రం నుంచి ఈరోజు నక్షత్రం వరకు లెక్కపెడితే 9 తారల్లో ఒకటి వస్తుంది (జన్మ, సంపత్, విపత్ మొదలైనవి).", practical: "సపోర్ట్ ఉన్న రోజు స్టార్ట్ చేయండి, అడగండి. జాగ్రత్త రోజు పాత పని ఫినిష్ చేసి ప్రిపేర్ అవ్వండి." },
    hi: { title: "तारा बल", simple: "आज का नक्षत्र आपके जन्म नक्षत्र के साथ कैसा बैठता है: साथ देने वाला, मिला-जुला या सावधानी वाला।", traditional: "जन्म नक्षत्र से आज के नक्षत्र तक गिनती नौ समूहों में से एक में आती है (जन्म, संपत, विपत वगैरह)।", practical: "अच्छे दिन शुरुआत कीजिए या बात आगे बढ़ाइए; सावधानी वाले दिन पुराना काम पूरा कीजिए।" },
  },
  nakshatra: {
    en: { title: "Nakshatra (birth star)", simple: "The star the Moon was in when you were born: your default style.", traditional: "The sky is split into 27 nakshatras of 13°20′ each; your birth star also decides where your dasha sequence starts.", practical: "It explains your natural pace and what recharges you; use it to pick how you do things, not whether." },
    te: { title: "నక్షత్రం (జన్మ నక్షత్రం)", simple: "మీరు పుట్టినప్పుడు చంద్రుడు ఉన్న నక్షత్రం. మీ నేచురల్ స్టైల్ ఇదే.", traditional: "ఆకాశాన్ని 27 నక్షత్రాలుగా విభజించారు. మీ దశల వరుస కూడా జన్మ నక్షత్రం నుంచే మొదలవుతుంది.", practical: "మీ స్పీడ్, మీకు ఎనర్జీ ఇచ్చేవి ఇది చెబుతుంది. పని ఎలా చేయాలో ఎంచుకోవడానికి వాడండి." },
    hi: { title: "नक्षत्र (जन्म नक्षत्र)", simple: "आपके जन्म के समय चंद्रमा जिस नक्षत्र में था, वही आपका स्वभाव दिखाता है।", traditional: "आसमान 27 नक्षत्रों में बँटा है; दशा का क्रम भी जन्म नक्षत्र से शुरू होता है।", practical: "यह बताता है कि आपकी रफ़्तार क्या है और क्या आपको ताज़ा करता है; काम कैसे करें, यह चुनने में मदद लीजिए।" },
  },
  tithi: {
    en: { title: "Tithi", simple: "The moon-day of the lunar month, like Ekadashi or Amavasya.", traditional: "A tithi is each 12° the Moon moves ahead of the Sun; 30 tithis make a lunar month.", practical: "Festival and fasting days follow it; some tithis suit fresh starts, others rest and review." },
    te: { title: "తిథి", simple: "చంద్ర మాసంలోని రోజు. ఏకాదశి, అమావాస్య లాంటివి.", traditional: "సూర్యుడి కంటే చంద్రుడు 12° ముందుకు వెళ్లిన ప్రతిసారి ఒక తిథి. 30 తిథులు ఒక చంద్ర మాసం.", practical: "పండుగలు, ఉపవాసాలు దీని బట్టే వస్తాయి. కొన్ని తిథులు కొత్త స్టార్ట్‌కి, కొన్ని రెస్ట్‌కి బాగుంటాయి." },
    hi: { title: "तिथि", simple: "चंद्र महीने का दिन, जैसे एकादशी या अमावस्या।", traditional: "चंद्रमा सूर्य से हर 12° आगे बढ़ने पर एक तिथि बनती है; 30 तिथियों का एक चंद्र मास।", practical: "त्योहार और व्रत इसी से तय होते हैं; कुछ तिथियाँ नई शुरुआत के लिए, कुछ आराम के लिए अच्छी मानी जाती हैं।" },
  },
  moon_sign: {
    en: { title: "Moon sign (Janma Rashi)", simple: "Your emotional default: how you react and recharge.", traditional: "The zodiac sign the Moon occupied at birth; Indian astrology leans on it more than the Sun sign.", practical: "Notice what calms you on hard days and schedule a little of it." },
    te: { title: "చంద్ర రాశి (జన్మ రాశి)", simple: "మీ మనసు ఎలా రియాక్ట్ అవుతుంది, ఎలా రీఛార్జ్ అవుతుంది అని చెప్పేది.", traditional: "పుట్టినప్పుడు చంద్రుడు ఉన్న రాశి. మన జ్యోతిషంలో సూర్య రాశి కంటే దీనికే ఎక్కువ వెయిట్.", practical: "కష్టమైన రోజుల్లో మిమ్మల్ని ఏది కూల్ చేస్తుందో గమనించి, దానికి కొంచెం టైమ్ పెట్టుకోండి." },
    hi: { title: "चंद्र राशि (जन्म राशि)", simple: "आपका मन कैसे प्रतिक्रिया करता है और कैसे फिर से ताज़ा होता है।", traditional: "जन्म के समय चंद्रमा जिस राशि में था; भारतीय ज्योतिष में इसे सूर्य राशि से ज़्यादा अहमियत दी जाती है।", practical: "मुश्किल दिनों में क्या आपको शांत करता है, उसे पहचानिए और उसके लिए थोड़ा समय रखिए।" },
  },
  chandrashtama: {
    en: { title: "Chandrashtama", simple: "About two days a month when the Moon is 8th from your Moon sign: low-key days.", traditional: "The transiting Moon in the 8th sign from your natal Moon is treated as a sensitive time.", practical: "Keep plans light, avoid arguments and big signatures; it passes in about 2.25 days." },
    te: { title: "చంద్రాష్టమం", simple: "నెలకి దాదాపు రెండు రోజులు, మీ రాశి నుంచి చంద్రుడు 8వ రాశిలో ఉంటాడు. సింపుల్‌గా ఉండాల్సిన రోజులు.", traditional: "జన్మ చంద్రుడి నుంచి 8వ రాశిలో గోచార చంద్రుడు ఉన్నప్పుడు సెన్సిటివ్ టైమ్ అంటారు.", practical: "ప్లాన్స్ లైట్‌గా ఉంచండి, గొడవలు, పెద్ద సంతకాలు వద్దు. రెండు రోజుల్లో అయిపోతుంది." },
    hi: { title: "चंद्राष्टम", simple: "महीने में करीब दो दिन, जब चंद्रमा आपकी राशि से आठवें घर में होता है: हल्के रखने वाले दिन।", traditional: "जन्म चंद्र से आठवीं राशि में गोचर का चंद्रमा संवेदनशील समय माना जाता है।", practical: "प्लान हल्के रखिए, बहस और बड़े दस्तखत टालिए; यह करीब सवा दो दिन में निकल जाता है।" },
  },
  koota: {
    en: { title: "Koota score (Ashtakoota)", simple: "Eight traditional compatibility checks, scored out of 36.", traditional: "Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot and Nadi, each worth 1 to 8 points, from both birth stars.", practical: "It shows where you naturally click and where you'll need to talk things through. It does not decide how the relationship turns out." },
    te: { title: "గుణ మేళనం (అష్టకూట)", simple: "8 సంప్రదాయ కాంపాటిబిలిటీ చెక్స్, 36 పాయింట్లకి.", traditional: "వర్ణ, వశ్య, తార, యోని, గ్రహ మైత్రి, గణ, భకూట, నాడి. ఇద్దరి జన్మ నక్షత్రాల నుంచి లెక్కిస్తారు.", practical: "మీరు ఎక్కడ ఈజీగా కలుస్తారో, ఎక్కడ మాట్లాడుకోవాలో చూపిస్తుంది. రిలేషన్ ఎలా ఉంటుందో ఇది డిసైడ్ చేయదు." },
    hi: { title: "गुण मिलान (अष्टकूट)", simple: "आठ पारंपरिक मिलान जाँचें, 36 अंकों में।", traditional: "वर्ण, वश्य, तारा, योनि, ग्रह मैत्री, गण, भकूट और नाड़ी, दोनों के जन्म नक्षत्र से।", practical: "यह दिखाता है कि आप कहाँ आसानी से जुड़ते हैं और कहाँ बात करनी होगी। रिश्ता कैसा रहेगा, यह यह तय नहीं करता।" },
  },
  varna: {
    en: { title: "Varna (1 point)", simple: "How your approaches to work and duty line up.", traditional: "Each Moon sign maps to one of four temperaments; the check compares them.", practical: "If low, agree early on who leads which decisions." },
    te: { title: "వర్ణ (1 పాయింట్)", simple: "పని, బాధ్యతల విషయంలో మీ ఇద్దరి అప్రోచ్ ఎలా కలుస్తుందో.", traditional: "ప్రతి చంద్ర రాశికి నాలుగు స్వభావాల్లో ఒకటి. ఆ రెండింటిని పోలుస్తారు.", practical: "తక్కువ వస్తే, ఏ నిర్ణయాలు ఎవరు తీసుకుంటారో ముందే మాట్లాడుకోండి." },
    hi: { title: "वर्ण (1 अंक)", simple: "काम और ज़िम्मेदारी को लेकर आप दोनों का तरीका कितना मिलता है।", traditional: "हर चंद्र राशि चार स्वभावों में से एक से जुड़ी है; इन्हें मिलाया जाता है।", practical: "कम हो तो पहले से तय कर लीजिए कि कौन-से फ़ैसले कौन लेगा।" },
  },
  vashya: {
    en: { title: "Vashya (2 points)", simple: "Who naturally influences whom, and how easily you adjust.", traditional: "Moon signs fall into five groups (human, quadruped, water, wild, insect) that relate in set ways.", practical: "If low, take turns giving way on small things." },
    te: { title: "వశ్య (2 పాయింట్లు)", simple: "ఒకరిపై ఒకరి ఇన్‌ఫ్లుయెన్స్, ఎంత ఈజీగా అడ్జస్ట్ అవుతారో.", traditional: "చంద్ర రాశుల్ని ఐదు గ్రూపులుగా చూస్తారు. వాటి మధ్య కలయికని బట్టి పాయింట్లు.", practical: "తక్కువ వస్తే, చిన్న విషయాల్లో వంతుల వారీగా తగ్గండి." },
    hi: { title: "वश्य (2 अंक)", simple: "कौन किस पर असर डालता है और आप कितनी आसानी से एडजस्ट करते हैं।", traditional: "चंद्र राशियाँ पाँच समूहों में आती हैं, जिनका आपसी रिश्ता तय है।", practical: "कम हो तो छोटी बातों पर बारी-बारी झुकिए।" },
  },
  koota_tara: {
    en: { title: "Tara (3 points)", simple: "How your two birth stars support each other day to day.", traditional: "Counted from one birth star to the other and back, in groups of nine.", practical: "If low, plan important things on days good for both of you." },
    te: { title: "తార (3 పాయింట్లు)", simple: "మీ ఇద్దరి జన్మ నక్షత్రాలు రోజూ ఒకరికొకరు ఎంత సపోర్ట్ చేస్తాయో.", traditional: "ఒకరి నక్షత్రం నుంచి ఇంకొకరి నక్షత్రం వరకు 9 చొప్పున లెక్కిస్తారు.", practical: "తక్కువ వస్తే, ముఖ్యమైన పనులు ఇద్దరికీ మంచి రోజుల్లో పెట్టుకోండి." },
    hi: { title: "तारा (3 अंक)", simple: "आप दोनों के जन्म नक्षत्र रोज़मर्रा में एक-दूसरे का कितना साथ देते हैं।", traditional: "एक के जन्म नक्षत्र से दूसरे तक, नौ-नौ के समूह में गिनती होती है।", practical: "कम हो तो ज़रूरी काम ऐसे दिन रखिए जो दोनों के लिए अच्छे हों।" },
  },
  yoni: {
    en: { title: "Yoni (4 points)", simple: "Physical and instinctive comfort with each other.", traditional: "Each birth star has an animal symbol; friendly or opposing animals set the score.", practical: "If low, make room for each other's pace and space." },
    te: { title: "యోని (4 పాయింట్లు)", simple: "ఇద్దరి మధ్య సహజమైన కంఫర్ట్, ఇన్‌స్టింక్ట్.", traditional: "ప్రతి నక్షత్రానికి ఒక జంతువు గుర్తు. ఫ్రెండ్లీ జంతువులా, వ్యతిరేకమా అన్నదాన్ని బట్టి పాయింట్లు.", practical: "తక్కువ వస్తే, ఒకరి స్పీడ్‌కి, స్పేస్‌కి ఇంకొకరు చోటు ఇవ్వండి." },
    hi: { title: "योनि (4 अंक)", simple: "एक-दूसरे के साथ स्वाभाविक सहजता।", traditional: "हर नक्षत्र का एक पशु प्रतीक है; दोस्ताना या विरोधी पशु से अंक तय होते हैं।", practical: "कम हो तो एक-दूसरे की रफ़्तार और स्पेस का ध्यान रखिए।" },
  },
  graha_maitri: {
    en: { title: "Graha Maitri (5 points)", simple: "How well your minds and outlooks get along.", traditional: "Compares the friendship between the lords of your two Moon signs.", practical: "If low, talk through big views (money, family) early and kindly." },
    te: { title: "గ్రహ మైత్రి (5 పాయింట్లు)", simple: "మీ ఇద్దరి ఆలోచనలు, చూసే విధానం ఎంత కలుస్తాయో.", traditional: "ఇద్దరి చంద్ర రాశుల అధిపతుల మధ్య స్నేహాన్ని పోలుస్తారు.", practical: "తక్కువ వస్తే, డబ్బు, ఫ్యామిలీ లాంటి పెద్ద విషయాలు ముందే ప్రేమగా మాట్లాడుకోండి." },
    hi: { title: "ग्रह मैत्री (5 अंक)", simple: "आप दोनों की सोच और नज़रिया कितना मेल खाता है।", traditional: "दोनों की चंद्र राशि के स्वामियों की दोस्ती देखी जाती है।", practical: "कम हो तो पैसे और परिवार जैसी बड़ी बातें जल्दी और प्यार से कर लीजिए।" },
  },
  gana: {
    en: { title: "Gana (6 points)", simple: "Your basic temperaments: gentle, human or fiery.", traditional: "Each birth star is Deva, Manushya or Rakshasa gana; matching or mixed groups set the score.", practical: "If low, agree on how you handle anger and cool-off time." },
    te: { title: "గణ (6 పాయింట్లు)", simple: "మీ ఇద్దరి ప్రాథమిక స్వభావం: సాఫ్ట్, మామూలు, లేదా ఫైరీ.", traditional: "ప్రతి నక్షత్రం దేవ, మనుష్య, రాక్షస గణాల్లో ఒకటి. ఒకటేనా, వేరా అన్నదాన్ని బట్టి పాయింట్లు.", practical: "తక్కువ వస్తే, కోపం వచ్చినప్పుడు ఎలా కూల్ అవ్వాలో ముందే అనుకోండి." },
    hi: { title: "गण (6 अंक)", simple: "आप दोनों का मूल स्वभाव: सौम्य, सामान्य या तेज़।", traditional: "हर नक्षत्र देव, मनुष्य या राक्षस गण का होता है; मेल या फ़र्क से अंक तय होते हैं।", practical: "कम हो तो पहले तय कर लीजिए कि गुस्से में कैसे संभालेंगे और कितना ठंडा होने का समय देंगे।" },
  },
  bhakoot: {
    en: { title: "Bhakoot (7 points)", simple: "How your Moon signs sit relative to each other: family and money harmony.", traditional: "Some sign distances (like 6–8 or 2–12) score zero in tradition; others score full.", practical: "If low, set shared money and family plans clearly." },
    te: { title: "భకూట (7 పాయింట్లు)", simple: "మీ చంద్ర రాశులు ఒకదానికొకటి ఎలా ఉన్నాయో: ఫ్యామిలీ, డబ్బు విషయంలో హార్మనీ.", traditional: "రాశుల మధ్య కొన్ని దూరాలకి (6–8, 2–12 లాంటివి) సంప్రదాయంలో సున్నా పాయింట్లు.", practical: "తక్కువ వస్తే, డబ్బు, ఫ్యామిలీ ప్లాన్స్ క్లియర్‌గా మాట్లాడుకోండి." },
    hi: { title: "भकूट (7 अंक)", simple: "आपकी चंद्र राशियाँ एक-दूसरे से कैसे बैठी हैं: परिवार और पैसे का तालमेल।", traditional: "कुछ राशि दूरियों (जैसे 6–8 या 2–12) को परंपरा में शून्य अंक मिलते हैं।", practical: "कम हो तो साझा पैसे और परिवार के प्लान साफ़-साफ़ तय कीजिए।" },
  },
  nadi: {
    en: { title: "Nadi (8 points)", simple: "The heaviest check, traditionally about health and family lineage.", traditional: "Birth stars fall into three nadis; the same nadi traditionally scores zero, with known exceptions.", practical: "Treat it as a prompt for an honest health conversation, not a verdict." },
    te: { title: "నాడి (8 పాయింట్లు)", simple: "అన్నిటికంటే ఎక్కువ వెయిట్ ఉన్న చెక్. హెల్త్, వంశానికి సంబంధించింది అంటారు.", traditional: "నక్షత్రాలు 3 నాడుల్లోకి వస్తాయి. ఒకే నాడి అయితే సంప్రదాయంలో సున్నా, కొన్ని మినహాయింపులు ఉన్నాయి.", practical: "దీన్ని తీర్పు లాగా కాకుండా, హెల్త్ గురించి ఓపెన్‌గా మాట్లాడుకోవడానికి ఒక సూచనగా తీసుకోండి." },
    hi: { title: "नाड़ी (8 अंक)", simple: "सबसे भारी जाँच, परंपरा में सेहत और वंश से जुड़ी।", traditional: "नक्षत्र तीन नाड़ियों में आते हैं; एक ही नाड़ी को परंपरा में शून्य अंक, कुछ अपवादों के साथ।", practical: "इसे फ़ैसला नहीं, सेहत पर खुलकर बात करने का इशारा मानिए।" },
  },
  life_chapter: {
    en: { title: "Life chapter", simple: "The stretch of life you're in now, named in plain words.", traditional: "Each chapter is one Mahadasha–Antardasha pair from your Vimshottari dasha; its dates come from your birth star.", practical: "Use it to choose what to push now and what to prepare for the next chapter." },
    te: { title: "లైఫ్ చాప్టర్", simple: "మీరు ఇప్పుడు ఉన్న జీవిత దశ, సింపుల్ పేరుతో.", traditional: "ప్రతి చాప్టర్ ఒక మహాదశ–అంతర్దశ జంట. తేదీలు మీ జన్మ నక్షత్రం నుంచి లెక్కిస్తారు.", practical: "ఇప్పుడు దేనిపై ఫోకస్ పెట్టాలో, నెక్స్ట్ చాప్టర్‌కి ఏం ప్రిపేర్ అవ్వాలో డిసైడ్ చేసుకోవడానికి వాడండి." },
    hi: { title: "लाइफ़ चैप्टर", simple: "ज़िंदगी का वो दौर जिसमें आप अभी हैं, आसान शब्दों में।", traditional: "हर चैप्टर विंशोत्तरी दशा की एक महादशा–अंतर्दशा जोड़ी है; तारीखें जन्म नक्षत्र से आती हैं।", practical: "इससे तय कीजिए कि अभी किस पर ज़ोर दें और अगले चैप्टर के लिए क्या तैयारी करें।" },
  },
  day_card: {
    en: { title: "Today's card", simple: "One line on what today is good for, from today's star and moon-day.", traditional: "Built from the day's panchang (tithi, nakshatra) and its Tara Bala from your birth star.", practical: "Do the one thing it suggests in your good time; keep Rahu Kalam for routine." },
    te: { title: "ఈరోజు కార్డ్", simple: "ఈరోజు నక్షత్రం, తిథి బట్టి ఈరోజు దేనికి బాగుంటుందో ఒక లైన్‌లో.", traditional: "ఈరోజు పంచాంగం (తిథి, నక్షత్రం), మీ జన్మ నక్షత్రం నుంచి తారాబలం కలిపి తయారు చేసింది.", practical: "అది చెప్పిన ఒక్క పని మంచి టైమ్‌లో చేయండి. రాహుకాలంలో రొటీన్ పనులు మాత్రమే." },
    hi: { title: "आज का कार्ड", simple: "आज का नक्षत्र और तिथि देखकर, आज किस काम के लिए अच्छा है, एक लाइन में।", traditional: "आज के पंचांग (तिथि, नक्षत्र) और आपके जन्म नक्षत्र से तारा बल को मिलाकर बना है।", practical: "जो एक काम सुझाया है, उसे अच्छे समय में कीजिए; राहुकाल में बस रोज़ के काम।" },
  },
};

export function glossEntry(term: string, locale: string): GlossEntry | null {
  const row = (GLOSSARY as Record<string, Row>)[term];
  if (!row) return null;
  return row[(locale === "te" || locale === "hi") ? locale : "en"];
}

export function isGlossTerm(term: string): term is GlossTerm {
  return (GLOSS_TERMS as string[]).includes(term);
}
