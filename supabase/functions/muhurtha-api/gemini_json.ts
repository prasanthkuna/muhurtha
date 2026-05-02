/** Shared Gemini JSON generation for locale-aware copy. */
const DEFAULT_MODEL = "gemini-3-flash-preview";

export async function geminiGenerateJson(
  systemInstruction: string,
  userText: string,
): Promise<string | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!apiKey) return null;
  const model = Deno.env.get("JOURNEY_GEMINI_MODEL") ?? DEFAULT_MODEL;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.72,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    console.error("Gemini JSON HTTP", res.status, await res.text());
    return null;
  }
  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (data.error?.message) {
    console.error("Gemini error", data.error.message);
    return null;
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}
