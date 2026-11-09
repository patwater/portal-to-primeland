import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/worker/index";
import { accessCookie, hasAccess } from "../src/worker/access";
import { anthropicReply, blocks, interview, memoryKV, story } from "./fixtures";

beforeEach(() => vi.stubGlobal("fetch", async (_u: string, init: { body?: string } = {}) => {
  const props = JSON.parse(String(init.body ?? "{}")).output_config?.format?.schema?.properties ?? {};
  return anthropicReply(props.questions ? interview() : story());
}));
afterEach(() => vi.unstubAllGlobals());

const mkEnv = (over: Record<string, unknown> = {}) => ({ ANTHROPIC_API_KEY: "sk", ANTHROPIC_RETRY_MS: "0", TURNSTILE_ENABLED: "false", STUDIO_PASSWORD: "open-sesame", BOOKS: memoryKV(), ...over }) as never;
const call = (env: never, method: string, path: string, body?: unknown, cookie?: string, ip = "1.1.1.1") =>
  app.fetch(new Request(`http://x${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...(cookie ? { cookie } : {}) } }), env);
const login = async (env: never, password = "open-sesame") => call(env, "POST", "/api/access", { password });
const cookieOf = (r: Response) => (r.headers.get("set-cookie") ?? "").split(";")[0];

describe("the book-making gate", () => {
  it("stops the interview and book creation without the password, before any model call", async () => {
    const env = mkEnv();
    const f = vi.fn(async () => anthropicReply(story()));
    vi.stubGlobal("fetch", f);
    for (const [path, body] of [["/api/interview", { blocks: blocks() }], ["/api/books", { blocks: blocks(), answers: [] }]] as const) {
      const res = await call(env, "POST", path, body);
      expect(res.status).toBe(401);
      expect(((await res.json()) as { code: string }).code).toBe("access_required");
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("lets the right password in, with an HttpOnly cookie that works", async () => {
    const env = mkEnv();
    const res = await login(env);
    expect(res.status).toBe(200);
    const set = res.headers.get("set-cookie")!;
    expect(set).toMatch(/^portal_access=\d{13}\.[0-9a-f]{64};/); expect(set).toMatch(/HttpOnly/); expect(set).toMatch(/SameSite=Lax/); expect(set).toMatch(/Max-Age=604800/);
    const cookie = cookieOf(res);
    expect(await (await call(env, "GET", "/api/access", undefined, cookie)).json()).toEqual({ required: true, granted: true });
    expect((await call(env, "POST", "/api/interview", { blocks: blocks() }, cookie)).status).toBe(200);
    expect((await call(env, "POST", "/api/books", { blocks: blocks(), answers: [] }, cookie)).status).toBe(200);
  });

  it("turns away a wrong password, and says nothing about the right one", async () => {
    const env = mkEnv();
    const res = await login(env, "nope");
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.text()).not.toContain("open-sesame");
    expect((await call(env, "POST", "/api/access", { password: 42 })).status).toBe(401);
    expect((await call(env, "POST", "/api/access", {})).status).toBe(401);
    expect(await (await call(env, "GET", "/api/access")).json()).toEqual({ required: true, granted: false });
  });

  it("rejects forged, expired and tampered cookies, and signs everyone out when the password changes", async () => {
    const env = mkEnv();
    const good = cookieOf(await login(env));
    const [name, val] = good.split("=");
    const [exp, sig] = val.split(".");
    for (const bad of [`${name}=${exp}.${"0".repeat(64)}`, `${name}=${Number(exp) + 1}.${sig}`, `${name}=${exp}`, `${name}=junk`]) {
      expect((await call(env, "POST", "/api/interview", { blocks: blocks() }, bad)).status, bad).toBe(401);
    }
    const old = cookieOf({ headers: new Headers({ "set-cookie": await accessCookie({ STUDIO_PASSWORD: "open-sesame" }, false, Date.now() - 8 * 86400_000) }) } as Response);
    expect(await hasAccess({ STUDIO_PASSWORD: "open-sesame" }, old)).toBe(false);          // expired
    expect((await call(mkEnv({ STUDIO_PASSWORD: "new-password" }), "POST", "/api/interview", { blocks: blocks() }, good)).status).toBe(401);
  });

  it("limits password guesses per address", async () => {
    const env = mkEnv();
    for (let i = 0; i < 10; i++) expect((await login(env, "wrong" + i)).status).toBe(401);
    const blocked = await login(env, "open-sesame");
    expect(blocked.status).toBe(429);
    expect((await call(env, "POST", "/api/access", { password: "open-sesame" }, undefined, "9.9.9.9")).status).toBe(200); // another address is unaffected
  });

  it("is open when no password is set, and /api/health says so", async () => {
    const env = mkEnv({ STUDIO_PASSWORD: undefined });
    expect(await (await call(env, "GET", "/api/access")).json()).toEqual({ required: false, granted: true });
    expect((await call(env, "POST", "/api/interview", { blocks: blocks() })).status).toBe(200);
    expect(((await (await call(env, "GET", "/api/health")).json()) as { accessGate: boolean }).accessGate).toBe(false);
    expect(((await (await call(mkEnv(), "GET", "/api/health")).json()) as { accessGate: boolean }).accessGate).toBe(true);
  });

  it("leaves reading a finished book public, and book editing on its own edit link", async () => {
    const env = mkEnv();
    const cookie = cookieOf(await login(env));
    const made = (await (await call(env, "POST", "/api/books", { blocks: blocks(), answers: [] }, cookie)).json()) as { id: string; editToken: string };
    expect((await call(env, "GET", `/api/books/${made.id}`)).status).toBe(200);                                   // no cookie needed to read
    expect((await call(env, "POST", `/api/books/${made.id}/pages/p1/art`, undefined, undefined)).status).toBe(401); // edit link still required
    expect((await call(env, "GET", "/api/studio/check")).status).toBe(401);                                        // roster studio keeps its own check
  });
});
