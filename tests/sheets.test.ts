import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateDrawing } from "../src/shared/drawing";
import roster from "../src/generated/roster.json";

const canon = new Set((JSON.parse(readFileSync("public/sketches/sketches.json", "utf8")) as { sprites: { id: string }[] }).sprites.map((s) => s.id));
const index = (JSON.parse(readFileSync("public/sketches/roster/index.json", "utf8")) as { sheets: { id: string }[] }).sheets;
const needing = (roster as { id: string; spriteId: string; badge: number | null }[]).filter((r) => !canon.has(r.spriteId));

describe("roster sheets", () => {
  it("every character without a canon sprite has a sheet in the index", () => {
    expect(needing.filter((r) => !index.some((s) => s.id === r.id)).map((r) => r.id)).toEqual([]);
  });
  it.each(needing.map((r) => [r.id, r] as const))("%s is a valid 220 x 300 drawing that shows its badge", (id, r) => {
    const raw = JSON.parse(readFileSync(`public/sketches/roster/${id}.json`, "utf8"));
    const v = validateDrawing(raw, { bounds: { w: 220, h: 300 }, allowSprites: false });
    expect(v.ok).toBe(true);
    const labels = raw.elements.filter((e: { type: string }) => e.type === "label").map((e: { text: string }) => e.text);
    if (r.badge != null) expect(labels).toContain(String(r.badge));
  });
  it("has no stray sheets for canon sprites", () => {
    for (const s of index) expect(existsSync(`public/sketches/roster/${s.id}.json`) || existsSync(`public/sketches/roster/${s.id}.png`)).toBe(true);
  });
});
