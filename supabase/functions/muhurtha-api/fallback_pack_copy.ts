import type { AppLocale } from "./vedic_labels.ts";

type FallbackStrings = {
  todayTitle: (date: string) => string;
  oneLine: string;
  goodCategory: string;
  goodWhy: string;
  goodBestFor: string[];
  goodAvoid: string[];
  cautionWhy: string;
  cautionBestFor: string[];
  cautionAvoid: string[];
  cautionShare: string;
  weeklyTitle: string;
  monthlyTitle: string;
  boundaries: string[];
  proTeasers: {
    future_timeline: string;
    subphase_unlock: string;
    chat_unlock: string;
    notification_unlock: string;
  };
};

const COPY: Record<AppLocale, FallbackStrings> = {
  en: {
    todayTitle: (date) => `Today · ${date}`,
    oneLine: "Use the better time slot and keep the next step simple.",
    goodCategory: "Time to use",
    goodWhy: "Small things go smoothly here.",
    goodBestFor: ["fresh starts", "focused work"],
    goodAvoid: ["rushed promises"],
    cautionWhy: "Hold off on big starts here.",
    cautionBestFor: ["review", "pause"],
    cautionAvoid: ["new commitments"],
    cautionShare: "Don't force your biggest decision in this slot.",
    weeklyTitle: "This week's rhythm",
    monthlyTitle: "This month's theme",
    boundaries: ["This is timing guidance, not medical, legal or money advice."],
    proTeasers: {
      future_timeline: "Unlock what's ahead and see what changes next.",
      subphase_unlock: "Open the smaller phases for a more detailed timeline.",
      chat_unlock: "Ask more questions, answered from your whole chart.",
      notification_unlock: "Get a heads-up before good and careful times start.",
    },
  },
  te: {
    todayTitle: (date) => `ఈరోజు · ${date}`,
    oneLine: "మంచి టైమ్‌ని వాడుకోండి, చిన్న స్టెప్ ప్రాక్టికల్‌గా ఉంచండి.",
    goodCategory: "వాడుకోవాల్సిన టైమ్",
    goodWhy: "ఈ టైమ్‌లో చిన్న పనులు బాగా జరుగుతాయి.",
    goodBestFor: ["క్లియర్ స్టార్ట్", "ఫోకస్ పని"],
    goodAvoid: ["తొందరపడి ప్రామిస్‌లు"],
    cautionWhy: "ఈ టైమ్‌లో పెద్ద నిర్ణయాలు వాయిదా వేయండి.",
    cautionBestFor: ["రివ్యూ", "బ్రేక్"],
    cautionAvoid: ["కొత్త కమిట్‌మెంట్"],
    cautionShare: "ఈ టైమ్‌లో పెద్ద నిర్ణయం ఫోర్స్ చేయకండి.",
    weeklyTitle: "ఈ వారం రిథమ్",
    monthlyTitle: "ఈ నెల థీమ్",
    boundaries: ["ఇది టైమింగ్ గైడ్ మాత్రమే — డాక్టర్, లీగల్, ఫైనాన్స్ గ్యారంటీ కాదు."],
    proTeasers: {
      future_timeline: "రాబోయే దశలు ఓపెన్ చేసి నెక్స్ట్ ఏం మారుతుందో చూడండి.",
      subphase_unlock: "చిన్న దశలు ఓపెన్ చేసి టైమ్‌లైన్ ఇంకా డీటెయిల్‌గా చూడండి.",
      chat_unlock: "మీ జాతకం ఆధారంగా ఇంకా ప్రశ్నలు అడగండి.",
      notification_unlock: "మంచి / జాగ్రత్త టైమ్స్‌కి ముందే అలర్ట్స్ పొందండి.",
    },
  },
  hi: {
    todayTitle: (date) => `आज · ${date}`,
    oneLine: "साफ समय इस्तेमाल करें, कदम practical रखें.",
    goodCategory: "काम का समय",
    goodWhy: "यहाँ दिन साफ काम के लिए सपोर्ट करता है.",
    goodBestFor: ["साफ शुरुआत", "फोकस वाला काम"],
    goodAvoid: ["जल्दबाज़ी वाले वादे"],
    cautionWhy: "यहाँ बड़ी शुरुआत हल्की रखें.",
    cautionBestFor: ["रिव्यू", "विराम"],
    cautionAvoid: ["नई कमिटमेंट"],
    cautionShare: "इस समय सबसे बड़ा फैसला ज़बरदस्ती मत लें.",
    weeklyTitle: "इस हफ्ते की लय",
    monthlyTitle: "इस महीने का थीम",
    boundaries: ["यह timing guidance है — medical, legal या financial guarantee नहीं."],
    proTeasers: {
      future_timeline: "आगे के दौर खोलें और देखें आगे क्या बदलेगा.",
      subphase_unlock: "sub-phase खोलकर timeline और गहरी करें.",
      chat_unlock: "पूरे birth pack context के साथ और सवाल पूछें.",
      notification_unlock: "अच्छे/सावधानी समय की अलर्ट पहले पाएं.",
    },
  },
};

export function fallbackPackStrings(locale: AppLocale): FallbackStrings {
  return COPY[locale] ?? COPY.en;
}
