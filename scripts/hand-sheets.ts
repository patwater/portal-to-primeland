/**
 * Hand-authored roster sheets: quick pen sketches of every roster character that has no canon sprite,
 * written as Drawing JSON on the 220 x 300 sheet (feet near y 290). They are placeholders, marked
 * "hand-authored" in public/sketches/roster/index.json, so Patrick can approve, redraw with
 * `npm run draw-roster -- --only <id>`, or replace any of them with his own PNG.
 *
 *   npm run hand-sheets
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { validateDrawing } from "../src/shared/drawing";
import type { DrawingElement as El, Hatch, Weight } from "../src/app/lib/types";

type Entry = { id: string; name: string; badge: number | null; spriteId: string };

// ---- tiny pen ----
const o = (cx: number, cy: number, rx: number, ry: number, weight: Weight = 2, hatch?: Hatch): El => ({ type: "ellipse", cx, cy, rx, ry, weight, hatch });
const p = (d: string, weight: Weight = 2, hatch?: Hatch): El => ({ type: "path", d, weight, hatch });
const r = (x: number, y: number, w: number, h: number, weight: Weight = 2, hatch?: Hatch): El => ({ type: "rect", x, y, w, h, weight, hatch });
const l = (x1: number, y1: number, x2: number, y2: number, weight: Weight = 2): El => ({ type: "line", x1, y1, x2, y2, weight });
const dot = (x: number, y: number): El => o(x, y, 2.4, 2.4, 3);
const eyes = (x1: number, x2: number, y: number): El[] => [dot(x1, y), dot(x2, y)];
const smile = (x: number, y: number, w = 8): El => p(`M ${x - w} ${y} Q ${x} ${y + w * 0.9} ${x + w} ${y}`);
const cx = (text: string, px: number) => 110 - (text.length * px * 0.46) / 2;
const name = (n: string): El => ({ type: "label", text: n, x: cx(n, 22), y: 296, size: "s" });
const text = (t: string, x: number, y: number, size: "s" | "m" = "s", extra: Partial<Extract<El, { type: "label" }>> = {}): El => ({ type: "label", text: t, x, y, size, ...extra });
const badge = (x: number, y: number, n: number | null): El[] => (n == null ? [] : [o(x, y, 15, 15, 2), text(String(n), x - (String(n).length * 22 * 0.46) / 2, y + 7)]);
const ground = (): El => p("M 40 288 Q 110 282 180 288", 1);
const legs = (xs: number[], y1: number, y2: number): El => p(xs.map((x) => `M ${x} ${y1} L ${x} ${y2}`).join(" "));
const spikes = (x0: number, y0: number, n: number, dx: number, dy: number, len: number): string => {
  let d = `M ${x0} ${y0}`;
  for (let i = 0; i < n; i++) d += ` L ${x0 + dx * (i + 0.5)} ${y0 - len} L ${x0 + dx * (i + 1)} ${y0 + dy}`;
  return d;
};

// ---- the sheets ----
const S: Record<string, (b: number | null) => El[]> = {
  "the-adding-machine": (b) => [
    r(45, 150, 130, 100, 3), p("M 45 150 L 65 128 L 195 128 L 175 150", 2), p("M 175 150 L 195 128 L 195 228 L 175 250", 2, { angle: 45, gap: 6, cross: true }),
    ...[0, 1, 2].flatMap((row) => [0, 1, 2, 3].map((c) => o(72 + c * 26, 172 + row * 24, 8, 8, 2))),
    p("M 100 128 Q 100 70 130 60 Q 165 52 160 90 Q 155 110 135 100", 2), p("M 106 128 Q 106 76 133 68 Q 160 62 155 88", 1),
    l(175, 200, 205, 178, 3), o(208, 175, 7, 7, 2), r(60, 250, 100, 10, 2), ...badge(110, 215 + 0, b).map((e) => e),
    name("The Adding Machine"),
  ],
  "alpha-and-beta": () => {
    const goat = (x: number, lop: boolean, tag: string): El[] => [
      o(x, 215, 30, 22), o(x + 30, 178, 14, 14), ...eyes(x + 26, x + 36, 175), legs([x - 18, x - 6, x + 8, x + 20], 232, 270),
      p(lop ? `M ${x + 24} 166 Q ${x + 10} 140 ${x + 26} 138 M ${x + 34} 166 Q ${x + 50} 150 ${x + 44} 128` : `M ${x + 24} 166 Q ${x + 18} 144 ${x + 26} 140 M ${x + 34} 166 Q ${x + 42} 144 ${x + 34} 140`, 2),
      r(x - 8, 195, 22, 16, 1), text(tag, x - 4, 209, "s"), p(`M ${x + 36} 192 Q ${x + 38} 204 ${x + 34} 206`, 1),
    ];
    return [...goat(62, true, "a"), ...goat(150, false, "b"), text("test you!", 24, 110, "s", { arrowTo: { x: 70, y: 150 } }), text("test you back!", 110, 100, "s", { arrowTo: { x: 160, y: 140 } }), name("Alpha and Beta")];
  },
  "patch-the-webmaster": () => [
    p("M 20 20 L 110 70 L 200 20 M 110 20 L 110 70", 1), o(110, 150, 34, 30, 2, { angle: 50, gap: 6 }), o(110, 108, 22, 22), ...eyes(102, 118, 104), smile(110, 116, 6),
    p("M 78 138 Q 40 100 25 130 L 22 220 M 80 152 Q 36 150 28 180 L 30 270 M 84 166 Q 50 190 48 230 L 52 280 M 92 176 Q 82 220 76 280"),
    p("M 142 138 Q 180 100 195 130 L 198 220 M 140 152 Q 184 150 192 180 L 190 270 M 136 166 Q 170 190 172 230 L 168 280 M 128 176 Q 138 220 144 280"),
    r(88, 132, 44, 30, 1), name("Patch the Webmaster"),
  ],
  "the-apps": (b) => [
    p("M 20 150 L 200 150", 3),
    ...[0, 1, 2, 3, 4].flatMap((i) => { const x = 36 + i * 36, y = 150 - (i % 2) * 26 - 32; return [r(x - 14, y, 28, 28, 2), p(`M ${x - 14} ${y + 6} Q ${x - 14} ${y} ${x - 8} ${y}`, 1), dot(x - 5, y + 10), dot(x + 5, y + 10), p(`M ${x + 14} ${y + 14} L ${x + 22} ${y + 17} L ${x + 14} ${y + 19} Z`, 1)]; }),
    text("Ding!", 20, 70, "m", { circled: true }), ...badge(110, 215, b), p("M 40 190 L 180 190", 1), name("The Apps"),
  ],
  "one-and-nought-the-binaries": (b) => [
    r(34, 110, 62, 110, 3), r(124, 110, 62, 110, 3), l(65, 135, 65, 165, 3), o(65, 128, 9, 9, 2), l(155, 165, 155, 195, 3), o(155, 202, 9, 9, 2),
    ...eyes(52, 78, 190), smile(65, 202, 7), ...eyes(142, 168, 130), p("M 148 142 L 162 142", 2), text("1", 56, 100, "m"), text("0", 146, 100, "m"), ...badge(110, 60, b), name("One and Nought"),
  ],
  "connie-conduit": (b) => [
    p("M 190 270 Q 110 270 110 230 Q 110 190 170 180 Q 60 170 50 130 Q 45 90 100 70", 3), p("M 190 252 Q 128 252 128 230 Q 128 205 176 196 Q 40 184 34 130 Q 32 70 100 52", 2),
    o(112, 52, 24, 20), ...eyes(104, 122, 48), smile(113, 60, 7), ...badge(150, 228, b), text("whoosh", 140, 130, "s"), name("Connie Conduit"),
  ],
  digit: (b) => [
    r(70, 60, 80, 12, 2, { angle: 90, gap: 3 }), r(70, 140, 80, 12, 2, { angle: 90, gap: 3 }), r(70, 220, 80, 12, 2, { angle: 90, gap: 3 }),
    r(62, 76, 12, 60, 2, { angle: 0, gap: 3 }), r(146, 76, 12, 60, 2, { angle: 0, gap: 3 }), r(62, 156, 12, 60, 2, { angle: 0, gap: 3 }), r(146, 156, 12, 60, 2, { angle: 0, gap: 3 }),
    ...eyes(96, 124, 100), smile(110, 118, 8), legs([88, 132], 236, 280), ...badge(110, 186, b), name("Digit"),
  ],
  "sparky-the-electric-eel": (b) => [
    p("M 30 200 Q 70 120 110 190 Q 150 260 190 170", 3), p("M 34 214 Q 72 138 110 206 Q 150 276 186 186", 2), o(36, 205, 16, 12), dot(32, 202),
    p("M 90 90 L 100 112 L 88 114 L 104 140", 3), p("M 140 70 L 152 94 L 138 96 L 156 124", 3), p("M 54 100 L 62 118 L 52 120 L 64 140", 2), ...badge(110, 232, b), text("Shocking!", 120, 60, "s"), name("Sparky the Electric Eel"),
  ],
  "fern-of-the-frontier": (b) => [
    o(80, 205, 28, 34), o(80, 150, 20, 20), ...eyes(74, 88, 148), p("M 76 158 Q 80 162 84 158", 1), p("M 58 148 Q 80 116 102 148 L 98 160 L 62 160 Z", 2, { angle: 45, gap: 7 }), p("M 62 160 Q 80 178 98 160", 1),
    legs([68, 92], 236, 280), ...badge(80, 210, b), r(130, 220, 56, 32, 2), p("M 124 220 Q 158 176 192 220", 2), o(142, 262, 14, 14), o(176, 262, 14, 14), l(106, 230, 130, 238, 2), text("not yet", 130, 150, "s"), name("Fern of the Frontier"),
  ],
  game: (b) => [
    r(60, 90, 100, 110, 3), p("M 93 90 L 93 200 M 127 90 L 127 200 M 60 127 L 160 127 M 60 164 L 160 164", 1), ...eyes(88, 132, 120), smile(110, 148, 10),
    r(54, 200, 112, 16, 2), r(64, 202, 12, 12, 1), dot(70, 208), r(94, 202, 12, 12, 1), dot(98, 206), dot(102, 210), r(124, 202, 12, 12, 1), r(148, 202, 12, 12, 1),
    p("M 36 130 L 60 150 M 184 130 L 160 150", 2), legs([88, 132], 216, 272), ...badge(110, 60, b), text("Your turn!", 110 - 46, 40, "s"), name("Game"),
  ],
  "hob-the-homebrewer": (b) => [
    o(100, 210, 46, 36, 2, { angle: 60, gap: 7 }), p(spikes(62, 190, 7, 10, 6, 18), 2), o(150, 214, 24, 20), dot(158, 208), o(170, 216, 4, 4, 3),
    o(140, 196, 9, 9, 2), o(160, 196, 9, 9, 2), l(149, 196, 151, 196, 1), p("M 128 190 Q 150 176 172 190", 1), legs([82, 116], 244, 276), ...badge(98, 216, b), p("M 40 276 L 60 262 L 70 276", 1), name("Hob the Homebrewer"),
  ],
  indie: (b) => [
    o(100, 190, 36, 24), o(142, 168, 15, 14), ...eyes(138, 148, 164), p("M 146 156 Q 160 120 190 110 M 150 156 Q 176 134 196 126", 2),
    p("M 76 200 L 52 232 L 40 276 M 96 210 L 90 250 L 80 280 M 120 210 L 128 250 L 140 280", 2), o(150, 218, 22, 12, 2, { angle: 40, gap: 6 }), l(128, 204, 176, 232, 2), ...badge(98, 192, b), text("Nobody asked.", 10, 70, "s"), text("I just did.", 10, 94, "s"), name("Indie"),
  ],
  "jinx-the-joker": (b) => [
    r(60, 90, 100, 140, 3, undefined), r(110, 90, 50, 140, 1, { angle: 45, gap: 6, cross: true }), p("M 62 90 L 40 50 L 78 70 L 110 36 L 142 70 L 180 50 L 158 90", 2), o(40, 46, 5, 5), o(110, 32, 5, 5), o(180, 46, 5, 5),
    ...eyes(88, 132, 130), smile(110, 160, 14), p("M 60 150 L 30 190 M 160 150 L 190 190", 2), legs([90, 130], 230, 276), text("J", 66, 112, "m"), ...badge(110, 200, b), name("Jinx the Joker"),
  ],
  "the-king": (b) => [
    p("M 70 270 L 150 270 L 138 230 L 82 230 Z", 3), p("M 82 230 Q 72 160 96 130 L 124 130 Q 148 160 138 230", 2), o(110, 118, 22, 12), p("M 80 86 L 86 120 L 134 120 L 140 86 L 124 102 L 110 80 L 96 102 Z", 3, { angle: 60, gap: 5 }),
    l(110, 80, 110, 46, 3), l(98, 60, 122, 60, 3), ...eyes(100, 120, 150), smile(110, 168, 8), ...badge(110, 205, b), text("one step at a time", 36, 24, "s"), name("The King"),
  ],
  "lou-the-loser": (b) => [
    o(100, 170, 36, 28), p("M 130 160 Q 160 120 150 70 Q 148 50 166 48 L 200 56", 3), o(164, 52, 10, 9), dot(166, 50), l(70, 190, 70, 280, 2), l(110, 195, 110, 280, 2), l(70, 280, 54, 282, 2), l(110, 280, 94, 282, 2),
    ...[0, 1, 2].flatMap((i) => [o(84 + i * 12, 176 + i * 4, 6, 6, 2), p(`M ${84 + i * 12} ${182 + i * 4} L ${80 + i * 12} ${198 + i * 4} M ${84 + i * 12} ${182 + i * 4} L ${90 + i * 12} ${198 + i * 4}`, 1)]), ...badge(100, 150, b), text("Good game! Again?", 10, 24, "s"), name("Lou the Loser"),
  ],
  mem: (b) => [
    o(100, 190, 48, 40), o(168, 170, 22, 22), p("M 186 180 Q 206 220 196 258 Q 192 270 184 262", 2), ...[0, 1].map((i) => dot(176 + i * 0, 160)), o(132, 160, 28, 36, 2),
    r(112, 140, 40, 40, 1), l(112, 160, 152, 160, 1), r(126, 148, 12, 6, 1), r(126, 168, 12, 6, 1), legs([68, 90, 120, 140], 224, 280), p("M 52 180 Q 36 190 40 210", 2), ...badge(80, 186, b), text("I remember!", 20, 60, "s"), name("Mem"),
  ],
  nega: (b) => [
    l(60, 30, 160, 30, 1), legs([90, 110, 130], 30, 70), o(110, 130, 36, 56), ...eyes(98, 122, 140), p("M 100 108 Q 110 98 120 108", 2), p("M 70 150 L 46 190 M 150 150 L 174 190", 2),
    p("M 180 250 L 140 250 M 140 250 L 154 240 M 140 250 L 154 260", 2), ...badge(110, 90, b), text("Olleh!", 70, 216, "m"), name("Nega"),
  ],
  "big-o": (b) => [
    o(110, 160, 82, 82, 3), o(110, 160, 66, 66, 1), ...Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return l(110 + 60 * Math.sin(a), 160 - 60 * Math.cos(a), 110 + 66 * Math.sin(a), 160 - 66 * Math.cos(a), 1); }),
    l(110, 160, 140, 128, 2), o(110, 160, 4, 4, 3), r(98, 68, 24, 14, 2), ...eyes(92, 128, 140), smile(110, 188, 14), ...badge(110, 222, b), legs([80, 140], 242, 282), text("How long will", 30, 22, "s"), text("THAT take?", 30, 44, "s"), name("Big O"),
  ],
  "polly-nomial": (b) => [
    o(100, 170, 30, 44), o(106, 112, 22, 20), dot(112, 108), p("M 120 112 Q 148 112 140 134 Q 130 124 122 124", 2), p("M 80 210 Q 40 250 70 280 M 90 214 Q 70 262 100 284 M 100 214 Q 100 262 130 282", 3), p("M 84 160 Q 62 180 80 206", 2),
    l(60, 220, 160, 220, 3), l(100, 214, 100, 220, 1), ...badge(104, 180, b), text("Again! Again, again!", 6, 40, "s"), name("Polly Nomial"),
  ],
  "quo-the-quokka": (b) => [
    o(100, 200, 40, 44), o(100, 140, 28, 26), p("M 78 122 Q 74 106 84 108 M 122 122 Q 126 106 116 108", 2), ...eyes(90, 110, 138), smile(100, 150, 12), o(100, 144, 3, 3, 3), legs([84, 116], 242, 280),
    r(130, 170, 60, 46, 3), p("M 142 182 L 142 204 M 150 182 L 150 204 M 158 182 L 158 204 M 134 186 L 166 200 M 172 182 L 172 204", 1), ...badge(100, 200, b), text("How many fit?", 100 - 30, 60, "s"), name("Quo the Quokka"),
  ],
  qubit: (b) => [
    p("M 66 120 L 154 120 L 110 262 Z", 2, { angle: 70, gap: 6 }), o(110, 122, 50, 14), l(110, 108, 110, 70, 3), p("M 56 170 Q 44 150 54 126 M 164 170 Q 176 150 166 126", 1), ...eyes(98, 122, 190), p("M 100 210 Q 110 200 120 210", 2),
    text("heads", 24, 60, "s"), text("tails", 150, 60, "s"), ...badge(110, 150, b), text("Maybe!", 70, 36, "m"), name("Qubit"),
  ],
  "rio-the-ratio": (b) => [
    p("M 110 280 L 80 236 L 140 236 Z", 3), p("M 24 190 L 196 250", 3), o(34, 160, 22, 22), ...eyes(28, 40, 156), smile(34, 168, 6), o(186, 220, 14, 14), ...eyes(182, 190, 218), smile(186, 226, 4),
    o(40, 130, 12, 12, 1), o(24, 130, 12, 12, 1), text("2", 30, 86, "m"), text("1", 176, 180, "m"), ...badge(110, 210, b), text("Two to one!", 70, 40, "s"), name("Rio the Ratio"),
  ],
  rate: (b) => [
    p("M 30 270 Q 40 230 100 232 L 190 250 Q 196 268 180 272 Z", 2), o(100, 170, 56, 56), o(100, 170, 40, 40, 1), l(100, 170, 124, 148, 3), o(100, 170, 4, 4, 3),
    ...[0, 1, 2, 3, 4, 5].map((i) => { const a = -2.4 + i * 0.9; return l(100 + 34 * Math.sin(a), 170 - 34 * Math.cos(a), 100 + 40 * Math.sin(a), 170 - 40 * Math.cos(a), 1); }),
    p("M 40 240 Q 30 200 34 180 M 56 236 Q 50 196 58 176", 2), o(34, 176, 5, 5), o(58, 172, 5, 5), dot(34, 176), dot(58, 172), smile(48, 252, 6), ...badge(100, 112, b), text("Per what?", 130, 100, "s"), name("Rate"),
  ],
  speck: (b) => [
    ...[0, 1, 2].map((i) => { const a = (i * Math.PI) / 3; return l(110 + 80 * Math.cos(a), 150 + 80 * Math.sin(a), 110 - 80 * Math.cos(a), 150 - 80 * Math.sin(a), 2); }),
    ...[0, 1, 2, 3, 4, 5].flatMap((i) => { const a = (i * Math.PI) / 3, ex = 110 + 56 * Math.cos(a), ey = 150 + 56 * Math.sin(a); return [l(ex, ey, ex + 18 * Math.cos(a + 0.8), ey + 18 * Math.sin(a + 0.8), 1), l(ex, ey, ex + 18 * Math.cos(a - 0.8), ey + 18 * Math.sin(a - 0.8), 1)]; }),
    o(110, 150, 20, 20, 2), ...eyes(103, 117, 147), smile(110, 156, 6), ...badge(110, 240, b), text("There's only", 30, 24, "s"), text("one of me!", 30, 46, "s"), name("Speck"),
  ],
  sal: (b) => [
    o(100, 210, 50, 32), ...eyes(84, 116, 160).map((e) => e), l(84, 190, 84, 164, 2), l(116, 190, 116, 164, 2), o(84, 160, 7, 7), o(116, 160, 7, 7), dot(84, 160), dot(116, 160), smile(100, 220, 12),
    p("M 56 200 Q 20 190 24 160 Q 40 150 52 170 Z M 144 200 Q 180 190 176 160 Q 160 150 148 170 Z", 2), p("M 60 236 L 40 262 M 76 242 L 64 274 M 124 242 L 136 274 M 140 236 L 160 262", 2),
    p("M 150 120 L 196 96 L 196 142 Z", 2), r(140, 124, 16, 10, 2), r(20, 40, 100, 32, 2), text("SALE!", 36, 66, "m"), ...badge(100, 214, b), name("Sal"),
  ],
  "tenny-the-tenth": (b) => [
    o(110, 230, 20, 20), o(110, 200, 16, 14), o(98, 182, 10, 12), o(124, 182, 10, 12), ...eyes(104, 116, 198), o(110, 207, 3, 3, 3), p("M 130 238 Q 170 250 160 276", 2), legs([100, 120], 248, 274),
    ...badge(110, 232, b), l(60, 288, 60, 266, 1), l(54, 288, 66, 288, 1), text("1/10", 40, 258, "s"), text("Just a little bit!", 40, 130, "s"), name("Tenny the Tenth"),
  ],
  true: (b) => [
    o(110, 170, 34, 44), o(86, 118, 22, 20), dot(90, 114), p("M 66 120 L 24 126 L 66 132", 2), l(20, 126, 6, 126, 3), p("M 6 126 L 16 120 M 6 126 L 16 132", 2),
    p("M 110 210 Q 80 250 100 280 M 120 210 Q 130 252 140 282", 2), p("M 130 150 Q 168 170 150 222 Q 136 190 130 190", 2, { angle: 55, gap: 6 }), p("M 100 214 L 96 282 M 122 214 L 128 282", 2),
    ...badge(112, 176, b), text("That's true.", 70, 60, "s"), name("True"),
  ],
  total: (b) => [
    p("M 30 240 Q 40 130 110 120 Q 180 130 190 240 Z", 3), o(196, 224, 14, 12), dot(202, 220), legs([60, 90, 140, 170], 240, 276), p("M 214 240 L 224 250", 2),
    text("1+2", 66, 170, "s"), text("+3+4", 62, 196, "s"), text("= ?", 82, 222, "s"), ...badge(110, 148, b), text("And that makes...", 40, 60, "s"), name("Total"),
  ],
  uni: (b) => [
    o(100, 196, 48, 32), p("M 132 180 Q 150 130 166 118 L 190 122 Q 196 140 180 150 L 160 170", 2), dot(176, 130), p("M 164 118 L 168 62 L 176 118 Z", 2), r(160, 50, 20, 12, 2), l(164, 46, 164, 50, 2), l(176, 46, 176, 50, 2),
    p("M 140 118 Q 120 120 120 150 M 150 120 Q 132 130 134 160", 2), p("M 54 190 Q 20 210 34 250", 3), legs([70, 88, 116, 132], 222, 280), ...badge(94, 196, b), text("One horn fits all!", 6, 30, "s"), name("Uni"),
  ],
  vector: (b) => [
    p("M 30 240 L 150 120 L 130 120 L 190 60 L 190 150 L 170 130 L 50 250 Z", 3, { angle: 45, gap: 9 }), ...eyes(84, 108, 182), smile(96, 198, 8), ...badge(60, 130, b), text("This way, this far!", 10, 30, "s"), name("Vector"),
  ],
  "wendell-the-window": (b) => [
    r(50, 50, 120, 150, 3), r(62, 62, 96, 126, 1), l(110, 62, 110, 188, 1), l(62, 125, 158, 125, 1), ...eyes(88, 132, 100), smile(110, 150, 10), p("M 52 200 L 44 270 M 168 200 L 176 270", 2),
    p("M 170 70 Q 200 90 180 120", 1), ...badge(110, 232, b), text("Have a look!", 10, 30, "s"), name("Wendell the Window"),
  ],
  "xavi-the-x-ray-fish": (b) => [
    p("M 40 160 Q 100 90 170 150 Q 100 220 40 160 Z", 2), p("M 170 150 L 204 118 L 204 184 Z", 2), dot(66, 150), p("M 70 158 L 168 150", 1), p("M 90 130 L 96 158 M 108 126 L 112 158 M 126 128 L 128 158 M 144 134 L 144 158 M 94 176 L 98 158 M 112 178 L 114 158 M 130 176 L 130 158", 1),
    o(58, 150, 10, 10, 1), p("M 110 100 L 100 70 M 120 102 L 122 72", 1), ...badge(120, 232, b), text("I can see right", 30, 24, "s"), text("through you!", 30, 46, "s"), name("Xavi the X-Ray Fish"),
  ],
  "yara-the-yak": (b) => [
    o(100, 190, 52, 38, 2, { angle: 70, gap: 5 }), o(160, 168, 22, 22), ...eyes(154, 170, 164), p("M 150 160 L 140 130 L 134 106 M 150 160 L 160 130 L 172 106 M 150 160 L 160 130 L 150 108", 2),
    p("M 56 200 Q 50 250 60 262 M 70 224 L 70 280 M 130 224 L 130 280 M 140 214 Q 150 250 142 270", 2), ...badge(96, 186, b), text("But why?", 20, 60, "m"), name("Yara the Yak"),
  ],
  "zara-the-zebra": (b) => [
    o(100, 190, 50, 32), o(158, 150, 20, 22), ...eyes(154, 166, 140), p("M 150 134 L 152 112 L 158 130 M 166 134 L 172 114 L 172 138", 2), p("M 140 136 Q 120 150 130 170", 2),
    r(60, 164, 80, 52, 1, { angle: 80, gap: 7 }), legs([66, 88, 114, 134], 218, 278), p("M 52 190 Q 28 200 34 226", 2), ...badge(100, 192, b), text("I know, and now", 30, 24, "s"), text("you know I know.", 30, 46, "s"), name("Zara the Zebra"),
  ],
  "pip-the-platypus": (b) => [
    o(100, 205, 46, 28, 2, { angle: 60, gap: 8 }), o(150, 180, 22, 18), ...eyes(154, 164, 174), p("M 168 182 L 204 184 L 204 196 L 168 196 Z", 2), p("M 168 190 L 204 190", 1),
    p("M 54 200 L 22 214 L 18 240 L 52 236 Z", 3, { angle: 40, gap: 5, cross: true }), p("M 82 230 L 78 262 L 60 266 L 70 270 L 90 270 L 96 230 M 124 230 L 122 262 L 104 266 L 114 270 L 134 270 L 140 230", 2),
    p("M 130 150 Q 150 130 166 156", 1), r(24, 112, 64, 34, 2, { angle: 30, gap: 5 }), p("M 24 112 Q 56 86 88 112", 2), o(40, 108, 9, 11, 2), o(58, 106, 9, 11, 2), o(76, 108, 9, 11, 2),
    ...badge(98, 206, b), text("A little bit of", 20, 40, "s"), text("everything, and", 20, 62, "s"), text("that's plenty!", 20, 84, "s"), name("Pip the Platypus"),
  ],
  "the-delivery-man": () => [
    o(110, 70, 26, 28), p("M 84 62 Q 110 30 136 62", 2, { angle: 60, gap: 6 }), ...eyes(100, 120, 72), smile(110, 82, 8), p("M 104 98 L 102 108 M 116 98 L 118 108", 1), p("M 86 100 L 80 190 L 140 190 L 134 100 Z", 2),
    p("M 80 190 L 80 250 M 92 190 L 92 250 M 104 190 L 104 250 M 116 190 L 116 250 M 128 190 L 128 250 M 140 190 L 140 250", 1), p("M 86 112 L 52 150 M 134 112 L 168 140", 2), legs([96, 124], 250, 282), r(24, 150, 36, 28, 1), name("The Delivery Man"),
  ],
  shilo: () => [
    o(110, 220, 46, 26), o(160, 196, 18, 16), ...eyes(156, 168, 192), p("M 150 182 L 144 164 L 156 176 M 170 182 L 178 166 L 176 184", 2), p("M 64 212 Q 38 196 44 176", 2), legs([84, 100, 128, 140], 240, 280), dot(176, 200), name("Shilo"),
  ],
  "the-platypuses": () => [
    ...[0, 1].flatMap((i) => { const x = 70 + i * 80, y = 190 + i * 20, s = 1 - i * 0.15; return [o(x, y, 34 * s, 20 * s), o(x + 40 * s, y - 4, 16 * s, 12 * s), p(`M ${x + 52 * s} ${y - 8} L ${x + 80 * s} ${y - 4} L ${x + 80 * s} ${y + 6} L ${x + 52 * s} ${y + 4} Z`, 2), dot(x + 38 * s, y - 8), p(`M ${x - 34 * s} ${y} L ${x - 60 * s} ${y + 8} L ${x - 56 * s} ${y - 8} Z`, 2, { angle: 45, gap: 5 }), legs([x - 10 * s, x + 14 * s], y + 18 * s, y + 34 * s)]; }),
    ...[0, 1].map((i) => text("?", 40 + i * 110, 120 + i * 20, "m", { circled: true })), p("M 20 262 Q 110 250 200 262", 1), name("The Platypuses"),
  ],
  "the-owl": () => [
    p("M 70 130 L 78 90 L 96 112 L 124 112 L 142 90 L 150 130", 2), o(110, 170, 48, 62), o(90, 140, 17, 17), o(130, 140, 17, 17), dot(92, 142), dot(128, 142), p("M 104 156 L 110 170 L 116 156 Z", 2),
    p("M 76 200 Q 110 240 144 200", 1, { angle: 30, gap: 5 }), l(30, 250, 190, 250, 3), p("M 96 232 L 96 250 M 124 232 L 124 250", 2), text("Come out on the left!", 4, 40, "s"), name("The Owl"),
  ],
  eratosthenes: () => [
    o(110, 84, 24, 26), p("M 88 94 Q 110 160 132 94 Q 110 110 88 94 Z", 2, { angle: 70, gap: 5 }), ...eyes(102, 118, 80), p("M 86 66 Q 110 40 134 66", 1), p("M 84 110 L 76 210 L 144 210 L 136 110 Z", 2), p("M 82 124 L 44 170 M 138 124 L 170 146", 2),
    o(40, 190, 30, 30, 2), p("M 14 190 L 66 190 M 40 164 L 40 216 M 22 172 L 58 208 M 58 172 L 22 208", 1), legs([98, 122], 210, 278), text("a stick and a shadow", 20, 28, "s"), name("Eratosthenes"),
  ],
  "the-mouse": () => [
    o(100, 210, 28, 30), o(100, 168, 20, 18), o(86, 152, 9, 11), o(114, 152, 9, 11), ...eyes(94, 106, 166), dot(100, 176), p("M 126 220 Q 160 240 150 272", 2), legs([90, 110], 238, 276),
    p("M 124 196 L 168 160 L 160 160 M 168 160 L 166 168", 2), p("M 172 150 L 196 126 L 190 146 Z", 2), text("this way", 140, 110, "s"), name("The Mouse"),
  ],
  "the-harbormaster": () => [
    o(110, 82, 24, 26), p("M 82 72 L 138 72 L 134 52 Q 110 36 86 52 Z", 2), p("M 78 74 L 142 74", 3), ...eyes(102, 118, 86), p("M 100 104 Q 110 112 120 104", 2), p("M 84 110 L 78 210 L 142 210 L 136 110 Z", 2),
    p("M 100 110 L 110 140 L 120 110", 1), p("M 84 124 L 56 162 M 136 124 L 160 150", 2), r(150, 142, 36, 46, 2), l(158, 156, 180, 156, 1), { type: "strike", text: "log", x: 154, y: 176 }, legs([96, 124], 210, 280), text("Maybe.", 20, 40, "m"), name("The Harbormaster"),
  ],
  "the-rangers": () => [
    o(110, 80, 22, 24), p("M 76 70 L 144 70 L 130 52 L 90 52 Z", 2), p("M 70 72 L 150 72", 3), ...eyes(102, 118, 84), smile(110, 96, 7), p("M 86 104 L 80 200 L 140 200 L 134 104 Z", 2), p("M 86 118 L 56 160 M 134 118 L 166 150", 2), legs([96, 124], 200, 280),
    l(176, 150, 176, 218, 2), p("M 176 160 Q 150 150 156 130 Q 176 120 176 140 Q 196 120 202 146 Q 204 166 176 160", 2), p("M 150 218 L 202 218", 2), text("shade for later", 20, 30, "s"), name("The Rangers"),
  ],
};

const roster = JSON.parse(readFileSync("src/generated/roster.json", "utf8")) as Entry[];
const canon = new Set((JSON.parse(readFileSync("public/sketches/sketches.json", "utf8")) as { sprites: { id: string }[] }).sprites.map((s) => s.id));
const need = roster.filter((e) => !canon.has(e.spriteId));
const dir = "public/sketches/roster";
mkdirSync(dir, { recursive: true });

const errors: string[] = [];
const missing = need.filter((e) => !S[e.id]).map((e) => e.id);
if (missing.length) errors.push(`no hand sheet for: ${missing.join(", ")}`);
const extra = Object.keys(S).filter((id) => !need.some((e) => e.id === id));
if (extra.length) errors.push(`hand sheet for unknown or canon id: ${extra.join(", ")}`);
const sheets: { id: string; kind: "json"; status: "pending"; source: string }[] = [];
for (const e of need) {
  const els = S[e.id]?.(e.badge);
  if (!els) continue;
  const v = validateDrawing({ viewBox: [800, 560], elements: els }, { bounds: { w: 220, h: 300 }, allowSprites: false });
  if (!v.ok) { errors.push(`${e.id}: ${v.errors.join("; ")}`); continue; }
  writeFileSync(`${dir}/${e.id}.json`, JSON.stringify(v.drawing) + "\n");
  sheets.push({ id: e.id, kind: "json", status: "pending", source: "hand-authored" });
}
if (errors.length) { console.error(errors.map((x) => `  - ${x}`).join("\n")); process.exit(1); }
writeFileSync(`${dir}/index.json`, JSON.stringify({ sheets }, null, 2) + "\n");
console.log(`${sheets.length} hand-authored sheets written to ${dir}`);
