// Client-side orchestration of the Sketch Artist (brief 2.4): cast sheets first, then pages, three at a time.
import type { Book, Drawing } from "./types";
import { ApiError } from "./api";

export type Progress = { done: number; total: number; failed: string[]; capped: boolean; running: boolean };

async function post<T>(path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new ApiError(res.status, j?.error ?? "The pencil snapped.");
  return j as T;
}

async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { for (let x = queue.shift(); x !== undefined; x = queue.shift()) await fn(x); }));
}

/**
 * Draws whatever the book is missing. `onBook` receives each updated book as soon as a drawing lands, so the
 * reader can show pages while the rest are still being drawn. Resolves when everything has been tried.
 */
export async function drawBook(book: Book, token: string, onBook: (b: Book) => void, onProgress: (p: Progress) => void): Promise<Book> {
  let cur = book;
  const castTodo = cur.cast.filter((c) => c.custom && !cur.castDrawings?.[c.id]).map((c) => c.id);
  const pageTodo = cur.pages.filter((p) => !p.art.drawing).map((p) => p.id);
  const prog: Progress = { done: 0, total: castTodo.length + pageTodo.length, failed: [], capped: false, running: true };
  const tick = () => onProgress({ ...prog, failed: [...prog.failed] });
  tick();

  const attempt = async <T,>(f: () => Promise<T>): Promise<T | null> => {
    for (let i = 0; i < 2; i++) {
      try { return await f(); } catch (e) {
        if (e instanceof ApiError && e.status === 429) { prog.capped = true; return null; }
        if (e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) { prog.capped = true; return null; }
      }
    }
    return null;
  };

  await pool(castTodo, 3, async (id) => {
    const r = prog.capped ? null : await attempt(() => post<{ drawing: Drawing }>(`/api/books/${book.id}/cast-sheet`, token, { castId: id }));
    if (r) { cur = { ...cur, castDrawings: { ...cur.castDrawings, [id]: r.drawing } }; onBook(cur); } else prog.failed.push(id);
    prog.done++; tick();
  });
  await pool(pageTodo, 3, async (id) => {
    const r = prog.capped ? null : await attempt(() => post<{ drawing: Drawing }>(`/api/books/${book.id}/pages/${id}/art`, token));
    if (r) { cur = { ...cur, pages: cur.pages.map((p) => (p.id === id ? { ...p, art: { ...p.art, renderer: "rough", drawing: r.drawing } } : p)) }; onBook(cur); } else prog.failed.push(id);
    prog.done++; tick();
  });
  prog.running = false; tick();
  return cur;
}
