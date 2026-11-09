import { describe, expect, it } from "vitest";
import { sampleBook } from "../src/app/lib/sample";

const DENYLIST = ["milo", "tock", "doldrums", "dodecahedron", "mathemagician", "digitopolis", "dictionopolis", "humbug"];

describe("public sample edition", () => {
  const all = sampleBook.pages.map((p) => p.text).join("\n");

  it("has ten pages in order", () => {
    expect(sampleBook.pages.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it("stays within the age 2-4 word budget (35-70 words)", () => {
    for (const p of sampleBook.pages) {
      const words = p.text.split(/\s+/).length;
      expect(words, p.id).toBeGreaterThanOrEqual(35);
      expect(words, p.id).toBeLessThanOrEqual(70);
    }
  });
  it("uses no em dashes, borrowed names, or Taylor and Scout", () => {
    expect(all).not.toMatch(/—/);
    for (const w of DENYLIST) expect(all.toLowerCase()).not.toMatch(new RegExp(`\\b${w}\\b`));
    expect(all).not.toMatch(/Taylor|Scout/);
  });
  it("respects the tic budget", () => {
    expect((all.match(/quizzical/gi) ?? []).length).toBeLessThanOrEqual(1);
    expect((all.match(/lo and behold/gi) ?? []).length).toBeLessThanOrEqual(1);
    expect((all.match(/\.\.\./g) ?? []).length).toBeLessThanOrEqual(3);
  });
  it("keeps drawings inside the format limits", () => {
    for (const p of sampleBook.pages) {
      const els = p.art.drawing!.elements;
      expect(els.length, p.id).toBeLessThanOrEqual(70);
      expect(els.filter((e) => e.type === "highlight").length, p.id).toBeLessThanOrEqual(1);
      for (const e of els) if (e.type === "path") expect(e.d.length).toBeLessThanOrEqual(2500);
    }
  });
});
