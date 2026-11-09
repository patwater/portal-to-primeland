import { describe, expect, it } from "vitest";
import { repairDrawing, validateDrawing } from "../src/shared/drawing";
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

describe("repairDrawing", () => {
  const good = { type: "line", x1: 1, y1: 1, x2: 9, y2: 9 };
  it("drops bad elements and keeps the good ones", () => {
    const r = repairDrawing({ elements: [good, { type: "path", d: "M 0 0 A 1 1 0 0 1 5 5" }, { type: "line", x1: 0, y1: 0, x2: 9000, y2: 0 }, { type: "nope" }, null, good] })!;
    expect(r.drawing.elements).toHaveLength(2);
    expect(r.dropped).toBe(4);
    expect(validateDrawing(r.drawing).ok).toBe(true);
  });
  it("strips keys the format doesn't have, and null optionals", () => {
    const r = repairDrawing({ elements: [{ ...good, fill: "red", weight: null, extra: 1 }] })!;
    expect(r.drawing.elements[0]).toEqual(good);
  });
  it("keeps one highlight and caps the total at 70", () => {
    const h = { type: "highlight", x: 1, y: 1, w: 5, h: 5 };
    expect(repairDrawing({ elements: [h, h, good] })!.drawing.elements.filter((e) => e.type === "highlight")).toHaveLength(1);
    expect(repairDrawing({ elements: Array.from({ length: 90 }, () => good) })!.drawing.elements).toHaveLength(70);
  });
  it("gives up when nothing is usable", () => {
    expect(repairDrawing({ elements: [{ type: "path", d: "A 1 2" }] })).toBeNull();
    expect(repairDrawing("not a drawing")).toBeNull();
    expect(repairDrawing({})).toBeNull();
  });
  it("respects the sheet bounds and sprite list it is given", () => {
    const r = repairDrawing({ elements: [good, { type: "sprite", spriteId: "x", x: 1, y: 1, scale: 1 }] }, { spriteIds: new Set(["y"]) })!;
    expect(r.drawing.elements).toHaveLength(1);
  });
});
