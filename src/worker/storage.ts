// KV helpers: books, versions, the daily generation budget. Book keys expire after BOOK_TTL_DAYS and the clock
// restarts on every save. Only the SHA-256 of the edit token is ever stored.
import type { StoredBook } from "./schemas";

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
export async function getBook(env: StorageEnv, id: string, version?: number): Promise<StoredBook | null> {
  const kv = need(env);
  const v = version ?? (await kv.get<Meta>(`book:${id}:meta`, "json"))?.latestVersion;
  if (!v) return null;
  return kv.get<StoredBook>(`book:${id}:v${v}`, "json");
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
