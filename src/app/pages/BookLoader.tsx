import { useEffect, useState } from "react";
import { ApiError, getBook } from "../lib/api";
import { sampleBook } from "../lib/sample";
import type { Book } from "../lib/types";
import { Link } from "../lib/router";
import { Reader } from "./Reader";

export function BookLoader({ id }: { id: string }) {
  const [book, setBook] = useState<Book | null>(id === "sample" ? sampleBook : null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (id === "sample") { setBook(sampleBook); return; }
    let live = true;
    setBook(null); setErr("");
    getBook(id).then((b) => live && setBook(b)).catch((e) => live && setErr(e instanceof ApiError ? e.message : "That book has wandered off."));
    return () => { live = false; };
  }, [id]);
  if (err) return <section className="paper paper--grid page-pad"><div className="prose"><p className="notice" role="alert">{err}</p><p><Link to="/">Back to Primeland</Link></p></div></section>;
  if (!book) return <section className="paper paper--dots page-pad"><p className="margin-note" role="status">Fetching the book from the box…</p></section>;
  return <Reader book={book} />;
}
