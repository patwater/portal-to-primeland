// Tiny builders for hand-authoring Drawing JSON (used by the public sample edition).
import type { DrawingElement as El, Hatch, Weight } from "./types";

type At = (x: number, y: number) => [number, number];
const at = (ox: number, oy: number, s: number, flip = false): At => (x, y) => [ox + (flip ? -x : x) * s, oy + y * s];

/** Map every coordinate pair in an M/L/Q/C/Z path through a transform. */
function P(t: At, d: string, weight?: Weight, hatch?: Hatch): El {
  const toks = d.match(/[MLCQZ]|-?\d+\.?\d*/g) ?? [];
  const out: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    if (/[MLCQZ]/.test(toks[i])) out.push(toks[i]);
    else {
      const [x, y] = t(parseFloat(toks[i]), parseFloat(toks[++i]));
      out.push(`${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`);
    }
  }
  return { type: "path", d: out.join(" "), weight, hatch };
}
const O = (t: At, cx: number, cy: number, rx: number, ry: number, weight?: Weight, hatch?: Hatch, s = 1): El => {
  const [x, y] = t(cx, cy);
  return { type: "ellipse", cx: x, cy: y, rx: rx * s, ry: ry * s, weight, hatch };
};
const dot = (t: At, cx: number, cy: number, s: number): El => O(t, cx, cy, 2.2, 2.2, 3, undefined, s);

export const ground = (y: number, x1 = 20, x2 = 780): El => ({ type: "path", d: `M ${x1} ${y} Q 200 ${y - 14} 400 ${y} T ${x2} ${y - 4}`, weight: 2 });

export function kid(x: number, y: number, s = 1, flip = false, excited = true): El[] {
  const t = at(x, y, s, flip);
  return [
    O(t, 0, -118, 27, 29, 2, undefined, s),
    P(t, "M -24 -132 Q -10 -158 6 -150 Q 22 -150 26 -128", 2),
    dot(t, -9, -122, s),
    dot(t, 9, -122, s),
    P(t, excited ? "M -9 -108 Q 0 -96 9 -108" : "M -7 -106 L 7 -106", 2),
    P(t, "M -22 -90 L -28 -42 L 28 -42 L 22 -90 Z", 2),
    dot(t, -10, -76, s), dot(t, 8, -66, s), dot(t, -6, -54, s), dot(t, 14, -82, s),
    P(t, excited ? "M -22 -84 L -48 -112 M 22 -84 L 48 -112" : "M -22 -84 L -42 -62 M 22 -84 L 42 -62", 2),
    P(t, "M -10 -42 L -12 -8 M 10 -42 L 12 -8", 2),
    O(t, -17, -3, 11, 6, 2, undefined, s),
    O(t, 17, -3, 11, 6, 2, undefined, s),
  ];
}

export function cat(x: number, y: number, s = 1, flip = false, bell = true): El[] {
  const t = at(x, y, s, flip);
  const els: El[] = [
    O(t, 0, -40, 38, 22, 2, undefined, s),
    O(t, 38, -62, 20, 18, 2, undefined, s),
    P(t, "M 26 -76 L 28 -96 L 40 -80 M 48 -78 L 56 -96 L 58 -74", 2),
    dot(t, 33, -64, s), dot(t, 46, -64, s),
    P(t, "M 38 -56 L 40 -54 L 43 -56", 1),
    P(t, "M -36 -48 Q -64 -70 -50 -96", 2),
    P(t, "M -20 -22 L -20 0 M -4 -20 L -4 0 M 14 -20 L 14 0 M 28 -24 L 28 0", 2),
  ];
  if (bell) els.push(O(t, 38, -44, 5, 5, 3, undefined, s), P(t, "M 24 -50 Q 38 -42 52 -50", 1));
  return els;
}

export function cube(x: number, y: number, s = 1, open = false): El[] {
  const t = at(x, y, s);
  const els: El[] = [
    P(t, "M -70 0 L 70 0 L 70 -110 L -70 -110 Z", 3),
    P(t, "M 70 -110 L 100 -128 L 100 -20 L 70 0", 2, { angle: 45, gap: 6, cross: true }),
    P(t, "M -70 -110 L -40 -128 L 100 -128", 2),
  ];
  if (open) {
    els.push(P(t, "M -70 -110 L -96 -170 L -38 -178 L -40 -128", 2), P(t, "M 70 -110 L 112 -172 L 150 -150 L 100 -128", 2));
  }
  return els;
}

export function aPrime(x: number, y: number, s = 1): El[] {
  return [{ type: "label", text: "A′", x, y, size: "m", circled: true }, { type: "line", x1: x - 70 * s, y1: y - 30, x2: x - 22, y2: y - 8, weight: 1 }];
}

export function brock(x: number, y: number, s = 1): El[] {
  const t = at(x, y, s);
  return [
    O(t, 0, -108, 24, 26, 2, undefined, s),
    P(t, "M -26 -124 L -8 -134 L 12 -132 L 26 -122", 2),
    P(t, "M -14 -114 L -4 -110 M 4 -110 L 14 -114", 2),
    P(t, "M -8 -94 L 8 -94", 2),
    P(t, "M -20 -82 L -24 -36 L 24 -36 L 20 -82 Z", 2, { angle: 60, gap: 5 }),
    P(t, "M -20 -74 L -40 -52 M 20 -74 L 40 -52", 2),
    P(t, "M -10 -36 L -12 0 M 10 -36 L 12 0", 2),
    P(t, "M -26 -2 L -6 -2 M 6 -2 L 26 -2", 2),
  ];
}

export function deliveryMan(x: number, y: number, s = 1, flip = false): El[] {
  const t = at(x, y, s, flip);
  return [
    O(t, 0, -118, 22, 24, 2, undefined, s),
    P(t, "M -18 -128 Q 0 -150 18 -128", 1),
    dot(t, -8, -120, s), dot(t, 8, -120, s),
    P(t, "M -8 -104 Q 0 -96 8 -104", 2),
    P(t, "M -24 -92 L -30 -42 L 30 -42 L 24 -92 Z", 2),
    P(t, "M -30 -42 L -30 -8 M -18 -42 L -18 -8 M -6 -42 L -6 -8 M 6 -42 L 6 -8 M 18 -42 L 18 -8 M 30 -42 L 30 -8", 1),
    P(t, "M -24 -84 L -46 -60 M 24 -84 L 50 -70", 2),
    P(t, "M -12 -8 L -12 4 M 12 -8 L 12 4", 2),
  ];
}

export function scissors(x: number, y: number, s = 1): El[] {
  const t = at(x, y, s);
  return [
    P(t, "M -8 -60 L -52 -190 L -34 -194 L 6 -66 Z", 2),
    P(t, "M 8 -60 L 52 -190 L 34 -194 L -6 -66 Z", 2),
    O(t, -34, -26, 26, 30, 2, undefined, s),
    O(t, 34, -26, 26, 30, 2, undefined, s),
    dot(t, -46, -164, s), dot(t, -38, -176, s),
    dot(t, 46, -164, s), dot(t, 38, -176, s),
    P(t, "M -48 -150 Q -42 -144 -36 -150 M 36 -150 Q 42 -144 48 -150", 1),
  ];
}

export function patch(x: number, y: number, s = 1): El[] {
  const t = at(x, y, s);
  return [
    O(t, 0, -70, 34, 28, 2, { angle: 50, gap: 6 }, s),
    O(t, 0, -118, 22, 22, 2, undefined, s),
    dot(t, -8, -122, s), dot(t, 8, -122, s),
    P(t, "M -34 -76 Q -70 -118 -92 -84 L -96 -4 M -30 -62 Q -76 -72 -94 -44 L -88 -2", 2),
    P(t, "M -26 -48 Q -48 -30 -62 -2 M -10 -44 Q -16 -24 -22 -2", 2),
    P(t, "M 34 -76 Q 70 -118 92 -84 L 96 -4 M 30 -62 Q 76 -72 94 -44 L 88 -2", 2),
    P(t, "M 26 -48 Q 48 -30 62 -2 M 10 -44 Q 16 -24 22 -2", 2),
  ];
}

export function sealRobo(x: number, y: number, s = 1, flip = false): El[] {
  const t = at(x, y, s, flip);
  return [
    O(t, 0, -40, 54, 28, 2, { angle: 30, gap: 7 }, s),
    O(t, 50, -62, 20, 18, 2, undefined, s),
    dot(t, 56, -66, s),
    P(t, "M 62 -56 L 76 -56", 1),
    P(t, "M -54 -38 L -84 -20 L -80 -50 Z", 2),
    P(t, "M 10 -16 L 24 4 L 34 -12", 2),
    P(t, "M 40 -20 L 50 -4", 1),
    P(t, "M -20 -60 L -20 -52 M -8 -62 L -8 -54 M 4 -60 L 4 -52", 1),
  ];
}

export function lake(y: number): El[] {
  return [
    { type: "path", d: `M 40 ${y} Q 140 ${y - 12} 240 ${y} T 440 ${y} T 640 ${y} T 770 ${y}`, weight: 1 },
    { type: "path", d: `M 90 ${y + 28} Q 180 ${y + 18} 270 ${y + 28} T 450 ${y + 28} T 620 ${y + 28}`, weight: 1 },
    { type: "path", d: `M 170 ${y + 56} Q 240 ${y + 48} 310 ${y + 56} T 450 ${y + 56}`, weight: 1 },
  ];
}

export function top(x: number, y: number, s = 1): El[] {
  const t = at(x, y, s);
  return [
    P(t, "M -34 -80 L 34 -80 L 0 0 Z", 2, { angle: 70, gap: 6 }),
    O(t, 0, -82, 38, 12, 2, undefined, s),
    P(t, "M 0 -94 L 0 -126", 3),
    P(t, "M -52 -40 Q -60 -60 -48 -78 M 52 -40 Q 60 -60 48 -78", 1),
  ];
}

export function windowFrame(x: number, y: number, s = 1): El[] {
  const t = at(x, y, s);
  return [
    P(t, "M -50 -140 L 50 -140 L 50 -20 L -50 -20 Z", 3),
    P(t, "M -40 -130 L 40 -130 L 40 -30 L -40 -30 Z", 1),
    P(t, "M 0 -130 L 0 -30 M -40 -80 L 40 -80", 1),
    dot(t, -20, -156, s), dot(t, 20, -156, s),
    P(t, "M -12 -170 Q 0 -160 12 -170", 2),
    P(t, "M -50 -20 L -56 4 M 50 -20 L 56 4", 2),
  ];
}
