// The Sketch Artist: one reusable cast sheet per new character, and one drawing per page (brief 7.4, 7.5, 9.4).
import { assemble } from "./assemble";
import { callClaude, FriendlyError, TANGLED, type ClaudeEnv } from "../claude";
import { validateDrawing, drawingJsonSchema, type ParsedDrawing } from "../../shared/drawing";
import { offersForPage, SHEET, SPRITE_UNIT, type OfferInput, type SpriteOffer } from "../sprites";
import { places } from "../world";

export type ArtEnv = ClaudeEnv & { MODEL_ART?: string };

const FORMAT = `<format>
Return {"viewBox":[800,560],"elements":[...]}. Element types:
- {"type":"sprite","spriteId","x","y","scale","rotate"?,"flip"?}: places a fixed drawing. (x, y) is where its feet touch the ground. Canon sprites render at ${SPRITE_UNIT} x their pixel size times scale, so use the sizes in <sprites> (width and height here are already at scale 1). Cast and roster sheets are ${SHEET.w} wide by ${SHEET.h} tall at scale 1.
- {"type":"path","d","weight"?,"hatch"?}: d uses only M L C Q Z. Weight 1 to 3. hatch is {"angle","gap","cross"?}.
- {"type":"ellipse","cx","cy","rx","ry","weight"?,"hatch"?}, {"type":"rect","x","y","w","h","weight"?,"hatch"?}, {"type":"line","x1","y1","x2","y2","weight"?}
- {"type":"label","text","x","y","size"?,"arrowTo"?,"circled"?,"underlined"?}: hand lettering. {"type":"strike","text","x","y"}: a crossed-out word. {"type":"highlight","x","y","w","h"}: the one yellow swipe.
The canvas is 800 wide by 560 tall. Use at most 70 elements and at most one highlight.
</format>`;

const offerLine = (o: SpriteOffer) => JSON.stringify({ id: o.id, width: o.width, height: o.height, anchor: o.anchor, facing: o.facing, description: o.description });

export type PageArtInput = OfferInput & { brief: string; n: number };

export function pageArtUser(i: PageArtInput): { user: string; offers: SpriteOffer[] } {
  const { offers, undrawn } = offersForPage(i);
  const place = places.find((p) => p.id === i.place);
  const parts = [
    FORMAT,
    `<sprites>\n${offers.length ? offers.map(offerLine).join("\n") : "(none for this page)"}\n</sprites>`,
    undrawn.length ? `<undrawn>\nThese characters have no fixed drawing yet, so draw them simply yourself, in the same quick pen:\n${undrawn.map((u) => `${u.name}: ${u.look}`).join("\n")}\n</undrawn>` : "",
    `<page>\nPlace: ${place?.name ?? i.place}${place ? `. ${place.description.split("\n")[0].slice(0, 400)}` : ""}\nIllustration brief: ${i.brief}\n</page>`,
    `Place every sprite you were offered for a character on this page, using its exact spriteId, and keep the same one for the same character on every page.`,
  ];
  return { user: parts.filter(Boolean).join("\n\n"), offers };
}

export function castSheetUser(c: { name: string; look: string; tier: string; badge: number | null }): string {
  return `${FORMAT}\n\n<task_detail>\nDraw ONE standing character for a cast sheet, centered, about ${SHEET.w} wide and ${SHEET.h} tall, on a sheet whose coordinates run from x 0 to ${SHEET.w} and y 0 to ${SHEET.h} (feet near y 290). Letter the name beneath the figure. No sprites. At most 60 elements.\nName: ${c.name}\nLook: ${c.look}${c.badge != null ? `\nPrime badge: ${c.badge}, drawn on the body as a small circled number.` : "\nNo badge."}\n</task_detail>`;
}

type Check = { bounds?: { w: number; h: number }; allowSprites: boolean; spriteIds?: Set<string>; mustPlace?: string[] };

async function drawWith(env: ArtEnv, route: string, user: string, check: Check, scene: string, fetchImpl?: typeof fetch): Promise<ParsedDrawing> {
  const system = assemble("sketch-artist");
  let msg = user;
  let last: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callClaude({ env, route: attempt ? `${route}-retry` : route, model: env.MODEL_ART ?? "claude-sonnet-5-5", system, user: msg, schema: drawingJsonSchema, maxTokens: 8000, timeoutMs: 90_000, fetchImpl });
    const v = validateDrawing(raw, { bounds: check.bounds, allowSprites: check.allowSprites, spriteIds: check.spriteIds });
    if (v.ok) {
      const placed = new Set(v.drawing.elements.flatMap((e) => (e.type === "sprite" ? [e.spriteId] : [])));
      const missing = (check.mustPlace ?? []).filter((id) => !placed.has(id));
      if (!missing.length) return v.drawing;
      last = [`you did not place these offered sprites: ${missing.join(", ")}`];
    } else last = v.errors;
    msg = `${user}\n\n<fix>Your last drawing of ${scene} was rejected: ${last.slice(0, 5).join("; ")}. Draw it again within the rules.</fix>`;
  }
  console.log(JSON.stringify({ route, rejected: last.length }));
  throw new FriendlyError(502, "The pencil snapped. Shall we try that page again?", `drawing failed checks`);
}

export function drawCastSheet(env: ArtEnv, c: { name: string; look: string; tier: string; badge: number | null }, fetchImpl?: typeof fetch) {
  return drawWith(env, "cast-sheet", castSheetUser(c), { bounds: { w: SHEET.w, h: SHEET.h }, allowSprites: false }, `${c.name}'s cast sheet`, fetchImpl);
}

export function drawPage(env: ArtEnv, i: PageArtInput & { allowed: Set<string> }, fetchImpl?: typeof fetch) {
  const { user, offers } = pageArtUser(i);
  return drawWith(env, "page-art", user, { allowSprites: true, spriteIds: i.allowed, mustPlace: offers.filter((o) => o.for).map((o) => o.id) }, `page ${i.n}`, fetchImpl);
}
