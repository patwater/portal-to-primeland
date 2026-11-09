import { useEffect, useState } from "react";
import { DrawingRenderer } from "./DrawingRenderer";
import { useIndex } from "../lib/sprites";
import type { RosterEntry } from "../lib/world";
import type { Drawing } from "../lib/types";

/** The fixed picture of one roster character: canon sprite, uploaded PNG, drawn roster sheet, or a pending placeholder. */
export function CharacterArt({ entry }: { entry: RosterEntry }) {
  const idx = useIndex();
  const sprite = idx?.sprites[entry.spriteId];
  const sheet = idx?.sheets[entry.id];
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  useEffect(() => {
    if (!sprite && sheet?.kind === "json") fetch(`/sketches/roster/${entry.id}.json`).then((r) => r.json() as Promise<Drawing>).then(setDrawing).catch(() => undefined);
  }, [sprite, sheet, entry.id]);
  const alt = `Sketch of ${entry.name}: ${entry.look}`;
  if (sprite) return <img className="char-art" src={`/sketches/${sprite.file}`} alt={alt} loading="lazy" />;
  if (sheet?.kind === "png") return <img className="char-art" src={`/sketches/roster/${entry.id}.png`} alt={alt} loading="lazy" />;
  if (drawing) return <DrawingRenderer drawing={drawing} seed={entry.id} alt={alt} viewBox="0 0 220 300" />;
  return (
    <div className="char-art char-art--pending" role="img" aria-label={`${entry.name}, sketch not drawn yet`}>
      <span className="display">{entry.badge ?? "?"}</span>
      <span className="margin-note">sketch pending</span>
    </div>
  );
}
