import { DateTime } from "luxon";
import type { AppLocale } from "./vedic_labels.ts";

type Flavor = { areas: string[]; mood: string[] };

const FLAVOR_EN: Record<string, Flavor> = {
  Ketu: {
    areas: ["detachment", "inner peace", "letting go of old weights"],
    mood: ["quiet reflection", "less desire for outward noise"],
  },
  Venus: {
    areas: ["home comfort", "buying beautiful things", "family celebrations"],
    mood: ["repairing relationships", "ease in personal comforts"],
  },
  Sun: {
    areas: ["office respect", "individual authority", "father's influence"],
    mood: ["showing up with dignity", "health and vitality peaks"],
  },
  Moon: {
    areas: ["peace of mind", "mother's care", "home environment"],
    mood: ["emotional nesting", "mood-sensitive decisions"],
  },
  Mars: {
    areas: ["physical grit", "property matters", "brotherly support"],
    mood: ["courage in disputes", "sharp energy to finish tasks"],
  },
  Rahu: {
    areas: ["ambition to grow", "restless craving", "foreign-related shifts"],
    mood: ["wanting to break traditions", "appetite outruns patience"],
  },
  Jupiter: {
    areas: ["elders' blessings", "wisdom in spending", "family expansion"],
    mood: ["steady growth", "saving for the long term"],
  },
  Saturn: {
    areas: ["family duty", "brick-by-brick building", "grit through delays"],
    mood: ["slow but solid results", "patient responsibility"],
  },
  Mercury: {
    areas: ["clever office talks", "exam success", "clearing paperwork"],
    mood: ["nimble logistics", "solving complex details"],
  },
};

const PHRASE_TE: Record<string, string> = {
  "detachment": "విడిచిపెట్టడం",
  "inner peace": "లోపలి శాంతి",
  "letting go of old weights": "పాత భారాలను దించుకోవడం",
  "quiet reflection": "నిశ్శబ్ద ఆలోచన",
  "less desire for outward noise": "బయటి హడావుడిపై తక్కువ కోరిక",
  "home comfort": "ఇంటి సౌకర్యం",
  "buying beautiful things": "అందమైన వాటిపై ఆకర్షణ",
  "family celebrations": "కుటుంబ వేడుకలు",
  "repairing relationships": "సంబంధాలను సరిచేయడం",
  "ease in personal comforts": "వ్యక్తిగత సౌకర్యాల్లో సౌలభ్యం",
  "office respect": "పని ప్రదేశ గౌరవం",
  "individual authority": "తన మాట నిలబెట్టుకోవడం",
  "father's influence": "తండ్రి ప్రభావం",
  "showing up with dignity": "గౌరవంగా కనిపించడం",
  "health and vitality peaks": "ఆరోగ్యం, ఉత్సాహం ఎగబాకడం",
  "peace of mind": "మనశ్శాంతి",
  "mother's care": "తల్లి శ్రద్ధ",
  "home environment": "ఇంటి వాతావరణం",
  "emotional nesting": "భావోద్వేగంగా లోపలికి చేరడం",
  "mood-sensitive decisions": "మూడ్ ఆధారిత నిర్ణయాలు",
  "physical grit": "శారీరక పట్టుదల",
  "property matters": "ఆస్తి విషయాలు",
  "brotherly support": "తోబుట్టువుల సహాయం",
  "courage in disputes": "వివాదాల్లో ధైర్యం",
  "sharp energy to finish tasks": "పనులు ముగించాలనే కఠిన ఉత్సాహం",
  "ambition to grow": "ఎదగాలనే తపన",
  "restless craving": "నిరంతర ఆకాంక్ష",
  "foreign-related shifts": "విదేశీ సంబంధిత మార్పులు",
  "wanting to break traditions": "పాత పద్ధతులను దాటాలని అనిపించడం",
  "appetite outruns patience": "ఆతురత, సహనాన్ని దాటిపోవడం",
  "elders' blessings": "పెద్దల ఆశీర్వాదం",
  "wisdom in spending": "ఖర్చులో జాగ్రత్త",
  "family expansion": "కుటుంబ విస్తరణ",
  "steady growth": "నెలకడైన ఎదుగుదల",
  "saving for the long term": "దీర్ఘకాలిక భద్రతపై దృష్టి",
  "family duty": "కుటుంబ బాధ్యత",
  "brick-by-brick building": "అడుగు అడుగుగా నిర్మించడం",
  "grit through delays": "ఆలస్యాల్లోనూ నిలబడటం",
  "slow but solid results": "నెమ్మదిగా కానీ బలమైన ఫలితాలు",
  "patient responsibility": "సహనంతో బాధ్యత",
  "clever office talks": "తెలివైన పని సంభాషణలు",
  "exam success": "పరీక్షల్లో పురోగతి",
  "clearing paperwork": "పత్రాల పని పూర్తిచేయడం",
  "nimble logistics": "చురుకైన నిర్వహణ",
  "solving complex details": "సంక్లిష్ట విషయాలు సర్దుబాటు చేయడం",
};

const PHRASE_HI: Record<string, string> = {
  "detachment": "छोड़ना सीखना",
  "inner peace": "भीतरी शांति",
  "letting go of old weights": "पुराने बोझ हल्के करना",
  "quiet reflection": "शांत आत्मचिंतन",
  "less desire for outward noise": "बाहरी शोर से दूरी",
  "home comfort": "घर का सुकून",
  "buying beautiful things": "सुंदर चीजों की ओर झुकाव",
  "family celebrations": "परिवार के उत्सव",
  "repairing relationships": "रिश्तों को संभालना",
  "ease in personal comforts": "निजी आराम में सहजता",
  "office respect": "काम की जगह सम्मान",
  "individual authority": "अपनी बात का वजन",
  "father's influence": "पिता का असर",
  "showing up with dignity": "गरिमा के साथ सामने आना",
  "health and vitality peaks": "स्वास्थ्य और ऊर्जा का उभार",
  "peace of mind": "मन की शांति",
  "mother's care": "मां का स्नेह",
  "home environment": "घर का माहौल",
  "emotional nesting": "भावनात्मक भीतरपन",
  "mood-sensitive decisions": "मूड से प्रभावित फैसले",
  "physical grit": "शारीरिक दम",
  "property matters": "जमीन-जायदाद के मामले",
  "brotherly support": "भाई-बहन का सहारा",
  "courage in disputes": "विवाद में हिम्मत",
  "sharp energy to finish tasks": "काम खत्म करने की तेज ऊर्जा",
  "ambition to grow": "आगे बढ़ने की चाह",
  "restless craving": "बेचैन चाह",
  "foreign-related shifts": "विदेश से जुड़े बदलाव",
  "wanting to break traditions": "पुरानी सीमाएं तोड़ने की चाह",
  "appetite outruns patience": "उत्सुकता, धैर्य से आगे निकलना",
  "elders' blessings": "बड़ों का आशीर्वाद",
  "wisdom in spending": "खर्च में समझदारी",
  "family expansion": "परिवार का विस्तार",
  "steady growth": "स्थिर बढ़त",
  "saving for the long term": "लंबी अवधि की बचत",
  "family duty": "परिवार की जिम्मेदारी",
  "brick-by-brick building": "धीरे-धीरे नींव बनाना",
  "grit through delays": "देरी में भी टिके रहना",
  "slow but solid results": "धीमे पर मजबूत नतीजे",
  "patient responsibility": "धैर्य वाली जिम्मेदारी",
  "clever office talks": "समझदार कामकाजी बातचीत",
  "exam success": "पढ़ाई या परीक्षा में प्रगति",
  "clearing paperwork": "कागजी काम निपटाना",
  "nimble logistics": "फुर्तीला प्रबंधन",
  "solving complex details": "पेचीदा बातों को सुलझाना",
};

function phraseMap(loc: AppLocale): Record<string, string> {
  if (loc === "te") return PHRASE_TE;
  if (loc === "hi") return PHRASE_HI;
  return {};
}

function tr(loc: AppLocale, phrase: string): string {
  return phraseMap(loc)[phrase] ?? phrase;
}

function pickMod<T>(arr: readonly T[], salt: number): T {
  return arr[((salt % arr.length) + arr.length) % arr.length]!;
}

export function lordFlavor(
  lord: string,
  loc: AppLocale = "en",
): Flavor {
  const base = FLAVOR_EN[lord] ?? FLAVOR_EN.Saturn;
  if (loc === "en") return base;
  return {
    areas: base.areas.map((x) => tr(loc, x)),
    mood: base.mood.map((x) => tr(loc, x)),
  };
}

function blendedTitle(mdLord: string, adLord: string, loc: AppLocale): string[] {
  if (loc !== "en") {
    return [`${mdLord}-${adLord}`, `${mdLord} / ${adLord}`];
  }
  const md = lordFlavor(mdLord, loc);
  const ad = lordFlavor(adLord, loc);
  return [
    `${mdLord}-${adLord}`,
    `${adLord} in ${mdLord}`,
    `${adFocal(ad, loc)} under ${mdFocal(md, loc)}`,
    `${adLord} over ${mdLord}`,
    `${mdLord} with ${adLord}`,
  ];
}

function mdFocal(flavor: Flavor, loc: AppLocale): string {
  return flavor.areas[0] ?? flavor.mood[0] ??
    (loc === "te" ? "జీవితం" : loc === "hi" ? "जीवन" : "life");
}

function adFocal(flavor: Flavor, loc: AppLocale): string {
  return flavor.mood[0] ?? flavor.areas[0] ??
    (loc === "te" ? "దృష్టి" : loc === "hi" ? "ध्यान" : "focus");
}

export function antardashaFallbackCopy(
  mdLord: string,
  adLord: string,
  start: Date,
  end: Date,
  varietyIndex: number,
  loc: AppLocale = "en",
): { title: string; sentences: string[] } {
  const mdF = lordFlavor(mdLord, loc);
  const adF = lordFlavor(adLord, loc);
  const label = plainPeriodLabel(start, end);
  const titles = blendedTitle(mdLord, adLord, loc);
  const salt = varietyIndex + mdLord.length * 5 + adLord.length * 7;

  if (loc === "te") {
    return {
      title: pickMod(titles, salt),
      sentences: [
        `${label} కాలంలో ${adF.areas[0]} ఎక్కువగా కనిపించి, ${mdF.areas[0]} పెద్ద నేపథ్యంలా నడిచే అవకాశం ఉంది.`,
        `ఇది సాధారణంగా పని, కుటుంబం, ఖర్చు, మనశ్శాంతి లేదా రోజువారీ స్వభావంలో కనిపిస్తుంది.`,
      ],
    };
  }

  if (loc === "hi") {
    return {
      title: pickMod(titles, salt),
      sentences: [
        `${label} के दौरान ${adF.areas[0]} ज्यादा दिखा होगा, जबकि ${
          mdF.areas[0]
        } लंबी पृष्ठभूमि की तरह चल रहा था।`,
        `यह अक्सर काम, परिवार, खर्च, मन की स्थिति या रोजमर्रा के व्यवहार में महसूस होता है।`,
      ],
    };
  }

  const lead = [
    () =>
      `${label} was more about ${adF.areas[0]}, while ${
        mdF.areas[0]
      } stayed as the longer chapter behind it.`,
    () =>
      `This stretch often brought ${adF.mood[0]} to the surface, with ${
        mdF.mood[0]
      } shaping the bigger story.`,
    () => `${adLord} usually made ${adF.areas[0]} more visible inside a broader ${mdLord} phase.`,
    () =>
      `This was a smaller ${adLord} phase inside ${mdLord}, so daily life often changed before the outer story did.`,
  ];
  const follow = [
    () =>
      `You would usually notice it through ${
        adF.areas[1] ?? adF.areas[0]
      }, work tone, family matters, or the way your energy was moving.`,
    () =>
      `Most people recognise this phase through ordinary life: home atmosphere, money choices, conversations, or inner calm.`,
    () => `If it fits, it fits as lived rhythm, not as one dramatic prediction.`,
    () => `The useful question is simple: did your real life lean this way during that period?`,
  ];
  return {
    title: pickMod(titles, salt),
    sentences: [
      pickMod(lead, salt)(),
      pickMod(follow, salt + 11)(),
    ],
  };
}

export function phaseCardCopy(
  lord: string,
  start: Date,
  end: Date,
  varietyIndex = 0,
  loc: AppLocale = "en",
): {
  title: string;
  sentences: string[];
  themes: string[];
  lifeAreas: string[];
} {
  const f = lordFlavor(lord, loc);
  const y1 = start.getFullYear();
  const y2 = end.getFullYear();
  const periodLabel = y1 === y2 ? `${y1}` : `${y1} - ${y2}`;
  const salt = varietyIndex + lord.length * 13 + y1 % 7;

  if (loc === "te") {
    return {
      title: pickMod(
        [`${periodLabel} దశ`, `${periodLabel} కాలం`, `${lord} ప్రభావ కాలం`],
        salt,
      ),
      sentences: [
        `ఈ కాలంలో ${f.areas[0]} మరియు ${f.areas[1]} ఎక్కువగా ముందుకు రావచ్చు.`,
        `రోజువారీగా ${f.mood[0]} ముందుగా కనిపించి, తరువాత ఇతర విషయాలపై దాని ప్రభావం తెలుస్తుంది.`,
        `పూర్తి సరిపోలిక అవసరం లేదు. దాని విస్తృత స్వరూపం సరిపోతే చాలు.`,
      ],
      themes: [...f.mood, ...f.areas.slice(0, 2)],
      lifeAreas: f.areas,
    };
  }

  if (loc === "hi") {
    return {
      title: pickMod(
        [`${periodLabel} चरण`, `${periodLabel} का दौर`, `${lord} का प्रभाव`],
        salt,
      ),
      sentences: [
        `इस दौर में ${f.areas[0]} और ${f.areas[1]} ज्यादा सामने आ सकते हैं।`,
        `रोजमर्रा में पहले ${f.mood[0]} दिखता है, फिर उसका असर बाकी बातों में महसूस होता है।`,
        `बिलकुल सटीक मिलान जरूरी नहीं है. इसका बड़ा ढांचा सही लगे तो वही काफी है।`,
      ],
      themes: [...f.mood, ...f.areas.slice(0, 2)],
      lifeAreas: f.areas,
    };
  }

  const titles = [
    `Stretch ${periodLabel}`,
    `Phase ${periodLabel}`,
    `Years ${periodLabel}`,
    `${periodLabel} ${lord} tone`,
    `Span ${periodLabel}`,
  ];
  const intros = [
    () => `This span often foregrounds ${f.areas[0]} and ${f.areas[1]} - pattern, not prophecy.`,
    () =>
      `${f.areas[0]} and ${
        f.areas[1]
      } tend to take centre stage; people usually recognise it only in hindsight.`,
    () =>
      `Look for ${f.areas[0]} braided with ${f.areas[1]}; this is rhythm language, not certainty.`,
    () =>
      `The chapter often feels heavy on ${f.areas[0]} with ${
        f.areas[1]
      } nearby - useful for reflection, not fortune-telling.`,
  ];
  const mids = [
    () =>
      `Typical texture: ${f.mood[0]}${f.mood.length > 1 ? `, and sometimes ${f.mood[1]}` : ""}.`,
    () =>
      `Many people describe it as ${f.mood[0]}${
        f.mood.length > 1 ? ` with flashes of ${f.mood[1]}` : ""
      }.`,
    () =>
      `Day to day, ${f.mood[0]} tends to show up first${
        f.mood.length > 1 ? `, while ${f.mood[1]} comes in waves` : ""
      }.`,
  ];
  const outros = [
    () => `A rough fit is enough to tune the smaller timings we show later.`,
    () => `If it lands, keep it as context; if not, ignore it without guilt.`,
    () => `Directional truth is enough here - it does not need to be perfect.`,
  ];
  return {
    title: pickMod(titles, salt),
    sentences: [
      pickMod(intros, salt)(),
      pickMod(mids, salt + 2)(),
      pickMod(outros, salt + 4)(),
    ],
    themes: [...f.mood, ...f.areas.slice(0, 2)],
    lifeAreas: f.areas,
  };
}

export function plainPeriodLabel(start: Date, end: Date): string {
  const startDt = DateTime.fromJSDate(start);
  const endDt = DateTime.fromJSDate(end).minus({ days: 1 });
  if (startDt.year === endDt.year && startDt.month === endDt.month) {
    return startDt.toFormat("LLL yyyy");
  }
  if (startDt.year === endDt.year) {
    return `${startDt.toFormat("LLL")} - ${endDt.toFormat("LLL yyyy")}`;
  }
  return `${startDt.toFormat("LLL yyyy")} - ${endDt.toFormat("LLL yyyy")}`;
}
