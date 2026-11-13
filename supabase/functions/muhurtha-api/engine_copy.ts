/**
 * Deterministic, engine-written copy: the slot notes the model does not write (hora and Rahu
 * Kalam tables) and full day cards for dates past the written range (real panchang facts,
 * never a weekday copy). Pure; uses only the meaning tables.
 */
import {
  HORA_THEME, type MeaningLocale, NAK_MEANING, RAHU_NOTE, TARA_MEANING, TITHI_MEANING, tithiBase, YOGA_MEANING,
} from "./meanings.ts";

const NAK_ORDER = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
const NAK_TE = ["అశ్విని", "భరణి", "కృత్తిక", "రోహిణి", "మృగశిర", "ఆరుద్ర", "పునర్వసు", "పుష్యమి", "ఆశ్లేష", "మఖ", "పుబ్బ", "ఉత్తర", "హస్త", "చిత్త", "స్వాతి", "విశాఖ", "అనూరాధ", "జ్యేష్ఠ", "మూల", "పూర్వాషాఢ", "ఉత్తరాషాఢ", "శ్రవణం", "ధనిష్ఠ", "శతభిష", "పూర్వాభాద్ర", "ఉత్తరాభాద్ర", "రేవతి"];
const NAK_HI = ["अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा", "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्व फाल्गुनी", "उत्तर फाल्गुनी", "हस्त", "चित्रा", "स्वाति", "विशाखा", "अनुराधा", "ज्येष्ठा", "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा", "पूर्व भाद्रपद", "उत्तर भाद्रपद", "रेवती"];

export function starName(n: string, l: MeaningLocale): string {
  const i = NAK_ORDER.indexOf(n);
  if (i < 0) return n;
  return l === "te" ? NAK_TE[i] : l === "hi" ? NAK_HI[i] : n;
}
export function tithiName(t: string, l: MeaningLocale): string {
  const b = tithiBase(t);
  return b ? TITHI_MEANING[b].name[l] : t;
}

export const HORA_LABEL: Record<string, Record<MeaningLocale, string>> = {
  sun: { en: "Official work", te: "ఆఫీస్ పనులు", hi: "दफ़्तरी काम" },
  moon: { en: "Family & food", te: "కుటుంబం, భోజనం", hi: "परिवार और भोजन" },
  mars: { en: "Hands-on effort", te: "శ్రమ పనులు", hi: "मेहनत के काम" },
  mercury: { en: "Calls & writing", te: "కాల్స్, రాతపని", hi: "फ़ोन और लिखना" },
  jupiter: { en: "Advice & planning", te: "సలహా, ప్లానింగ్", hi: "सलाह और योजना" },
  venus: { en: "People & comforts", te: "మనుషులు, సౌకర్యాలు", hi: "लोग और सुख" },
  saturn: { en: "Routine & pending", te: "రొటీన్, పెండింగ్", hi: "रोज़ के और अटके काम" },
};
export const AREA_WORD: Record<string, Record<MeaningLocale, string>> = {
  work: { en: "work", te: "పని", hi: "काम" },
  money: { en: "money", te: "డబ్బు", hi: "पैसे" },
  home: { en: "home", te: "ఇంటి", hi: "घर" },
  family: { en: "family", te: "కుటుంబ", hi: "परिवार" },
  partner: { en: "partner", te: "జీవిత భాగస్వామి", hi: "जीवनसाथी" },
  friends: { en: "friendship", te: "స్నేహ", hi: "दोस्ती" },
  body: { en: "health", te: "ఆరోగ్య", hi: "सेहत" },
  learning: { en: "study", te: "చదువు", hi: "पढ़ाई" },
  self: { en: "personal", te: "వ్యక్తిగత", hi: "निजी" },
  errands: { en: "errand", te: "బయటి పనుల", hi: "बाहर के काम" },
  play: { en: "play", te: "ఆట", hi: "खेल" },
  sleep: { en: "sleep", te: "నిద్ర", hi: "नींद" },
  food: { en: "food", te: "ఆహార", hi: "खाने" },
  bonding: { en: "bonding", te: "అనుబంధ", hi: "जुड़ाव" },
  outdoors: { en: "outdoor", te: "బయటి", hi: "बाहर" },
  calm: { en: "calm-time", te: "ప్రశాంత", hi: "शांति" },
};

export type EngineNote = { category: string; why_it_works: string };

/** Engine note for a slot the model did not write. */
export function engineSlotNote(kind: "good" | "caution", hora: string | undefined, area: string | undefined, l: MeaningLocale): EngineNote {
  const a = AREA_WORD[area ?? ""]?.[l] ?? "";
  if (kind === "caution") {
    const tail = l === "te"
      ? (a ? ` ${a} విషయాల్లో కొత్తవి దీని తర్వాతే.` : "")
      : l === "hi"
      ? (a ? ` ${a} से जुड़ी नई शुरुआत इसके बाद।` : "")
      : (a ? ` Keep new ${a} moves for after it ends.` : "");
    return { category: l === "te" ? "రాహుకాలం" : l === "hi" ? "राहु काल" : "Rahu Kalam", why_it_works: `${RAHU_NOTE[l]}.${tail}`.replace(/\.\./g, ".") };
  }
  const theme = hora ? HORA_THEME[hora]?.[l] ?? "" : "";
  const label = hora ? HORA_LABEL[hora]?.[l] ?? "" : "";
  if (!theme) return { category: label, why_it_works: "" };
  const why = l === "te" ? `ఈ హోరా ${theme}కి అనుకూలం.` : l === "hi" ? `यह होरा ${theme} के लिए ठीक है।` : `This hour traditionally suits ${theme}.`;
  return { category: label, why_it_works: why };
}

const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;

/** A full card from engine facts alone, for dates the model did not write. */
export function engineDayCopy(fx: { nakshatra: string; tithi: string; yoga: string; tara: string | null }, l: MeaningLocale) {
  const star = starName(fx.nakshatra, l);
  const tn = tithiName(fx.tithi, l);
  const nak = NAK_MEANING[fx.nakshatra];
  const tb = TITHI_MEANING[tithiBase(fx.tithi)];
  const yo = YOGA_MEANING[fx.yoga];
  const tara = fx.tara ? TARA_MEANING[fx.tara]?.[l] ?? "" : "";
  const yogaWord = l === "te" ? "యోగం" : l === "hi" ? "योग" : "yoga";
  const body = [
    nak ? `${star}: ${nak.meaning[l]}.` : "",
    tb ? `${tn}: ${tb.meaning[l]}.` : "",
    yo ? `${fx.yoga} ${yogaWord}: ${yo.meaning[l]}.` : "",
  ].filter(Boolean).join(" ");
  const goodFor = (nak?.good_for[l] ?? "").split(/,\s*|، /).map((x) => cap(x.trim())).filter(Boolean).slice(0, 2);
  return {
    title: `${star} · ${tn}`,
    line: cap(tara || nak?.meaning[l] || ""),
    body,
    do: goodFor,
    avoid: yo && yo.tone === "careful" ? [cap(yo.meaning[l])] : [],
  };
}

/** Item-specific traditional layer for Explain: the meaning of the star / tithi / yoga / tara shown on screen. */
export function valueMeaning(term: string, value: string, l: MeaningLocale): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  const low = v.toLowerCase();
  if (term === "nakshatra") {
    const i = NAK_ORDER.findIndex((n, k) => low.includes(n.toLowerCase()) || v.includes(NAK_TE[k]) || v.includes(NAK_HI[k]));
    if (i < 0) return "";
    const n = NAK_MEANING[NAK_ORDER[i]];
    const gf = l === "te" ? "దేనికి బాగుంటుంది" : l === "hi" ? "किसके लिए अच्छा" : "Good for";
    return `${starName(NAK_ORDER[i], l)}: ${n.meaning[l]}. ${gf}: ${n.good_for[l]}.`;
  }
  if (term === "tithi") {
    const key = Object.keys(TITHI_MEANING).find((k) => low.includes(k.toLowerCase()) || v.includes(TITHI_MEANING[k].name.te) || v.includes(TITHI_MEANING[k].name.hi));
    if (!key) return "";
    const t = TITHI_MEANING[key];
    const gf = l === "te" ? "దేనికి బాగుంటుంది" : l === "hi" ? "किसके लिए अच्छा" : "Good for";
    return `${t.name[l]}: ${t.meaning[l]}. ${gf}: ${t.good_for[l]}.`;
  }
  if (term === "tara_bala") {
    const key = Object.keys(TARA_MEANING).sort((a, b) => b.length - a.length).find((k) => low.includes(k.toLowerCase()));
    return key ? cap(TARA_MEANING[key][l]) + "." : "";
  }
  const yk = Object.keys(YOGA_MEANING).find((k) => low.includes(k.toLowerCase()));
  if (yk && (term === "day_card" || term === "yoga")) return `${yk}: ${YOGA_MEANING[yk].meaning[l]}.`;
  return "";
}

/** What Explain should do on each screen, so the same term reads differently where it is shown. */
export const SCREEN_JOB: Record<string, string> = {
  today: "Today screen: say what this value means for TODAY only (this date, this person); no life story.",
  decode: "Decode screen: say what this says about who they are by nature; no daily advice.",
  life: "Life screen: say what it means for the current chapter and the next transition; no daily advice.",
  calendar: "Calendar screen: say how to use it to compare dates and pick one; no personality.",
  bond: "Bond screen: explain what the matching factor looks at and how to talk about it; no verdicts.",
  timing: "Timing screen: say how to use it to compare dates and pick one; no personality.",
  ask: "Ask screen: answer briefly, tied to the question context.",
};
