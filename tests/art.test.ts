import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/worker/index";
import { anthropicReply, blocks, memoryKV, story } from "./fixtures";

type Req = { url: string; body: string };
let requests: Req[];
let mode: "ok" | "bad-sprite" | "no-sprites" | "wide";
let calls = 0;

const sheet = () => ({ viewBox: [800, 560], elements: [{ type: "ellipse", cx: 110, cy: 80, rx: 30, ry: 32 }, { type: "label", text: "Kid", x: 90, y: 295 }] });
function pageDrawing(user: string) {
  const ids = [...user.matchAll(/^\{"id":"([^"]+)"/gm)].map((m) => m[1]);
  const sprites = mode === "no-sprites" ? [] : ids.map((id, i) => ({ type: "sprite", spriteId: id, x: 150 + i * 150, y: 450, scale: 1 }));
  if (mode === "bad-sprite" && calls <= 1) sprites.push({ type: "sprite", spriteId: "made-up", x: 10, y: 10, scale: 1 });
  return { viewBox: [800, 560], elements: [...sprites, { type: "line", x1: 0, y1: 470, x2: mode === "wide" ? 5000 : 790, y2: 470 }] };
}

beforeEach(() => {
  requests = []; mode = "ok"; calls = 0;
  vi.stubGlobal("fetch", async (url: string, init: { body?: string } = {}) => {
    requests.push({ url, body: String(init.body ?? "") });
    if (url.includes("siteverify") || url.includes("challenges.cloudflare")) return new Response(JSON.stringify({ success: true }));
    const j = JSON.parse(String(init.body));
    const user: string = j.messages[0].content;
    if (j.output_config.format.schema.properties.pages) return anthropicReply(story());
    calls++;
    return anthropicReply(user.includes("<task_detail>") ? sheet() : pageDrawing(user));
  });
});
afterEach(() => vi.unstubAllGlobals());

const mkEnv = (over: Record<string, unknown> = {}) => ({ ANTHROPIC_API_KEY: "sk", TURNSTILE_SECRET_KEY: "t", BOOKS: memoryKV(), ...over }) as never;
const call = (env: never, method: string, path: string, body?: unknown, token?: string) =>
  app.fetch(new Request(`http://x${path}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }), env);
async function newBook(env: never, over: Record<string, unknown> = {}) {
  const r = await call(env, "POST", "/api/books", { blocks: blocks(over), answers: [], turnstileToken: "x" });
  return (await r.json()) as { id: string; editToken: string };
}
const art = (env: never, id: string, page: string, token?: string) => call(env, "POST", `/api/books/${id}/pages/${page}/art`, undefined, token);
const cast = (env: never, id: string, castId: string, token?: string) => call(env, "POST", `/api/books/${id}/cast-sheet`, { castId }, token);
const artReqs = () => requests.filter((r) => r.url.includes("anthropic") && !JSON.parse(r.body).output_config.format.schema.properties.pages);

describe("edit-token auth", () => {
  it("refuses art routes without the token, or with the wrong one", async () => {
    const env = mkEnv(); const b = await newBook(env);
    expect((await art(env, b.id, "p1")).status).toBe(401);
    expect((await art(env, b.id, "p1", "wrong")).status).toBe(403);
    expect((await cast(env, b.id, "zzyzx", "wrong")).status).toBe(403);
    expect((await art(env, "nobook", "p1", b.editToken)).status).toBe(404);
    expect(artReqs()).toHaveLength(0);
  });
});

describe("cast sheets", () => {
  it("draws a sheet for a custom character and stores it on the book", async () => {
    const env = mkEnv(); const b = await newBook(env);
    const res = await cast(env, b.id, "zzyzx", b.editToken);
    expect(res.status).toBe(200);
    const book = (await (await call(env, "GET", `/api/books/${b.id}`)).json()) as { castDrawings: Record<string, unknown> };
    expect(Object.keys(book.castDrawings)).toEqual(["zzyzx"]);
  });
  it("rejects unknown cast ids", async () => {
    const env = mkEnv(); const b = await newBook(env);
    expect((await cast(env, b.id, "nobody", b.editToken)).status).toBe(400);
  });
  it("rejects a sheet that strays off its 220 x 300 sheet", async () => {
    const env = mkEnv(); const b = await newBook(env);
    vi.stubGlobal("fetch", async () => anthropicReply({ viewBox: [800, 560], elements: [{ type: "line", x1: 0, y1: 0, x2: 700, y2: 5 }] }));
    expect((await cast(env, b.id, "zzyzx", b.editToken)).status).toBe(502);
  });
});

describe("page art", () => {
  it("offers sprites for the page's characters and requires them to be placed", async () => {
    const env = mkEnv(); const b = await newBook(env);
    await cast(env, b.id, "zzyzx", b.editToken); await cast(env, b.id, "biscuit", b.editToken);
    const res = await art(env, b.id, "p4", b.editToken); // p4 has the kid, the cat and Chris and Steve
    expect(res.status).toBe(200);
    const user = JSON.parse(artReqs().at(-1)!.body).messages[0].content as string;
    for (const id of ["cast:zzyzx", "cast:biscuit", "scissors-chris-steve"]) expect(user).toContain(`"id":"${id}"`);
    expect(user).toContain("<format>");
    const d = (await res.json()) as { drawing: { elements: { spriteId?: string }[] } };
    expect(d.drawing.elements.filter((e) => e.spriteId).map((e) => e.spriteId)).toEqual(expect.arrayContaining(["cast:zzyzx", "scissors-chris-steve"]));
  });

  it("uses the same cast sprite for the hero on every page", async () => {
    const env = mkEnv(); const b = await newBook(env);
    await cast(env, b.id, "zzyzx", b.editToken);
    for (const p of ["p1", "p2", "p3"]) await art(env, b.id, p, b.editToken);
    const book = (await (await call(env, "GET", `/api/books/${b.id}`)).json()) as { pages: { art: { drawing?: { elements: { spriteId?: string }[] } } }[] };
    for (const p of book.pages.slice(0, 3)) expect(p.art.drawing!.elements.some((e) => e.spriteId === "cast:zzyzx")).toBe(true);
  });

  it("draws characters without a sheet themselves, and says so", async () => {
    const env = mkEnv(); const b = await newBook(env);
    await art(env, b.id, "p1", b.editToken);
    expect(JSON.parse(artReqs().at(-1)!.body).messages[0].content).toContain("<undrawn>");
  });

  it("retries once when the drawing breaks the rules, then succeeds", async () => {
    mode = "bad-sprite";
    const env = mkEnv(); const b = await newBook(env);
    await cast(env, b.id, "zzyzx", b.editToken);
    calls = 0;
    const res = await art(env, b.id, "p1", b.editToken);
    expect(res.status).toBe(200);
    expect(artReqs().length).toBeGreaterThanOrEqual(3); // the cast sheet, the rejected page, the retry
    expect(JSON.parse(artReqs().at(-1)!.body).messages[0].content).toMatch(/unknown spriteId "made-up"/);
  });

  it("fails kindly if a drawing never validates", async () => {
    mode = "wide";
    const env = mkEnv(); const b = await newBook(env);
    const res = await art(env, b.id, "p1", b.editToken);
    expect(res.status).toBe(502);
    expect(await res.text()).toContain("pencil snapped");
  });

  it("asks for the offered sprites when the model forgets them", async () => {
    mode = "no-sprites";
    const env = mkEnv(); const b = await newBook(env);
    await cast(env, b.id, "zzyzx", b.editToken);
    expect((await art(env, b.id, "p1", b.editToken)).status).toBe(502);
    expect(JSON.parse(artReqs().at(-1)!.body).messages[0].content).toMatch(/did not place these offered sprites: cast:zzyzx/);
  });

  it("keeps the system blocks free of family details and the soul cached first", async () => {
    const env = mkEnv(); const b = await newBook(env);
    await art(env, b.id, "p1", b.editToken);
    const req = JSON.parse(artReqs().at(-1)!.body);
    expect(req.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(JSON.stringify(req.system)).not.toContain("Zzyzx");
    expect(req.model).toBe("claude-sonnet-5-5");
  });

  it("keeps concurrent pages from overwriting each other, and flips to ready at the end", async () => {
    const env = mkEnv(); const b = await newBook(env);
    const ids = Array.from({ length: 10 }, (_, i) => `p${i + 1}`);
    await Promise.all(ids.slice(0, 5).map((p) => art(env, b.id, p, b.editToken)));
    let book = (await (await call(env, "GET", `/api/books/${b.id}`)).json()) as { status: string; pages: { art: { drawing?: unknown } }[] };
    expect(book.pages.filter((p) => p.art.drawing)).toHaveLength(5);
    expect(book.status).toBe("drawing");
    await Promise.all(ids.slice(5).map((p) => art(env, b.id, p, b.editToken)));
    book = (await (await call(env, "GET", `/api/books/${b.id}`)).json()) as typeof book;
    expect(book.pages.every((p) => p.art.drawing)).toBe(true);
    expect(book.status).toBe("ready");
  });

  it("caps Sketch Artist calls per book", async () => {
    const env = mkEnv(); const b = await newBook(env);
    let last = 200;
    for (let i = 0; i < 50 && last === 200; i++) last = (await art(env, b.id, "p1", b.editToken)).status;
    expect(last).toBe(429);
  });

  it("never offers the Taylor drawing to another family, and does to Taylor", async () => {
    const { offersForPage } = await import("../src/worker/sprites");
    const base = { place: "the-long-and-lonesome-hill", characters: ["taylor"], cast: [], castSheets: new Set<string>() };
    expect(offersForPage({ ...base, kidName: "Maya" }).offers.map((o) => o.id)).not.toContain("tot-polka-dot");
    expect(offersForPage({ ...base, kidName: "Taylor" }).offers.map((o) => o.id)).toContain("tot-polka-dot");
  });
});
