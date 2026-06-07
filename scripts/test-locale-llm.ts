/**
 * Smoke-test Groq + Gemini for te/hi/en JSON snippets.
 * Run from repo root (loads keys from supabase/functions/.env if present):
 *   deno run --allow-net --allow-env --allow-read scripts/test-locale-llm.ts
 */
const LOCALES = ["en", "te", "hi"] as const;

const PROMPT = `Return valid JSON only: {"greeting":string,"locale_check":string}
Write greeting in the requested language only. locale_check must echo the locale code.`;

async function loadDotEnv(path: string): Promise<Record<string, string>> {
  try {
    const text = await Deno.readTextFile(path);
    const out: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

async function testGroq(apiKey: string, locale: string): Promise<string> {
  const model = Deno.env.get("GROQ_MODEL")?.trim() || "llama-3.3-70b-versatile";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: JSON.stringify({ locale, task: "say hello as Sakha" }) },
      ],
    }),
  });
  const body = await res.text();
  if (!res.ok) return `HTTP ${res.status}: ${body.slice(0, 200)}`;
  const parsed = JSON.parse(body);
  const text = parsed?.choices?.[0]?.message?.content ?? "";
  return text.slice(0, 180);
}

async function testGemini(apiKey: string, locale: string): Promise<string> {
  const model = Deno.env.get("GEMINI_MODEL")?.trim() || "gemini-2.0-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${
      encodeURIComponent(apiKey)
    }`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{
        role: "user",
        parts: [{ text: JSON.stringify({ locale, task: "say hello as Sakha" }) }],
      }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }),
  });
  const body = await res.text();
  if (!res.ok) return `HTTP ${res.status}: ${body.slice(0, 200)}`;
  const parsed = JSON.parse(body);
  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text.slice(0, 180);
}

async function testOpenAi(apiKey: string, locale: string): Promise<string> {
  const model = Deno.env.get("BIRTH_PACK_MODEL")?.trim() ||
    Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: JSON.stringify({ locale, task: "say hello as Sakha" }) },
      ],
    }),
  });
  const body = await res.text();
  if (!res.ok) return `HTTP ${res.status}: ${body.slice(0, 200)}`;
  const parsed = JSON.parse(body);
  const text = parsed?.choices?.[0]?.message?.content ?? "";
  return text.slice(0, 180);
}

const dotenv = await loadDotEnv("supabase/functions/.env");
for (const [k, v] of Object.entries(dotenv)) {
  if (!Deno.env.get(k)) Deno.env.set(k, v);
}

const groqKey = Deno.env.get("GROQ_API_KEY") ?? "";
const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
const openAiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

console.log("Keys:", {
  openai: openAiKey ? "set" : "MISSING",
  groq: groqKey ? "set" : "MISSING",
  gemini: geminiKey ? "set" : "MISSING",
});

for (const locale of LOCALES) {
  console.log(`\n=== locale: ${locale} ===`);
  if (openAiKey) {
    console.log("openai:", await testOpenAi(openAiKey, locale));
  }
  if (groqKey) {
    console.log("groq:", await testGroq(groqKey, locale));
  }
  if (geminiKey) {
    console.log("gemini:", await testGemini(geminiKey, locale));
  }
}
