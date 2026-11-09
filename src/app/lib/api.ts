import type { Blocks } from "./blocks";
import type { Book } from "./types";
import { load, save } from "./storage";
import type { Feedback } from "../../shared/feedback";

export type Question = { id: string; text: string; why: string; askKid: boolean; kind: "single" | "multi" | "text"; options: string[] };
export type Answer = { id: string; text: string; askKid?: boolean };
export type MyBook = { id: string; editToken?: string; title: string; kidName: string; createdAt: string };

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public detail?: string) { super(message); }
}
const ANTHROPIC_HINTS: Record<string, string> = {
  anthropic_key_missing: "The Anthropic API key secret is not set on the Worker.",
  anthropic_key_rejected: "Anthropic refused the API key set on the Worker. Check that it is valid and has credit.",
  anthropic_model_unavailable: "Anthropic doesn't know the model name set in wrangler.jsonc (or the key can't use it).",
  anthropic_bad_request: "Anthropic rejected the request itself. Check the Worker logs for the details.",
  anthropic_max_tokens: "The model ran out of room before finishing. Check the Worker logs.",
  anthropic_busy: "Anthropic is rate-limiting or overloaded. Waiting a minute and pressing Try again usually works.",
  drawing_rejected: "The model's drawing broke the drawing rules even after repair.",
};
const OWNER_HINT = " (Site owner: the Turnstile site key in wrangler.jsonc and the secret key set on the Worker must come from the same Turnstile widget.)";
const FALLBACK = "The scissors got tangled. Shall we try that again?";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(path, init); } catch { throw new ApiError(0, "The portal is out of reach for a moment. Shall we try again?"); }
  const body = (await res.json().catch(() => null)) as { error?: string; code?: string; detail?: string } | null;
  if (!res.ok) {
    const setup = body?.code === "turnstile_rejected" || body?.code === "turnstile_misconfigured" || body?.code === "turnstile_unconfigured";
    const hint = body?.code ? ANTHROPIC_HINTS[body.code] : undefined;
    throw new ApiError(res.status, (body?.error ?? FALLBACK) + (setup ? OWNER_HINT : "") + (hint ? ` (Site owner: ${hint}${body?.detail ? ` [${body.detail.slice(0, 160)}]` : ""})` : ""), body?.code, body?.detail);
  }
  return body as T;
}
const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const getConfig = () => request<{ turnstileSiteKey: string; turnstileEnabled: boolean; bookLimit: number; booksLeft: number }>("/api/config");
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

// ---- feedback, revision, editions (milestone 5): all need the private edit token ----
export type VersionInfo = { version: number; createdAt: string; kind: string; changelog: string[]; pages: number };
const auth = (token: string, init: RequestInit = {}): RequestInit => ({ ...init, headers: { ...(init.headers as object), Authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) } });
export const getFeedback = (id: string, token: string) => request<Feedback>(`/api/books/${id}/feedback`, auth(token));
export const putFeedback = (id: string, token: string, f: Feedback) => request<{ ok: true }>(`/api/books/${id}/feedback`, auth(token, { method: "PUT", body: JSON.stringify(f) }));
export const reviseBook = (id: string, token: string, feedback: Feedback, turnstileToken: string) =>
  request<{ book: Book; changelog: string[] }>(`/api/books/${id}/revise`, auth(token, { method: "POST", body: JSON.stringify({ feedback, turnstileToken }) }));
export const listVersions = (id: string) => request<{ versions: VersionInfo[] }>(`/api/books/${id}/versions`);
export const getVersion = (id: string, n: number) => request<Book>(`/api/books/${id}/versions/${n}`);
export const restoreVersion = (id: string, token: string, n: number) => request<{ book: Book }>(`/api/books/${id}/restore/${n}`, auth(token, { method: "POST" }));
export const deleteBook = (id: string, token: string) => request<{ ok: true }>(`/api/books/${id}`, auth(token, { method: "DELETE" }));
export function forgetBook(id: string) { save(KEY, myBooks().filter((b) => b.id !== id)); }
