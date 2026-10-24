/**
 * Server-side Bond / Calendar push phrases (reviewed phrase bank; no LLM).
 * ─── Telugu strings live only in this file and in pwa/src/lib/messages-bond.ts ───
 * Neutral partner wording (spouses and lovers alike); never fatalistic.
 */
export type BondLocale = "en" | "te" | "hi";
export type HeadsUpType = "warm" | "soft" | "support_a" | "support_b" | "talk";

type Copy = {
  monthReadyTitle: string;
  monthReadyBody: (partner: string) => string;
  open: string;
  headsUp: Record<HeadsUpType, { title: string; body: (partner: string) => string }>;
};

export const BOND_PUSH: Record<BondLocale, Copy> = {
  en: {
    monthReadyTitle: "Your couple guide for the month is ready",
    monthReadyBody: (p) => `Warm days, soft days and one small thing to try with ${p}. Open Bond.`,
    open: "Open Bond",
    headsUp: {
      warm: { title: "Tomorrow is a warm day for you two", body: (p) => `A good day to plan time with ${p} — a walk, a meal, a long talk.` },
      soft: { title: "Tomorrow: go gentle with each other", body: () => "Moods may run thin. Keep plans light and big talks for another day." },
      support_a: { title: "Tomorrow may feel heavy for you", body: (p) => `Tell ${p} early if you need space. Small kindness goes a long way.` },
      support_b: { title: "Tomorrow, be there for your partner", body: (p) => `${p} may feel low tomorrow. A check-in message will mean a lot.` },
      talk: { title: "Tomorrow is good for the talk you have been saving", body: (p) => `Clear, calm words land well with ${p} tomorrow.` },
    },
  },
  te: {
    monthReadyTitle: "ఈ నెల మీ జంట గైడ్ రెడీ",
    monthReadyBody: (p) => `${p}తో ప్రేమగా గడిపే రోజులు, జాగ్రత్త రోజులు, ఒక చిన్న ప్రయత్నం — Bond లో చూడండి.`,
    open: "Bond తెరవండి",
    headsUp: {
      warm: { title: "రేపు మీ ఇద్దరికీ మంచి రోజు", body: (p) => `${p}తో టైమ్ ప్లాన్ చేయండి — నడక, భోజనం, మనసు విప్పి మాట.` },
      soft: { title: "రేపు ఒకరితో ఒకరు సున్నితంగా", body: () => "మూడ్స్ త్వరగా మారొచ్చు. ప్లాన్లు తేలికగా, పెద్ద చర్చలు ఇంకో రోజు." },
      support_a: { title: "రేపు మీకు కొంచెం బరువుగా అనిపించొచ్చు", body: (p) => `స్పేస్ కావాలంటే ${p}కి ముందే చెప్పండి. చిన్న ప్రేమ చాలు.` },
      support_b: { title: "రేపు మీ భాగస్వామికి తోడుగా ఉండండి", body: (p) => `రేపు ${p} కొంచెం డల్‌గా ఉండొచ్చు. ఒక చిన్న మెసేజ్ చాలా అర్థం.` },
      talk: { title: "దాచుకున్న మాట రేపు చెప్పొచ్చు", body: (p) => `రేపు ${p}తో ప్రశాంతంగా మాట్లాడితే బాగా అర్థమవుతుంది.` },
    },
  },
  hi: {
    monthReadyTitle: "इस महीने की आपकी कपल गाइड तैयार है",
    monthReadyBody: (p) => `${p} के साथ अच्छे दिन, नरम दिन और एक छोटी कोशिश — Bond खोलें।`,
    open: "Bond खोलें",
    headsUp: {
      warm: { title: "कल आप दोनों के लिए अच्छा दिन है", body: (p) => `${p} के साथ समय तय करें — सैर, खाना या लंबी बात।` },
      soft: { title: "कल एक-दूसरे के साथ नरमी रखें", body: () => "मूड जल्दी बदल सकता है। योजनाएँ हल्की रखें, बड़ी बातें किसी और दिन।" },
      support_a: { title: "कल आपको थोड़ा भारी लग सकता है", body: (p) => `ज़रूरत हो तो ${p} को पहले बता दें। छोटी सी नरमी काफ़ी है।` },
      support_b: { title: "कल अपने साथी का साथ दें", body: (p) => `कल ${p} थोड़ा उदास महसूस कर सकते हैं। एक छोटा संदेश बहुत मायने रखेगा।` },
      talk: { title: "कल वह बात करने का अच्छा दिन है", body: (p) => `कल ${p} से शांत, साफ़ बात अच्छी तरह पहुँचेगी।` },
    },
  },
};

export function bondLoc(raw: string | null | undefined): BondLocale {
  return raw === "te" || raw === "hi" ? raw : "en";
}
