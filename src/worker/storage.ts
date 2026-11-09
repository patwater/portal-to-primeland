// KV helpers: books, versions, the daily generation budget. Book keys expire after BOOK_TTL_DAYS and the clock
// restarts on every save. Only the SHA-256 of the edit token is ever stored.
import type { StoredBook } from "./schemas";
import type { ParsedDrawing } from "../shared/drawing";
import type { Feedback } from "../shared/feedback";
import type { FamilyBlocks } from "./schemas";

export type StorageEnv = { BOOKS?: KVNamespace; BOOK_TTL_DAYS?: string; DAILY_BOOK_BUDGET?: string };

const ttl = (env: StorageEnv) => Math.max(60, Math.round(Number(env.BOOK_TTL_DAYS ?? 400) * 86400));
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function randomId(len = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export function randomToken(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type Meta = { latestVersion: number; editTokenHash: string; createdAt: string };
const need = (env: StorageEnv) => { if (!env.BOOKS) throw new Error("BOOKS KV namespace is not bound"); return env.BOOKS; };

export async function saveBook(env: StorageEnv, book: StoredBook, editTokenHash?: string) {
  const kv = need(env);
  const metaKey = `book:${book.id}:meta`;
  const prev = await kv.get<Meta>(metaKey, "json");
  const meta: Meta = { latestVersion: book.version, editTokenHash: editTokenHash ?? prev?.editTokenHash ?? "", createdAt: prev?.createdAt ?? book.createdAt };
  const opts = { expirationTtl: ttl(env) };
  await kv.put(`book:${book.id}:v${book.version}`, JSON.stringify(book), opts);
  await kv.put(metaKey, JSON.stringify(meta), opts);
}
/**
 * Drawings are stored one key each, so three pages drawing at once never overwrite each other
 * (KV has no compare-and-set). Reading a book merges them back in.
 */
const pageArtKey = (id: string, v: number, pageId: string) => `book:${id}:v${v}:art:${pageId}`;
const castKey = (id: string, v: number, castId: string) => `book:${id}:v${v}:cast:${castId}`;

export async function savePageArt(env: StorageEnv, id: string, v: number, pageId: string, d: ParsedDrawing) {
  await need(env).put(pageArtKey(id, v, pageId), JSON.stringify(d), { expirationTtl: ttl(env) });
}
export async function saveCastSheet(env: StorageEnv, id: string, v: number, castId: string, d: ParsedDrawing) {
  await need(env).put(castKey(id, v, castId), JSON.stringify(d), { expirationTtl: ttl(env) });
}

export async function getBook(env: StorageEnv, id: string, version?: number): Promise<StoredBook | null> {
  const kv = need(env);
  const v = version ?? (await kv.get<Meta>(`book:${id}:meta`, "json"))?.latestVersion;
  if (!v) return null;
  const book = await kv.get<StoredBook>(`book:${id}:v${v}`, "json");
  if (!book) return null;
  const [pageArt, castArt] = await Promise.all([
    Promise.all(book.pages.map((p) => kv.get<ParsedDrawing>(pageArtKey(id, v, p.id), "json"))),
    Promise.all(book.cast.map((c) => kv.get<ParsedDrawing>(castKey(id, v, c.id), "json"))),
  ]);
  book.pages = book.pages.map((p, i) => (pageArt[i] ? { ...p, art: { ...p.art, renderer: "rough", drawing: pageArt[i]! } } : p));
  const castDrawings: Record<string, ParsedDrawing> = {};
  book.cast.forEach((c, i) => { if (castArt[i]) castDrawings[c.id] = castArt[i]!; });
  book.castDrawings = castDrawings;
  book.status = book.pages.every((p) => p.art.drawing) ? "ready" : "drawing";
  return book;
}

/** The stored version without drawings merged in (cheap). */
export async function getBookRaw(env: StorageEnv, id: string): Promise<StoredBook | null> {
  const kv = need(env);
  const v = (await kv.get<Meta>(`book:${id}:meta`, "json"))?.latestVersion;
  return v ? kv.get<StoredBook>(`book:${id}:v${v}`, "json") : null;
}
export async function getVersionRaw(env: StorageEnv, id: string, v: number): Promise<StoredBook | null> {
  return need(env).get<StoredBook>(`book:${id}:v${v}`, "json");
}
/** Ids of cast members that already have a cast sheet. */
export async function castSheetIds(env: StorageEnv, book: StoredBook): Promise<Set<string>> {
  const kv = need(env);
  const has = await Promise.all(book.cast.map(async (c) => (await kv.get(castKey(book.id, book.version, c.id))) != null));
  return new Set(book.cast.filter((_, i) => has[i]).map((c) => c.id));
}

/** A hard cap on Sketch Artist calls per book, so a stuck client can't run up the bill. */
export async function takeArtAttempt(env: StorageEnv, id: string, cap: number): Promise<boolean> {
  const kv = need(env);
  const key = `book:${id}:artcount`;
  const n = Number((await kv.get(key)) ?? 0);
  if (n >= cap) return false;
  await kv.put(key, String(n + 1), { expirationTtl: ttl(env) });
  return true;
}
export const getMeta = (env: StorageEnv, id: string) => need(env).get<Meta>(`book:${id}:meta`, "json");

/** Daily counter. Not atomic (KV is eventually consistent), which is fine for a cost guard. */
export async function takeBudget(env: StorageEnv, now = new Date()): Promise<boolean> {
  const kv = need(env);
  const key = `budget:${now.toISOString().slice(0, 10)}`;
  const used = Number((await kv.get(key)) ?? 0);
  if (used >= Number(env.DAILY_BOOK_BUDGET ?? 200)) return false;
  await kv.put(key, String(used + 1), { expirationTtl: 3 * 86400 });
  return true;
}

// ---- the family's blocks (private, never served), feedback, versions, deletion ----
export const saveBlocks = (env: StorageEnv, id: string, blocks: FamilyBlocks) =>
  need(env).put(`book:${id}:blocks`, JSON.stringify(blocks), { expirationTtl: ttl(env) });
export const getBlocks = (env: StorageEnv, id: string) => need(env).get<FamilyBlocks>(`book:${id}:blocks`, "json");

const feedbackKey = (id: string, v: number) => `book:${id}:v${v}:feedback`;
export const saveFeedback = (env: StorageEnv, id: string, v: number, f: Feedback) =>
  need(env).put(feedbackKey(id, v), JSON.stringify(f), { expirationTtl: ttl(env) });
export async function getFeedback(env: StorageEnv, id: string, v: number): Promise<Feedback> {
  return (await need(env).get<Feedback>(feedbackKey(id, v), "json")) ?? { pages: {} };
}

export type VersionInfo = { version: number; createdAt: string; kind: string; changelog: string[]; pages: number };
export async function listVersions(env: StorageEnv, id: string): Promise<VersionInfo[]> {
  const kv = need(env);
  const latest = (await kv.get<Meta>(`book:${id}:meta`, "json"))?.latestVersion ?? 0;
  const books = await Promise.all(Array.from({ length: latest }, (_, i) => kv.get<StoredBook>(`book:${id}:v${i + 1}`, "json")));
  return books.flatMap((b) => (b ? [{ version: b.version, createdAt: b.createdAt, kind: b.kind ?? "created", changelog: b.changelog ?? [], pages: b.pages.length }] : []));
}

/** Copies drawings that are still valid into a new version: pages whose brief is unchanged, and every cast sheet. */
export async function carryArt(env: StorageEnv, id: string, from: StoredBook, to: StoredBook) {
  const kv = need(env);
  const opts = { expirationTtl: ttl(env) };
  const copy = async (a: string, b: string) => { const v = await kv.get(a); if (v != null) await kv.put(b, v, opts); };
  const oldById = new Map(from.pages.map((p) => [p.id, p]));
  await Promise.all([
    ...to.pages.filter((p) => oldById.get(p.id)?.art.brief === p.art.brief).map((p) => copy(pageArtKey(id, from.version, p.id), pageArtKey(id, to.version, p.id))),
    ...from.cast.map((c) => copy(castKey(id, from.version, c.id), castKey(id, to.version, c.id))),
  ]);
}

export async function deleteBook(env: StorageEnv, id: string): Promise<number> {
  const kv = need(env);
  let cursor: string | undefined, n = 0;
  do {
    const page = await kv.list({ prefix: `book:${id}:`, cursor });
    await Promise.all(page.keys.map((k) => kv.delete(k.name)));
    n += page.keys.length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return n;
}
