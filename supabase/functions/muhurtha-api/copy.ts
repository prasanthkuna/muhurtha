import { DateTime } from "luxon";
import type { AppLocale } from "./vedic_labels.ts";

type Flavor = { areas: string[]; mood: string[] };

const FLAVOR_EN: Record<string, Flavor> = {
  Ketu: {
    areas: ["detachment", "inner peace", "letting go of old baggage"],
    mood: ["quiet reflection", "less need for noise and crowds"],
  },
  Venus: {
    areas: ["home comfort", "wanting nice things", "family celebrations"],
    mood: ["patching up relationships", "enjoying your own comforts"],
  },
  Sun: {
    areas: ["respect at work", "standing your ground", "father's influence"],
    mood: ["showing up with your head high", "health and energy on a high"],
  },
  Moon: {
    areas: ["peace of mind", "mother's care", "home environment"],
    mood: ["wanting to stay close to home", "decisions that swing with your mood"],
  },
  Mars: {
    areas: ["physical stamina", "property matters", "help from siblings"],
    mood: ["courage in disputes", "a push to get things done"],
  },
  Rahu: {
    areas: ["ambition to grow", "restless wanting", "changes linked to travel or abroad"],
    mood: ["wanting to break the old rules", "wanting it all faster than it comes"],
  },
  Jupiter: {
    areas: ["elders' blessings", "spending smart", "family expansion"],
    mood: ["steady growth", "saving for the long term"],
  },
  Saturn: {
    areas: ["family duty", "building brick by brick", "holding on through delays"],
    mood: ["slow but solid results", "patient responsibility"],
  },
  Mercury: {
    areas: ["smart conversations at work", "progress in exams", "clearing paperwork"],
    mood: ["handling the small stuff fast", "sorting out messy details"],
  },
};

const PHRASE_TE: Record<string, string> = {
  "detachment": "విడిచిపెట్టడం",
  "inner peace": "లోపలి శాంతి",
  "letting go of old baggage": "పాత భారాలను దించుకోవడం",
  "quiet reflection": "నిశ్శబ్ద ఆలోచన",
  "less need for noise and crowds": "బయటి హడావుడి మీద ఇంట్రెస్ట్ తగ్గడం",
  "home comfort": "ఇంటి సౌకర్యం",
  "wanting nice things": "అందమైన వస్తువుల మీద మోజు",
  "family celebrations": "కుటుంబ వేడుకలు",
  "patching up relationships": "రిలేషన్స్ మళ్లీ సెట్ చేసుకోవడం",
  "enjoying your own comforts": "సొంత కంఫర్ట్స్‌లో ఈజీగా ఉండటం",
  "respect at work": "ఆఫీస్‌లో రెస్పెక్ట్",
  "standing your ground": "తన మాట నిలబెట్టుకోవడం",
  "father's influence": "తండ్రి ప్రభావం",
  "showing up with your head high": "గౌరవంగా కనిపించడం",
  "health and energy on a high": "హెల్త్, ఎనర్జీ పీక్‌లో",
  "peace of mind": "మనశ్శాంతి",
  "mother's care": "అమ్మ కేర్",
  "home environment": "ఇంటి వాతావరణం",
  "wanting to stay close to home": "మనసు ఇంటి వైపు లాగడం",
  "decisions that swing with your mood": "మూడ్ బట్టి నిర్ణయాలు",
  "physical stamina": "ఫిజికల్ స్టామినా",
  "property matters": "ఆస్తి విషయాలు",
  "help from siblings": "అన్నదమ్ముల సపోర్ట్",
  "courage in disputes": "వివాదాల్లో ధైర్యం",
  "a push to get things done": "పనులు పూర్తి చేయాలనే జోష్",
  "ambition to grow": "ఎదగాలనే తపన",
  "restless wanting": "ఆగని ఆరాటం",
  "changes linked to travel or abroad": "విదేశాలకు సంబంధించిన మార్పులు",
  "wanting to break the old rules": "పాత పద్ధతులు బ్రేక్ చేయాలనిపించడం",
  "wanting it all faster than it comes": "ఆరాటం ఓపికని దాటేయడం",
  "elders' blessings": "పెద్దల ఆశీర్వాదం",
  "spending smart": "ఖర్చులో జాగ్రత్త",
  "family expansion": "కుటుంబ విస్తరణ",
  "steady growth": "స్టడీ గ్రోత్",
  "saving for the long term": "లాంగ్-టర్మ్ సెక్యూరిటీ మీద ఫోకస్",
  "family duty": "కుటుంబ బాధ్యత",
  "building brick by brick": "స్టెప్ బై స్టెప్ బిల్డ్ చేయడం",
  "holding on through delays": "డిలేలు వచ్చినా నిలబడటం",
  "slow but solid results": "నెమ్మదిగా, కానీ గట్టి రిజల్ట్స్",
  "patient responsibility": "ఓపికగా బాధ్యత",
  "smart conversations at work": "స్మార్ట్ వర్క్ మీటింగ్స్",
  "progress in exams": "ఎగ్జామ్స్‌లో ప్రోగ్రెస్",
  "clearing paperwork": "పేపర్ వర్క్ పూర్తి చేయడం",
  "handling the small stuff fast": "చురుకుగా పనులు మేనేజ్ చేయడం",
  "sorting out messy details": "కాంప్లికేటెడ్ విషయాలు సెట్ చేయడం",
};

const PHRASE_HI: Record<string, string> = {
  "detachment": "छोड़ना सीखना",
  "inner peace": "भीतरी शांति",
  "letting go of old baggage": "पुराने बोझ हल्के करना",
  "quiet reflection": "शांत आत्मचिंतन",
  "less need for noise and crowds": "बाहरी शोर से दूरी",
  "home comfort": "घर का सुकून",
  "wanting nice things": "सुंदर चीजों की ओर झुकाव",
  "family celebrations": "परिवार के उत्सव",
  "patching up relationships": "रिश्तों को संभालना",
  "enjoying your own comforts": "निजी आराम में सहजता",
  "respect at work": "काम की जगह सम्मान",
  "standing your ground": "अपनी बात का वजन",
  "father's influence": "पिता का असर",
  "showing up with your head high": "गरिमा के साथ सामने आना",
  "health and energy on a high": "स्वास्थ्य और ऊर्जा का उभार",
  "peace of mind": "मन की शांति",
  "mother's care": "मां का स्नेह",
  "home environment": "घर का माहौल",
  "wanting to stay close to home": "भावनात्मक भीतरपन",
  "decisions that swing with your mood": "मूड से प्रभावित फैसले",
  "physical stamina": "शारीरिक दम",
  "property matters": "जमीन-जायदाद के मामले",
  "help from siblings": "भाई-बहन का सहारा",
  "courage in disputes": "विवाद में हिम्मत",
  "a push to get things done": "काम खत्म करने की तेज ऊर्जा",
  "ambition to grow": "आगे बढ़ने की चाह",
  "restless wanting": "बेचैन चाह",
  "changes linked to travel or abroad": "विदेश से जुड़े बदलाव",
  "wanting to break the old rules": "पुरानी सीमाएं तोड़ने की चाह",
  "wanting it all faster than it comes": "उत्सुकता, धैर्य से आगे निकलना",
  "elders' blessings": "बड़ों का आशीर्वाद",
  "spending smart": "खर्च में समझदारी",
  "family expansion": "परिवार का विस्तार",
  "steady growth": "स्थिर बढ़त",
  "saving for the long term": "लंबी अवधि की बचत",
  "family duty": "परिवार की जिम्मेदारी",
  "building brick by brick": "धीरे-धीरे नींव बनाना",
  "holding on through delays": "देरी में भी टिके रहना",
  "slow but solid results": "धीमे पर मजबूत नतीजे",
  "patient responsibility": "धैर्य वाली जिम्मेदारी",
  "smart conversations at work": "समझदार कामकाजी बातचीत",
  "progress in exams": "पढ़ाई या परीक्षा में प्रगति",
  "clearing paperwork": "कागजी काम निपटाना",
  "handling the small stuff fast": "फुर्तीला प्रबंधन",
  "sorting out messy details": "पेचीदा बातों को सुलझाना",
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
        `${label} టైమ్‌లో ${adF.areas[0]} ఎక్కువగా కనిపిస్తుంది, ${mdF.areas[0]} బ్యాక్‌గ్రౌండ్‌లో నడుస్తుంటుంది.`,
        `ఇది మామూలుగా పని, ఫ్యామిలీ, ఖర్చులు, మనశ్శాంతి, లేదా మీ రోజువారీ మూడ్‌లో కనిపిస్తుంది.`,
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
    () => `${adLord} usually put ${adF.areas[0]} in the spotlight, inside a bigger ${mdLord} chapter.`,
    () =>
      `This was a shorter ${adLord} stretch inside ${mdLord}, so day-to-day life often shifted before the big picture did.`,
  ];
  const follow = [
    () =>
      `You would usually notice it through ${
        adF.areas[1] ?? adF.areas[0]
      }, work tone, family matters, or the way your energy was moving.`,
    () =>
      `Most people notice this stretch in everyday stuff: the mood at home, money choices, conversations, how calm they felt.`,
    () => `If it fits, it fits as how life felt, not as one big dramatic event.`,
    () => `Simple test: did your life actually lean this way back then?`,
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
        `ఈ టైమ్‌లో ${f.areas[0]}, ${f.areas[1]} ఎక్కువగా ముందుకొస్తాయి.`,
        `రోజూ ముందు ${f.mood[0]} కనిపిస్తుంది, తర్వాత మిగతా విషయాల మీద దాని ఎఫెక్ట్ తెలుస్తుంది.`,
        `అంతా అచ్చుగుద్దినట్టు సరిపోనక్కర్లేదు. మొత్తం మీద ఫీల్ సరిపోతే చాలు.`,
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
    () => `This stretch often puts ${f.areas[0]} and ${f.areas[1]} up front. A pattern, not a prophecy.`,
    () =>
      `${f.areas[0]} and ${
        f.areas[1]
      } tend to take centre stage; people usually recognise it only in hindsight.`,
    () =>
      `Look for ${f.areas[0]} mixed in with ${f.areas[1]}. It's a vibe, not a certainty.`,
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
    () => `A rough fit is enough to fine-tune the smaller timings later.`,
    () => `If it lands, keep it in mind. If not, skip it, no guilt.`,
    () => `Roughly right is good enough here. It doesn't need to be perfect.`,
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
