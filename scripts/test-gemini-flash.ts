/**
 * One-shot Gemini probe for gemini-3.5-flash (or GEMINI_MODEL env).
 * Usage (add GEMINI_API_KEY to supabase/.env or env):
 *   deno run --allow-net --allow-env --allow-read scripts/test-gemini-flash.ts
 */
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

const dotenv = await loadDotEnv("supabase/.env");
for (const [k, v] of Object.entries(dotenv)) {
  if (!Deno.env.get(k)) Deno.env.set(k, v);
}

const apiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
const model = Deno.env.get("GEMINI_MODEL")?.trim() || "gemini-3.5-flash";

if (!apiKey) {
  console.error("GEMINI_API_KEY missing. Add to supabase/.env or environment.");
  Deno.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  },
  body: JSON.stringify({
    systemInstruction: {
      parts: [{
        text: 'Return valid JSON only: {"ok":true,"model":string,"message":string}',
      }],
    },
    contents: [{
      role: "user",
      parts: [{ text: "Say hello from Muhurta smoke test." }],
    }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  }),
});

const bodyText = await res.text();
console.log("model:", model);
console.log("http_status:", res.status);

if (!res.ok) {
  console.log("error:", bodyText.slice(0, 500));
  Deno.exit(2);
}

let parsed: unknown;
try {
  parsed = JSON.parse(bodyText);
} catch {
  console.log("raw:", bodyText.slice(0, 500));
  Deno.exit(3);
}

const gemini = parsed as {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
};

if (gemini.error?.message) {
  console.log("api_error:", gemini.error.message);
  Deno.exit(4);
}

const text = gemini.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
console.log("response:", text.slice(0, 300));
console.log("result: OK");
