import { describe, expect, it, vi } from "vitest";
import { callClaude, FriendlyError } from "../src/worker/claude";
import { generateInterview } from "../src/worker/prompts/interviewer";
import { generateStory } from "../src/worker/prompts/storyteller";
import { anthropicReply, blocks, interview, story } from "./fixtures";

const base = { env: { ANTHROPIC_API_KEY: "sk-secret", ANTHROPIC_RETRY_MS: "0" }, route: "t", model: "m", system: [], user: "u", schema: {}, maxTokens: 100 };
const fail = async (res: Response | (() => Response)) => {
  const f = vi.fn(async () => (typeof res === "function" ? res() : res.clone()));
  try { await callClaude({ ...base, fetchImpl: f as never }); } catch (e) { return { e: e as FriendlyError, calls: f.mock.calls.length }; }
  throw new Error("expected a failure");
};
const apiError = (status: number, type: string) => new Response(JSON.stringify({ type: "error", error: { type, message: "secret detail: sk-secret Zzyzx" } }), { status });

describe("why a Claude call failed", () => {
  it.each([
    [401, "authentication_error", "anthropic_key_rejected", 1],
    [403, "permission_error", "anthropic_key_rejected", 1],
    [404, "not_found_error", "anthropic_model_unavailable", 1],
    [400, "invalid_request_error", "anthropic_bad_request", 1],
    [529, "overloaded_error", "anthropic_busy", 3],
    [429, "rate_limit_error", "anthropic_busy", 3],
  ])("status %i gives %s a code the owner can act on", async (status, type, code, calls) => {
    const { e, calls: n } = await fail(() => apiError(status, type));
    expect(e.code).toBe(code);
    expect(e.message).toBe(`upstream status ${status} ${type}`);
    expect(e.userMessage).toContain("scissors got tangled");
    expect(e.message).not.toMatch(/secret detail|sk-secret|Zzyzx/); // only the error type ever leaves the API body
    expect(n).toBe(calls);                                           // a 4xx is not retried; a 429 or 5xx is, twice, after waiting
  });

  it("a missing key says so", async () => {
    await expect(callClaude({ ...base, env: {} })).rejects.toMatchObject({ code: "anthropic_key_missing" });
  });
  it("running out of room before the JSON is finished is its own code", async () => {
    const r = new Response(JSON.stringify({ content: [{ type: "thinking", thinking: "" }], stop_reason: "max_tokens", usage: {} }));
    expect((await fail(r)).e.code).toBe("anthropic_max_tokens");
  });
  it("an odd error body yields no type rather than a leak", async () => {
    const { e } = await fail(() => new Response("<html>oops sk-secret</html>", { status: 400 }));
    expect(e.message).toBe("upstream status 400");
  });
});

describe("token budgets leave room for thinking", () => {
  it("interview: 6000 tokens at low effort", async () => {
    const f = vi.fn(async () => anthropicReply(interview()));
    await generateInterview({ ANTHROPIC_API_KEY: "k" }, blocks(), f as never);
    const req = JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(req.max_tokens).toBe(6000);
    expect(req.output_config.effort).toBe("low");
    expect(req.output_config.format.type).toBe("json_schema");
    expect(req.thinking).toBeUndefined();     // never disable thinking: Sonnet 5.5 and Opus 5.5 reject it
    expect(req.temperature).toBeUndefined();  // sampling parameters are rejected on current models
  });
  it("story: 16000 tokens at medium effort", async () => {
    const f = vi.fn(async () => anthropicReply(story()));
    await generateStory({ ANTHROPIC_API_KEY: "k" }, blocks(), [], f as never);
    const req = JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(req.max_tokens).toBe(16000);
    expect(req.output_config.effort).toBe("medium");
    expect(req.model).toBe("claude-sonnet-5-5");
  });
});

describe("the route tells the client why", () => {
  it("returns the code and detail, and nothing from the API body", async () => {
    const { default: app } = await import("../src/worker/index");
    vi.stubGlobal("fetch", async () => apiError(401, "authentication_error"));
    const res = await app.fetch(new Request("http://x/api/interview", { method: "POST", body: JSON.stringify({ blocks: blocks() }), headers: { "content-type": "application/json" } }), { ANTHROPIC_API_KEY: "sk-secret" } as never);
    vi.unstubAllGlobals();
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toMatchObject({ code: "anthropic_key_rejected", detail: "upstream status 401 authentication_error" });
    expect(text).not.toMatch(/secret detail|sk-secret|Zzyzx/);
  });
});
