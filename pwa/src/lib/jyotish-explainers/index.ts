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
      level0: "Traditionally linked with clarity, vitality, and how you show up with purpose.",
      level1:
        "In Jyotish, Surya is a graha of identity and direction — not a guarantee of outcomes. We use it as symbolic context for your chart and current periods, alongside calculated calendar facts.",
    },
    te: {
      title: "సూర్యుడు (Sun)",
      level0: "స్పష్టత, శక్తి మరియు ఉద్దేశ్యంతో ముందుకు సాగడానికి సంబంధించిన ప్రतीకం.",
      level1:
        "జ్యోతిషంలో సూర్యుడు గుర్తింపు మరియు దిశకు సంబంధించిన గ్రహం — ఫలితాల హామీ కాదు. గణన చేసిన తేదీ/కాలం వాస్తవాలతో కలిపి చిత్రానికి సందర్భం.",
    },
    hi: {
      title: "सूर्य (Surya)",
      level0: "पारंपरिक रूप से स्पष्टता, ऊर्जा और उद्देश्य के साथ आगे बढ़ने से जुड़ा प्रतीक।",
      level1:
        "ज्योतिष में सूर्य पहचान और दिशा का ग्रह है — परिणाम की गारंटी नहीं। यह गणना किए गए कैलेंडर तथ्यों के साथ प्रतीकात्मक संदर्भ देता है।",
    },
  },
  Moon: {
    en: {
      title: "Moon (Chandra)",
      level0: "Your birth Moon sign reflects emotional rhythm and how you process change.",
      level1:
        "Janma Rashi (Moon sign) comes from calculated Moon position at birth. It differs from today's transit Moon. Associations are traditional, not scientific predictions.",
    },
    te: {
      title: "చంద్రుడు (Moon)",
      level0: "జన్మ చంద్ర రాశి భావోద్వేగ లయ మరియు మార్పులను ఎలా తీసుకుంటారో చూపుతుంది.",
      level1:
        "జన్మ చంద్ర రాశి జనన సమయంలో చంద్ర స్థానం నుండి. Today's transit Moon is separate — traditional associations, not guarantees.",
    },
    hi: {
      title: "चंद्र (Chandra)",
      level0: "जन्म चंद्र राशि भावनात्मक लय और बदलाव को समझने का प्रतीक है।",
      level1:
        "जन्म चंद्र राशि जन्म के समय चंद्र की गणना से आती है; आज का चंद्र अलग हो सकता है। यह पारंपरिक संदर्भ है, वैज्ञानिक भविष्यवाणी नहीं।",
    },
  },
  Jupiter: {
    en: {
      title: "Jupiter (Guru)",
      level0: "Often read as growth, learning, and wise expansion in traditional charts.",
      level1:
        "Guru periods are Vimshottari timing labels from your birth Nakshatra sequence — calculated start/end, interpretive meaning.",
    },
    te: {
      title: "గురువు (Jupiter)",
      level0: "వృద్ధి, అభ్యాసం మరియు విస్తృత దృష్టికి సంబంధించిన పారंपरिक చిహ్నం.",
      level1: "గురు కాలాలు జన్మ నక్షత్ర క్రమం నుండి గణించబడతాయి — తేదీలు గణిత, అర్థం వ్యాఖ్యాన.",
    },
    hi: {
      title: "गुरु (Jupiter)",
      level0: "पारंपरिक रूप से विकास, सीख और विस्तार से जुड़ा प्रतीक।",
      level1: "गुरु अवधि जन्म नक्षत्र क्रम से गिनी जाती हैं — तिथियाँ गणित, अर्थ व्याख्या।",
    },
  },
  Mercury: {
    en: {
      title: "Mercury (Budha)",
      level0: "Linked with speech, analysis, and practical coordination in tradition.",
      level1: "Budha sub-periods highlight communication themes in the dasha story — symbolic, not fate.",
    },
    te: {
      title: "బుధ (Mercury)",
      level0: "మాట, విశ్లేషణ మరియు సమన్వయానికి సంబంధించిన ప్రतीक.",
      level1: "బుధ అంతరదశలు కమ్యూనికేషన్ థీమ్‌లను చూపుతాయి — విధి కాదు.",
    },
    hi: {
      title: "बुध (Mercury)",
      level0: "वाणी, विश्लेषण और समन्वय से जुड़ा पारंपरिक प्रतीक।",
      level1: "बुध अंतरदशा संचार थीम दिखाती है — भाग्य नहीं।",
    },
  },
};

const LUCKY: Record<AppLocale, ExplainerEntry> = {
  en: {
    title: "Traditional sign associations",
    level0: "Lucky days, numbers, and colours here come from classic Rashi tables — not a full-chart calculation.",
    level1:
      "These are cultural associations for your Moon sign (Chandra Rashi), not proof that a colour or number will change outcomes today. For activity timing, use Today and Timing windows.",
  },
  te: {
    title: "పారंपरिक రాశి అనుబంధాలు",
    level0: "అదృష్ట రోజులు/సంఖ్యలు/రంగులు klassik Rashi lookup నుండి — పూర్తి చART గణన కాదు.",
    level1: "ఇవి సాంస్కృతిక అనుబంధాలు; ఫలితాల హామీ కాదు. కార్య సమయానికి Today/Timing చూడండి.",
  },
  hi: {
    title: "पारंपरिक राशि संबंध",
    level0: "भाग्य दिन/अंक/रंग क्लासिक राशि तालिका से — पूर्ण कुंडली गणना नहीं।",
    level1: "ये सांस्कृतिक संबंध हैं; परिणाम की गारंटी नहीं। गतिविधि समय के लिए Today/Timing देखें।",
  },
};

export function explainerForGraha(lord: string, locale: AppLocale): ExplainerEntry | null {
  const key = lord.trim();
  const hit = GRAHA[key];
  if (hit) return hit[locale] ?? hit.en;
  return {
    title: key,
    level0: "A graha (planet or node) used in traditional Jyotish timing and symbolism.",
    level1: "Meaning depends on your calculated period and chart context — not guaranteed outcomes.",
  };
}

export function explainerForLucky(locale: AppLocale): ExplainerEntry {
  return LUCKY[locale] ?? LUCKY.en;
}
