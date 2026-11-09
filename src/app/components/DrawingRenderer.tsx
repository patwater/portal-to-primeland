import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hashSeed, renderDrawing, textSize, type Rendered } from "../lib/rough";
import type { Drawing } from "../lib/types";
import { useIndex, type SpriteInfo } from "../lib/sprites";

/** Rendered size of a sprite: pixels of the transparent PNG times this, times the element's `scale`. */
export const SPRITE_UNIT = 0.4;
/** Cast sheets drawn for the book being read, keyed by cast id. Sprites named "cast:<id>" resolve here. */
export const CastContext = createContext<Record<string, Drawing>>({});
const sheetCache = new Map<string, Promise<Drawing | null>>();
function loadSheet(id: string): Promise<Drawing | null> {
  if (!sheetCache.has(id)) sheetCache.set(id, fetch(`/sketches/roster/${id}.json`).then((r) => (r.ok ? (r.json() as Promise<Drawing>) : null)).catch(() => null));
  return sheetCache.get(id)!;
}

function Items({ items }: { items: Rendered[] }) {
  const idx = useIndex();
  return (
    <>
      {items.map((it, i) => {
        switch (it.kind) {
          case "highlight":
            return <rect key={i} className="highlighter" x={it.x} y={it.y} width={it.w} height={it.h} rx={6} />;
          case "sprite":
            return <Sprite key={i} el={it.el} info={idx?.sprites[it.el.spriteId]} sheetKind={idx?.sheets[it.el.spriteId]?.kind} />;
          case "strokes":
            return (
              <g key={i}>
                {it.paths.map((p, j) => (
                  <path key={j} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </g>
            );
          case "text": {
            const el = it.el;
            const px = el.type === "label" ? textSize(el.size) : 30;
            return (
              <g key={i}>
                <text className="drawing__label" x={el.x} y={el.y} fontSize={px}>{el.text}</text>
                {it.paths.map((p, j) => (
                  <path key={j} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" />
                ))}
              </g>
            );
          }
        }
      })}
    </>
  );
}

function Sprite({ el, info, sheetKind }: { el: Extract<Rendered, { kind: "sprite" }>["el"]; info?: SpriteInfo; sheetKind?: "json" | "png" }) {
  const [sheet, setSheet] = useState<Drawing | null>(null);
  const cast = useContext(CastContext);
  const castSheet = el.spriteId.startsWith("cast:") ? cast[el.spriteId.slice(5)] : undefined;
  const useJson = !info && !castSheet && sheetKind === "json";
  useEffect(() => {
    if (useJson) loadSheet(el.spriteId).then(setSheet);
  }, [useJson, el.spriteId]);
  const flip = el.flip ? -1 : 1;
  const tf = `translate(${el.x} ${el.y}) rotate(${el.rotate ?? 0}) scale(${flip} 1)`;
  if (info) {
    const k = SPRITE_UNIT * el.scale;
    return <image href={`/sketches/${info.file}`} x={-info.anchor.x * k} y={-info.anchor.y * k} width={info.width * k} height={info.height * k} transform={tf} />;
  }
  if (sheetKind === "png") {
    const k = el.scale;
    return <image href={`/sketches/roster/${el.spriteId}.png`} x={-110 * k} y={-290 * k} width={220 * k} height={300 * k} transform={tf} />;
  }
  const drawn = castSheet ?? sheet;
  if (drawn) return <g transform={`${tf} scale(${el.scale}) translate(-110 -290)`}><Nested drawing={drawn} seed={el.spriteId} /></g>;
  return null;
}

function Nested({ drawing, seed }: { drawing: Drawing; seed: string }) {
  const items = useMemo(() => renderDrawing(drawing, hashSeed(seed)), [drawing, seed]);
  return <Items items={items} />;
}

export function DrawingRenderer({ drawing, seed, alt, viewBox = "0 0 800 560" }: { drawing: Drawing; seed: string; alt: string; viewBox?: string }) {
  const items = useMemo(() => renderDrawing(drawing, hashSeed(seed)), [drawing, seed]);
  return (
    <svg className="drawing" viewBox={viewBox} role="img" aria-label={alt}>
      <Items items={items} />
    </svg>
  );
}
