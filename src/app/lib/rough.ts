import rough from "roughjs";
import type { Options } from "roughjs/bin/core";
import type { Drawing, DrawingElement, Weight } from "./types";

export const INK = "#1d1d1b";
const gen = rough.generator();
const WIDTH: Record<Weight, number> = { 1: 1.2, 2: 1.8, 3: 2.6 };

export type RPath = { d: string; stroke: string; strokeWidth: number; fill: string };

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483646 || 1;
}

function base(seed: number, weight: Weight = 2, hatch?: { angle: number; gap: number; cross?: boolean }): Options {
  const o: Options = { seed, stroke: INK, strokeWidth: WIDTH[weight], roughness: 1.3, bowing: 1 };
  if (hatch) {
    o.fill = INK;
    o.fillStyle = hatch.cross ? "cross-hatch" : "hachure";
    o.hachureAngle = hatch.angle;
    o.hachureGap = hatch.gap;
    o.fillWeight = 0.9;
  }
  return o;
}

function toPaths(d: ReturnType<typeof gen.line>): RPath[] {
  return gen.toPaths(d).map((p) => ({
    d: p.d,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    fill: p.fill || "none",
  }));
}

export const roughLine = (x1: number, y1: number, x2: number, y2: number, seed: number, weight: Weight = 2) =>
  toPaths(gen.line(x1, y1, x2, y2, base(seed, weight)));
export const roughRect = (x: number, y: number, w: number, h: number, seed: number, o: Partial<Options> = {}) =>
  toPaths(gen.rectangle(x, y, w, h, { ...base(seed, 2), ...o }));
export const roughEllipse = (cx: number, cy: number, w: number, h: number, seed: number, o: Partial<Options> = {}) =>
  toPaths(gen.ellipse(cx, cy, w, h, { ...base(seed, 2), ...o }));
export const roughPath = (d: string, seed: number, o: Partial<Options> = {}) =>
  toPaths(gen.path(d, { ...base(seed, 2), ...o }));

export type Rendered =
  | { kind: "strokes"; paths: RPath[] }
  | { kind: "text"; el: Extract<DrawingElement, { type: "label" | "strike" }>; paths: RPath[] }
  | { kind: "highlight"; x: number; y: number; w: number; h: number }
  | { kind: "sprite"; el: Extract<DrawingElement, { type: "sprite" }> };

const TEXT_SIZE = { s: 22, m: 30, l: 48 } as const;
export const textSize = (s?: "s" | "m" | "l") => TEXT_SIZE[s ?? "m"];
const textWidth = (t: string, px: number) => t.length * px * 0.46;

function arrow(from: { x: number; y: number }, to: { x: number; y: number }, seed: number): RPath[] {
  const mx = (from.x + to.x) / 2 + (to.y - from.y) * 0.18;
  const my = (from.y + to.y) / 2 - (to.x - from.x) * 0.18;
  const out = roughPath(`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`, seed, { strokeWidth: 1.4 });
  const ang = Math.atan2(to.y - my, to.x - mx);
  const a = (d: number) => ({ x: to.x - 14 * Math.cos(ang + d), y: to.y - 14 * Math.sin(ang + d) });
  const h1 = a(0.45), h2 = a(-0.45);
  out.push(...roughPath(`M ${h1.x} ${h1.y} L ${to.x} ${to.y} L ${h2.x} ${h2.y}`, seed + 1, { strokeWidth: 1.4 }));
  return out;
}

export function renderDrawing(drawing: Drawing, pageSeed: number): Rendered[] {
  return drawing.elements.map((el, i): Rendered => {
    const seed = pageSeed + i * 31;
    switch (el.type) {
      case "sprite":
        return { kind: "sprite", el };
      case "path":
        return { kind: "strokes", paths: roughPath(el.d, seed, base(seed, el.weight, el.hatch)) };
      case "ellipse":
        return { kind: "strokes", paths: roughEllipse(el.cx, el.cy, el.rx * 2, el.ry * 2, seed, base(seed, el.weight, el.hatch)) };
      case "rect":
        return { kind: "strokes", paths: roughRect(el.x, el.y, el.w, el.h, seed, base(seed, el.weight, el.hatch)) };
      case "line":
        return { kind: "strokes", paths: roughLine(el.x1, el.y1, el.x2, el.y2, seed, el.weight) };
      case "highlight":
        return { kind: "highlight", x: el.x, y: el.y, w: el.w, h: el.h };
      case "strike": {
        const px = 30, w = textWidth(el.text, px);
        return { kind: "text", el, paths: roughLine(el.x - 4, el.y - 9, el.x + w + 4, el.y - 12, seed, 2) };
      }
      case "label": {
        const px = textSize(el.size), w = textWidth(el.text, px);
        const paths: RPath[] = [];
        if (el.circled) paths.push(...roughEllipse(el.x + w / 2, el.y - px * 0.3, w + 30, px * 1.4, seed, { strokeWidth: 1.3 }));
        if (el.underlined) paths.push(...roughLine(el.x, el.y + 6, el.x + w, el.y + 4, seed, 1));
        if (el.arrowTo) paths.push(...arrow({ x: el.x + w / 2, y: el.y + 10 }, el.arrowTo, seed + 7));
        return { kind: "text", el, paths };
      }
    }
  });
}
