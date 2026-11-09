import type { Blocks } from "./blocks";
import type { Book } from "./types";
import { load, save } from "./storage";

export type Question = { id: string; text: string; why: string; askKid: boolean; kind: "single" | "multi" | "text"; options: string[] };
export type Answer = { id: string; text: string; askKid?: boolean };
export type MyBook = { id: string; editToken?: string; title: string; kidName: string; createdAt: string };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const FALLBACK = "The scissors got tangled. Shall we try that again?";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(path, init); } catch { throw new ApiError(0, "The portal is out of reach for a moment. Shall we try again?"); }
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? FALLBACK);
  return body as T;
}
const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const getConfig = () => request<{ turnstileSiteKey: string }>("/api/config");
export const interview = (blocks: Blocks) => request<{ questions: Question[] }>("/api/interview", json({ blocks }));
export const createBook = (blocks: Blocks, answers: Answer[], turnstileToken: string) =>
  request<{ id: string; editToken: string; book: Book }>("/api/books", json({ blocks, answers, turnstileToken }));
export const getBook = (id: string) => request<Book>(`/api/books/${encodeURIComponent(id)}`);

const KEY = "primeland.mybooks";
export const myBooks = () => load<MyBook[]>(KEY, []);
export function rememberBook(b: MyBook) {
  save(KEY, [b, ...myBooks().filter((x) => x.id !== b.id)].slice(0, 30));
}
export const editTokenFor = (id: string): string | undefined => {
  const m = window.location.hash.match(/edit=([\w-]+)/);
  return m?.[1] ?? myBooks().find((b) => b.id === id)?.editToken;
};
