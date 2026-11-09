import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { buildAll } from "./roster-lib";

const { roster, places, errors } = buildAll(readFileSync("content/characters.md", "utf8"), readFileSync("content/locations.md", "utf8"));
const puzzles = JSON.parse(readFileSync("content/puzzles.json", "utf8")) as { id: string; places: string[]; characters: string[] }[];
const placeIds = new Set(places.map((p) => p.id)), rosterIds = new Set(roster.map((r) => r.id));
for (const q of puzzles) {
  for (const id of q.places) if (!placeIds.has(id)) errors.push(`puzzle "${q.id}": unknown place "${id}"`);
  for (const id of q.characters) if (!rosterIds.has(id)) errors.push(`puzzle "${q.id}": unknown character "${id}"`);
}
if (errors.length) {
  console.error("\nroster/places checks failed:\n" + errors.map((e) => `  - ${e}`).join("\n") + "\n");
  process.exit(1);
}
mkdirSync("src/generated", { recursive: true });
writeFileSync("src/generated/roster.json", JSON.stringify(roster, null, 2) + "\n");
writeFileSync("src/generated/places.json", JSON.stringify(places, null, 2) + "\n");
const counted = roster.filter((r) => r.tier !== "folk").length;
console.log(`roster ok: ${counted} entries (+${roster.length - counted} folk), ${places.length} places`);
