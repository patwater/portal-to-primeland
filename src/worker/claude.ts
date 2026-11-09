// The only place that talks to the Messages API. Structured outputs, caching, a timeout, one retry,
// and a friendly error. It never logs prompt text, never returns raw API bodies.
import type { SystemBlock } from "./prompts/assemble";

export class FriendlyError extends Error {
  constructor(public status: number, public userMessage: string, detail?: string) { super(detail ?? userMessage); }
}
export const TANGLED = "The scissors got tangled. Shall we try that again?";

export type ClaudeEnv = { ANTHROPIC_API_KEY?: string; ANTHROPIC_BASE_URL?: string };
export type CallOptions = {
  env: ClaudeEnv; route: string; model: string; system: SystemBlock[]; user: string;
  schema: unknown; maxTokens: number; timeoutMs?: number; fetchImpl?: typeof fetch;
};

type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };

/** Returns the parsed JSON the model produced. Transport failures retry once; anything else is a FriendlyError. */
export async function callClaude(o: CallOptions): Promise<unknown> {
  if (!o.env.ANTHROPIC_API_KEY) throw new FriendlyError(503, TANGLED, "ANTHROPIC_API_KEY is not set");
  const f = o.fetchImpl ?? fetch;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await f(`${o.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
        method: "POST",
        headers: { "x-api-key": o.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: o.model,
          max_tokens: o.maxTokens,
          system: o.system,
          messages: [{ role: "user", content: o.user }],
          output_config: { format: { type: "json_schema", schema: o.schema } },
        }),
        signal: AbortSignal.timeout(o.timeoutMs ?? 90_000),
      });
      lastStatus = res.status;
      if (res.status === 429 || res.status >= 500) continue;
      if (!res.ok) break; // a 4xx will not get better by asking again
      const j = (await res.json()) as { content?: { type: string; text?: string }[]; usage?: Usage; stop_reason?: string };
      const u = j.usage ?? {};
      // Cache check (brief 2.5): numbers only, tagged with the route, never any prompt text.
      console.log(JSON.stringify({ route: o.route, input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cache_write: u.cache_creation_input_tokens ?? 0, cache_read: u.cache_read_input_tokens ?? 0 }));
      if (j.stop_reason === "max_tokens") throw new FriendlyError(502, TANGLED, "max_tokens reached");
      const text = j.content?.find((c) => c.type === "text")?.text;
      if (!text) throw new FriendlyError(502, TANGLED, "empty response");
      try { return JSON.parse(text); } catch { throw new FriendlyError(502, TANGLED, "unparseable response"); }
    } catch (e) {
      if (e instanceof FriendlyError) throw e;
      lastStatus = lastStatus || -1; // timeout or network error: try once more
    }
  }
  console.log(JSON.stringify({ route: o.route, failed: true, status: lastStatus }));
  throw new FriendlyError(502, TANGLED, `upstream status ${lastStatus}`);
}
