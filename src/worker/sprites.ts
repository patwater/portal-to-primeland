// What the Sketch Artist may place on a page: canon sprites, drawn roster sheets, this book's cast sheets,
// and a few scenery sprites by place. Bundled at build time like the rest of the world.
import manifest from "../../public/sketches/sketches.json";
import rosterIndex from "../../public/sketches/roster/index.json";
import { roster } from "./world";

export const SPRITE_UNIT = 0.4; // rendered units per sprite pixel at scale 1 (same constant the client uses)
export const SHEET = { w: 220, h: 300 }; // roster and cast sheets at scale 1

type Canon = { id: string; width: number; height: number; anchor: { x: number; y: number }; facing: string };
export const canon = new Map((manifest.sprites as Canon[]).map((s) => [s.id, s]));
const sheets = new Set((rosterIndex.sheets as { id: string }[]).map((s) => s.id));

const DESCRIPTIONS: Record<string, string> = {
  cube: "the big blue nylon delivery cube, with A′ on its side",
  brock: "Brock, a bored boy with his hands on his hips, drawn facing front",
  "scissors-chris-steve": "Chris and Steve, one pair of scissors with a face on each blade, open in an X",
  "robo-seal": "a Robo-Seal, a stamping swimmer on four legs with a flag-like tail",
  scout: "Scout the dog, small, seen from the side (draw his smartwatch yourself as a few paths on his collar and paw)",
  "data-lake": "the Data Lake: a glittering lake with a shimmering structure rising from it",
  "tower-of-two": "the Tower of Two, a giant numeral 2 with a lantern at its top",
  "dig-in-the-dots": "the stone arch of the Mines of Many Primes, with dots spraying out",
  "sieve-grid": "a hand-drawn grid of boxes with X marks, the sieve",
  "portal-box-open": "an open box with a small figure standing inside it",
};

/** Scenery that suits each place. Characters bring their own sprites. */
const SCENERY: Record<string, string[]> = {
  "the-long-and-lonesome-hill": ["cube"],
  "the-bubble-wrap-landing": ["portal-box-open"],
  "the-scissor-gate": ["cube"],
  "the-data-lake": ["data-lake"],
  terminus: ["data-lake"],
  "the-tower-of-two": ["tower-of-two"],
  "the-mines-of-many-primes": ["dig-in-the-dots"],
  "the-sifting-sands": ["sieve-grid"],
};

export type SpriteOffer = { id: string; width: number; height: number; anchor: { x: number; y: number }; facing: string; description: string; kind: "canon" | "sheet" | "cast"; for?: string };

const round = (n: number) => Math.round(n);
const canonOffer = (id: string, forId?: string): SpriteOffer | null => {
  const s = canon.get(id);
  return s ? { id, width: round(s.width * SPRITE_UNIT), height: round(s.height * SPRITE_UNIT), anchor: { x: round(s.anchor.x * SPRITE_UNIT), y: round(s.anchor.y * SPRITE_UNIT) }, facing: s.facing, description: DESCRIPTIONS[id] ?? id, kind: "canon", for: forId } : null;
};
const sheetOffer = (id: string, description: string, kind: "sheet" | "cast", forId?: string): SpriteOffer => ({ id, width: SHEET.w, height: SHEET.h, anchor: { x: SHEET.w / 2, y: 290 }, facing: "front", description, kind, for: forId });

export type OfferInput = {
  place: string; characters: string[]; kidName: string;
  cast: { id: string; name: string; look: string }[]; castSheets: Set<string>; // ids of cast members that already have a sheet
};

/** Sprites the Sketch Artist is offered for one page, and the characters on it that have none. */
export function offersForPage(i: OfferInput): { offers: SpriteOffer[]; undrawn: { id: string; name: string; look: string }[] } {
  const offers = new Map<string, SpriteOffer>();
  const undrawn: { id: string; name: string; look: string }[] = [];
  for (const cid of i.characters) {
    const cast = i.cast.find((c) => c.id === cid);
    if (cast) {
      if (i.castSheets.has(cid)) offers.set(`cast:${cid}`, sheetOffer(`cast:${cid}`, `${cast.name}: ${cast.look}`, "cast", cid));
      else undrawn.push({ id: cid, name: cast.name, look: cast.look });
      continue;
    }
    const r = roster.find((x) => x.id === cid);
    if (!r) continue;
    // The tot drawing is Patrick's own Taylor edition only, never a generic hero.
    const o = r.spriteId === "tot-polka-dot" && !/^taylor$/i.test(i.kidName.trim()) ? null : canonOffer(r.spriteId, cid);
    if (o) offers.set(o.id, o);
    else if (sheets.has(r.id)) offers.set(r.id, sheetOffer(r.id, `${r.name}: ${r.look}`, "sheet", cid));
    else undrawn.push({ id: r.id, name: r.name, look: r.look });
  }
  for (const id of SCENERY[i.place] ?? []) { const o = canonOffer(id); if (o) offers.set(id, o); }
  return { offers: [...offers.values()], undrawn };
}

/** Every spriteId a drawing for this book may reference. */
export function allowedSpriteIds(kidName: string, castIds: string[]): Set<string> {
  const ids = new Set<string>();
  for (const id of canon.keys()) if (id !== "tot-polka-dot" || /^taylor$/i.test(kidName.trim())) ids.add(id);
  for (const id of sheets) ids.add(id);
  for (const c of castIds) ids.add(`cast:${c}`);
  return ids;
}
