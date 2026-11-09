import { useEffect, useState } from "react";
import { CharacterArt } from "../components/CharacterArt";
import { RoughButton } from "../components/Rough";
import { Link } from "../lib/router";
import { citizens, placeName } from "../lib/world";
import { defaultBlocks, type Blocks } from "../lib/blocks";
import { load, save } from "../lib/storage";

/** Full-screen card-flipping game: a grown-up reads, a kid decides who to meet. */
export function Cards() {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string[]>(() => load<Partial<Blocks>>("primeland.blocks", {}).citizens ?? []);
  const c = citizens[i];
  const go = (n: number) => { setI((cur) => (cur + n + citizens.length) % citizens.length); setFlipped(false); };
  const toggle = () => {
    const next = picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id];
    setPicked(next);
    save("primeland.blocks", { ...defaultBlocks, ...load<Partial<Blocks>>("primeland.blocks", {}), citizens: next });
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === " " || e.key === "Enter") { if ((e.target as HTMLElement).tagName !== "BUTTON") { e.preventDefault(); setFlipped((f) => !f); } }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  const on = picked.includes(c.id);
  return (
    <section className="cards paper paper--dots" aria-label="Citizen cards">
      <div className="cards__bar">
        <Link to="/blocks">← Back to the blocks</Link>
        <span className="margin-note" aria-live="polite">{i + 1} of {citizens.length} · {picked.length} picked</span>
      </div>
      <button className={`flip ${flipped ? "is-flipped" : ""}`} onClick={() => setFlipped((f) => !f)}>
        <span className="flip__face flip__front">
          <span className="display">{c.letter}</span>
          <span className="margin-note">who lives behind this letter? tap to flip</span>
        </span>
        <span className="flip__face flip__back">
          <span className="flip__art"><CharacterArt entry={c} /></span>
          <span className="badge-card__badge">{c.badge}</span>
          <strong className="display display--xs">{c.name}</strong>
          <span className="badge-card__says">“{c.says}”</span>
          {c.home && <span className="margin-note">lives at {placeName(c.home)}</span>}
        </span>
      </button>
      <div className="cards__nav">
        <RoughButton seed="cprev" onClick={() => go(-1)}>← Back</RoughButton>
        <RoughButton seed="cpick" onClick={toggle} aria-pressed={on}>{on ? "✓ We’ll meet them" : "Let’s meet them!"}</RoughButton>
        <RoughButton seed="cnext" onClick={() => go(1)}>Next →</RoughButton>
      </div>
    </section>
  );
}
