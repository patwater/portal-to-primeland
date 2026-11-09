// Which sprites, extras and roster sheets exist. Kept apart from world.ts so pages that only draw
// do not pull in the whole roster and places JSON.
import { useEffect, useState } from "react";

export type SpriteInfo = { id: string; file: string; width: number; height: number; anchor: { x: number; y: number }; facing: string; source: string };
export type ExtraInfo = { id: string; file: string; width: number; height: number; source: string };
export type RosterSheetInfo = { id: string; kind: "json" | "png"; status?: "pending" | "approved" };
type Index = { sprites: Record<string, SpriteInfo>; extras: ExtraInfo[]; sheets: Record<string, RosterSheetInfo> };

let cache: Promise<Index> | null = null;
export function loadIndex(): Promise<Index> {
  cache ??= (async () => {
    const out: Index = { sprites: {}, extras: [], sheets: {} };
    try {
      const j = (await (await fetch("/sketches/sketches.json")).json()) as { sprites: SpriteInfo[]; extras: ExtraInfo[] };
      for (const s of j.sprites) out.sprites[s.id] = s;
      out.extras = j.extras;
    } catch { /* no sprites yet: components fall back to placeholders */ }
    try {
      const r = (await (await fetch("/sketches/roster/index.json")).json()) as { sheets: RosterSheetInfo[] };
      for (const s of r.sheets) out.sheets[s.id] = s;
    } catch { /* no roster sheets drawn yet */ }
    return out;
  })();
  return cache;
}

export function useIndex(): Index | null {
  const [idx, setIdx] = useState<Index | null>(null);
  useEffect(() => {
    let live = true;
    loadIndex().then((i) => live && setIdx(i));
    return () => { live = false; };
  }, []);
  return idx;
}
