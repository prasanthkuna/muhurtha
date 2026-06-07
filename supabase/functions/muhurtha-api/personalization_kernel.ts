import type { AppLocale } from "./vedic_labels.ts";

export const KERNEL_VERSION = "v4-life-chapter";

export type ForecastScope = "today" | "weekly" | "monthly" | "journey" | "proof";

export type DomainLens = {
  key: string;
  label: string;
  signals: string[];
  cautions: string[];
  actions: string[];
};

export type PurposeLens = {
  purposeType: string;
  domains: DomainLens[];
  supportSignals: string[];
  cautionSignals: string[];
  actionSignals: string[];
  shareSeed: string;
};

export type PersonalizationKernel = {
  version: string;
  locale: AppLocale;
  age?: number;
  lifeStage: string;
  natal: {
    moonSign?: string;
    nakshatra?: string;
    pada?: number | null;
    sunSign?: string;
    archetype: NakshatraArchetype;
    signals: string[];
  };
  period: {
    mahadashaLord?: string;
    antardashaLord?: string;
    nextMahadashaLord?: string;
    stage: string;
    stageRatio?: number;
    remainingMonths?: number;
    startLabel?: string;
    endLabel?: string;
    isDashaSandhi: boolean;
    line: string;
  };
  domains: DomainLens[];
  screenLenses: Record<ForecastScope, DomainLens[]>;
  purposeLenses: Record<string, PurposeLens>;
  personalSignals: string[];
  shareSeed: string;
};

export type PersonalizationInput = {
  locale: AppLocale;
  age?: number;
  birthMoonSign?: string | null;
  birthMoonNakshatra?: string | null;
  nakshatraPada?: number | null;
  sunSign?: string | null;
  mahadashaLord?: string | null;
  antardashaLord?: string | null;
  mahadashaStart?: Date | null;
  mahadashaEnd?: Date | null;
  nextMahadashaLord?: string | null;
  refDate?: Date | null;
};

export type NakshatraArchetype = {
  key: string;
  core: string;
  strength: string;
  shadow: string;
  workStyle: string;
  speechStyle: string;
  relationshipStyle: string;
  stressPattern: string;
  resetStyle: string;
  metaphors: string[];
};

const DEFAULT_ARCHETYPE: NakshatraArchetype = {
  key: "unknown",
  core: "practical timing and emotional pattern awareness",
  strength: "steady follow-through when life becomes real",
  shadow: "carrying pressure privately until it leaks into decisions",
  workStyle: "does better with a clear next step than vague motivation",
  speechStyle: "needs a pause before important words",
  relationshipStyle: "values reliability over showy promises",
  stressPattern: "overthinks when too many people expect answers",
  resetStyle: "small routine, clean room, calm food, early sleep",
  metaphors: ["pressure cooker", "quiet notebook"],
};

const ARCHETYPES: Record<string, NakshatraArchetype> = {
  ashwini: {
    key: "Ashwini",
    core: "quick starts, rescue instinct, and restless freshness",
    strength: "moves first when others are still deciding",
    shadow: "starts too many things before one stabilizes",
    workStyle: "best with short sprints, fast fixes, and visible movement",
    speechStyle: "direct, quick, sometimes too immediate",
    relationshipStyle: "shows care through action more than long explanation",
    stressPattern: "impatience when progress feels slow",
    resetStyle: "movement, breath, sunlight, and one clean action",
    metaphors: ["first responder", "morning horse"],
  },
  bharani: {
    key: "Bharani",
    core: "endurance, boundaries, duty, and private intensity",
    strength: "can carry difficult responsibilities longer than most",
    shadow: "holds resentment when boundaries are ignored",
    workStyle: "strong under deadlines when expectations are clear",
    speechStyle: "controlled until pushed, then very firm",
    relationshipStyle: "loyal, protective, and sensitive to respect",
    stressPattern: "feels trapped when everyone wants something at once",
    resetStyle: "privacy, body discipline, and saying one clean no",
    metaphors: ["locked gate", "deep vessel"],
  },
  krittika: {
    key: "Krittika",
    core: "cutting clarity, standards, and purification",
    strength: "spots what is unnecessary and removes it",
    shadow: "can become harsh when trying to improve things",
    workStyle: "best at review, correction, operations, and quality",
    speechStyle: "sharp, honest, and hard to soften under pressure",
    relationshipStyle: "shows love through improvement and protection",
    stressPattern: "irritation when people avoid obvious truths",
    resetStyle: "clean food, clean plan, clean words",
    metaphors: ["knife edge", "sacred fire"],
  },
  rohini: {
    key: "Rohini",
    core: "growth, comfort, beauty, and steady accumulation",
    strength: "builds value slowly and makes life feel livable",
    shadow: "can cling to comfort after the season has changed",
    workStyle: "best with tangible progress, assets, design, and resources",
    speechStyle: "warm, persuasive, and practical",
    relationshipStyle: "needs affection, reliability, and shared comfort",
    stressPattern: "uneasy when money, food, or home rhythm feels unstable",
    resetStyle: "good meal, slower pace, and practical money clarity",
    metaphors: ["growing field", "well-kept home"],
  },
  mrigashira: {
    key: "Mrigashira",
    core: "searching mind, curiosity, and careful exploration",
    strength: "finds options other people miss",
    shadow: "keeps looking even when a decision is needed",
    workStyle: "best with research, sales, product discovery, and learning",
    speechStyle: "questioning, light, and sometimes indirect",
    relationshipStyle: "needs mental space and honest curiosity",
    stressPattern: "restlessness when one path feels final",
    resetStyle: "walk, list options, choose the next small experiment",
    metaphors: ["deer trail", "open notebook"],
  },
  ardra: {
    key: "Ardra",
    core: "storm, analysis, disruption, and emotional truth",
    strength: "can understand chaos without pretending it is simple",
    shadow: "can stay too long in mental storms",
    workStyle: "best with tech, crisis solving, investigation, and repair",
    speechStyle: "intense, intelligent, and sometimes cutting",
    relationshipStyle: "needs honesty more than surface peace",
    stressPattern: "mental overload, late-night loops, and emotional spikes",
    resetStyle: "name the truth, reduce noise, sleep before replying",
    metaphors: ["monsoon storm", "server room"],
  },
  punarvasu: {
    key: "Punarvasu",
    core: "return, renewal, teaching, and second chances",
    strength: "can restart after disappointment without becoming bitter",
    shadow: "repeats old loops if the lesson is not named",
    workStyle: "best with teaching, mentoring, writing, and rebuilding",
    speechStyle: "reassuring, explanatory, and hopeful",
    relationshipStyle: "forgiving, but needs sincerity after conflict",
    stressPattern: "feels tired when the same issue comes back again",
    resetStyle: "simplify, return home, restart with one honest rule",
    metaphors: ["returning arrow", "lamp relit"],
  },
  pushya: {
    key: "Pushya",
    core: "nourishment, duty, guidance, and social trust",
    strength: "supports others while keeping structure",
    shadow: "over-gives until resentment or fatigue appears",
    workStyle: "best with management, service, advising, and caretaking",
    speechStyle: "measured, protective, and authority-aware",
    relationshipStyle: "shows love through duty and consistency",
    stressPattern: "parental pressure, family duty, or team dependence",
    resetStyle: "boundaries, prayer, warm food, and a realistic schedule",
    metaphors: ["temple lamp", "milk vessel"],
  },
  ashlesha: {
    key: "Ashlesha",
    core: "depth, instinct, privacy, and emotional intelligence",
    strength: "reads hidden motives and protects what matters",
    shadow: "can become guarded, suspicious, or mentally entangled",
    workStyle: "best with strategy, research, psychology, and confidential work",
    speechStyle: "subtle, precise, and hard to read when hurt",
    relationshipStyle: "needs trust before full openness",
    stressPattern: "loops around what was implied but not said",
    resetStyle: "detox from noise, write the truth, release control",
    metaphors: ["coiled serpent", "locked room"],
  },
  magha: {
    key: "Magha",
    core: "status, lineage, respect, and visible responsibility",
    strength: "steps into authority when dignity is required",
    shadow: "ego pain when respect feels missing",
    workStyle: "best with leadership, legacy, administration, and public roles",
    speechStyle: "formal, proud, and status-aware",
    relationshipStyle: "needs respect for family, tradition, and contribution",
    stressPattern: "pressure around recognition, elders, or family name",
    resetStyle: "serve elders, reduce pride, choose dignity over drama",
    metaphors: ["ancestral seat", "royal seal"],
  },
  purva_phalguni: {
    key: "Purva Phalguni",
    core: "pleasure, creativity, romance, and social ease",
    strength: "brings warmth, charm, and artistic ease",
    shadow: "postpones hard decisions when comfort is available",
    workStyle: "best with creative presentation, hospitality, and people energy",
    speechStyle: "warm, playful, and persuasive",
    relationshipStyle: "needs affection, beauty, and shared enjoyment",
    stressPattern: "avoids dull responsibilities until they pile up",
    resetStyle: "beauty, rest, honest pleasure, then one adult task",
    metaphors: ["festival courtyard", "soft cushion"],
  },
  uttara_phalguni: {
    key: "Uttara Phalguni",
    core: "agreements, duty, support, and lasting alliances",
    strength: "turns goodwill into stable commitment",
    shadow: "can feel trapped by promises made too quickly",
    workStyle: "best with contracts, HR, partnerships, and long service",
    speechStyle: "clear, responsible, and relationship-aware",
    relationshipStyle: "needs loyalty, fairness, and shared duty",
    stressPattern: "agreement pressure, paperwork, and expectation load",
    resetStyle: "review commitments, renegotiate cleanly, keep only what is true",
    metaphors: ["signed paper", "shared umbrella"],
  },
  hasta: {
    key: "Hasta",
    core: "precision, craft, hands-on skill, and practical intelligence",
    strength: "turns messy details into something usable",
    shadow: "over-corrects, overthinks, or tries to control every small piece",
    workStyle: "best with coding, craft, writing, repair, systems, and execution",
    speechStyle: "clever, precise, and sometimes too corrective",
    relationshipStyle: "shows care by fixing, arranging, and making life easier",
    stressPattern: "perfection pressure when the result carries their name",
    resetStyle: "hands-on work, clean checklist, stop at good enough",
    metaphors: ["artisan hand", "well-folded cloth"],
  },
  chitra: {
    key: "Chitra",
    core: "design, image, structure, and striking presentation",
    strength: "can make things look and feel premium",
    shadow: "may overfocus on appearance when the foundation needs work",
    workStyle: "best with design, engineering, branding, and public presentation",
    speechStyle: "polished, visual, and exacting",
    relationshipStyle: "needs admiration, beauty, and intelligent exchange",
    stressPattern: "image pressure, comparison, and high personal standards",
    resetStyle: "repair the structure before decorating the surface",
    metaphors: ["architect sketch", "cut gemstone"],
  },
  swati: {
    key: "Swati",
    core: "independence, movement, trade, and flexible intelligence",
    strength: "adapts quickly without losing direction",
    shadow: "can drift when freedom has no anchor",
    workStyle: "best with sales, freelancing, business, media, and negotiation",
    speechStyle: "breezy, diplomatic, and sometimes noncommittal",
    relationshipStyle: "needs space and respect for independence",
    stressPattern: "pressure when people demand instant commitment",
    resetStyle: "choose one anchor, then move freely around it",
    metaphors: ["wind path", "market lane"],
  },
  vishakha: {
    key: "Vishakha",
    core: "goal hunger, focus, ambition, and intense pursuit",
    strength: "keeps going toward a target after others lose steam",
    shadow: "can let appetite outrun patience or peace",
    workStyle: "best with growth, competition, sales, strategy, and achievement",
    speechStyle: "convincing, goal-focused, and sometimes forceful",
    relationshipStyle: "needs shared ambition and honest loyalty",
    stressPattern: "impatience when results are delayed",
    resetStyle: "define the target, reduce excess, protect peace of mind",
    metaphors: ["two-branched goalpost", "burning lamp"],
  },
  anuradha: {
    key: "Anuradha",
    core: "loyalty, friendship, devotion, and network strength",
    strength: "builds bonds that survive difficulty",
    shadow: "can carry emotional loyalty after it becomes heavy",
    workStyle: "best with teams, clients, communities, and long alliances",
    speechStyle: "warm, diplomatic, and emotionally observant",
    relationshipStyle: "needs loyalty, respect, and emotional consistency",
    stressPattern: "friendship or family duty pulling against personal needs",
    resetStyle: "one honest conversation and one boundary",
    metaphors: ["friend circle", "devotional thread"],
  },
  jyeshtha: {
    key: "Jyeshtha",
    core: "seniority, protection, control, and responsibility",
    strength: "handles pressure when others look for someone capable",
    shadow: "can become controlling when afraid of losing ground",
    workStyle: "best with leadership, sensitive issues, and crisis ownership",
    speechStyle: "authoritative, strategic, and sometimes defensive",
    relationshipStyle: "needs respect for burden carried silently",
    stressPattern: "feels alone with too much responsibility",
    resetStyle: "delegate one thing and speak without proving seniority",
    metaphors: ["elder's staff", "protective umbrella"],
  },
  mula: {
    key: "Mula",
    core: "root truth, endings, research, and fearless simplification",
    strength: "goes to the root instead of decorating the problem",
    shadow: "can break things before knowing what should replace them",
    workStyle: "best with research, debugging, investigation, and transformation",
    speechStyle: "blunt, penetrating, and truth-first",
    relationshipStyle: "needs honesty and room for deep change",
    stressPattern: "restless when life asks for half-truths",
    resetStyle: "remove one false thing and ground the body",
    metaphors: ["uprooted tree", "root cellar"],
  },
  purva_ashadha: {
    key: "Purva Ashadha",
    core: "conviction, enthusiasm, persuasion, and emotional victory",
    strength: "can rally people behind a belief",
    shadow: "can overstate confidence before proof is ready",
    workStyle: "best with campaigns, teaching, launches, and public conviction",
    speechStyle: "inspiring, emotional, and persuasive",
    relationshipStyle: "needs belief, encouragement, and shared direction",
    stressPattern: "defensiveness when opinions are challenged",
    resetStyle: "listen once before convincing twice",
    metaphors: ["victory banner", "river wave"],
  },
  uttara_ashadha: {
    key: "Uttara Ashadha",
    core: "lasting victory, discipline, ethics, and long reputation",
    strength: "wins slowly by doing the right thing repeatedly",
    shadow: "can become rigid or too heavy with duty",
    workStyle: "best with institutions, management, planning, and long projects",
    speechStyle: "principled, calm, and serious",
    relationshipStyle: "needs reliability and shared values",
    stressPattern: "pressure to be correct, responsible, and respected",
    resetStyle: "choose the long game, but reduce one unnecessary burden",
    metaphors: ["stone pillar", "oath"],
  },
  shravana: {
    key: "Shravana",
    core: "listening, learning, reputation, and social message",
    strength: "hears what matters and turns it into useful guidance",
    shadow: "can worry too much about what people heard or said",
    workStyle: "best with communication, teaching, operations, and advisory roles",
    speechStyle: "careful, observant, and reputation-aware",
    relationshipStyle: "needs to feel heard before responding fully",
    stressPattern: "rumours, status anxiety, or too much incoming information",
    resetStyle: "reduce noise, confirm facts, then speak once",
    metaphors: ["listening ear", "temple bell"],
  },
  dhanishta: {
    key: "Dhanishta",
    core: "rhythm, resources, group energy, and achievement",
    strength: "can coordinate people, money, and timing",
    shadow: "can push pace faster than the body or family can carry",
    workStyle: "best with teams, music/rhythm, operations, money, and execution",
    speechStyle: "practical, rhythmic, and achievement-focused",
    relationshipStyle: "needs shared momentum and respect for contribution",
    stressPattern: "resource pressure, group demands, or work-life imbalance",
    resetStyle: "slow the rhythm and protect the body",
    metaphors: ["drumbeat", "shared treasury"],
  },
  shatabhisha: {
    key: "Shatabhisha",
    core: "systems, healing, distance, technology, and hidden repair",
    strength: "can diagnose broken systems without drama",
    shadow: "can isolate when help would make repair easier",
    workStyle: "best with tech, analytics, medicine-adjacent systems, and privacy",
    speechStyle: "cool, factual, and sometimes detached",
    relationshipStyle: "needs privacy and intellectual honesty",
    stressPattern: "withdrawal, screen fatigue, or solving too much alone",
    resetStyle: "offline time, water, sleep, and one trusted conversation",
    metaphors: ["hundred healers", "closed lab"],
  },
  purva_bhadrapada: {
    key: "Purva Bhadrapada",
    core: "intensity, ideals, sacrifice, and inner fire",
    strength: "can commit deeply when the cause feels meaningful",
    shadow: "can swing between extremes when disappointed",
    workStyle: "best with research, spirituality, strategy, and meaningful change",
    speechStyle: "serious, philosophical, and intense",
    relationshipStyle: "needs depth, loyalty, and emotional truth",
    stressPattern: "all-or-nothing thinking under pressure",
    resetStyle: "cool the fire with routine and one practical act",
    metaphors: ["single flame", "two-faced threshold"],
  },
  uttara_bhadrapada: {
    key: "Uttara Bhadrapada",
    core: "depth, patience, protection, and quiet endurance",
    strength: "can stay steady through emotionally heavy seasons",
    shadow: "can become too silent about what hurts",
    workStyle: "best with deep work, counselling, research, and long care",
    speechStyle: "slow, thoughtful, and emotionally contained",
    relationshipStyle: "needs trust, calm, and depth",
    stressPattern: "carrying old heaviness without naming it",
    resetStyle: "water, rest, honest prayer, and slow conversation",
    metaphors: ["deep ocean", "sleeping serpent"],
  },
  revati: {
    key: "Revati",
    core: "guidance, completion, compassion, and safe passage",
    strength: "helps people and plans reach a gentle finish",
    shadow: "can over-help or drift when closure is needed",
    workStyle: "best with guidance, travel, support, design, and finishing touches",
    speechStyle: "kind, guiding, and sometimes avoidant",
    relationshipStyle: "needs softness, trust, and emotional safety",
    stressPattern: "confusion when too many endings overlap",
    resetStyle: "finish one loose end and return to simple care",
    metaphors: ["safe road", "shepherd's lamp"],
  },
};

const DOMAIN_LIBRARY: Record<string, DomainLens> = {
  career: {
    key: "career",
    label: "Career / Work",
    signals: ["boss pressure", "skill growth", "visibility", "follow-through"],
    cautions: ["sharp words with seniors", "taking too many tasks"],
    actions: ["prepare notes before calls", "show one finished output"],
  },
  business: {
    key: "business",
    label: "Business / Clients",
    signals: ["client follow-up", "pricing", "launch timing", "partnership clarity"],
    cautions: ["over-expansion", "unclear promises"],
    actions: ["send a concise proposal", "confirm scope in writing"],
  },
  money: {
    key: "money",
    label: "Money",
    signals: ["payment follow-up", "savings discipline", "expense pressure"],
    cautions: ["impulse spend", "risky shortcuts"],
    actions: ["ask clearly", "write the amount and due date"],
  },
  relationship: {
    key: "relationship",
    label: "Relationship",
    signals: ["tone", "reconciliation", "family approval", "emotional timing"],
    cautions: ["defensive replies", "demanding instant answers"],
    actions: ["speak after calming down", "keep one clear ask"],
  },
  family: {
    key: "family",
    label: "Family / Home",
    signals: ["elder support", "home peace", "decision burden"],
    cautions: ["turning preparation into confrontation", "old issue reopening"],
    actions: ["choose a calm window", "start with practical details"],
  },
  health: {
    key: "health",
    label: "Body / Mind",
    signals: ["sleep rhythm", "energy", "anger control", "recovery"],
    cautions: ["overwork", "late-night overthinking"],
    actions: ["slow the pace", "protect food, water, and sleep"],
  },
  education: {
    key: "education",
    label: "Study / Learning",
    signals: ["revision", "mentor support", "focus", "certification"],
    cautions: ["scattered study", "last-minute panic"],
    actions: ["revise one topic", "ask one clear doubt"],
  },
  travel: {
    key: "travel",
    label: "Travel",
    signals: ["departure timing", "documents", "delay handling"],
    cautions: ["rushed start", "argument before travel"],
    actions: ["check documents", "leave a buffer"],
  },
  property: {
    key: "property",
    label: "Property / Vehicle",
    signals: ["site visit", "agreement review", "advance payment"],
    cautions: ["signing without checking", "rushed booking"],
    actions: ["verify papers", "take a second opinion"],
  },
  spiritual: {
    key: "spiritual",
    label: "Spiritual / Remedy",
    signals: ["silence", "seva", "prayer", "sattvic reset"],
    cautions: ["making remedy complicated", "fear-based action"],
    actions: ["do one simple act", "keep the intention clean"],
  },
  personality: {
    key: "personality",
    label: "Personality Mirror",
    signals: ["decision style", "speech pattern", "stress response"],
    cautions: ["acting from old pressure", "needing everyone to understand"],
    actions: ["name the real pressure", "choose one grounded response"],
  },
};

const LORD_DOMAIN_KEYS: Record<string, string[]> = {
  Sun: ["career", "family", "health", "personality"],
  Moon: ["family", "relationship", "health", "spiritual"],
  Mars: ["property", "career", "health", "legal"],
  Mercury: ["career", "business", "education", "money"],
  Jupiter: ["money", "family", "education", "spiritual"],
  Venus: ["relationship", "family", "money", "creative"],
  Saturn: ["career", "family", "money", "health"],
  Rahu: ["career", "business", "travel", "personality"],
  Ketu: ["spiritual", "health", "personality", "family"],
};

const PURPOSE_DOMAIN_KEYS: Record<string, string[]> = {
  career_interview: ["career", "education", "personality"],
  business_launch: ["business", "money", "career"],
  money_talk: ["money", "family", "business"],
  property_vehicle: ["property", "money", "family"],
  relationship_marriage_talk: ["relationship", "family", "personality"],
  family_discussion: ["family", "relationship", "money"],
  travel: ["travel", "health", "family"],
  study_exam: ["education", "career", "health"],
  health_routine: ["health", "spiritual", "personality"],
  legal_dispute: ["career", "property", "family"],
  spiritual_puja: ["spiritual", "family", "health"],
  creative_public: ["business", "career", "relationship"],
};

function normalizedNakshatraKey(name?: string | null): string {
  return (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function monthYearLabel(date?: Date | null): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function pickDomains(keys: string[], max = 5): DomainLens[] {
  return unique(keys)
    .map((key) => DOMAIN_LIBRARY[key])
    .filter(Boolean)
    .slice(0, max);
}

const DOMAIN_LABELS: Record<string, Record<AppLocale, string>> = {
  career: { en: "Career / Work", te: "పని / కెరీర్", hi: "काम / करियर" },
  business: { en: "Business / Clients", te: "వ్యాపారం / క్లయింట్లు", hi: "व्यापार / क्लाइंट" },
  money: { en: "Money", te: "డబ్బు", hi: "पैसा" },
  relationship: { en: "Relationship", te: "సంబంధం", hi: "रिश्ता" },
  family: { en: "Family / Home", te: "కుటుంబం / ఇల్లు", hi: "परिवार / घर" },
  health: { en: "Body / Mind", te: "శరీరం / మనసు", hi: "शरीर / मन" },
  education: { en: "Study / Learning", te: "చదువు / నేర్చుకోవడం", hi: "पढ़ाई / सीखना" },
  travel: { en: "Travel", te: "ప్రయాణం", hi: "यात्रा" },
  property: { en: "Property / Vehicle", te: "ఆస్తి / వాహనం", hi: "प्रॉपर्टी / वाहन" },
  spiritual: { en: "Spiritual / Remedy", te: "పూజ / పరిహారం", hi: "पूजा / उपाय" },
  personality: { en: "Your pattern", te: "మీ స్వభావం", hi: "आपका स्वभाव" },
};

const SHORT_ACTIONS: Record<string, Record<AppLocale, string[]>> = {
  career: {
    en: ["prepare notes", "finish one output"],
    te: ["నోట్స్ సిద్ధం చేయండి", "ఒక పని పూర్తి చేయండి"],
    hi: ["नोट्स तैयार रखें", "एक काम पूरा करें"],
  },
  money: {
    en: ["ask clearly", "write the amount"],
    te: ["స్పష్టంగా అడగండి", "మొత్తం రాసుకోండి"],
    hi: ["साफ पूछें", "रकम लिख लें"],
  },
  family: {
    en: ["speak calmly", "start with facts"],
    te: ["శాంతంగా మాట్లాడండి", "ముందు విషయాన్ని చెప్పండి"],
    hi: ["शांति से बोलें", "पहले बात साफ रखें"],
  },
  relationship: {
    en: ["reply after calming down", "keep one ask"],
    te: ["శాంతమైన తర్వాత చెప్పండి", "ఒక్క మాటపై ఉండండి"],
    hi: ["शांत होकर जवाब दें", "एक ही बात रखें"],
  },
  property: {
    en: ["check papers", "take a second look"],
    te: ["పేపర్లు చెక్ చేయండి", "మరొకసారి చూసుకోండి"],
    hi: ["कागज जांचें", "एक बार और देखें"],
  },
  health: {
    en: ["slow down", "protect sleep"],
    te: ["నెమ్మదిగా చేయండి", "నిద్రను కాపాడుకోండి"],
    hi: ["धीरे चलें", "नींद बचाएं"],
  },
  business: {
    en: ["keep scope clear", "follow up simply"],
    te: ["స్కోప్ క్లియర్‌గా ఉంచండి", "సింపుల్‌గా ఫాలో అప్ చేయండి"],
    hi: ["स्कोप साफ रखें", "सीधा फॉलोअप करें"],
  },
  personality: {
    en: ["name the pressure", "stop at enough"],
    te: ["ఒత్తిడిని గుర్తించండి", "చాలు అనిపించిన దగ్గర ఆపండి"],
    hi: ["दबाव को पहचानें", "जहां काफी हो वहां रुकें"],
  },
};

const SHORT_CAUTIONS: Record<string, Record<AppLocale, string[]>> = {
  career: {
    en: ["sharp words", "too many tasks"],
    te: ["కఠినమైన మాటలు", "చాలా పనులు ఒకేసారి"],
    hi: ["तेज शब्द", "बहुत काम एक साथ"],
  },
  money: {
    en: ["impulse spend", "risky shortcuts"],
    te: ["తొందర ఖర్చు", "షార్ట్‌కట్ రిస్క్"],
    hi: ["जल्दी खर्च", "शॉर्टकट रिस्क"],
  },
  family: {
    en: ["old issue reopening", "heated tone"],
    te: ["పాత విషయం మళ్లీ రావడం", "వేడి మాటలు"],
    hi: ["पुरानी बात खुलना", "गरम लहजा"],
  },
  relationship: {
    en: ["defensive replies", "forcing answers"],
    te: ["డిఫెన్సివ్ రిప్లైలు", "జవాబు బలవంతం చేయడం"],
    hi: ["डिफेंसिव जवाब", "जवाब जबरदस्ती लेना"],
  },
  property: {
    en: ["signing fast", "rushed booking"],
    te: ["త్వరగా సైన్ చేయడం", "తొందర బుకింగ్"],
    hi: ["जल्दी साइन", "जल्दी बुकिंग"],
  },
  health: {
    en: ["overwork", "late-night thinking"],
    te: ["అతి పని", "రాత్రి ఎక్కువ ఆలోచన"],
    hi: ["ज्यादा काम", "रात की सोच"],
  },
  business: {
    en: ["overpromising", "unclear deal"],
    te: ["ఎక్కువ మాట ఇవ్వడం", "క్లియర్ కాని డీల్"],
    hi: ["ज्यादा वादा", "अधूरी डील"],
  },
  personality: {
    en: ["perfection pressure", "old pressure"],
    te: ["పర్ఫెక్షన్ ఒత్తిడి", "పాత ఒత్తిడి"],
    hi: ["परफेक्शन दबाव", "पुराना दबाव"],
  },
};

function localizeDomains(domains: DomainLens[], loc: AppLocale): DomainLens[] {
  if (loc === "en") return domains;
  return domains.map((domain) => ({
    ...domain,
    label: DOMAIN_LABELS[domain.key]?.[loc] ?? domain.label,
    signals: [
      ...(SHORT_ACTIONS[domain.key]?.[loc] ?? []),
      ...(SHORT_CAUTIONS[domain.key]?.[loc] ?? []),
    ].slice(0, 4),
    actions: SHORT_ACTIONS[domain.key]?.[loc] ?? domain.actions,
    cautions: SHORT_CAUTIONS[domain.key]?.[loc] ?? domain.cautions,
  }));
}

function lifeStage(age?: number): string {
  if (!Number.isFinite(age ?? NaN)) return "adult practical decisions";
  const n = age!;
  if (n <= 22) return "study, confidence, identity, and early direction";
  if (n <= 32) return "career build, money structure, and relationship clarity";
  if (n <= 42) return "consolidation, family responsibility, stable money, and meaningful work";
  if (n <= 55) return "authority, assets, health discipline, and long-term stability";
  return "peace of mind, family guidance, health steadiness, and legacy";
}

function periodStage(input: PersonalizationInput) {
  const start = input.mahadashaStart?.getTime();
  const end = input.mahadashaEnd?.getTime();
  const now = (input.refDate ?? new Date()).getTime();
  if (!start || !end || end <= start) {
    return {
      stage: "current life-period",
      ratio: undefined,
      remainingMonths: undefined,
      isDashaSandhi: false,
    };
  }
  const ratio = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const remainingMonths = Math.max(0, (end - now) / (1000 * 60 * 60 * 24 * 30.4375));
  const stage = ratio < 0.18 ? "entry" : ratio < 0.5 ? "build" : ratio < 0.82 ? "peak" : "release";
  return {
    stage,
    ratio,
    remainingMonths: Math.round(remainingMonths * 10) / 10,
    isDashaSandhi: remainingMonths <= 18 || ratio >= 0.9,
  };
}

function periodLine(input: PersonalizationInput, stage: string, isSandhi: boolean): string {
  const md = input.mahadashaLord ?? "current";
  const ad = input.antardashaLord ?? md;
  const next = input.nextMahadashaLord;
  if (isSandhi && next) {
    return `${md} is in its closing stretch, so ${ad} topics need completion before the ${next} chapter opens.`;
  }
  return `${md}-${ad} is the active life-period blend, with the ${stage} part shaping daily decisions.`;
}

function screenKeys(scope: ForecastScope, base: string[]): string[] {
  if (scope === "today") return unique(["personality", ...base, "health"]).slice(0, 4);
  if (scope === "weekly") return unique(["career", "money", "family", ...base]).slice(0, 5);
  if (scope === "monthly") {
    return unique(["career", "money", "relationship", "family", ...base]).slice(0, 5);
  }
  if (scope === "journey") return unique([...base, "personality", "family", "career"]).slice(0, 5);
  return unique(["personality", ...base, "family", "career"]).slice(0, 5);
}

function purposeLens(purposeType: string, kernelBase: {
  archetype: NakshatraArchetype;
  stage: string;
  lifeStage: string;
  periodLine: string;
  locale: AppLocale;
}): PurposeLens {
  const domains = localizeDomains(
    pickDomains(PURPOSE_DOMAIN_KEYS[purposeType] ?? ["career", "money", "family"], 4),
    kernelBase.locale,
  );
  const supportSignals = unique([
    ...domains.flatMap((d) => d.signals.slice(0, 2)),
    kernelBase.archetype.strength,
    kernelBase.lifeStage,
  ]).slice(0, 6);
  const cautionSignals = unique([
    ...domains.flatMap((d) => d.cautions.slice(0, 1)),
    kernelBase.archetype.shadow,
  ]).slice(0, 5);
  const actionSignals = unique([
    ...domains.flatMap((d) => d.actions.slice(0, 1)),
    kernelBase.archetype.resetStyle,
  ]).slice(0, 5);
  const domainName = domains[0]?.label ?? "this decision";
  return {
    purposeType,
    domains,
    supportSignals,
    cautionSignals,
    actionSignals,
    shareSeed: `${domainName}: choose timing that protects ${kernelBase.archetype.speechStyle}.`,
  };
}

export function buildPersonalizationKernel(input: PersonalizationInput): PersonalizationKernel {
  const archetype = ARCHETYPES[normalizedNakshatraKey(input.birthMoonNakshatra)] ??
    DEFAULT_ARCHETYPE;
  const stageInfo = periodStage(input);
  const stageLine = periodLine(input, stageInfo.stage, stageInfo.isDashaSandhi);
  const baseKeys = unique([
    ...(LORD_DOMAIN_KEYS[input.antardashaLord ?? ""] ?? []),
    ...(LORD_DOMAIN_KEYS[input.mahadashaLord ?? ""] ?? []),
    "personality",
  ]);
  const domains = localizeDomains(pickDomains(baseKeys, 6), input.locale);
  const life = lifeStage(input.age);
  const screenLenses = {
    today: localizeDomains(pickDomains(screenKeys("today", baseKeys), 5), input.locale),
    weekly: localizeDomains(pickDomains(screenKeys("weekly", baseKeys), 5), input.locale),
    monthly: localizeDomains(pickDomains(screenKeys("monthly", baseKeys), 5), input.locale),
    journey: localizeDomains(pickDomains(screenKeys("journey", baseKeys), 5), input.locale),
    proof: localizeDomains(pickDomains(screenKeys("proof", baseKeys), 5), input.locale),
  };
  const baseForPurpose = {
    archetype,
    stage: stageInfo.stage,
    lifeStage: life,
    periodLine: stageLine,
    locale: input.locale,
  };
  const purposeLenses = Object.keys(PURPOSE_DOMAIN_KEYS).reduce<Record<string, PurposeLens>>(
    (acc, purposeType) => {
      acc[purposeType] = purposeLens(purposeType, baseForPurpose);
      return acc;
    },
    {},
  );
  const personalSignals = unique([
    archetype.core,
    archetype.workStyle,
    archetype.stressPattern,
    life,
    stageLine,
  ]);
  const shareSeed = input.locale === "te"
    ? `${archetype.key}: పాత పని పూర్తి చేసి తర్వాతి అడుగు వేయండి.`
    : input.locale === "hi"
      ? `${archetype.key}: पुराना काम साफ करके अगला कदम लें.`
      : `${archetype.key}: ${archetype.strength}; today should respect ${archetype.stressPattern}.`;
  return {
    version: KERNEL_VERSION,
    locale: input.locale,
    age: input.age,
    lifeStage: life,
    natal: {
      moonSign: input.birthMoonSign ?? undefined,
      nakshatra: input.birthMoonNakshatra ?? undefined,
      pada: input.nakshatraPada,
      sunSign: input.sunSign ?? undefined,
      archetype,
      signals: [
        archetype.core,
        archetype.strength,
        archetype.shadow,
        archetype.workStyle,
        archetype.relationshipStyle,
        archetype.stressPattern,
      ],
    },
    period: {
      mahadashaLord: input.mahadashaLord ?? undefined,
      antardashaLord: input.antardashaLord ?? undefined,
      nextMahadashaLord: input.nextMahadashaLord ?? undefined,
      stage: stageInfo.stage,
      stageRatio: stageInfo.ratio,
      remainingMonths: stageInfo.remainingMonths,
      startLabel: monthYearLabel(input.mahadashaStart),
      endLabel: monthYearLabel(input.mahadashaEnd),
      isDashaSandhi: stageInfo.isDashaSandhi,
      line: stageLine,
    },
    domains,
    screenLenses,
    purposeLenses,
    personalSignals,
    shareSeed,
  };
}
