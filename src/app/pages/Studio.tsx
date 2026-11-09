import { useState } from "react";
import { CharacterArt } from "../components/CharacterArt";
import { RoughBox, RoughButton } from "../components/Rough";
import { load, save } from "../lib/storage";
import { roster, useIndex } from "../lib/world";

const nextPrimes = (used: number[], n: number) => {
  const isP = (x: number) => { for (let i = 2; i * i <= x; i++) if (x % i === 0) return false; return x > 1; };
  const out: number[] = [];
  for (let x = Math.max(...used) + 1; out.length < n; x++) if (isP(x)) out.push(x);
  return out;
};

export function Studio() {
  const [pw, setPw] = useState(() => { try { return sessionStorage.getItem("primeland.studio") ?? ""; } catch { return ""; } });
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState("");
  const [approved, setApproved] = useState<string[]>(() => load<string[]>("primeland.studio.approved", []));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const idx = useIndex();

  const enter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const r = await fetch("/api/studio/check", { headers: { Authorization: `Bearer ${pw}` } });
      if (r.ok) { setAuthed(true); try { sessionStorage.setItem("primeland.studio", pw); } catch { /* ignore */ } }
      else setErr(r.status === 503 ? "The studio password isn't set yet (wrangler secret put STUDIO_PASSWORD)." : "That's not the password.");
    } catch { setErr("Couldn't reach the Worker."); }
  };
  const toggle = (id: string) => {
    const next = approved.includes(id) ? approved.filter((x) => x !== id) : [...approved, id];
    setApproved(next);
    save("primeland.studio.approved", next);
  };

  if (!authed)
    return (
      <section className="paper paper--grid page-pad">
        <form className="prose" onSubmit={enter}>
          <h1 className="display display--sm">Studio</h1>
          <label className="field"><span className="field__label">Password</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          </label>
          <RoughButton seed="studio" type="submit">Come in</RoughButton>
          {err && <p className="notice" role="alert">{err}</p>}
        </form>
      </section>
    );

  const counted = roster.filter((r) => r.tier !== "folk");
  const used = roster.map((r) => r.badge ?? 0);
  const drawn = counted.filter((r) => idx?.sprites[r.spriteId] || idx?.sheets[r.id]).length;
  return (
    <section className="paper paper--dots page-pad">
      <div className="studio">
        <h1 className="display display--sm">Roster studio</h1>
        <p className="margin-note">{drawn} of {counted.length} have a picture. {approved.length} approved on this device (approvals are saved in this browser only for now).</p>
        <div className="card-grid card-grid--page">
          {roster.map((r) => (
            <RoughBox key={r.id} seed={`studio-${r.id}`} fill className={`studio-card ${approved.includes(r.id) ? "is-selected" : ""}`}>
              <div className="badge-card__art"><CharacterArt entry={r} /></div>
              <h3 className="badge-card__name">{r.name} <span className="soft">({r.tier}{r.badge != null ? ` · ${r.badge}` : ""})</span></h3>
              <RoughButton seed={`ap-${r.id}`} onClick={() => toggle(r.id)} aria-pressed={approved.includes(r.id)}>{approved.includes(r.id) ? "✓ Approved" : "Approve"}</RoughButton>
              <details>
                <summary>Redraw or replace</summary>
                <label className="field"><span className="margin-note">Note for the Sketch Artist</span>
                  <input type="text" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                </label>
                <code className="cmd">npm run draw-roster -- --only {r.id}{notes[r.id] ? ` --note "${notes[r.id].replace(/"/g, "'")}"` : ""}</code>
                <p className="margin-note">To replace it with your own drawing, save a transparent PNG as <code>public/sketches/roster/{r.id}.png</code> and push.</p>
              </details>
            </RoughBox>
          ))}
        </div>

        <h2 className="display display--xs">Sketchbook extras</h2>
        <p className="margin-note">Not used in books until you promote one. Promoting means adding a row to <code>content/characters.md</code> with the next unused prime (next up: {nextPrimes(used, 4).join(", ")}).</p>
        <div className="card-grid card-grid--page">
          {(idx?.extras ?? []).map((x) => (
            <RoughBox key={x.id} seed={`x-${x.id}`} fill className="studio-card">
              <div className="badge-card__art"><img className="char-art" src={`/sketches/${x.file}`} alt={x.id} loading="lazy" /></div>
              <h3 className="badge-card__name">{x.id}</h3>
              <p className="margin-note">{x.source}</p>
              <code className="cmd">| ? · {nextPrimes(used, 1)[0]} | Name | {x.id.replace(/-/g, " ")} | Background and story hook | "Catchphrase" |</code>
            </RoughBox>
          ))}
        </div>
      </div>
    </section>
  );
}
