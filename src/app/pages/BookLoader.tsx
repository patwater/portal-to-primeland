import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, deleteBook, editTokenFor, forgetBook, getBook, getFeedback, getVersion, listVersions, putFeedback, restoreVersion, reviseBook, type VersionInfo } from "../lib/api";
import { drawBook, type Progress } from "../lib/artist";
import { sampleBook } from "../lib/sample";
import type { Book } from "../lib/types";
import { Link, navigate } from "../lib/router";
import { Reader } from "./Reader";
import type { EditionApi } from "../components/NextEdition";
import type { Feedback, PageFeedback } from "../../shared/feedback";

const EMPTY: Feedback = { pages: {} };

export function BookLoader({ id }: { id: string }) {
  const [book, setBook] = useState<Book | null>(id === "sample" ? sampleBook : null);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [round, setRound] = useState(0); // bumping this runs the artist again
  const drawing = useRef(false);
  const token = id === "sample" ? undefined : editTokenFor(id);

  // feedback and editions (only the holder of the edit token ever sees or loads these)
  const [feedback, setFeedback] = useState<Feedback>(EMPTY);
  const loadedFeedback = useRef(false);
  const dirty = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changelog, setChangelog] = useState<string[] | null>(null);
  const [versions, setVersions] = useState<VersionInfo[] | null>(null);
  const [viewing, setViewing] = useState<Book | null>(null);

  useEffect(() => {
    if (id === "sample") { setBook(sampleBook); return; }
    let live = true;
    setBook(null); setErr(""); setViewing(null); loadedFeedback.current = false;
    getBook(id).then((b) => live && setBook(b)).catch((e) => live && setErr(e instanceof ApiError ? e.message : "That book has wandered off."));
    return () => { live = false; };
  }, [id]);

  const loaded = !!book && book.id === id;

  useEffect(() => {
    if (!loaded || !token || loadedFeedback.current) return;
    loadedFeedback.current = true;
    getFeedback(id, token).then((f) => setFeedback({ ...EMPTY, ...f })).catch(() => undefined);
  }, [loaded, token, id]);

  // Autosave stamps and notes shortly after the last change.
  useEffect(() => {
    if (!dirty.current || !token) return;
    const t = setTimeout(() => { dirty.current = false; putFeedback(id, token, feedback).catch(() => { dirty.current = true; }); }, 800);
    return () => clearTimeout(t);
  }, [feedback, token, id]);

  // The creator (who holds the edit token) draws whatever is missing.
  useEffect(() => {
    if (!loaded || id === "sample" || drawing.current || viewing) return;
    if (!token) return;
    const missing = book!.pages.some((p) => !p.art.drawing) || book!.cast.some((c) => c.custom && !book!.castDrawings?.[c.id]);
    if (!missing) return;
    drawing.current = true;
    drawBook(book!, token, (b) => setBook((cur) => (cur && cur.version !== undefined && b.version !== undefined && cur.version !== b.version ? cur : b)), setProgress).finally(() => { drawing.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, id, round]);

  // Everyone else just watches: pick up drawings as the creator's browser saves them.
  useEffect(() => {
    if (!loaded || id === "sample" || token || viewing || book!.status === "ready") return;
    const t = setInterval(() => getBook(id).then(setBook).catch(() => undefined), 6000);
    return () => clearInterval(t);
  }, [loaded, id, book?.status, viewing]); // eslint-disable-line react-hooks/exhaustive-deps

  const editor: EditionApi | undefined = useMemo(() => {
    if (!token || !book || id === "sample" || viewing) return undefined;
    const latest = book.version ?? 1;
    const apply = (b: Book, f: Feedback) => { setBook(b); setFeedback(f); setViewing(null); setVersions(null); setProgress(null); setRound((r) => r + 1); };
    return {
      feedback, latest, versions, busy, error, changelog,
      setPage: (pageId: string, patch: Partial<PageFeedback>) => { dirty.current = true; setFeedback((f) => ({ ...f, pages: { ...f.pages, [pageId]: { ...f.pages[pageId], ...patch } } })); },
      setBook: (patch) => { dirty.current = true; setFeedback((f) => ({ ...f, ...patch })); },
      dismissChangelog: () => setChangelog(null),
      loadVersions: () => { listVersions(id).then((r) => setVersions(r.versions)).catch(() => setVersions([])); },
      revise: async (turnstileToken: string) => {
        setBusy(true); setError("");
        try {
          const r = await reviseBook(id, token, feedback, turnstileToken);
          const sealed = Object.fromEntries(r.book.pages.filter((p) => p.locked).map((p) => [p.id, { seal: true }]));
          apply(r.book, { pages: sealed }); setChangelog(r.changelog);
          navigate(`/b/${id}#edit=${token}`);
        } catch (e) { setError(e instanceof ApiError ? e.message : "The scissors got tangled. Shall we try that again?"); }
        setBusy(false);
      },
      view: (n: number) => { getVersion(id, n).then(setViewing).catch(() => setError("That edition has wandered off.")); },
      restore: async (n: number) => {
        try { const r = await restoreVersion(id, token, n); apply(r.book, EMPTY); setChangelog([`Edition ${n} is back as the newest edition.`]); }
        catch (e) { setError(e instanceof ApiError ? e.message : "That edition has wandered off."); }
      },
      remove: async () => {
        try { await deleteBook(id, token); forgetBook(id); navigate("/"); }
        catch (e) { setError(e instanceof ApiError ? e.message : "The scissors got tangled. Shall we try that again?"); }
      },
    };
  }, [token, book, id, viewing, feedback, versions, busy, error, changelog]);

  if (err) return <section className="paper paper--grid page-pad"><div className="prose"><p className="notice" role="alert">{err}</p><p><Link to="/">Back to Primeland</Link></p></div></section>;
  if (!book) return <section className="paper paper--dots page-pad"><p className="margin-note" role="status">Fetching the book from the box…</p></section>;

  const shown = viewing ?? book;
  return (
    <>
      {viewing && (
        <p className="banner no-print" role="status">
          You're reading edition {viewing.version}. <button className="linkish" onClick={() => setViewing(null)}>Back to the newest</button>
          {token && <> · <button className="linkish" onClick={() => { restoreVersion(id, token, viewing.version!).then((r) => { setBook(r.book); setViewing(null); setVersions(null); setFeedback(EMPTY); setRound((x) => x + 1); }).catch(() => undefined); }}>Make this the newest edition</button></>}
        </p>
      )}
      <Reader key={`${shown.id}-${shown.version ?? 0}`} book={shown} progress={viewing ? null : progress} onRetry={() => { setProgress(null); setRound((r) => r + 1); }} editor={editor} startAtNext={!!changelog} />
    </>
  );
}
