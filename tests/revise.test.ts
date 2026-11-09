import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/worker/index";
import { applyRevision } from "../src/worker/patch";
import type { Revision, StoredBook } from "../src/worker/schemas";
import { anthropicReply, blocks, memoryKV, story } from "./fixtures";

type Handler = (user: string) => unknown;
let reviser: Handler;
let reviserCalls: string[];
let turnstile: boolean;

const page = (n: number, text: string) => ({ id: `p${n}`, n, text, place: "terminus", characters: ["zzyzx", "scout-the-watchdog"], art: { brief: `brief ${n}` } });
const SCOUT_TEXT = "Scout trotted up the platform with his smartwatch buzzing, and the kid laughed so hard that the whole station shook, and the clock over the track chimed in with a happy little bong, and everyone on the platform turned to look at the dog.";
const good = (over: Partial<Revision> = {}): Revision => ({
  changes: [{ op: "update", pageId: "p3", page: { ...story().pages[2], text: SCOUT_TEXT, characters: ["zzyzx", "biscuit", "scout-the-watchdog"] } }],
  castAdditions: [], changelog: ["Scout does more on page 3, because Zzyzx asked for more Scout."], ...over,
});

beforeEach(() => {
  turnstile = true; reviserCalls = []; reviser = () => good();
  vi.stubGlobal("fetch", async (url: string, init: { body?: string } = {}) => {
    if (url.includes("siteverify") || url.includes("challenges.cloudflare")) return new Response(JSON.stringify({ success: turnstile }));
    const j = JSON.parse(String(init.body));
    const props = j.output_config.format.schema.properties;
    if (props.pages) return anthropicReply(story());
    if (props.changes) { reviserCalls.push(j.messages[0].content); return anthropicReply(reviser(j.messages[0].content)); }
    return anthropicReply({ viewBox: [800, 560], elements: [{ type: "line", x1: 0, y1: 470, x2: 790, y2: 470 }] });
  });
});
afterEach(() => vi.unstubAllGlobals());

const mkEnv = () => ({ ANTHROPIC_API_KEY: "sk", TURNSTILE_SECRET_KEY: "t", BOOKS: memoryKV() }) as never;
const call = (env: never, method: string, path: string, body?: unknown, token?: string) =>
  app.fetch(new Request(`http://x${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }), env);
async function newBook(env: never) {
  const r = await call(env, "POST", "/api/books", { blocks: blocks({ companion: "scout", keepers: ["chris-and-steve"] }), answers: [], turnstileToken: "x" });
  return (await r.json()) as { id: string; editToken: string; book: StoredBook };
}
const revise = (env: never, id: string, token: string, feedback?: unknown) => call(env, "POST", `/api/books/${id}/revise`, { feedback, turnstileToken: "x" }, token);
const FB = { pages: { p2: { seal: true }, p3: { moreOf: { ids: ["scout-the-watchdog"], text: "" } } }, kidQuote: "Scout is silly" };
const get = async (env: never, path: string) => (await call(env, "GET", path)).json() as Promise<any>;

describe("feedback", () => {
  it("is private to the edit token, clamped, and drops unknown pages", async () => {
    const env = mkEnv(); const b = await newBook(env);
    expect((await call(env, "GET", `/api/books/${b.id}/feedback`)).status).toBe(401);
    expect((await call(env, "PUT", `/api/books/${b.id}/feedback`, FB, "nope")).status).toBe(403);
    const long = "x\u0007".repeat(400);
    expect((await call(env, "PUT", `/api/books/${b.id}/feedback`, { pages: { p1: { note: long.slice(0, 200) }, ghost: { seal: true } }, notes: "hi" }, b.editToken)).status).toBe(200);
    const f = (await (await call(env, "GET", `/api/books/${b.id}/feedback`, undefined, b.editToken)).json()) as any;
    expect(Object.keys(f.pages)).toEqual(["p1"]);
    expect(f.pages.p1.note).not.toMatch(/\u0007/);
    expect((await call(env, "PUT", `/api/books/${b.id}/feedback`, { pages: { p1: { note: "y".repeat(500) } } }, b.editToken)).status).toBe(400);
  });
});

describe("revise: the milestone 5 acceptance case", () => {
  it("locks a page and gives 'more Scout': v2 keeps the locked page word for word, has a changelog, and v1 stays restorable", async () => {
    const env = mkEnv(); const b = await newBook(env);
    const res = await revise(env, b.id, b.editToken, FB);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { book: StoredBook; changelog: string[] };
    expect(j.book.version).toBe(2);
    expect(j.book.kind).toBe("revised");
    expect(j.changelog).toEqual(["Scout does more on page 3, because Zzyzx asked for more Scout."]);
    const v1 = await get(env, `/api/books/${b.id}/versions/1`);
    const v2 = await get(env, `/api/books/${b.id}`);
    expect(v2.version).toBe(2);
    expect(v2.pages[1].text).toBe(v1.pages[1].text);                  // locked p2, word for word
    expect(v2.pages[1].locked).toBe(true);
    expect(v2.pages[2].text).toContain("Scout trotted");              // p3 changed
    expect(v1.pages[2].text).not.toContain("Scout trotted");          // v1 untouched
    const seeded = await (await call(env, "GET", `/api/books/${b.id}/feedback`, undefined, b.editToken)).json() as any;
    expect(seeded.pages).toEqual({ p2: { seal: true } });             // seals carry; requests don't
  });

  it("sends the locked ids, the feedback and the quote to the Reviser, never in a system block", async () => {
    const env = mkEnv(); const b = await newBook(env);
    await revise(env, b.id, b.editToken, FB);
    const user = reviserCalls[0];
    expect(user).toContain("Locked pages (never change, never remove): p2");
    expect(user).toContain("wants more of: Scout the Watchdog");
    expect(user).toContain('"Scout is silly"');
  });

  it("rejects a patch that touches a locked page, retries with the reason, then succeeds", async () => {
    let n = 0;
    reviser = () => (n++ === 0 ? good({ changes: [{ op: "update", pageId: "p2", page: { ...story().pages[1], text: "Changed!" } }] }) : good());
    const env = mkEnv(); const b = await newBook(env);
    expect((await revise(env, b.id, b.editToken, FB)).status).toBe(200);
    expect(reviserCalls).toHaveLength(2);
    expect(reviserCalls[1]).toMatch(/page "p2" is locked/);
  });

  it("gives up kindly if the Reviser keeps breaking the lock, and saves nothing", async () => {
    reviser = () => good({ changes: [{ op: "remove", pageId: "p2" }] });
    const env = mkEnv(); const b = await newBook(env);
    const res = await revise(env, b.id, b.editToken, FB);
    expect(res.status).toBe(502);
    expect((await get(env, `/api/books/${b.id}`)).version).toBe(1);
  });

  it("carries drawings forward and only redraws pages whose brief changed", async () => {
    const env = mkEnv(); const b = await newBook(env);
    for (const p of ["p1", "p2", "p3"]) expect((await call(env, "POST", `/api/books/${b.id}/pages/${p}/art`, undefined, b.editToken)).status).toBe(200);
    reviser = () => good({ changes: [{ op: "update", pageId: "p3", page: { ...story().pages[2], text: SCOUT_TEXT, art: { brief: "a brand new brief" } } }] });
    await revise(env, b.id, b.editToken, FB);
    const v2 = await get(env, `/api/books/${b.id}`);
    expect(v2.pages[0].art.drawing).toBeTruthy();
    expect(v2.pages[1].art.drawing).toBeTruthy();
    expect(v2.pages[2].art.drawing).toBeUndefined();
    expect(v2.status).toBe("drawing");
  });

  it("can insert a page, renumbering the rest", async () => {
    const extra = { ...story().pages[0], id: "p11", text: SCOUT_TEXT, characters: ["zzyzx", "biscuit"] };
    reviser = () => good({ changes: [{ op: "insert", pageId: "p11", afterPageId: "p3", page: extra }], changelog: ["A new page 4 gives Scout his moment."] });
    const env = mkEnv(); const b = await newBook(env);
    const j = (await (await revise(env, b.id, b.editToken, FB)).json()) as { book: StoredBook };
    expect(j.book.pages).toHaveLength(11);
    expect(j.book.pages.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(j.book.pages[3].id).toBe("p11");
  });

  it("asks for something to act on, and for the right credentials, before spending anything", async () => {
    const env = mkEnv(); const b = await newBook(env);
    expect((await revise(env, b.id, b.editToken, { pages: { p2: { seal: true } } })).status).toBe(422);
    expect((await revise(env, b.id, "wrong", FB)).status).toBe(403);
    expect((await call(env, "POST", `/api/books/${b.id}/revise`, { feedback: FB, turnstileToken: "x" })).status).toBe(401);
    turnstile = false;
    expect((await revise(env, b.id, b.editToken, FB)).status).toBe(403);
    expect(reviserCalls).toHaveLength(0);
  });
});

describe("past editions and restore", () => {
  it("lists every edition and restores an old one as the newest, keeping history", async () => {
    const env = mkEnv(); const b = await newBook(env);
    await call(env, "POST", `/api/books/${b.id}/pages/p1/art`, undefined, b.editToken);
    await revise(env, b.id, b.editToken, FB);
    const list = ((await get(env, `/api/books/${b.id}/versions`)) as { versions: { version: number; kind: string }[] }).versions;
    expect(list.map((v) => [v.version, v.kind])).toEqual([[1, "created"], [2, "revised"]]);
    expect((await call(env, "POST", `/api/books/${b.id}/restore/1`, undefined, "wrong")).status).toBe(403);
    expect((await call(env, "POST", `/api/books/${b.id}/restore/9`, undefined, b.editToken)).status).toBe(404);
    const res = await call(env, "POST", `/api/books/${b.id}/restore/1`, undefined, b.editToken);
    const j = (await res.json()) as { book: StoredBook };
    expect(j.book.version).toBe(3);
    expect(j.book.kind).toBe("restored");
    expect(j.book.pages[2].text).not.toContain("Scout trotted"); // v1's text is back
    expect(j.book.pages[0].art.drawing).toBeTruthy();            // and its drawing
    expect((await get(env, `/api/books/${b.id}/versions/2`)).pages[2].text).toContain("Scout trotted"); // v2 still there
  });
});

describe("delete", () => {
  it("removes the book and every version, drawing, feedback and block, only for the edit token", async () => {
    const env = mkEnv(); const b = await newBook(env);
    await call(env, "POST", `/api/books/${b.id}/pages/p1/art`, undefined, b.editToken);
    await revise(env, b.id, b.editToken, FB);
    expect((await call(env, "DELETE", `/api/books/${b.id}`)).status).toBe(401);
    expect((await call(env, "DELETE", `/api/books/${b.id}`, undefined, "wrong")).status).toBe(403);
    expect((await call(env, "DELETE", `/api/books/${b.id}`, undefined, b.editToken)).status).toBe(200);
    const store = (env as { BOOKS: { store: Map<string, string> } }).BOOKS.store;
    expect([...store.keys()].filter((k) => k.startsWith(`book:${b.id}`))).toEqual([]);
    expect((await call(env, "GET", `/api/books/${b.id}`)).status).toBe(404);
    expect((await call(env, "GET", `/api/books/${b.id}/versions/1`)).status).toBe(404);
  });
});

describe("applyRevision", () => {
  const book = () => ({ ...(story() as object), id: "b", version: 1, status: "drawing", soulVersion: { commit: "c", soul: "s" }, createdAt: "", kidName: "K", paper: "lined" }) as unknown as StoredBook;
  const rev = (changes: Revision["changes"]): Revision => ({ changes, castAdditions: [], changelog: ["x"] });
  const upd = (id: string) => ({ op: "update" as const, pageId: id, page: { ...story().pages[0], id, text: "new" } });
  it("refuses more than two inserts and removes in total", () => {
    const r = applyRevision(book(), rev([{ op: "remove", pageId: "p1" }, { op: "remove", pageId: "p2" }, { op: "remove", pageId: "p3" }]), new Set());
    expect(r.ok).toBe(false);
  });
  it("refuses to touch a locked page, however it is asked", () => {
    for (const op of [upd("p2"), { op: "remove" as const, pageId: "p2" }]) expect(applyRevision(book(), rev([op]), new Set(["p2"]))).toMatchObject({ ok: false });
  });
  it("refuses unknown pages, reused ids and duplicate changes", () => {
    expect(applyRevision(book(), rev([upd("nope")]), new Set()).ok).toBe(false);
    expect(applyRevision(book(), rev([{ op: "insert", pageId: "p4", afterPageId: "p1", page: { ...story().pages[0], id: "p4" } }]), new Set()).ok).toBe(false);
    expect(applyRevision(book(), rev([upd("p1"), upd("p1")]), new Set()).ok).toBe(false);
  });
  it("leaves untouched pages byte for byte and renumbers", () => {
    const b = book();
    const r = applyRevision(b, rev([{ op: "remove", pageId: "p1" }]), new Set(["p2"]));
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.pages).toHaveLength(9); expect(r.pages[0].id).toBe("p2"); expect(r.pages[0].text).toBe(b.pages[1].text); expect(r.pages[0].n).toBe(1); }
  });
  it("refuses a cast addition that reuses an id", () => {
    const m = { id: "zzyzx", name: "Z", tier: "traveler" as const, badge: null, look: "x", custom: true };
    expect(applyRevision(book(), { ...rev([upd("p1")]), castAdditions: [m] }, new Set()).ok).toBe(false);
  });
});
