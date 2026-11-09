// Sense checks the schema can't make: ids that exist, badges that are prime and unused, the right page count,
// borrowed names, house style, and the family's own "avoid" list.
import { isPrime } from "../../scripts/roster-lib";
import type { Interview, Story, FamilyBlocks } from "./schemas";
import { roster, places } from "./world";

export const DENYLIST = ["milo", "tock", "doldrums", "dodecahedron", "mathemagician", "digitopolis", "dictionopolis", "humbug"];

/** Words per page by the kid's age (soul, Part II), with room either side so a good page is never retried for a word. */
export function wordBudget(age: number): { min: number; max: number } {
  const [min, max] = age <= 4 ? [35, 70] : age <= 6 ? [60, 110] : [90, 150];
  return { min: Math.floor(min * 0.7), max: Math.ceil(max * 1.25) };
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const re = (w: string) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`, "i");

/** Short phrases from the parent's "avoid" note, split on commas, semicolons and "and". */
export function avoidTerms(avoid: string): string[] {
  return avoid.split(/[,;\n]| and /i).map((t) => t.trim().toLowerCase().replace(/[.!?]+$/, "")).filter((t) => t.length >= 3 && t.split(/\s+/).length <= 3);
}

export function storyText(story: Story): string {
  return [story.title, story.dedication, story.byline, story.n2Resolution, ...story.cast.map((c) => `${c.name} ${c.look}`),
    ...story.pages.flatMap((p) => [p.text, p.kidPrompt ?? "", p.marginNote ?? "", p.art.brief])].join("\n");
}

export function checkStory(story: Story, blocks: FamilyBlocks): string[] {
  const errors: string[] = [];
  if (story.pages.length !== blocks.length) errors.push(`expected exactly ${blocks.length} pages, got ${story.pages.length}`);
  story.pages.forEach((p, i) => { if (p.n !== i + 1) errors.push(`page ${i + 1} has n=${p.n}`); });
  const pageIds = new Set<string>();
  for (const p of story.pages) { if (pageIds.has(p.id)) errors.push(`duplicate page id ${p.id}`); pageIds.add(p.id); }

  const rosterById = new Map(roster.map((r) => [r.id, r]));
  const used = new Set(roster.map((r) => r.badge).filter((b): b is number => b != null));
  const maxBadge = Math.max(...used);
  const castIds = new Set<string>();
  const customBadges = new Set<number>();
  for (const c of story.cast) {
    if (castIds.has(c.id) || (c.custom && rosterById.has(c.id))) errors.push(`cast id "${c.id}" repeats or collides with the roster`);
    castIds.add(c.id);
    if (!c.custom && !rosterById.has(c.id)) errors.push(`cast member "${c.id}" is not custom but is not in the roster`);
    if (c.custom && c.tier === "citizen") {
      if (c.badge == null || !isPrime(c.badge)) errors.push(`custom citizen ${c.name} needs a prime badge`);
      else if (c.badge <= maxBadge || used.has(c.badge) || customBadges.has(c.badge)) errors.push(`custom citizen ${c.name}: badge ${c.badge} is already taken or not the next unused prime`);
      else customBadges.add(c.badge);
    }
    if ((c.tier === "traveler" || c.tier === "folk" || c.tier === "keeper") && c.badge != null) errors.push(`${c.name} (${c.tier}) must not have a badge`);
  }

  const placeIds = new Set(places.map((p) => p.id));
  for (const p of story.pages) {
    if (!placeIds.has(p.place)) errors.push(`page ${p.n}: unknown place "${p.place}"`);
    for (const c of p.characters) if (!rosterById.has(c) && !castIds.has(c)) errors.push(`page ${p.n}: unknown character "${c}"`);
  }
  const marginNotes = story.pages.filter((p) => p.marginNote).length;
  if (marginNotes > 3) errors.push(`${marginNotes} margin notes (the limit is 3)`);

  const present = new Set(story.pages.flatMap((p) => p.characters));
  for (const k of blocks.keepers) if (rosterById.has(k) && !present.has(k)) errors.push(`chosen keeper "${k}" never appears`);

  const { min, max } = wordBudget(blocks.age);
  for (const p of story.pages) {
    const n = words(p.text);
    if (n < min || n > max) errors.push(`page ${p.n}: ${n} words (aim for ${min}-${max} for age ${blocks.age})`);
  }

  const all = storyText(story);
  const scrubbed = all.replace(/nodebug humbug/gi, "");
  for (const w of DENYLIST) if (re(w).test(scrubbed)) errors.push(`borrowed name "${w}"`);
  if (/—/.test(all)) errors.push("contains an em dash; use commas, colons or a new sentence");
  if ((all.match(/quizzical/gi) ?? []).length > 1) errors.push("\"quizzical\" used more than once");
  if ((all.match(/lo and behold/gi) ?? []).length > 1) errors.push("\"lo and behold\" used more than once");
  if ((all.match(/\.\.\./g) ?? []).length > 3) errors.push("more than three ellipsis reveals");
  if (re("taylor").test(all) && !/taylor/i.test(blocks.name)) errors.push("Taylor leaked in from the worked example");
  if (re("scout").test(all) && blocks.companion !== "scout") errors.push("Scout leaked in from the worked example");
  if (!blocks.brock && re("brock").test(all)) errors.push("the Brock prologue was off, but Brock appears");

  const lower = all.toLowerCase();
  for (const t of avoidTerms(blocks.avoid)) {
    const stem = t.replace(/(ies|es|s)$/, (m) => (m === "ies" ? "y" : "")); // "spiders" also catches "spider"
    if (lower.includes(t) || (stem.length >= 4 && lower.includes(stem))) errors.push(`the family asked to avoid "${t}"`);
  }
  return errors;
}

export function checkInterview(iv: Interview): string[] {
  const errors: string[] = [];
  const kid = iv.questions.filter((q) => q.askKid).length;
  if (kid < 1 || kid > 2) errors.push("mark one or two questions askKid");
  for (const q of iv.questions) {
    if (q.text.split(/\s+/).length > 22) errors.push(`question "${q.id}" is longer than 20 words`);
    if (/last name|surname|home address|street address|photo|diagnos|medical|health/i.test(q.text)) errors.push(`question "${q.id}" asks for something private`);
    if (q.kind !== "text" && (q.options.length < 3 || q.options.length > 5)) errors.push(`question "${q.id}" needs three to five options`);
  }
  if (new Set(iv.questions.map((q) => q.id)).size !== iv.questions.length) errors.push("question ids repeat");
  return errors;
}
