import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildAll, isPrime, nthPrime, ROSTER_COUNT } from "../scripts/roster-lib";

const characters = readFileSync("content/characters.md", "utf8");
const locations = readFileSync("content/locations.md", "utf8");

describe("the real content files", () => {
  const { roster, places, errors } = buildAll(characters, locations);
  it("passes every roster and place check", () => expect(errors).toEqual([]));
  it("has 38 counted entries and keeps folk out of the count", () => {
    expect(roster.filter((r) => r.tier !== "folk")).toHaveLength(ROSTER_COUNT);
    expect(roster.filter((r) => r.tier === "folk").every((f) => f.badge === null)).toBe(true);
  });
  it("gives the second column the primes after 101", () => {
    const badge = (n: string) => roster.find((r) => r.name === n)!.badge;
    expect(["Qubit", "Rate", "Sal", "True", "Total"].map(badge)).toEqual([103, 107, 109, 113, 127]);
  });
  it("parses the places", () => {
    expect(places.filter((p) => p.number == null)).toHaveLength(4);
    expect(places.filter((p) => p.number != null)).toHaveLength(17);
    expect(places.find((p) => p.id === "the-alphabet-bazaar")!.residents).toContain("sal");
  });
  it("points chris-and-steve at the canon scissors sprite", () => {
    expect(roster.find((r) => r.id === "chris-and-steve")!.spriteId).toBe("scissors-chris-steve");
  });
});

describe("the checks fail loudly", () => {
  const fails = (md: string, re: RegExp) => expect(buildAll(md, locations).errors.join("\n")).toMatch(re);
  it("rejects a non-prime badge", () => fails(characters.replace("| D · 7 |", "| D · 9 |"), /not prime|letter D/));
  it("rejects a duplicate badge", () => fails(characters.replace("| E · 11 |", "| E · 7 |"), /share badge 7/));
  it("rejects a wrong second-column badge", () => fails(characters.replace("| Q · 103 |", "| Q · 131 |"), /Qubit should wear 103/));
  it("rejects folk whose place is not in locations.md", () => fails(characters.replace("| The Mouse | Xerox Park |", "| The Mouse | Nowhere Land |"), /matches no place/));
  it("rejects a missing citizen", () => fails(characters.replace(/^\| Z · 101 .*$/m, ""), /letter Z|expected 38/));
  it("rejects the wrong place count", () => {
    const { errors } = buildAll(characters, locations.replace(/### 17\. Terminus[^]*$/, ""));
    expect(errors.join("\n")).toMatch(/expected 4 unnumbered and 17 numbered/);
  });
});

describe("prime helpers", () => {
  it("knows the 26th prime is 101", () => expect(nthPrime(26)).toBe(101));
  it("treats 1 as not prime", () => expect(isPrime(1)).toBe(false));
});
