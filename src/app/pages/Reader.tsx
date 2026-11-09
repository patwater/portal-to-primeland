import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Book } from "../lib/types";
import { CastContext, DrawingRenderer } from "../components/DrawingRenderer";
import type { Progress } from "../lib/artist";
import { RoughBox, RoughButton, Squiggle } from "../components/Rough";
import { Link } from "../lib/router";
import { editTokenFor } from "../lib/api";
import { FeedbackStrip } from "../components/FeedbackStrip";
import { NextEdition, type EditionApi } from "../components/NextEdition";

type Leaf = { key: string; node: ReactNode; label: string };

function useCommit() {
  const [c, setC] = useState<{ commit: string; hashes?: { soul: string } } | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/health")
      .then((r) => (r.ok ? (r.json() as Promise<{ commit: string; hashes?: { soul: string } }>) : null))
      .then((j: { commit: string; hashes?: { soul: string } } | null) => { if (live && j) setC(j); })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return c;
}

const blankFrame = {
  viewBox: [800, 560] as [800, 560],
  elements: [{ type: "rect" as const, x: 80, y: 60, w: 640, h: 440, weight: 3 as const }],
};

export function Reader({ book, progress, onRetry, editor, startAtNext }: { book: Book; progress?: Progress | null; onRetry?: () => void; editor?: EditionApi; startAtNext?: boolean }) {
  const health = useCommit();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const touch = useRef<number | null>(null);
  const [sheet, setSheet] = useState<"square" | "letter">("square");
  // Square 8.5 x 8.5 in is the default sheet; letter landscape puts the picture beside the text.
  useEffect(() => {
    document.documentElement.dataset.print = sheet;
    let el = document.getElementById("print-size") as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = "print-size"; document.head.appendChild(el); }
    el.textContent = `@page { size: ${sheet === "letter" ? "11in 8.5in" : "8.5in 8.5in"}; margin: .4in; }`;
    return () => { delete document.documentElement.dataset.print; };
  }, [sheet]);
  const paper = book.paper === "lined" ? "lined" : book.paper === "dots" ? "dots" : "grid";

  const leaves: Leaf[] = [
    {
      key: "cover",
      label: "Cover",
      node: (
        <div className="leaf-single paper paper--dots cover">
          <p className="margin-note">{book.byline}</p>
          <h1 className="display">{book.title.replace("Primeland", "") }<span className="hl">Primeland</span></h1>
          <Squiggle seed="rcover" width={300} />
          <p className="subtitle">Chapter the First, in which a box is opened.</p>
        </div>
      ),
    },
    {
      key: "dedication",
      label: "Dedication",
      node: (
        <div className="leaf-single paper paper--lined">
          <p className="dedication">{book.dedication}</p>
        </div>
      ),
    },
    ...book.pages.map((p): Leaf => ({
      key: p.id,
      label: `Page ${p.n}`,
      node: (
        <div className="spread">
          <div className="spread__art paper paper--dots">
            {p.art.drawing ? (
              <DrawingRenderer drawing={p.art.drawing} seed={`${book.id}-${p.id}`} alt={p.art.brief} />
            ) : (
              <div className="art-pending" role="img" aria-label={p.art.brief}>
                <p className="margin-note">{progress?.running ? "The Sketch Artist is drawing this one…" : "The Sketch Artist is still sharpening a pencil."}</p>
                <p className="art-pending__brief">{p.art.brief}</p>
              </div>
            )}
            <span className="pageno">{p.n}</span>
          </div>
          <div className={`spread__text paper paper--${paper}`}>
            <p className="story">{p.text}</p>
            {p.locked && !editor && <p className="margin-note no-print">★ {book.kidName} loved this page</p>}
            {p.kidPrompt && <p className="kidprompt"><span aria-hidden="true">☞ </span>Ask {book.kidName}: {p.kidPrompt}</p>}
            {p.marginNote && <p className="margin-note margin-note--tilt">{p.marginNote}</p>}
            {editor && <FeedbackStrip book={book} page={p} editor={editor} />}
          </div>
        </div>
      ),
    })),
    ...(editor ? [{ key: "next", label: "Next edition", node: <NextEdition book={book} api={editor} /> } as Leaf] : []),
    {
      key: "own",
      label: "Your own drawing",
      node: (
        <div className="leaf-single paper paper--dots">
          <h2 className="display display--sm">{book.kidName}’s own drawing</h2>
          <DrawingRenderer drawing={blankFrame} seed="frame" alt={`An empty frame for ${book.kidName} to draw in.`} />
        </div>
      ),
    },
    {
      key: "colophon",
      label: "Colophon",
      node: (
        <div className="leaf-single paper paper--grid colophon">
          <p>Written in the manner of Patrick Atwater’s notebooks, and drawn with a very wobbly pen.</p>
          <p className="margin-note">
            Edition 1{health ? ` · soul ${health.hashes?.soul ?? ""} · commit ${health.commit.slice(0, 7)}` : ""}
          </p>
          <p className="soft"><Link to="/blocks">Make your own edition</Link></p>
        </div>
      ),
    },
  ];

  const go = useCallback(
    (n: number) => {
      setI((cur) => {
        const next = Math.max(0, Math.min(leaves.length - 1, n));
        if (next !== cur) setDir(next > cur ? "fwd" : "back");
        return next;
      });
    },
    [leaves.length],
  );

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setI((c) => Math.min(leaves.length - 1, c + 1)), setDir("fwd");
      if (e.key === "ArrowLeft" || e.key === "PageUp") setI((c) => Math.max(0, c - 1)), setDir("back");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [leaves.length]);

  // After a revision, land on the "next edition" leaf so the changelog is the first thing seen.
  useEffect(() => { if (startAtNext) setI(Math.max(0, leaves.findIndex((l) => l.key === "next"))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = leaves[i];

  return (
    <CastContext.Provider value={book.castDrawings ?? {}}>
    <section
      className="reader"
      aria-roledescription="book"
      aria-label={book.title}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      <div className="reader__bar no-print">
        <Link to="/">← Primeland</Link>
        <span className="margin-note" aria-live="polite">{cur.label} · {i + 1} of {leaves.length}</span>
        <span>
          {book.id !== "sample" && <CopyLinks id={book.id} />}
          <label className="margin-note">Sheet <select value={sheet} onChange={(e) => setSheet(e.target.value as "square" | "letter")} aria-label="Print sheet size"><option value="square">8.5 in square</option><option value="letter">Letter landscape</option></select></label>{" "}
          <button className="linkish" onClick={() => window.print()}>Print or save as PDF</button>
        </span>
      </div>

      {progress && (progress.running || progress.failed.length > 0) && (
        <p className="margin-note no-print reader__progress" role="status">
          {progress.running
            ? `Drawing… ${progress.done} of ${progress.total} done. You can start reading.`
            : progress.capped
              ? "The Sketch Artist has put his pencils down for now."
              : `${progress.failed.length} drawing${progress.failed.length === 1 ? "" : "s"} didn't come out.${progress.reason ? ` ${progress.reason.replace(/^[^(]*/, "")}` : ""}`}
          {!progress.running && onRetry && <> <button className="linkish" onClick={onRetry}>Try again</button></>}
        </p>
      )}
      <div className="reader__stage">
        {leaves.map((l, idx) => (
          <article
            key={l.key}
            className={`leaf ${idx === i ? `is-current turn-${dir}` : ""}`}
            aria-hidden={idx !== i}
            aria-label={l.label}
          >
            {l.node}
          </article>
        ))}
      </div>

      <nav className="reader__nav no-print" aria-label="Turn the page">
        <RoughButton seed="prev" onClick={() => go(i - 1)} disabled={i === 0} >← Back</RoughButton>
        <ol className="dots" aria-hidden="true">
          {leaves.map((l, idx) => (
            <li key={l.key} className={idx === i ? "on" : ""} />
          ))}
        </ol>
        <RoughButton seed="next" onClick={() => go(i + 1)} disabled={i === leaves.length - 1} >Turn the page →</RoughButton>
      </nav>
      <RoughBox className="no-print reader__hint" seed="hint">
        <p className="margin-note">Arrow keys turn the page. On a phone, swipe.</p>
      </RoughBox>
    </section>
    </CastContext.Provider>
  );
}

function CopyLinks({ id }: { id: string }) {
  const [said, setSaid] = useState("");
  const copy = async (label: string, url: string) => {
    try { await navigator.clipboard.writeText(url); setSaid(`${label} copied`); } catch { setSaid("Copy it from the address bar instead"); }
    setTimeout(() => setSaid(""), 2500);
  };
  const origin = window.location.origin, token = editTokenFor(id);
  return (
    <>
      <button className="linkish" onClick={() => copy("Share link", `${origin}/b/${id}`)}>Copy share link</button>
      {token && <button className="linkish" onClick={() => copy("Private edit link", `${origin}/b/${id}#edit=${token}`)}>Copy private edit link</button>}
      {said && <span className="margin-note" role="status"> {said}</span>}
    </>
  );
}
