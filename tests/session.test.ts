import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/worker/index";
import { anthropicReply, blocks, memoryKV, story } from "./fixtures";

let failStory = false;
beforeEach(() => {
  failStory = false;
  vi.stubGlobal("fetch", async (url: string) => {
    if (url.includes("challenges.cloudflare.com")) return new Response(JSON.stringify({ success: true }));
    return failStory ? new Response("{}", { status: 400 }) : anthropicReply(story());
  });
});
afterEach(() => vi.unstubAllGlobals());

const mkEnv = (over: Record<string, unknown> = {}) => ({ ANTHROPIC_API_KEY: "sk", TURNSTILE_ENABLED: "false", BOOKS: memoryKV(), ...over }) as never;
const create = (env: never, cookie?: string, ip = "1.1.1.1", url = "http://x") =>
  app.fetch(new Request(`${url}/api/books`, { method: "POST", body: JSON.stringify({ blocks: blocks(), answers: [] }), headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...(cookie ? { cookie } : {}) } }), env);
const cfg = async (env: never, cookie?: string) => (await (await app.fetch(new Request("http://x/api/config", { headers: cookie ? { cookie } : {} }), env)).json()) as { booksLeft: number; bookLimit: number };
const cookieOf = (res: Response) => (res.headers.get("set-cookie") ?? "").split(";")[0];

describe("two books per session", () => {
  it("lets a session make two books, then stops the third with a friendly message", async () => {
    const env = mkEnv();
    const first = await create(env);
    expect(first.status).toBe(200);
    const cookie = cookieOf(first);
    expect(cookie).toMatch(/^portal_sid=[A-Za-z0-9]{24}$/);
    expect((await create(env, cookie)).status).toBe(200);
    const third = await create(env, cookie);
    expect(third.status).toBe(429);
    const j = (await third.json()) as { error: string; code: string };
    expect(j.code).toBe("session_limit");
    expect(j.error).toMatch(/two portals/);
    expect(j.error).not.toMatch(/Zzyzx/);
  });

  it("sets an HttpOnly, SameSite cookie that lasts a day, Secure on https", async () => {
    const env = mkEnv();
    const http = (await create(env)).headers.get("set-cookie")!;
    expect(http).toMatch(/HttpOnly/); expect(http).toMatch(/SameSite=Lax/); expect(http).toMatch(/Max-Age=86400/); expect(http).not.toMatch(/Secure/);
    expect((await create(mkEnv(), undefined, "2.2.2.2", "https://x")).headers.get("set-cookie")).toMatch(/Secure/);
  });

  it("reports how many books are left, and stays at the full allowance for a new visitor", async () => {
    const env = mkEnv();
    expect(await cfg(env)).toMatchObject({ bookLimit: 2, booksLeft: 2 });
    const cookie = cookieOf(await create(env));
    expect((await cfg(env, cookie)).booksLeft).toBe(1);
    await create(env, cookie);
    expect((await cfg(env, cookie)).booksLeft).toBe(0);
    expect((await cfg(env)).booksLeft).toBe(2);
  });

  it("keeps sessions separate", async () => {
    const env = mkEnv();
    const a = cookieOf(await create(env, undefined, "1.1.1.1"));
    await create(env, a, "1.1.1.1");
    expect((await create(env, a, "1.1.1.1")).status).toBe(429);
    expect((await create(env, undefined, "9.9.9.9")).status).toBe(200);
  });

  it("does not charge a book that failed", async () => {
    const env = mkEnv();
    failStory = true;
    const bad = await create(env);
    expect(bad.status).toBe(502);
    failStory = false;
    expect((await create(env)).status).toBe(200);          // nothing was spent by the failure
    expect((await cfg(env)).bookLimit).toBe(2);
  });

  it("does not charge a request the daily budget turned away", async () => {
    const env = mkEnv({ DAILY_BOOK_BUDGET: "0" });
    const res = await create(env, "portal_sid=" + "a".repeat(24));
    expect(res.status).toBe(429);
    expect((await cfg(env, "portal_sid=" + "a".repeat(24))).booksLeft).toBe(2);
  });

  it("holds an address to its daily cap even when cookies are cleared, and stores no raw IP", async () => {
    const env = mkEnv({ IP_DAILY_BOOK_LIMIT: "3" });
    for (let i = 0; i < 3; i++) expect((await create(env, undefined, "5.5.5.5")).status).toBe(200); // a new cookie each time
    const res = await create(env, undefined, "5.5.5.5");
    expect(res.status).toBe(429);
    expect(((await res.json()) as { code: string }).code).toBe("ip_limit");
    expect((await create(env, undefined, "6.6.6.6")).status).toBe(200);
    const keys = [...(env as { BOOKS: { store: Map<string, string> } }).BOOKS.store.keys()].join(" ");
    expect(keys).not.toContain("5.5.5.5");
  });

  it("follows SESSION_BOOK_LIMIT", async () => {
    const env = mkEnv({ SESSION_BOOK_LIMIT: "1" });
    const cookie = cookieOf(await create(env));
    const res = await create(env, cookie);
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toMatch(/one portal,/);
  });

  it("ignores a malformed session cookie", async () => {
    const env = mkEnv();
    for (let i = 0; i < 3; i++) expect((await create(env, "portal_sid=not-valid!!", "7.7.7.7")).status).toBe(200);
  });
});
