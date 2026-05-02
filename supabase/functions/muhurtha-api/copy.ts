/** Plain-language lived experience only — no chart jargon (PRD §6.11). */
const FLAVOR: Record<string, { areas: string[]; mood: string[] }> = {
  Ketu: {
    areas: ["closure", "inner sorting", "what you are ready to release"],
    mood: ["quieter priorities", "less appetite for noise"],
  },
  Venus: {
    areas: ["relationships", "comfort", "money rhythm"],
    mood: ["what feels worthwhile", "repairing trust in small ways"],
  },
  Sun: {
    areas: ["visibility", "responsibility", "energy management"],
    mood: ["showing up even when it is inconvenient"],
  },
  Moon: {
    areas: ["emotional rhythm", "home and caretaking"],
    mood: ["nesting instincts", "mood-sensitive decisions"],
  },
  Mars: {
    areas: ["push", "disputes", "courage under pressure"],
    mood: ["sharp timing—small sparks can grow fast"],
  },
  Rahu: {
    areas: ["hunger for more", "unfamiliar choices"],
    mood: ["appetite outruns patience—pace yourself"],
  },
  Jupiter: {
    areas: ["learning", "expansion", "meaning-making"],
    mood: ["optimism with homework—promises need follow-through"],
  },
  Saturn: {
    areas: ["slow building", "boundaries", "long games"],
    mood: ["results arrive late but solid—avoid shortcut deals"],
  },
  Mercury: {
    areas: ["conversation", "details", "logistics"],
    mood: ["nimble plans—say less, verify more"],
  },
};

function pickMod<T>(arr: readonly T[], salt: number): T {
  return arr[((salt % arr.length) + arr.length) % arr.length]!;
}

export function lordFlavor(
  lord: string,
): { areas: string[]; mood: string[] } {
  return FLAVOR[lord] ?? FLAVOR["Saturn"];
}

/**
 * Deterministic Journey fallback when no LLM. `varietyIndex` rotates phrasing so
 * consecutive cards do not share identical boilerplate.
 */
export function antardashaFallbackCopy(
  mdLord: string,
  adLord: string,
  start: Date,
  end: Date,
  varietyIndex: number,
): { title: string; sentences: string[] } {
  const mdF = lordFlavor(mdLord);
  const adF = lordFlavor(adLord);
  const label = plainPeriodLabel(start, end);
  const tStyles = [
    `${mdLord}–${adLord}`,
    `${mdLord} chapter · ${adLord} beat`,
    `Under ${mdLord}: ${adLord} (${label})`,
    `${adLord} within ${mdLord}`,
    `${mdLord} / ${adLord}`,
  ];
  const a1 = [
    () =>
      `${label}: a ${adLord} slice inside your broader ${mdLord} mahadasha—timing from Vimshottari proportions, offered as lived rhythm rather than a forecast.`,
    () =>
      `For ${label}, the calendar nests ${adLord} inside ${mdLord}; people often read that as ${adF.areas[0]} showing up inside a ${mdF.areas[0]} backdrop.`,
    () =>
      `This window (${label}) pairs ${adLord}'s ${adF.mood[0]} with ${mdLord}'s wider ${mdF.areas[0]} theme—pattern language, not a verdict on events.`,
    () =>
      `Between these dates, ${adLord} runs as antardasha under ${mdLord}; the felt texture can lean toward ${adF.areas[0]} while ${mdF.mood[0]} still colours the chapter.`,
    () =>
      `${mdLord} sets the long arc; ${adLord} sharpens the slice marked ${label}. Notice ${adF.areas[0]} more than drama.`,
    () =>
      `Engine-timed ${adLord} under ${mdLord} across ${label}: ${adF.mood[0]} in the foreground, ${mdF.areas[1] ?? mdF.areas[0]} still in the mix.`,
  ];
  const a2 = [
    () =>
      `Contrast memory with these hints—rough fit is enough; skip anything that feels foreign.`,
    () =>
      `Treat it as a lens for hindsight, then carry only what matches your own story.`,
    () =>
      `If the tone lands, it helps calibrate lighter day-to-day cues; if not, discard without guilt.`,
    () =>
      `Useful only as one vocabulary for “what that stretch felt like,” not as a checklist of outcomes.`,
    () =>
      `Let ${adLord} and ${mdLord} name textures, not people or plot points you “should” have lived.`,
    () =>
      `Hold it lightly: the value is noticing pattern, not proving fate.`,
  ];
  const a3 = [
    () =>
      `Share only if it sparks recognition—accuracy is emotional resonance, not astrology trivia.`,
    () =>
      `Good company for the timed windows listed below; they stay grounded in sunrise math.`,
    () =>
      `${adLord} and ${mdLord} are labels for tempo, not verdicts on what you “should” do.`,
    () =>
      `If friends ask, you can say it is a reflective timing note, not a horoscope headline.`,
    () =>
      `Simpler days often feel truer than dramatic ones—trust the quiet match.`,
    () =>
      `Use social sharing lightly; the best proof is your own calendar memory.`,
  ];
  const salt = varietyIndex + mdLord.length * 3 + adLord.length * 5;
  return {
    title: pickMod(tStyles, salt),
    sentences: [
      pickMod(a1, salt)(),
      pickMod(a2, salt + 11)(),
      pickMod(a3, salt + 19)(),
    ],
  };
}

export function phaseCardCopy(
  lord: string,
  start: Date,
  end: Date,
  varietyIndex = 0,
): {
  title: string;
  sentences: string[];
  themes: string[];
  lifeAreas: string[];
} {
  const f = FLAVOR[lord] ?? FLAVOR["Saturn"];
  const y1 = start.getFullYear();
  const y2 = end.getFullYear();
  const periodLabel = y1 === y2 ? `${y1}` : `${y1} – ${y2}`;
  const titles = [
    `Stretch ${periodLabel}`,
    `Phase ${periodLabel}`,
    `Years ${periodLabel}`,
    `${periodLabel} · ${lord} tone`,
    `Span ${periodLabel}`,
  ];
  const intros = [
    () =>
      `This span often foregrounds ${f.areas[0]} and ${f.areas[1]}—pattern, not prophecy.`,
    () =>
      `${f.areas[0]} and ${f.areas[1]} tend to take centre stage; people describe it as a tempo they only see in hindsight.`,
    () =>
      `Look for ${f.areas[0]} braided with ${f.areas[1]}; the app frames it as rhythm language, not certainty.`,
    () =>
      `The chapter reads ${f.areas[0]}-heavy with ${f.areas[1]} nearby—useful for reflection, not fortune-telling.`,
    () =>
      `Background hum: ${f.areas[0]} plus ${f.areas[1]}; if that mismatches memory, ignore the card.`,
  ];
  const mids = [
    () =>
      `Typical colours: ${f.mood[0]}${
        f.mood.length > 1 ? `; some also feel ${f.mood[1]}` : ""
      }.`,
    () =>
      `Common texture: ${f.mood[0]}${f.mood.length > 1 ? `, sometimes ${f.mood[1]}` : ""}.`,
    () =>
      `Many recall ${f.mood[0]}${f.mood.length > 1 ? ` interleaved with ${f.mood[1]}` : ""}.`,
    () =>
      `The lived feel is often ${f.mood[0]}${f.mood.length > 1 ? ` with flashes of ${f.mood[1]}` : ""}.`,
    () =>
      `Day-to-day, ${f.mood[0]} shows up${f.mood.length > 1 ? `; ${f.mood[1]} can spike` : ""}.`,
  ];
  const outros = [
    () =>
      `Rough resonance is enough to trust the smaller timings we layer on.`,
    () =>
      `A loose match still helps tune what we suggest for ordinary days.`,
    () =>
      `Treat overlap as signal; total mismatch means this card is not yours.`,
    () =>
      `If a line lands, keep it as context for the windows we calculate next.`,
    () =>
      `No need for perfect fit—directional truth is the bar.`,
  ];
  const salt = varietyIndex + lord.length * 13 + y1 % 7;
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
  const y1 = start.getFullYear();
  const y2 = end.getFullYear();
  return y1 === y2 ? `${y1}` : `${y1} – ${y2}`;
}
