import { assemble } from "./assemble";
import { familyInput } from "./family";
import { callClaude, FriendlyError, TANGLED } from "../claude";
import { checkStory } from "../checks";
import { applyRevision } from "../patch";
import { revisionJsonSchema, revisionSchema, storySchema, type FamilyBlocks, type StoredBook } from "../schemas";
import { cleanText, lockedPageIds, type Feedback } from "../../shared/feedback";
import { roster, places } from "../world";
import type { StoryEnv } from "./storyteller";

const nameOf = (id: string, book: StoredBook) => book.cast.find((c) => c.id === id)?.name ?? roster.find((r) => r.id === id)?.name ?? id;

export function feedbackInput(f: Feedback, book: StoredBook): string {
  const lines: string[] = [];
  for (const p of book.pages) {
    const x = f.pages[p.id];
    if (!x) continue;
    const bits = [x.seal && `SEAL OF APPROVAL (${book.kidName} loved it; locked)`, x.snip && "too long, please shorten", x.huh && "confusing", x.spooky && "too spooky",
      x.moreOf && (x.moreOf.ids.length || x.moreOf.text) && `wants more of: ${[...x.moreOf.ids.map((id) => nameOf(id, book)), cleanText(x.moreOf.text, 200)].filter(Boolean).join(", ")}`,
      x.note?.trim() && `said: "${cleanText(x.note, 200)}"`].filter(Boolean);
    if (bits.length) lines.push(`${p.id} (page ${p.n}): ${bits.join("; ")}`);
  }
  if (f.notes?.trim()) lines.push(`Whole-book notes: ${cleanText(f.notes, 400)}`);
  if (f.kidQuote?.trim()) lines.push(`Something ${book.kidName} said, in their own words: "${cleanText(f.kidQuote, 300)}"`);
  if (f.nextPlace) lines.push(`Next time, ${book.kidName} would like to go to: ${places.find((p) => p.id === f.nextPlace)?.name ?? f.nextPlace}`);
  return `<feedback>\n${lines.join("\n")}\n</feedback>`;
}

const bookInput = (b: StoredBook, locked: Set<string>) => `<book>\n${JSON.stringify({
  title: b.title, cast: b.cast, n2Resolution: b.n2Resolution,
  pages: b.pages.map((p) => ({ id: p.id, n: p.n, text: p.text, place: p.place, characters: p.characters, kidPrompt: p.kidPrompt, marginNote: p.marginNote, art: { brief: p.art.brief }, locked: locked.has(p.id) || undefined })),
})}\n</book>`;

export type RevisedBook = { pages: StoredBook["pages"]; cast: StoredBook["cast"]; changelog: string[] };

/** Asks for a patch, applies it, runs the same sense checks as the Storyteller, and retries once with the errors. */
export async function generateRevision(env: StoryEnv, book: StoredBook, blocks: FamilyBlocks, feedback: Feedback, fetchImpl?: typeof fetch): Promise<RevisedBook> {
  const lockedIds = lockedPageIds(feedback).filter((id) => book.pages.some((p) => p.id === id));
  const locked = new Set(lockedIds);
  const system = assemble("reviser");
  const base = [bookInput(book, locked), feedbackInput(feedback, book), familyInput(blocks),
    `<limits>\nLocked pages (never change, never remove): ${lockedIds.join(", ") || "none"}. Insert or remove at most 2 pages in total. Book length stays between ${Math.max(6, book.pages.length - 2)} and ${Math.min(14, book.pages.length + 2)} pages. Give inserted pages new ids that are not already used.\n</limits>`].join("\n\n");
  let user = base, errors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callClaude({ env, route: attempt ? "revise-retry" : "revise", model: env.MODEL_STORY ?? "claude-sonnet-5-5", system, user, schema: revisionJsonSchema, maxTokens: 8000, timeoutMs: 120_000, fetchImpl });
    const rev = revisionSchema.safeParse(raw);
    if (!rev.success) errors = rev.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`);
    else {
      const applied = applyRevision(book, rev.data, locked);
      if (!applied.ok) errors = applied.errors;
      else {
        const candidate = { title: book.title, dedication: book.dedication, byline: book.byline, n2Resolution: book.n2Resolution, cast: applied.cast, pages: applied.pages.map(({ locked: _l, ...p }) => p) };
        const shape = storySchema.safeParse(candidate);
        errors = shape.success ? checkStory(shape.data, blocks, { pageRange: { min: Math.max(6, book.pages.length - 2), max: Math.min(14, book.pages.length + 2) } }) : shape.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`);
        if (!errors.length) {
          if (rev.data.changelog.length < rev.data.changes.length) errors = ["write one changelog sentence for each change"];
          else return { pages: applied.pages, cast: applied.cast, changelog: rev.data.changelog };
        }
      }
    }
    user = `${base}\n\n<fix>Your last patch was rejected for these reasons. Return a corrected patch:\n${errors.map((e) => `- ${e}`).join("\n")}\n</fix>`;
  }
  console.log(JSON.stringify({ route: "revise", rejected: errors.length }));
  throw new FriendlyError(502, TANGLED, "revision failed checks");
}
