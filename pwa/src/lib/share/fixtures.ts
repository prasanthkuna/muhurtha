import type { CardLocale, CardPayload, CardType } from "@/lib/share/card-types";

type Fx = Record<CardType, CardPayload["data"]>;

const en: Fx = {
  today: { title: "A steady day for finishing what you started", value: "Best: 10:42 AM – 12:10 PM", subtitle: "Friday, 23 October · Hasta nakshatra", body: "Moon in Hasta favours careful hands-on work. Keep new launches out of Rahu Kalam (10:30 AM – 12:00 PM) and close pending tasks before sunset.", chips: ["Tithi: Dwitiya", "Yoga: Vishkambha"], glyph: "sunrise", name: "Prasanth" },
  window: { title: "Best window today", value: "10:42 AM – 12:10 PM", subtitle: "Friday, 23 October", body: "Abhijit-adjacent hour, clear of Rahu Kalam and Yamagandam. Good for signing, calls and first steps.", chips: ["Avoid 3:00–4:30 PM"], glyph: "goodWindow", verdict: "good", name: "Prasanth" },
  chapter: { title: "Jupiter chapter: growth through teaching", value: "2019 – 2035", subtitle: "Now in the Saturn sub-period", body: "A long stretch that rewards study, mentoring and patient building. The current sub-period asks for discipline over speed.", chips: ["Mahadasha: Guru", "Antardasha: Shani"], glyph: "guru", name: "Prasanth", birth: { date: "12 Aug 1990", time: "6:20 AM", place: "Hyderabad" } },
  decode: { title: "Hasta — the skilled hand", value: "Moon in Virgo", subtitle: "Ruled by the Moon · deity Savitr", body: "Practical, witty and good with detail. You make ideas real with your hands and like to see progress you can touch.", chips: ["Pada 2", "Gana: Deva"], glyph: "virgo", name: "Prasanth" },
  timing: { title: "Buying a vehicle on Sat, 31 Oct", value: "Good · 9:05 – 10:35 AM", subtitle: "Score 82 / 100", body: "Strong tithi and a friendly Moon. Avoid 1:30–3:00 PM (Rahu Kalam).", glyph: "kalash", verdict: "good", name: "Prasanth" },
  finddate: { title: "Best dates for griha pravesh", value: "4 Nov · 9 Nov · 16 Nov", subtitle: "Between 1 and 30 November", body: "4 Nov has the cleanest morning (6:48 – 8:20 AM). 9 Nov is the strongest overall.", chips: ["Top score 88"], glyph: "home", verdict: "good", name: "Prasanth" },
  ask: { title: "Is this a good month to change jobs?", body: "The second half of the month is better. Saturn's sub-period favours a planned move over a sudden one — line up the offer before you resign, ideally after the 14th.", glyph: "ask", name: "Prasanth" },
  milestone: { title: "Annaprashana (first rice)", value: "Thu, 5 Nov · 9:12 – 10:40 AM", subtitle: "Around day 165 · Shravana nakshatra", body: "A gentle, well-placed morning for the first feeding ceremony.", glyph: "firstFood", verdict: "good", name: "Sweety" },
};

const te: Fx = {
  today: { title: "మొదలుపెట్టిన పనులు పూర్తి చేయడానికి స్థిరమైన రోజు", value: "మంచి సమయం: ఉ. 10:42 – మ. 12:10", subtitle: "శుక్రవారం, 23 అక్టోబర్ · హస్త నక్షత్రం", body: "హస్తలో చంద్రుడు జాగ్రత్తగా చేసే పనులకు అనుకూలం. రాహుకాలం (ఉ. 10:30 – మ. 12:00) లో కొత్త ప్రారంభాలు వద్దు.", chips: ["తిథి: ద్వితీయ", "యోగం: విష్కంభ"], glyph: "sunrise", name: "ప్రశాంత్" },
  window: { title: "ఈ రోజు మంచి సమయం", value: "ఉ. 10:42 – మ. 12:10", subtitle: "శుక్రవారం, 23 అక్టోబర్", body: "రాహుకాలం, యమగండం లేని సమయం. సంతకాలు, ముఖ్యమైన కాల్స్, కొత్త అడుగులకు అనుకూలం.", chips: ["మ. 3:00–4:30 వద్దు"], glyph: "goodWindow", verdict: "good", name: "ప్రశాంత్" },
  chapter: { title: "గురు దశ: బోధన ద్వారా ఎదుగుదల", value: "2019 – 2035", subtitle: "ప్రస్తుతం శని అంతర్దశ", body: "చదువు, మార్గదర్శనం, ఓపికగా నిర్మించడానికి ఫలితమిచ్చే దీర్ఘ కాలం. వేగం కంటే క్రమశిక్షణ ముఖ్యం.", chips: ["మహాదశ: గురు", "అంతర్దశ: శని"], glyph: "guru", name: "ప్రశాంత్", birth: { date: "12 ఆగ 1990", time: "ఉ. 6:20", place: "హైదరాబాద్" } },
  decode: { title: "హస్త — నైపుణ్యమైన చేయి", value: "కన్యా రాశిలో చంద్రుడు", subtitle: "అధిపతి చంద్రుడు · దేవత సవిత", body: "ఆచరణాత్మకం, చమత్కారం, వివరాలపై శ్రద్ధ. ఆలోచనలను చేతులతో నిజం చేస్తారు.", chips: ["పాదం 2", "గణం: దేవ"], glyph: "virgo", name: "ప్రశాంత్" },
  timing: { title: "శని, 31 అక్టోబర్ వాహన కొనుగోలు", value: "మంచిది · ఉ. 9:05 – 10:35", subtitle: "స్కోరు 82 / 100", body: "బలమైన తిథి, అనుకూల చంద్రుడు. మ. 1:30–3:00 (రాహుకాలం) వద్దు.", glyph: "kalash", verdict: "good", name: "ప్రశాంత్" },
  finddate: { title: "గృహ ప్రవేశానికి మంచి తేదీలు", value: "4 నవం · 9 నవం · 16 నవం", subtitle: "1 – 30 నవంబర్ మధ్య", body: "4 నవంబర్ ఉదయం (ఉ. 6:48 – 8:20) శుభ్రమైన సమయం. 9 నవంబర్ మొత్తం మీద బలమైనది.", chips: ["అత్యధిక స్కోరు 88"], glyph: "home", verdict: "good", name: "ప్రశాంత్" },
  ask: { title: "ఉద్యోగం మారడానికి ఈ నెల మంచిదేనా?", body: "నెల రెండో సగం మంచిది. శని అంతర్దశ ఆకస్మిక మార్పు కంటే ప్రణాళికతో చేసే మార్పుకు అనుకూలం — 14వ తేదీ తర్వాత ఆఫర్ ఖరారు చేసుకుని రాజీనామా చేయండి.", glyph: "ask", name: "ప్రశాంత్" },
  milestone: { title: "అన్నప్రాశన", value: "గురు, 5 నవం · ఉ. 9:12 – 10:40", subtitle: "సుమారు 165వ రోజు · శ్రవణ నక్షత్రం", body: "మొదటి అన్నం పెట్టే వేడుకకు ప్రశాంతమైన, అనుకూలమైన ఉదయం.", glyph: "firstFood", verdict: "good", name: "స్వీటీ" },
};

const hi: Fx = {
  today: { title: "शुरू किए काम पूरे करने का स्थिर दिन", value: "शुभ: सुबह 10:42 – दोपहर 12:10", subtitle: "शुक्रवार, 23 अक्टूबर · हस्त नक्षत्र", body: "हस्त में चंद्रमा सावधानी वाले कामों के लिए अच्छा है। राहुकाल (10:30 – 12:00) में नई शुरुआत न करें।", chips: ["तिथि: द्वितीया", "योग: विष्कंभ"], glyph: "sunrise", name: "प्रशांत" },
  window: { title: "आज का शुभ समय", value: "सुबह 10:42 – दोपहर 12:10", subtitle: "शुक्रवार, 23 अक्टूबर", body: "राहुकाल और यमगंड से मुक्त समय। हस्ताक्षर, ज़रूरी कॉल और नए कदमों के लिए अच्छा।", chips: ["3:00–4:30 से बचें"], glyph: "goodWindow", verdict: "good", name: "प्रशांत" },
  chapter: { title: "गुरु दशा: सिखाने से विकास", value: "2019 – 2035", subtitle: "अभी शनि अंतर्दशा", body: "पढ़ाई, मार्गदर्शन और धैर्य से निर्माण का लंबा समय। गति से ज़्यादा अनुशासन ज़रूरी।", chips: ["महादशा: गुरु", "अंतर्दशा: शनि"], glyph: "guru", name: "प्रशांत", birth: { date: "12 अग 1990", time: "सुबह 6:20", place: "हैदराबाद" } },
  decode: { title: "हस्त — कुशल हाथ", value: "कन्या राशि में चंद्रमा", subtitle: "स्वामी चंद्रमा · देवता सविता", body: "व्यावहारिक, हाज़िरजवाब और बारीकियों पर ध्यान। विचारों को हाथों से साकार करते हैं।", chips: ["पद 2", "गण: देव"], glyph: "virgo", name: "प्रशांत" },
  timing: { title: "शनि, 31 अक्टूबर को वाहन ख़रीद", value: "शुभ · सुबह 9:05 – 10:35", subtitle: "स्कोर 82 / 100", body: "मज़बूत तिथि और अनुकूल चंद्रमा। 1:30–3:00 (राहुकाल) से बचें।", glyph: "kalash", verdict: "good", name: "प्रशांत" },
  finddate: { title: "गृह प्रवेश की शुभ तिथियाँ", value: "4 नव · 9 नव · 16 नव", subtitle: "1 – 30 नवंबर के बीच", body: "4 नवंबर की सुबह (6:48 – 8:20) सबसे साफ़ है। 9 नवंबर कुल मिलाकर सबसे मज़बूत।", chips: ["सर्वोच्च स्कोर 88"], glyph: "home", verdict: "good", name: "प्रशांत" },
  ask: { title: "क्या नौकरी बदलने के लिए यह महीना ठीक है?", body: "महीने का दूसरा हिस्सा बेहतर है। शनि अंतर्दशा अचानक बदलाव से ज़्यादा योजनाबद्ध कदम का साथ देती है — 14 तारीख़ के बाद ऑफ़र पक्का करके इस्तीफ़ा दें।", glyph: "ask", name: "प्रशांत" },
  milestone: { title: "अन्नप्राशन", value: "गुरु, 5 नव · सुबह 9:12 – 10:40", subtitle: "लगभग 165वाँ दिन · श्रवण नक्षत्र", body: "पहले अन्न संस्कार के लिए शांत, अनुकूल सुबह।", glyph: "firstFood", verdict: "good", name: "स्वीटी" },
};

export const FIXTURES: Record<CardLocale, Fx> = { en, te, hi };
