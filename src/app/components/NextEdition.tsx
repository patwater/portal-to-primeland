import { useEffect, useState } from "react";
import { RoughBox, RoughButton } from "./Rough";
import { Turnstile } from "./Turnstile";
import { numberedPlaces } from "../lib/world";
import type { VersionInfo } from "../lib/api";
import type { Book } from "../lib/types";
import type { EditorApi } from "./FeedbackStrip";
import { hasRequests } from "../../shared/feedback";

export type EditionApi = EditorApi & {
  busy: boolean; error: string; changelog: string[] | null; dismissChangelog: () => void;
  revise: (turnstileToken: string) => Promise<void>;
  latest: number; versions: VersionInfo[] | null; loadVersions: () => void;
  view: (n: number) => void; restore: (n: number) => Promise<void>; remove: () => Promise<void>;
};

/** Whole-book notes, the kid's own words, the revise button, past editions, and delete (brief 6.2, 6.3). */
export function NextEdition({ book, api }: { book: Book; api: EditionApi }) {
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [sure, setSure] = useState(false);
  const f = api.feedback, kid = book.kidName;
  const ready = hasRequests(f);
  useEffect(() => { if (api.error) { setToken(null); setResetKey((k) => k + 1); } }, [api.error]);

  return (
    <div className="leaf-single paper paper--grid next">
      <div className="next__inner">
        <h2 className="display display--sm">Make the next edition</h2>

        {api.changelog && (
          <RoughBox seed="changelog" fill className="changelog" as="section">
            <h3 className="field__label">What changed, and why</h3>
            <ul>{api.changelog.map((c, i) => <li key={i}>{c}</li>)}</ul>
            <button className="linkish" onClick={api.dismissChangelog}>Got it</button>
          </RoughBox>
        )}

        <label className="field"><span className="field__label">How did the reading go?</span>
          <textarea rows={3} maxLength={400} value={f.notes ?? ""} onChange={(e) => api.setBook({ notes: e.target.value })} placeholder="Anything that worked, or didn't." />
        </label>
        <label className="field"><span className="field__label">Something {kid} said, in their own words</span>
          <input type="text" maxLength={300} value={f.kidQuote ?? ""} onChange={(e) => api.setBook({ kidQuote: e.target.value })} />
        </label>
        <label className="field"><span className="field__label">Next time, can we go to…</span>
          <select value={f.nextPlace ?? ""} onChange={(e) => api.setBook({ nextPlace: e.target.value || undefined })}>
            <option value="">Let the story decide</option>
            {numberedPlaces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <div className="form-foot">
          <Turnstile onToken={setToken} resetKey={resetKey} />
          <RoughButton big seed="revise" className="wobble" disabled={!ready || !token || api.busy} onClick={() => token && api.revise(token)}>
            {api.busy ? "Back through the portal…" : "Send it back through the portal →"}
          </RoughButton>
          {!ready && <p className="margin-note">Add a stamp, a note, or something {kid} said first.</p>}
          {api.error && <p className="notice" role="alert">{api.error}</p>}
        </div>

        <RoughBox seed="past" className="past" as="section">
          <details onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && api.loadVersions()}>
            <summary className="field__label">Past editions</summary>
            {!api.versions && <p className="margin-note">Fetching the shelf…</p>}
            <ol className="versions">
              {(api.versions ?? []).slice().reverse().map((v) => (
                <li key={v.version}>
                  <strong>Edition {v.version}</strong>{v.version === api.latest ? " (newest)" : ""} · {v.pages} pages
                  {v.changelog.length > 0 && <ul>{v.changelog.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                  {v.version !== api.latest && (
                    <span className="versions__actions">
                      <button className="linkish" onClick={() => api.view(v.version)}>Read it</button>
                      <button className="linkish" onClick={() => api.restore(v.version)}>Make it the newest</button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </details>
        </RoughBox>

        <div className="danger">
          {!sure ? (
            <button className="linkish" onClick={() => setSure(true)}>Delete this book…</button>
          ) : (
            <p className="notice" role="alertdialog">
              Delete this book and every edition for good? <button className="linkish" onClick={api.remove}>Yes, delete it</button> · <button className="linkish" onClick={() => setSure(false)}>Keep it</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
