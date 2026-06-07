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
    oneLine: "Use the cleaner window and keep the step practical.",
    goodCategory: "Useful window",
    goodWhy: "The day supports cleaner action here.",
    goodBestFor: ["clear starts", "focused work"],
    goodAvoid: ["rushed promises"],
    cautionWhy: "Keep important starts light here.",
    cautionBestFor: ["review", "pause"],
    cautionAvoid: ["new commitments"],
    cautionShare: "Avoid forcing the biggest decision in this window.",
    weeklyTitle: "This week's rhythm",
    monthlyTitle: "This month's theme",
    boundaries: ["Use this as timing guidance, not medical, legal, or financial certainty."],
    proTeasers: {
      future_timeline: "Unlock future phases and see what changes next.",
      subphase_unlock: "Open sub-phases for a more detailed timeline.",
      chat_unlock: "Ask more questions with your full birth pack context.",
      notification_unlock: "Get good-time and caution-time alerts before they start.",
    },
  },
  te: {
    todayTitle: (date) => `ఈరోజు · ${date}`,
    oneLine: "స్పష్టమైన సమయం వాడి, చిన్న స్టెప్‌ను ప్రాక్టికల్‌గా ఉంచు.",
    goodCategory: "వాడుకోవాల్సిన సమయం",
    goodWhy: "ఇక్కడ రోజు చిన్న పనులకు మంచి సపోర్ట్ ఇస్తుంది.",
    goodBestFor: ["క్లియర్ స్టార్ట్", "ఫోకస్ పని"],
    goodAvoid: ["తొందర పదే పదే ప్రామిస్"],
    cautionWhy: "ఇక్కడ పెద్ద నిర్ణయాలు తేలికగా ఉంచు.",
    cautionBestFor: ["రివ్యూ", "విరామం"],
    cautionAvoid: ["కొత్త కమిట్‌మెంట్"],
    cautionShare: "ఈ సమయంలో అతి పెద్ద నిర్ణయం ఫోర్స్ చేయకు.",
    weeklyTitle: "ఈ వారం రిథమ్",
    monthlyTitle: "ఈ నెల థీమ్",
    boundaries: ["ఇది టైమింగ్ గైడెన్స్ మాత్రమే — వైద్య, లీగల్, ఫైనాన్షియల్ హామీ కాదు."],
    proTeasers: {
      future_timeline: "ముందు దశలు తెరిచి తర్వాత ఏం మారుతుందో చూడు.",
      subphase_unlock: "సబ్-ఫేజ్‌లు తెరిచి టైమ్‌లైన్ లోతు పెంచు.",
      chat_unlock: "నీ బర్త్ ప్యాక్ కాంటెక్స్ట్‌తో మరిన్ని ప్రశ్నలు అడగు.",
      notification_unlock: "మంచి/జాగ్రత్త సమయాలు ముందే అలర్ట్ పొందు.",
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
