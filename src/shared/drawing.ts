// Drawing validation shared by the Worker (page art, M4) and scripts/draw-roster.ts.
// A schema guarantees shape; these rules guarantee the drawing is also safe to render.
import { z } from "zod";

export const MAX_ELEMENTS = 70;
export const MAX_PATH_LENGTH = 2500;
const SLACK = 100;

const w = z.union([z.literal(1), z.literal(2), z.literal(3)]).optional();
const hatch = z.object({ angle: z.number(), gap: z.number().min(2), cross: z.boolean().optional() }).strict().optional();
const n = z.number().finite();

export const elementSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sprite"), spriteId: z.string(), x: n, y: n, scale: z.number().positive().max(6), rotate: n.optional(), flip: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("path"), d: z.string().max(MAX_PATH_LENGTH), weight: w, hatch }).strict(),
  z.object({ type: z.literal("ellipse"), cx: n, cy: n, rx: n, ry: n, weight: w, hatch }).strict(),
  z.object({ type: z.literal("rect"), x: n, y: n, w: n, h: n, weight: w, hatch }).strict(),
  z.object({ type: z.literal("line"), x1: n, y1: n, x2: n, y2: n, weight: w }).strict(),
  z.object({
    type: z.literal("label"), text: z.string().max(60), x: n, y: n, size: z.enum(["s", "m", "l"]).optional(),
    arrowTo: z.object({ x: n, y: n }).strict().optional(), circled: z.boolean().optional(), underlined: z.boolean().optional(),
  }).strict(),
  z.object({ type: z.literal("strike"), text: z.string().max(40), x: n, y: n }).strict(),
  z.object({ type: z.literal("highlight"), x: n, y: n, w: n, h: n }).strict(),
]);

export const drawingSchema = z.object({
  viewBox: z.tuple([z.literal(800), z.literal(560)]),
  elements: z.array(elementSchema).max(MAX_ELEMENTS),
}).strict();

export type ParsedDrawing = z.infer<typeof drawingSchema>;
export type Bounds = { w: number; h: number };

/** Numbers in a path, in order; commands must be M L C Q Z (any case). */
function pathNumbers(d: string): number[] | null {
  if (/[^MLCQZmlcqz0-9eE.,\s+-]/.test(d)) return null;
  return (d.match(/-?\d*\.?\d+(?:[eE][+-]?\d+)?/g) ?? []).map(Number);
}

export function validateDrawing(input: unknown, opts: { bounds?: Bounds; spriteIds?: Set<string>; allowSprites?: boolean } = {}): { ok: true; drawing: ParsedDrawing } | { ok: false; errors: string[] } {
  const parsed = drawingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const { w: W, h: H } = opts.bounds ?? { w: 800, h: 560 };
  const errors: string[] = [];
  const out = (x: number, y: number) => x < -SLACK || y < -SLACK || x > W + SLACK || y > H + SLACK;
  let highlights = 0;
  parsed.data.elements.forEach((el, i) => {
    const at = `element ${i} (${el.type})`;
    switch (el.type) {
      case "path": {
        const nums = pathNumbers(el.d);
        if (!nums) { errors.push(`${at}: path uses commands other than M L C Q Z`); break; }
        for (let k = 0; k + 1 < nums.length; k += 2) if (out(nums[k], nums[k + 1])) { errors.push(`${at}: coordinate outside the sheet`); break; }
        break;
      }
      case "ellipse": if (out(el.cx - el.rx, el.cy - el.ry) || out(el.cx + el.rx, el.cy + el.ry)) errors.push(`${at}: outside the sheet`); break;
      case "rect": if (out(el.x, el.y) || out(el.x + el.w, el.y + el.h)) errors.push(`${at}: outside the sheet`); break;
      case "line": if (out(el.x1, el.y1) || out(el.x2, el.y2)) errors.push(`${at}: outside the sheet`); break;
      case "label": case "strike": if (out(el.x, el.y)) errors.push(`${at}: outside the sheet`); break;
      case "highlight": highlights++; break;
      case "sprite":
        if (opts.allowSprites === false) errors.push(`${at}: sprites are not allowed here`);
        else if (opts.spriteIds && !opts.spriteIds.has(el.spriteId)) errors.push(`${at}: unknown spriteId "${el.spriteId}"`);
        break;
    }
  });
  if (highlights > 1) errors.push("more than one highlight");
  return errors.length ? { ok: false, errors } : { ok: true, drawing: parsed.data };
}

const ELEMENT_KEYS = new Map<string, string[]>(
  elementSchema.options.map((o) => [String((o.shape.type as unknown as { value: string }).value), Object.keys(o.shape)]),
);

/**
 * A drawing with a few bad elements is still a good drawing. Keeps every element that passes on its own (stripping keys the
 * format doesn't have), drops the rest, and caps the total, so one stray coordinate or path command doesn't cost a whole page.
 * Returns null when nothing usable is left.
 */
export function repairDrawing(input: unknown, opts: { bounds?: Bounds; spriteIds?: Set<string>; allowSprites?: boolean } = {}): { drawing: ParsedDrawing; dropped: number } | null {
  const els = (input as { elements?: unknown } | null)?.elements;
  if (!Array.isArray(els)) return null;
  const keep: ParsedDrawing["elements"] = [];
  let dropped = 0, highlights = 0;
  for (const raw of els) {
    const keys = raw && typeof raw === "object" ? ELEMENT_KEYS.get(String((raw as { type?: unknown }).type)) : undefined;
    if (!keys) { dropped++; continue; }
    const picked = Object.fromEntries(Object.entries(raw as object).filter(([k, v]) => keys.includes(k) && v !== null));
    const one = validateDrawing({ viewBox: [800, 560], elements: [picked] }, opts);
    if (!one.ok || (one.drawing.elements[0].type === "highlight" && highlights++ >= 1)) { dropped++; continue; }
    keep.push(one.drawing.elements[0]);
  }
  if (!keep.length) return null;
  dropped += Math.max(0, keep.length - MAX_ELEMENTS);
  return { drawing: { viewBox: [800, 560], elements: keep.slice(0, MAX_ELEMENTS) }, dropped };
}

/** JSON Schema handed to the Messages API structured outputs. Kept loose on purpose; validateDrawing is the real gate. */
const num = { type: "number" };
const weight = { type: "integer", enum: [1, 2, 3] };
const hatchSchema = { type: "object", properties: { angle: num, gap: num, cross: { type: "boolean" } }, required: ["angle", "gap"], additionalProperties: false };
export const drawingJsonSchema = {
  type: "object",
  properties: {
    viewBox: { type: "array", items: { type: "integer" } },
    elements: {
      type: "array",
      items: {
        anyOf: [
          { type: "object", properties: { type: { const: "path" }, d: { type: "string" }, weight, hatch: hatchSchema }, required: ["type", "d"], additionalProperties: false },
          { type: "object", properties: { type: { const: "ellipse" }, cx: num, cy: num, rx: num, ry: num, weight, hatch: hatchSchema }, required: ["type", "cx", "cy", "rx", "ry"], additionalProperties: false },
          { type: "object", properties: { type: { const: "rect" }, x: num, y: num, w: num, h: num, weight, hatch: hatchSchema }, required: ["type", "x", "y", "w", "h"], additionalProperties: false },
          { type: "object", properties: { type: { const: "line" }, x1: num, y1: num, x2: num, y2: num, weight }, required: ["type", "x1", "y1", "x2", "y2"], additionalProperties: false },
          { type: "object", properties: { type: { const: "label" }, text: { type: "string" }, x: num, y: num, size: { type: "string", enum: ["s", "m", "l"] }, arrowTo: { type: "object", properties: { x: num, y: num }, required: ["x", "y"], additionalProperties: false }, circled: { type: "boolean" }, underlined: { type: "boolean" } }, required: ["type", "text", "x", "y"], additionalProperties: false },
          { type: "object", properties: { type: { const: "strike" }, text: { type: "string" }, x: num, y: num }, required: ["type", "text", "x", "y"], additionalProperties: false },
          { type: "object", properties: { type: { const: "highlight" }, x: num, y: num, w: num, h: num }, required: ["type", "x", "y", "w", "h"], additionalProperties: false },
        ],
      },
    },
  },
  required: ["viewBox", "elements"],
  additionalProperties: false,
} as const;
