import { useEffect, useState } from "react";
import { LoadingScene } from "../components/LoadingScene";
import { RoughBox, RoughButton, RoughCheck, Squiggle } from "../components/Rough";
import { Turnstile } from "../components/Turnstile";
import { ApiError, createBook, getConfig, interview, rememberBook, type Answer, type Question } from "../lib/api";
import { defaultBlocks, type Blocks } from "../lib/blocks";
import { navigate, Link } from "../lib/router";
import { load } from "../lib/storage";

type Pick = { chosen: string[]; text: string };

export function Interview() {
  const [blocks] = useState<Blocks>(() => ({ ...defaultBlocks, ...load<Partial<Blocks>>("primeland.blocks", {}) }));
  const [qs, setQs] = useState<Question[] | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [why, setWhy] = useState("");
  const [left, setLeft] = useState<{ left: number; limit: number } | null>(null);
  useEffect(() => { getConfig().then((c) => setLeft({ left: c.booksLeft, limit: c.bookLimit })).catch(() => undefined); }, []);
  const kid = blocks.name.trim() || "your kid";

  useEffect(() => {
    if (!blocks.name.trim()) { navigate("/blocks"); return; }
    let live = true;
    interview(blocks).then((r) => live && setQs(r.questions)).catch((e) => { if (!live) return; setSkipped(true); if (e instanceof ApiError && e.code) setWhy(e.message); }); // the interview is optional
    return () => { live = false; };
  }, [blocks]);

  const set = (id: string, p: Partial<Pick>) => setPicks((cur) => ({ ...cur, [id]: { ...{ chosen: [] as string[], text: "" }, ...cur[id], ...p } }));
  const answers = (): Answer[] =>
    (qs ?? []).flatMap((q) => {
      const p = picks[q.id];
      const text = [...(p?.chosen ?? []), p?.text?.trim()].filter(Boolean).join("; ");
      return text ? [{ id: q.id, text, askKid: q.askKid }] : [];
    });

  const open = async () => {
    if (!token) return;
    setBusy(true); setErr("");
    try {
      const r = await createBook(blocks, skipped ? [] : answers(), token);
      rememberBook({ id: r.id, editToken: r.editToken, title: r.book.title, kidName: r.book.kidName, createdAt: new Date().toISOString() });
      navigate(`/b/${r.id}#edit=${r.editToken}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "The scissors got tangled. Shall we try that again?");
      setBusy(false); setToken(null); setResetKey((k) => k + 1);
      getConfig().then((c) => setLeft({ left: c.booksLeft, limit: c.bookLimit })).catch(() => undefined);
    }
  };

  if (busy)
    return <LoadingScene label="Writing your book" messages={[
      "Snipping numbers until they're indivisible…", "The Delivery Man is checking his clipboard…", `Sketching ${kid} in ${blocks.look || "their favorite outfit"}…`,
      "Patch is connecting the nodes…", "The Robo-Seals are stamping your pages…", "Almost there. The ticker tape is still printing…",
    ]} />;

  return (
    <section className="paper paper--dots page-pad">
      <div className="blocks">
        <h1 className="display">The Delivery Man’s questions</h1>
        <p className="subtitle">A few quick ones, so the book fits {kid} just right. Skip any you like.</p>
        <Squiggle seed="iv" width={260} />

        {!qs && !skipped && <p className="margin-note" role="status">The Delivery Man is checking his clipboard…</p>}
        {skipped && <p className="margin-note">The Delivery Man dropped his clipboard, so we'll skip the questions this time.{why && <> <span className="soft">{why.replace(/^[^(]*/, "")}</span></>}</p>}

        {(qs ?? []).map((q) => {
          const p = picks[q.id] ?? { chosen: [], text: "" };
          return (
            <RoughBox key={q.id} seed={`q-${q.id}`} className="block-page paper paper--dots">
              {q.askKid && <p className="margin-note">☞ read this one to your kid</p>}
              <h2 className="field__label">{q.text}</h2>
              <p className="margin-note">{q.why}</p>
              {q.kind !== "text" && (
                <div className="choices">
                  {q.options.map((o) => (
                    <RoughCheck key={o} radio={q.kind === "single"} seed={`${q.id}-${o}`} checked={p.chosen.includes(o)} label={o}
                      onChange={(on) => set(q.id, { chosen: q.kind === "single" ? (on ? [o] : []) : on ? [...p.chosen, o] : p.chosen.filter((x) => x !== o) })} />
                  ))}
                </div>
              )}
              <label className="field"><span className="margin-note">{q.kind === "text" ? "Your answer" : "Something else"}</span>
                <input type="text" maxLength={200} value={p.text} onChange={(e) => set(q.id, { text: e.target.value.slice(0, 200) })} />
              </label>
            </RoughBox>
          );
        })}

        <div className="form-foot">
          {left && <p className="margin-note" role="status">{left.left > 0 ? `${left.left} of ${left.limit} books left for this visit.` : `You've opened all ${left.limit} of your books for this visit. They're still on your shelf, and more boxes arrive tomorrow.`}</p>}
          <Turnstile onToken={setToken} resetKey={resetKey} />
          <RoughButton big seed="open" className="wobble" disabled={!token || (!qs && !skipped) || left?.left === 0} onClick={open}>Open the portal →</RoughButton>
          {err && <p className="notice" role="alert">{err}</p>}
          <p><Link to="/blocks">← Back to the blocks</Link>{qs && <> · <button className="linkish" onClick={() => { setQs(null); setSkipped(true); }}>Skip the questions</button></>}</p>
        </div>
      </div>
    </section>
  );
}
