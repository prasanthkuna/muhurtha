import type { AppLocale } from "@/lib/locale";

export type ExplainerEntry = {
  title: string;
  level0: string;
  level1: string;
  notAssessed?: string;
};

const GRAHA: Record<string, Record<AppLocale, ExplainerEntry>> = {
  Sun: {
    en: {
      title: "Sun (Surya)",
      level0: "Clarity, energy and showing up with purpose.",
      level1:
        "In Jyotish, the Sun (Surya) stands for who you are and where you're headed. It's context for your chart, not a promise, and we read it alongside the real calendar math.",
    },
    te: {
      title: "సూర్యుడు (Sun)",
      level0: "క్లారిటీ, ఎనర్జీ, ఒక గోల్‌తో ముందుకెళ్లడం — సూర్యుడు చెప్పేది ఇదే.",
      level1:
        "జ్యోతిషంలో సూర్యుడు అంటే మీ ఐడెంటిటీ, మీ దారి. ఇది గ్యారంటీ కాదు — లెక్కేసిన తేదీలతో కలిపి చూస్తే అర్థం అవుతుంది.",
    },
    hi: {
      title: "सूर्य (Surya)",
      level0: "साफ़ सोच, एनर्जी और एक मकसद के साथ आगे बढ़ना — सूर्य यही बताता है।",
      level1:
        "ज्योतिष में सूर्य आपकी पहचान और आपकी दिशा दिखाता है। यह कोई गारंटी नहीं है — गिनी हुई तारीखों के साथ मिलाकर देखें, तभी बात समझ आती है।",
    },
  },
  Moon: {
    en: {
      title: "Moon (Chandra)",
      level0: "Your Moon sign shows your emotional rhythm and how you handle change.",
      level1:
        "Your Moon sign (Janma Rashi) is where the Moon was when you were born. That's different from where the Moon is today. These meanings are traditional, not science.",
    },
    te: {
      title: "చంద్రుడు (Moon)",
      level0: "మీ చంద్ర రాశి మీ మూడ్ ఎలా ఉంటుందో, మార్పుల్ని ఎలా తీసుకుంటారో చూపిస్తుంది.",
      level1:
        "మీ చంద్ర రాశి = మీరు పుట్టినప్పుడు చంద్రుడు ఉన్న రాశి. ఈరోజు చంద్రుడు తిరిగే రాశి వేరు — ఇవి సంప్రదాయ అర్థాలు, గ్యారంటీ కాదు.",
    },
    hi: {
      title: "चंद्र (Chandra)",
      level0: "आपकी चंद्र राशि बताती है कि आपका मूड कैसे चलता है और आप बदलाव को कैसे लेते हैं।",
      level1:
        "चंद्र राशि (जन्म राशि) वह राशि है जिसमें आपके जन्म के समय चंद्रमा था। आज चंद्रमा किस राशि में है, वह अलग बात है। ये पारंपरिक अर्थ हैं, कोई पक्की भविष्यवाणी नहीं।",
    },
  },
  Jupiter: {
    en: {
      title: "Jupiter (Guru)",
      level0: "Growth, learning and the big picture.",
      level1:
        "Jupiter (Guru) periods come from your birth star's dasha sequence. The dates are math; the meaning is our read.",
    },
    te: {
      title: "గురువు (Jupiter)",
      level0: "ఎదుగుదల, నేర్చుకోవడం, పెద్ద పిక్చర్ — గురువు చెప్పేది ఇదే.",
      level1: "గురు దశ తేదీలు మీ జన్మ నక్షత్రం నుంచి లెక్కేస్తాం — తేదీలు లెక్క, అర్థం మా వివరణ.",
    },
    hi: {
      title: "गुरु (Jupiter)",
      level0: "आगे बढ़ना, कुछ नया सीखना और बड़ी तस्वीर देखना — गुरु यही बताता है।",
      level1: "गुरु की दशा की तारीखें आपके जन्म नक्षत्र से गिनी जाती हैं। तारीखें हिसाब से आती हैं, उनका मतलब हमारी समझ है।",
    },
  },
  Mercury: {
    en: {
      title: "Mercury (Budha)",
      level0: "Speech, thinking and getting things organised.",
      level1: "Mercury (Budha) sub-periods bring talking and communication to the front. A theme, not fate.",
    },
    te: {
      title: "బుధుడు (Mercury)",
      level0: "మాట, ఆలోచన, పనుల్ని సెట్ చేయడం — బుధుడు చెప్పేది ఇదే.",
      level1: "బుధ అంతర్దశలో మాట్లాడటం, కమ్యూనికేషన్ మెయిన్ అవుతాయి — ఇది రాత కాదు.",
    },
    hi: {
      title: "बुध (Mercury)",
      level0: "बातचीत, सोच-विचार और कामों को ठीक से सँभालना — बुध यही बताता है।",
      level1: "बुध की अंतरदशा में बात करना और लोगों से जुड़ना आगे आता है। यह एक थीम है, किस्मत का फ़ैसला नहीं।",
    },
  },
};

const LUCKY: Record<AppLocale, ExplainerEntry> = {
  en: {
    title: "Traditional sign picks",
    level0: "Lucky days, numbers and colours here come from old Moon-sign tables, not your full chart.",
    level1:
      "These are cultural picks for your Moon sign (Chandra Rashi). A colour or number won't change your day. For timing a task, use Today and Timing.",
  },
  te: {
    title: "రాశి సంప్రదాయ అర్థాలు",
    level0: "లక్కీ రోజులు, నంబర్స్, కలర్స్ రాశి సంప్రదాయ పట్టిక నుంచి — పూర్తి జాతకం లెక్క కాదు.",
    level1: "ఇవి సంప్రదాయ నమ్మకాలు, గ్యారంటీ కాదు. పనికి టైమ్ కావాలంటే Today / Timing చూడండి.",
  },
  hi: {
    title: "राशि के पारंपरिक लकी पिक्स",
    level0: "यहाँ लकी दिन, नंबर और रंग पुरानी चंद्र राशि की तालिका से आते हैं, पूरी कुंडली से नहीं।",
    level1: "ये परंपरा से चली आ रही बातें हैं; कोई रंग या नंबर आपका दिन नहीं बदलता। किसी काम का समय देखना हो तो Today और Timing खोलिए।",
  },
};

export function explainerForGraha(lord: string, locale: AppLocale): ExplainerEntry | null {
  const key = lord.trim();
  const hit = GRAHA[key];
  if (hit) return hit[locale] ?? hit.en;
  return {
    title: key,
    level0: "A planet (graha) used in traditional Jyotish timing and symbolism.",
    level1: "What it means depends on your current period and your chart. No guarantees.",
  };
}

export function explainerForLucky(locale: AppLocale): ExplainerEntry {
  return LUCKY[locale] ?? LUCKY.en;
}
