import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/worker/index";
import { anthropicReply, blocks, interview, memoryKV, story } from "./fixtures";

type Handler = (url: string, init: { body?: string }) => Response | Promise<Response>;
let anthropic: Handler;
let turnstile: boolean;
const requests: { url: string; body: string }[] = [];

beforeEach(() => {
  turnstile = true;
  requests.length = 0;
  anthropic = () => anthropicReply(story());
  vi.stubGlobal("fetch", async (url: string, init: { body?: string } = {}) => {
    requests.push({ url, body: String(init.body ?? "") });
    if (url.includes("challenges.cloudflare.com")) return new Response(JSON.stringify({ success: turnstile }));
    if (url.includes("api.anthropic.com")) return anthropic(url, init);
    return new Response("unexpected", { status: 500 });
  });
});
afterEach(() => vi.unstubAllGlobals());

const mkEnv = (over: Record<string, unknown> = {}) => ({ ANTHROPIC_API_KEY: "sk-secret", TURNSTILE_SECRET_KEY: "ts", BOOKS: memoryKV(), DAILY_BOOK_BUDGET: "200", ...over }) as never;
const post = (path: string, body: unknown, env: never) =>
  app.fetch(new Request(`http://x${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }), env);
const create = (env: never, extra: Record<string, unknown> = {}) => post("/api/books", { blocks: blocks(), answers: [], turnstileToken: "tok", ...extra }, env);
const anthropicCalls = () => requests.filter((r) => r.url.includes("api.anthropic.com"));

describe("POST /api/books", () => {
  it("writes a valid book, stores it, and returns the edit token once", async () => {
    const env = mkEnv();
    const res = await create(env);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { id: string; editToken: string; book: { pages: unknown[]; status: string; soulVersion: { soul: string } } };
    expect(j.id).toHaveLength(16);
    expect(j.editToken.length).toBeGreaterThanOrEqual(43); // 32 bytes, base64url
    expect(j.book.pages).toHaveLength(10);
    expect(j.book.status).toBe("drawing");
    expect(j.book.soulVersion.soul).toMatch(/^[0-9a-f]{12}$/);

    const stored = (env as { BOOKS: { store: Map<string, string> } }).BOOKS.store;
    const dump = [...stored.values()].join("\n");
    expect(dump).not.toContain(j.editToken);                     // only the hash is kept
    expect(JSON.parse(stored.get(`book:${j.id}:meta`)!).editTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect([...stored.keys()].some((k) => k.startsWith("budget:"))).toBe(true);
  });

  it("serves the book to anyone with the id, without any token material", async () => {
    const env = mkEnv();
    const j = (await (await create(env)).json()) as { id: string; editToken: string };
    const res = await app.fetch(new Request(`http://x/api/books/${j.id}`), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(j.editToken);
    expect(text).not.toContain("editTokenHash");
    expect((await app.fetch(new Request(`http://x/api/books/${j.id}/versions/1`), env)).status).toBe(200);
    expect((await app.fetch(new Request(`http://x/api/books/${j.id}/versions/9`), env)).status).toBe(404);
    expect((await app.fetch(new Request(`http://x/api/books/nope`), env)).status).toBe(404);
  });

  it("retries once with the specific errors, then succeeds", async () => {
    let n = 0;
    anthropic = () => anthropicReply(n++ === 0 ? story(9) : story());
    const res = await create(mkEnv());
    expect(res.status).toBe(200);
    const calls = anthropicCalls();
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[1].body).messages[0].content).toMatch(/expected exactly 10 pages/);
  });

  it("gives a friendly error, and leaks nothing, when the book fails twice", async () => {
    anthropic = () => anthropicReply(story(9));
    const res = await create(mkEnv());
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toContain("scissors got tangled");
    expect(text).not.toMatch(/sk-secret|pages|Zzyzx/);
  });

  it("never forwards the upstream error body, and retries a 5xx once", async () => {
    anthropic = () => new Response('{"error":{"message":"secret upstream detail Zzyzx"}}', { status: 529 });
    const res = await create(mkEnv());
    expect(res.status).toBe(502);
    expect(await res.text()).not.toMatch(/secret upstream|Zzyzx/);
    expect(anthropicCalls()).toHaveLength(2);
  });

  it("rejects a failed Turnstile check before spending anything", async () => {
    turnstile = false;
    const res = await create(mkEnv());
    expect(res.status).toBe(403);
    expect(anthropicCalls()).toHaveLength(0);
    expect((await create(mkEnv(), { turnstileToken: undefined })).status).toBe(403);
    const unset = await create(mkEnv({ TURNSTILE_SECRET_KEY: undefined }));
    expect(unset.status).toBe(503);
    expect(((await unset.json()) as { code: string }).code).toBe("turnstile_unconfigured");
  });

  it("says why when Cloudflare rejects the token, and logs only Cloudflare's error codes", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] })));
    const res = await create(mkEnv());
    const j = (await res.json()) as { code: string; detail: string[]; error: string };
    const logged = log.mock.calls.map((c) => c.join(" ")).join("\n");
    log.mockRestore();
    expect(res.status).toBe(403);
    expect(j.code).toBe("turnstile_rejected");
    expect(j.detail).toEqual(["invalid-input-response"]);
    expect(logged).toContain("invalid-input-response");
    expect(logged).not.toMatch(/Zzyzx|sk-secret|"tok"/);
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-secret"] })));
    expect(((await (await create(mkEnv())).json()) as { code: string }).code).toBe("turnstile_misconfigured");
  });

  it("skips Turnstile when TURNSTILE_ENABLED is false, but keeps the budget and rate limit", async () => {
    turnstile = false;
    const env = mkEnv({ TURNSTILE_ENABLED: "false", TURNSTILE_SECRET_KEY: undefined, DAILY_BOOK_BUDGET: "1" });
    expect((await create(env, { turnstileToken: undefined })).status).toBe(200);
    expect(requests.some((r) => r.url.includes("challenges.cloudflare.com"))).toBe(false);
    expect((await create(env, { turnstileToken: undefined })).status).toBe(429);        // the daily budget still applies
    const limiter = { limit: async () => ({ success: false }) };
    expect((await create(mkEnv({ TURNSTILE_ENABLED: "false", GEN_LIMITER: limiter }), { turnstileToken: undefined })).status).toBe(429);
  });

  it("reports the switch to the client, and any value but \"false\" leaves the check on", async () => {
    const cfg = async (v?: string) => (await (await app.fetch(new Request("http://x/api/config"), mkEnv({ TURNSTILE_ENABLED: v }))).json()) as { turnstileEnabled: boolean };
    expect((await cfg("false")).turnstileEnabled).toBe(false);
    expect((await cfg()).turnstileEnabled).toBe(true);
    expect((await cfg("true")).turnstileEnabled).toBe(true);
    expect((await cfg("0")).turnstileEnabled).toBe(true);
    turnstile = false;
    expect((await create(mkEnv({ TURNSTILE_ENABLED: "no" }))).status).toBe(403);
  });

  it("stops at the daily budget", async () => {
    const env = mkEnv({ DAILY_BOOK_BUDGET: "2" });
    expect((await create(env)).status).toBe(200);
    expect((await create(env)).status).toBe(200);
    const third = await create(env);
    expect(third.status).toBe(429);
    expect(anthropicCalls()).toHaveLength(2);
  });

  it("honors the rate limiter and validates input", async () => {
    const limiter = { limit: async () => ({ success: false }) };
    expect((await create(mkEnv({ GEN_LIMITER: limiter }))).status).toBe(429);
    expect((await post("/api/books", { blocks: { name: "" }, turnstileToken: "t" }, mkEnv())).status).toBe(400);
    expect((await post("/api/books", { turnstileToken: "t" }, mkEnv())).status).toBe(400);
  });

  it("strips control characters and caps long fields before they reach the model", async () => {
    await create(mkEnv(), { blocks: { name: "Zz\u0007yzx", age: 4, look: "x".repeat(500), length: 10, companion: "cat", keepers: ["snip-and-snap"] } });
    const user = JSON.parse(anthropicCalls()[0].body).messages[0].content as string;
    expect(user).toContain("Traveler's name: Zzyzx");
    expect(user).not.toMatch(/\u0007/);
    expect(user).toContain("Looks like: " + "x".repeat(200) + "\n");
  });

  it("never logs the family's details", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    anthropic = () => anthropicReply(story(), { cache_creation_input_tokens: 50000 });
    await create(mkEnv());
    const logged = log.mock.calls.map((c) => c.join(" ")).join("\n");
    log.mockRestore();
    expect(logged).toContain('"route":"story"');
    expect(logged).toContain('"cache_write":50000');
    expect(logged).not.toMatch(/Zzyzx|sk-secret/);
  });
});

describe("POST /api/interview", () => {
  it("returns three to five questions", async () => {
    anthropic = () => anthropicReply(interview());
    const res = await post("/api/interview", { blocks: blocks() }, mkEnv());
    expect(res.status).toBe(200);
    expect(((await res.json()) as { questions: unknown[] }).questions).toHaveLength(3);
    expect(JSON.parse(anthropicCalls()[0].body).model).toBe("claude-haiku-5-5");
  });
  it("needs no Turnstile but needs a name", async () => {
    expect((await post("/api/interview", { blocks: { name: " " } }, mkEnv())).status).toBe(400);
  });
});

describe("misc routes", () => {
  it("health shows hashes and no contents", async () => {
    const j = (await (await app.fetch(new Request("http://x/api/health"), mkEnv())).json()) as { hashes: Record<string, string> };
    expect(Object.keys(j.hashes)).toEqual(["soul", "characters", "locations"]);
  });
  it("exposes only the public Turnstile site key", async () => {
    const res = await app.fetch(new Request("http://x/api/config"), mkEnv({ TURNSTILE_SITE_KEY: "pub" }));
    expect(await res.json()).toEqual({ turnstileSiteKey: "pub", turnstileEnabled: true });
  });
});
