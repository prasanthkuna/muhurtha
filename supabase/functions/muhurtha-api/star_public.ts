/**
 * Public birth-star teaser (Welcome screen, shared-link landing). No sign-in, nothing stored,
 * zero LLM: Moon nakshatra + pada + rashi from the date (and rough time), the current Vimshottari
 * mahadasha, and one hand-written line per nakshatra in the house voice.
 */
import { DateTime } from "luxon";
import { moonSiderealLongitudeDeg, nakshatraMetaFromSiderealLon } from "./ephemeris.ts";
import { segmentAt, vimshottariMahadashas } from "./vimshottari.ts";
import { rashiDisplay, rashiKeyFromSiderealLon } from "./vedic_labels.ts";
import { quickDayFacts } from "./panchanga.ts";

type Loc = "en" | "te" | "hi";

/** Representative clock time for each rough birth-time window. */
const BUCKET_TIME: Record<string, string> = {
  early_morning: "05:00", morning: "08:30", afternoon: "13:30", evening: "18:00", night: "21:30", late_night: "01:30",
};

const NAK: Record<Loc, string[]> = {
  en: ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"],
  te: ["అశ్విని", "భరణి", "కృత్తిక", "రోహిణి", "మృగశిర", "ఆర్ద్ర", "పునర్వసు", "పుష్యమి", "ఆశ్లేష", "మఖ", "పుబ్బ", "ఉత్తర", "హస్త", "చిత్త", "స్వాతి", "విశాఖ", "అనూరాధ", "జ్యేష్ఠ", "మూల", "పూర్వాషాఢ", "ఉత్తరాషాఢ", "శ్రవణం", "ధనిష్ఠ", "శతభిషం", "పూర్వాభాద్ర", "ఉత్తరాభాద్ర", "రేవతి"],
  hi: ["अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा", "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्व फाल्गुनी", "उत्तर फाल्गुनी", "हस्त", "चित्रा", "स्वाति", "विशाखा", "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा", "पूर्व भाद्रपद", "उत्तर भाद्रपद", "रेवती"],
};

const LORD: Record<Loc, Record<string, string>> = {
  en: { Sun: "Sun", Moon: "Moon", Mars: "Mars", Mercury: "Mercury", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn", Rahu: "Rahu", Ketu: "Ketu" },
  te: { Sun: "సూర్య", Moon: "చంద్ర", Mars: "కుజ", Mercury: "బుధ", Jupiter: "గురు", Venus: "శుక్ర", Saturn: "శని", Rahu: "రాహు", Ketu: "కేతు" },
  hi: { Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु" },
};

/** One line per nakshatra (index 0 = Ashwini). Polished English, casual Telugu-Twitter Telugu, simple mixed Hindi. */
export const STAR_LINES: Record<Loc, string[]> = {
  en: [
    "Quick to start, quicker to help. You fix things while others are still talking about them.",
    "You carry more than you show, and you finish what you take on.",
    "Sharp, honest and a little fiery. You cut through noise to what's real.",
    "Warm, steady and easy to love. You make places feel like home.",
    "Curious by nature. You learn by looking, asking and trying.",
    "You feel deeply and think hard. Storms clear the way for your best work.",
    "You bounce back. Whatever falls apart, you build it again, better.",
    "The caretaker of the room. People grow around your calm.",
    "Perceptive and private. You read people faster than they read you.",
    "Dignified and loyal to your roots. You lead without asking to.",
    "You bring the joy. Rest, play and good company recharge you.",
    "Reliable and generous. Your word is something people can bank on.",
    "Skilled hands, practical mind. You make good ideas actually work.",
    "An eye for beauty and detail. You make things look and feel right.",
    "Independent and adaptable. You need room to move, and you use it well.",
    "Goal-driven and patient. When you aim at something, you get there.",
    "Loyal to your people. Friendship and devotion are your quiet strength.",
    "Protective and capable. You step up when things get serious.",
    "You go to the root of things. Endings for you become fresh starts.",
    "Confident and persuasive. Your enthusiasm moves people.",
    "Principled and steady. Your wins are slow, earned and lasting.",
    "A great listener. You learn from everything and remember what matters.",
    "Rhythmic and generous. You shine in groups and share what you earn.",
    "A healer and an independent thinker. You solve what others can't.",
    "Intense and idealistic. You care about the big picture and stand for it.",
    "Calm, wise and deep. You hold steady when others can't.",
    "Gentle and protective. You guide people safely to where they're going.",
  ],
  te: [
    "Start చేయడంలో fast, help చేయడంలో ఇంకా fast. అందరూ మాట్లాడేలోపే మీరు పని ముగించేస్తారు.",
    "బయటకి చూపించరు కానీ బరువంతా మోస్తారు. పట్టుకున్న పని పూర్తి చేసే వరకు వదలరు.",
    "Sharp, honest, కొంచెం fire కూడా. ఏది నిజమో direct గా పట్టేస్తారు.",
    "మీ దగ్గర ఉంటే ఇంట్లో ఉన్నట్టే. Warm, steady — అందరికీ నచ్చే టైప్.",
    "Curiosity మీ blood లోనే ఉంది. అడిగి, చూసి, ట్రై చేసి నేర్చుకుంటారు.",
    "లోతుగా feel అవుతారు, గట్టిగా ఆలోచిస్తారు. తుఫాను తర్వాతే మీ best వస్తుంది.",
    "పడినా లేస్తారు. ఏది విరిగినా ఇంకా better గా మళ్లీ కడతారు.",
    "Room మొత్తానికి care taker మీరే. మీ ప్రశాంతతలో అందరూ ఎదుగుతారు.",
    "మనుషుల్ని ఇట్టే చదివేస్తారు, మీ గురించి మాత్రం ఎవరికీ ఈజీగా అర్థం కాదు.",
    "మూలాలకి loyal, నడవడికలో హుందా. అడక్కుండానే లీడ్ చేస్తారు.",
    "మీరు ఉంటే vibe వేరే. Rest, fun, మంచి company తో recharge అవుతారు.",
    "మాట ఇస్తే నిలబెట్టుకుంటారు. Reliable, generous — పక్కా.",
    "చేతిలో skill, బుర్రలో practical sense. Idea ని నిజంగా పని చేయిస్తారు.",
    "Beauty, details మీద కన్ను. ఏదైనా చూడ్డానికి, feel కి సెట్ చేసేస్తారు.",
    "Independent, ఎక్కడైనా adjust అవుతారు. మీకు space కావాలి — దాన్ని బాగా వాడతారు.",
    "Target పెట్టుకుంటే చేరే వరకు ఆగరు. ఓపిక, focus రెండూ ఉన్నాయి.",
    "మీ వాళ్లకోసం ఏదైనా. Friendship, devotion — అదే మీ silent strength.",
    "Protective, capable. Serious టైమ్ వస్తే ముందు నిలబడేది మీరే.",
    "ప్రతిదానికీ root వరకు వెళ్తారు. మీకు ముగింపు అంటే fresh start.",
    "Confident, convincing. మీ జోష్ చూస్తే జనం కదిలిపోతారు.",
    "Principles మీద నిలబడతారు. మీ విజయాలు slow గా వస్తాయి, కానీ పర్మనెంట్.",
    "Superb listener. అన్నిటి నుంచీ నేర్చుకుంటారు, ముఖ్యమైనది మర్చిపోరు.",
    "Groups లో shine అవుతారు. సంపాదించింది పంచుకునే పెద్ద మనసు.",
    "Healer, independent thinker. వేరేవాళ్లకి సాధ్యం కానిది మీరు solve చేస్తారు.",
    "Intense, idealistic. Big picture కోసం నిలబడతారు, వెనక్కి తగ్గరు.",
    "ప్రశాంతంగా, లోతుగా, తెలివిగా. అందరూ కంగారు పడినప్పుడు మీరు steady.",
    "సాఫ్ట్ గా ఉంటారు కానీ protective. అందరినీ సేఫ్ గా గమ్యానికి చేరుస్తారు.",
  ],
  hi: [
    "शुरुआत में तेज़, मदद में और भी तेज़। लोग बात करते रह जाते हैं, आप काम कर देते हैं।",
    "जितना दिखाते हैं उससे ज़्यादा उठाते हैं, और जो पकड़ते हैं वो पूरा करते हैं।",
    "Sharp, honest और थोड़े fiery। शोर में से सच तुरंत पकड़ लेते हैं।",
    "Warm और steady। आपके साथ हर जगह घर जैसी लगती है।",
    "Curiosity आपके स्वभाव में है। देखकर, पूछकर, आज़माकर सीखते हैं।",
    "गहराई से महसूस करते हैं, गहराई से सोचते हैं। तूफ़ान के बाद आपका best आता है।",
    "आप फिर खड़े होते हैं। जो टूटे, उसे और बेहतर बनाते हैं।",
    "आप सबका ख़्याल रखते हैं। आपकी शांति में लोग बढ़ते हैं।",
    "लोगों को जल्दी पढ़ लेते हैं, पर आपको पढ़ना आसान नहीं।",
    "अपनी जड़ों से जुड़े और गरिमा वाले। बिना कहे lead करते हैं।",
    "आप मज़ा लाते हैं। आराम, खेल और अच्छी company से recharge होते हैं।",
    "भरोसेमंद और दिलदार। आपकी बात पर लोग पक्का भरोसा करते हैं।",
    "हाथ में हुनर, दिमाग़ में practical सोच। idea को सच में चला देते हैं।",
    "Beauty और detail पर नज़र। हर चीज़ को सही दिखा और महसूस करा देते हैं।",
    "Independent और flexible। आपको space चाहिए, और आप उसे बढ़िया इस्तेमाल करते हैं।",
    "Goal वाले और धैर्यवान। जो ठान लेते हैं, वहाँ पहुँचते हैं।",
    "अपनों के प्रति loyal। दोस्ती और समर्पण आपकी शांत ताक़त है।",
    "Protective और काबिल। बात गंभीर हो तो आप आगे आते हैं।",
    "हर चीज़ की जड़ तक जाते हैं। आपके लिए अंत भी नई शुरुआत है।",
    "Confident और असरदार। आपका जोश लोगों को साथ ले आता है।",
    "उसूलों वाले और steady। आपकी जीत धीरे आती है, पर टिकती है।",
    "बढ़िया listener। हर चीज़ से सीखते हैं और ज़रूरी बात याद रखते हैं।",
    "Group में चमकते हैं और जो कमाते हैं, बाँटते हैं।",
    "Healer और independent thinker। जो दूसरों से न सुलझे, आप सुलझाते हैं।",
    "Intense और idealistic। बड़ी तस्वीर के लिए खड़े रहते हैं।",
    "शांत, समझदार और गहरे। जब सब घबराएँ, आप steady रहते हैं।",
    "नर्म पर protective। लोगों को सुरक्षित मंज़िल तक पहुँचाते हैं।",
  ],
};

export class StarInputError extends Error {
  code = "invalid_input";
}

export function starTeaser(body: Record<string, unknown>) {
  const loc: Loc = body.locale === "te" || body.locale === "hi" ? body.locale : "en";
  const date = String(body.date_of_birth ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new StarInputError("Need a date of birth");
  const zone = typeof body.timezone === "string" && body.timezone ? body.timezone : "Asia/Kolkata";
  const exact = typeof body.time === "string" && /^\d{1,2}:\d{2}$/.test(body.time) ? body.time.padStart(5, "0") : null;
  const bucket = typeof body.time_bucket === "string" ? BUCKET_TIME[body.time_bucket] : undefined;
  const clock = exact ?? bucket ?? "12:00";
  const dt = DateTime.fromISO(`${date}T${clock}:00`, { zone });
  if (!dt.isValid) throw new StarInputError("Invalid date");
  const now = DateTime.now();
  if (dt > now || dt.year < 1900) throw new StarInputError("Date out of range");
  const birth = dt.toUTC().toJSDate();
  const lon = moonSiderealLongitudeDeg(birth);
  const meta = nakshatraMetaFromSiderealLon(lon);
  const rashiKey = rashiKeyFromSiderealLon(lon);
  const mds = vimshottariMahadashas(birth, meta.idx, meta.pada, meta.withinFraction);
  const current = segmentAt(mds, new Date());
  return {
    nakshatra: NAK.en[meta.idx],
    nakshatra_label: NAK[loc][meta.idx],
    nak_index: meta.idx,
    pada: exact ? meta.pada : null,
    rashi_key: rashiKey,
    rashi_label: rashiDisplay(rashiKey, loc).label,
    dasha_lord: current?.lord ?? null,
    dasha_label: current ? LORD[loc][current.lord] ?? current.lord : null,
    dasha_end_year: current ? current.end.getUTCFullYear() : null,
    approximate: !exact,
    line: STAR_LINES[loc][meta.idx],
  };
}

/** Today's real panchang for one reference city (Welcome sample card). Zero LLM, nothing stored. */
export function panchangToday(body: Record<string, unknown>) {
  const zone = "Asia/Kolkata";
  const date = DateTime.now().setZone(zone).toISODate()!;
  const f = quickDayFacts({ date, zone, latitude: 17.385, longitude: 78.4867 });
  if (!f) throw new StarInputError("No panchang");
  const loc: Loc = body.locale === "te" || body.locale === "hi" ? body.locale : "en";
  const now = DateTime.now().setZone(zone).toFormat("HH:mm");
  const nextGood = f.good.find((g) => g.end > now) ?? f.good[0] ?? null;
  return {
    date,
    city: "Hyderabad",
    weekday: f.weekday,
    tithi: f.tithi,
    paksha: f.paksha,
    tithi_index: f.tithiIndex,
    nakshatra: NAK.en[f.nakIndex],
    nakshatra_label: NAK[loc][f.nakIndex],
    nak_index: f.nakIndex,
    good: nextGood,
    rahu: f.rahu,
  };
}
