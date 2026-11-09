import { useEffect, useRef, useState } from "react";
import { ApiError, editTokenFor, getBook } from "../lib/api";
import { drawBook, type Progress } from "../lib/artist";
import { sampleBook } from "../lib/sample";
import type { Book } from "../lib/types";
import { Link } from "../lib/router";
import { Reader } from "./Reader";

export function BookLoader({ id }: { id: string }) {
  const [book, setBook] = useState<Book | null>(id === "sample" ? sampleBook : null);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [round, setRound] = useState(0); // bumping this runs the artist again (the "try again" button)
  const drawing = useRef(false);

  useEffect(() => {
    if (id === "sample") { setBook(sampleBook); return; }
    let live = true;
    setBook(null); setErr("");
    getBook(id).then((b) => live && setBook(b)).catch((e) => live && setErr(e instanceof ApiError ? e.message : "That book has wandered off."));
    return () => { live = false; };
  }, [id]);

  // The creator (who holds the edit token) draws whatever is missing, one batch at a time.
  const loaded = !!book && book.id === id;
  useEffect(() => {
    if (!loaded || id === "sample" || drawing.current) return;
    const token = editTokenFor(id);
    if (!token) return;
    const missing = book!.pages.some((p) => !p.art.drawing) || book!.cast.some((c) => c.custom && !book!.castDrawings?.[c.id]);
    if (!missing) return;
    drawing.current = true;
    drawBook(book!, token, (b) => setBook(b), setProgress).finally(() => { drawing.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, id, round]);

  // Everyone else just watches: pick up drawings as the creator's browser saves them.
  useEffect(() => {
    if (!loaded || id === "sample" || editTokenFor(id) || book!.status === "ready") return;
    const t = setInterval(() => getBook(id).then(setBook).catch(() => undefined), 6000);
    return () => clearInterval(t);
  }, [loaded, id, book?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <section className="paper paper--grid page-pad"><div className="prose"><p className="notice" role="alert">{err}</p><p><Link to="/">Back to Primeland</Link></p></div></section>;
  if (!book) return <section className="paper paper--dots page-pad"><p className="margin-note" role="status">Fetching the book from the box…</p></section>;
  return <Reader book={book} progress={progress} onRetry={() => { setProgress(null); setRound((r) => r + 1); }} />;
}
