import type { AppLocale } from "./vedic_labels.ts";

export type ShareCardRecord = {
  shareTitle: string;
  shareBody: string;
  shareContext: string;
  shareText: string;
  deepLink: string;
  brandVariant: string;
};

function deepLink(shareId: string): string {
  return `https://muhurta.app/c/${shareId}`;
}

function mark(loc: AppLocale): string {
  if (loc === "te") return "ముహూర్త";
  if (loc === "hi") return "मुहूर्त";
  return "Muhūrta";
}

function text(
  loc: AppLocale,
  key: string,
  fallback = "",
): string {
  const te: Record<string, string> = {
    based_on_phase: "మీ ప్రస్తుత దశ ఆధారంగా",
    based_on_today: "ఈరోజు జ్యోతిష్య సమయంపై ఆధారంగా",
    check_yours: "నీదీ చూడండి",
    past_phase: "నా గత దశ గురించి ఇది చెప్పింది",
    today_line: "ఈరోజు ఒక లైన్",
    purpose: "ఈ పని కోసం ఇది చెప్పింది",
    journey: "నా జీవన దశ గురించి ఇది చెప్పింది",
    remedy: "ఈరోజు నాకు ఇది సూచించింది",
    insight: "ఈ రోజు సూచన",
  };
  const hi: Record<string, string> = {
    based_on_phase: "आपकी मौजूदा दशा के आधार पर",
    based_on_today: "आज के ज्योतिष समय के आधार पर",
    check_yours: "अपना भी देखें",
    past_phase: "मेरे पिछले चरण के बारे में यह कहा",
    today_line: "आज की एक लाइन",
    purpose: "इस काम के लिए यह कहा",
    journey: "मेरे जीवन चरण के बारे में यह कहा",
    remedy: "आज के लिए यह उपाय सुझाया",
    insight: "आज की दिशा",
  };
  const en: Record<string, string> = {
    based_on_phase: "Based on your current phase",
    based_on_today: "Based on today's Jyotish timing",
    check_yours: "Check yours",
    past_phase: "This is what it said about my past phase",
    today_line: "Today's one line",
    purpose: "This is what it said for this purpose",
    journey: "This is what it said about my current life phase",
    remedy: "This is the remedy it suggested for me today",
    insight: "Today’s insight",
  };
  if (loc === "te") return te[key] ?? fallback;
  if (loc === "hi") return hi[key] ?? fallback;
  return en[key] ?? fallback;
}

function listLines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);
}

function fromPayload(
  payload: Record<string, unknown>,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = payload[key];
    if (value == null) continue;
    const textValue = String(value).trim();
    if (textValue.length > 0) return textValue;
  }
  return fallback;
}

export function buildShareCard(
  shareId: string,
  loc: AppLocale,
  sourceType: string,
  payload: Record<string, unknown>,
): ShareCardRecord {
  const link = deepLink(shareId);
  const brand = mark(loc);
  const lines = listLines(payload["sentences"]);

  if (sourceType === "quick_proof") {
    const title = fromPayload(payload, ["title"], "Past phase");
    const body = fromPayload(
      payload,
      ["shareHook", "highlight", "evidenceLine", "periodLabel"],
      title,
    );
    const context = fromPayload(
      payload,
      ["evidenceLine", "periodLabel"],
      text(loc, "based_on_phase", "Based on your current phase"),
    );
    return {
      shareTitle: title,
      shareBody: body,
      shareContext: context,
      shareText: `${brand}\n\n${text(loc, "past_phase", "Past phase")}\n${body}\n\n${
        text(loc, "check_yours", "Check yours")
      }\n${link}`,
      deepLink: link,
      brandVariant: "classic_gold",
    };
  }

  if (sourceType === "today_one_line") {
    const title = text(loc, "today_line", "Today's one line");
    const body = fromPayload(payload, ["shareHook", "oneLine", "title"], title);
    const context = fromPayload(
      payload,
      ["context", "currentLifePeriodLabel"],
      text(loc, "based_on_today", "Based on today's Jyotish timing"),
    );
    return {
      shareTitle: title,
      shareBody: body,
      shareContext: context,
      shareText: `${brand}\n\n${body}\n\n${text(loc, "check_yours", "Check yours")}\n${link}`,
      deepLink: link,
      brandVariant: "classic_gold",
    };
  }

  if (sourceType === "purpose_result") {
    const title = fromPayload(payload, ["headline", "purposeLabel"], "Timing check");
    const body = fromPayload(
      payload,
      ["shareHook", "actionLine", "summary", "timingLine"],
      title,
    );
    const context = fromPayload(payload, ["timingNote"], "");
    return {
      shareTitle: title,
      shareBody: body,
      shareContext: context,
      shareText: `${brand}\n\n${text(loc, "purpose", "Purpose")}\n${body}\n\n${
        text(loc, "check_yours", "Check yours")
      }\n${link}`,
      deepLink: link,
      brandVariant: "classic_gold",
    };
  }

  if (sourceType === "ask_answer") {
    const title = fromPayload(payload, ["title"], "Ask Muhurta");
    const body = fromPayload(
      payload,
      ["shareHook", "directAnswer", "actionLine", "bestTime"],
      title,
    );
    const context = fromPayload(payload, ["bestTime", "betterOption", "question"], "");
    return {
      shareTitle: title,
      shareBody: body,
      shareContext: context,
      shareText: `${brand}\n\n${body}\n\n${text(loc, "check_yours", "Check yours")}\n${link}`,
      deepLink: link,
      brandVariant: "classic_gold",
    };
  }

  if (sourceType === "journey_phase") {
    const title = fromPayload(payload, ["title"], "Journey phase");
    const body = fromPayload(
      payload,
      ["shareHook", "highlight", "evidenceLine", "phasePulse"],
      title,
    );
    const context = fromPayload(
      payload,
      ["transitionNote", "periodLabel"],
      text(loc, "based_on_phase", "Based on your current phase"),
    );
    return {
      shareTitle: title,
      shareBody: body,
      shareContext: context,
      shareText: `${brand}\n\n${text(loc, "journey", "Journey")}\n${body}\n\n${
        text(loc, "check_yours", "Check yours")
      }\n${link}`,
      deepLink: link,
      brandVariant: "classic_gold",
    };
  }

  if (sourceType === "remedy") {
    const title = fromPayload(payload, ["title"], "Today's remedy");
    const body = fromPayload(payload, ["simpleLine", "whatToDo"], title);
    const context = fromPayload(
      payload,
      ["whyNow"],
      text(loc, "based_on_today", "Based on today's Jyotish timing"),
    );
    return {
      shareTitle: title,
      shareBody: body,
      shareContext: context,
      shareText: `${brand}\n\n${text(loc, "remedy", "Remedy")}\n${body}\n\n${
        text(loc, "check_yours", "Check yours")
      }\n${link}`,
      deepLink: link,
      brandVariant: "classic_gold",
    };
  }

  return {
    shareTitle: fromPayload(payload, ["title"], "Muhūrta insight"),
    shareBody: fromPayload(
      payload,
      ["shareHook", "highlight", "body", "summary"],
      lines[0] ?? text(loc, "insight", "Today's insight"),
    ),
    shareContext: fromPayload(
      payload,
      ["context"],
      text(loc, "based_on_today", "Based on today's Jyotish timing"),
    ),
    shareText: `${brand}\n\n${fromPayload(payload, ["title"], text(loc, "insight", "Insight"))}\n${
      fromPayload(payload, ["shareHook", "highlight", "body", "summary"], lines[0] ?? "")
    }\n\n${text(loc, "check_yours", "Check yours")}\n${link}`,
    deepLink: link,
    brandVariant: "classic_gold",
  };
}
