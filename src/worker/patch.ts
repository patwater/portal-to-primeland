// Applies the Reviser's patch (brief 6.3, 9.5). The Reviser returns a patch, never a whole book, and a locked
// page is protected here as well as in the prompt: the patch is rejected if it touches one.
import type { Revision, StoredBook } from "./schemas";

type Page = StoredBook["pages"][number];
export type Applied = { ok: true; pages: Page[]; cast: StoredBook["cast"] } | { ok: false; errors: string[] };

export const MAX_STRUCTURAL = 2; // pages inserted plus pages removed

export function applyRevision(book: StoredBook, rev: Revision, locked: Set<string>): Applied {
  const errors: string[] = [];
  let pages: Page[] = book.pages.map((p) => ({ ...p, locked: locked.has(p.id) || undefined }));
  const exists = (id: string) => pages.some((p) => p.id === id);
  const touched = new Set<string>();
  const structural = rev.changes.filter((c) => c.op !== "update").length;
  if (structural > MAX_STRUCTURAL) errors.push(`at most ${MAX_STRUCTURAL} pages may be inserted or removed in total, got ${structural}`);

  for (const c of rev.changes) {
    if (touched.has(c.pageId)) errors.push(`page "${c.pageId}" appears in more than one change`);
    touched.add(c.pageId);
    if (c.op !== "insert" && locked.has(c.pageId)) { errors.push(`page "${c.pageId}" is locked and must not change`); continue; }
    if (c.op === "update") {
      if (!exists(c.pageId)) { errors.push(`cannot update unknown page "${c.pageId}"`); continue; }
      if (!c.page || c.page.id !== c.pageId) { errors.push(`update of "${c.pageId}" needs a page with the same id`); continue; }
      pages = pages.map((p) => (p.id === c.pageId ? { ...c.page!, locked: undefined } : p));
    } else if (c.op === "remove") {
      if (!exists(c.pageId)) { errors.push(`cannot remove unknown page "${c.pageId}"`); continue; }
      pages = pages.filter((p) => p.id !== c.pageId);
    } else {
      if (exists(c.pageId) || book.pages.some((p) => p.id === c.pageId)) { errors.push(`inserted page id "${c.pageId}" is already in use`); continue; }
      if (!c.page || c.page.id !== c.pageId) { errors.push(`insert of "${c.pageId}" needs a page with the same id`); continue; }
      const at = c.afterPageId ? pages.findIndex((p) => p.id === c.afterPageId) : pages.length - 1;
      if (c.afterPageId && at < 0) { errors.push(`insert after unknown page "${c.afterPageId}"`); continue; }
      pages = [...pages.slice(0, at + 1), { ...c.page, locked: undefined }, ...pages.slice(at + 1)];
    }
  }

  const castIds = new Set(book.cast.map((m) => m.id));
  for (const m of rev.castAdditions) {
    if (castIds.has(m.id)) errors.push(`cast id "${m.id}" is already in the book`);
    castIds.add(m.id);
  }
  if (errors.length) return { ok: false, errors };

  // Locked pages must come out exactly as they went in (only their number may move).
  for (const orig of book.pages.filter((p) => locked.has(p.id))) {
    const now = pages.find((p) => p.id === orig.id);
    if (!now || now.text !== orig.text || now.place !== orig.place || now.art.brief !== orig.art.brief || now.kidPrompt !== orig.kidPrompt || now.marginNote !== orig.marginNote || JSON.stringify(now.characters) !== JSON.stringify(orig.characters))
      return { ok: false, errors: [`locked page "${orig.id}" changed`] };
  }
  pages = pages.map((p, i) => ({ ...p, n: i + 1 }));
  return { ok: true, pages, cast: [...book.cast, ...rev.castAdditions] };
}
