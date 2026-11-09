import { describe, expect, it } from "vitest";
import { validateDrawing } from "../src/shared/drawing";
import { sampleBook } from "../src/app/lib/sample";

const base = (elements: unknown[]) => ({ viewBox: [800, 560], elements });

describe("drawing validation", () => {
  it("accepts every drawing in the sample edition", () => {
    for (const p of sampleBook.pages) expect(validateDrawing(p.art.drawing, { allowSprites: false }), p.id).toMatchObject({ ok: true });
  });
  it("rejects too many elements", () => {
    const els = Array.from({ length: 71 }, () => ({ type: "line", x1: 0, y1: 0, x2: 5, y2: 5 }));
    expect(validateDrawing(base(els)).ok).toBe(false);
  });
  it("rejects path commands outside M L C Q Z", () => {
    expect(validateDrawing(base([{ type: "path", d: "M 0 0 A 5 5 0 0 1 10 10" }])).ok).toBe(false);
    expect(validateDrawing(base([{ type: "path", d: "M 0 0 l 5 5 q 3 3 6 6 z" }])).ok).toBe(true);
  });
  it("rejects coordinates far outside the sheet", () => {
    expect(validateDrawing(base([{ type: "line", x1: 0, y1: 0, x2: 2000, y2: 5 }])).ok).toBe(false);
    expect(validateDrawing(base([{ type: "line", x1: 0, y1: 0, x2: 2000, y2: 5 }]), { bounds: { w: 2200, h: 300 } }).ok).toBe(true);
  });
  it("rejects unknown sprites and a second highlight", () => {
    const s = { type: "sprite", spriteId: "nope", x: 1, y: 1, scale: 1 };
    expect(validateDrawing(base([s]), { spriteIds: new Set(["cube"]) }).ok).toBe(false);
    const h = { type: "highlight", x: 1, y: 1, w: 2, h: 2 };
    expect(validateDrawing(base([h, h])).ok).toBe(false);
  });
  it("rejects a path longer than 2500 characters", () => {
    expect(validateDrawing(base([{ type: "path", d: "M 0 0 " + "L 1 1 ".repeat(500) }])).ok).toBe(false);
  });
});
