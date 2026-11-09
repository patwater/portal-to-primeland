import { useState } from "react";
import { Stamp } from "./Stamp";
import { roster } from "../lib/world";
import type { Book, BookPage } from "../lib/types";
import type { Feedback, PageFeedback } from "../../shared/feedback";

export type EditorApi = {
  feedback: Feedback;
  setPage: (pageId: string, patch: Partial<PageFeedback>) => void;
  setBook: (patch: Partial<Omit<Feedback, "pages">>) => void;
};

/** The strip of stamps under each page (brief 6.1). The Seal of Approval also locks the page for the Reviser. */
export function FeedbackStrip({ book, page, editor }: { book: Book; page: BookPage; editor: EditorApi }) {
  const f = editor.feedback.pages[page.id] ?? {};
  const [more, setMore] = useState(!!(f.moreOf?.ids.length || f.moreOf?.text));
  const kid = book.kidName;
  const toggle = (k: "seal" | "snip" | "huh" | "spooky") => editor.setPage(page.id, { [k]: !f[k] });
  const people = [...new Map([
    ...page.characters.map((id) => [id, book.cast.find((c) => c.id === id)?.name ?? roster.find((r) => r.id === id)?.name ?? id] as const),
    ...book.cast.map((c) => [c.id, c.name] as const),
    ...roster.filter((r) => r.tier === "keeper").map((r) => [r.id, r.name] as const),
  ]).entries()];
  const ids = f.moreOf?.ids ?? [];

  return (
    <div className="feedback no-print" role="group" aria-label={`How did ${kid} like this page?`}>
      <div className="feedback__stamps">
        <Stamp seed={`seal-${page.id}`} round on={!!f.seal} onClick={() => toggle("seal")}>Seal of Approval</Stamp>
        <Stamp seed={`snip-${page.id}`} on={!!f.snip} onClick={() => toggle("snip")}>Snip it</Stamp>
        <Stamp seed={`more-${page.id}`} on={more} onClick={() => { if (more) editor.setPage(page.id, { moreOf: undefined }); setMore(!more); }}>More of…</Stamp>
        <Stamp seed={`huh-${page.id}`} on={!!f.huh} onClick={() => toggle("huh")}>Huh?</Stamp>
        <Stamp seed={`spooky-${page.id}`} on={!!f.spooky} onClick={() => toggle("spooky")}>Too spooky</Stamp>
      </div>
      {f.seal && <p className="margin-note">{kid} loved this page, so it stays exactly as it is.</p>}
      {more && (
        <div className="feedback__more">
          <div className="choices" role="group" aria-label="More of which characters?">
            {people.map(([id, name]) => (
              <label key={id} className="chip">
                <input type="checkbox" checked={ids.includes(id)} onChange={(e) => editor.setPage(page.id, { moreOf: { ids: e.target.checked ? [...ids, id].slice(0, 6) : ids.filter((x) => x !== id), text: f.moreOf?.text ?? "" } })} />
                <span>{name}</span>
              </label>
            ))}
          </div>
          <input type="text" maxLength={200} placeholder="or something else…" value={f.moreOf?.text ?? ""} aria-label="More of something else"
            onChange={(e) => editor.setPage(page.id, { moreOf: { ids, text: e.target.value } })} />
        </div>
      )}
      <label className="field"><span className="margin-note">What did {kid} say?</span>
        <input type="text" maxLength={200} value={f.note ?? ""} onChange={(e) => editor.setPage(page.id, { note: e.target.value })} />
      </label>
    </div>
  );
}
