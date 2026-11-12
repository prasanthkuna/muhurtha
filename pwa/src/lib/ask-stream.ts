/** Client for the streamed Ask (/api/ask/stream): parses server-sent events as they arrive. */
export type AskStreamChip = { label: string; kind: "ask" | "save_event" | "explain" | "open"; value: string };

export type AskStreamHandlers = {
  onMeta?: (m: Record<string, unknown>) => void;
  onDelta: (text: string) => void;
  onDone: (d: Record<string, unknown>) => void;
  onError: (e: { error: string; error_code: string; status?: number; shown?: boolean }) => void;
};

export async function askStream(body: Record<string, unknown>, h: AskStreamHandlers, signal?: AbortSignal): Promise<"ok" | "unavailable"> {
  let res: Response;
  try {
    res = await fetch("/api/ask/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    return "unavailable";
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("text/event-stream") || !res.body) {
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(j.error_code ?? "");
    // Route missing / engine without streaming: the caller falls back to the classic Ask.
    if (res.status === 404 || res.status === 502 || code === "engine_unavailable" || code === "unknown_action") return "unavailable";
    h.onError({ error: String(j.error ?? "Ask failed"), error_code: code, status: res.status });
    return "ok";
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trim());
      }
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(data.join("\n") || "{}");
      } catch {
        continue;
      }
      if (event === "meta") h.onMeta?.(payload);
      else if (event === "delta") h.onDelta(String(payload.t ?? ""));
      else if (event === "done") {
        finished = true;
        h.onDone(payload);
      } else if (event === "error") {
        finished = true;
        h.onError({ error: String(payload.error ?? "Ask failed"), error_code: String(payload.error_code ?? "internal_error"), shown: Boolean(payload.shown) });
      }
    }
  }
  if (!finished) h.onError({ error: "Connection dropped", error_code: "stream_dropped" });
  return "ok";
}
