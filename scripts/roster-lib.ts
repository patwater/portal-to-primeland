// Parses content/characters.md and content/locations.md into roster.json and places.json, and runs the
// checks from section 4.2 and 5.1 of the build brief. Pure functions, so tests can feed them bad input.

/** Patrick may change these after confirming a new total. */
export const ROSTER_COUNT = 38;
export const UNNUMBERED_PLACES = 4;
export const NUMBERED_PLACES = 17;

export type Tier = "traveler" | "keeper" | "citizen" | "folk";
export type RosterEntry = {
  id: string; tier: Tier; name: string; home?: string; letter?: string; badge: number | null; badgeNote?: string;
  look: string; background: string; says: string; hook: string; spriteId: string;
};
export type Place = { id: string; number: number | null; name: string; region: string; description: string; residents: string[] };

export const kebab = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
export const nthPrime = (n: number) => {
  let c = 0, k = 1;
  while (c < n) if (isPrime(++k)) c++;
  return k;
};

/** Canon sprites that stand in for a roster entry. Everyone else is drawn once as a roster sheet. */
export const CANON_SPRITES: Record<string, string> = {
  taylor: "tot-polka-dot",
  "scout-the-watchdog": "scout",
  "chris-and-steve": "scissors-chris-steve",
  "the-robo-seals": "robo-seal",
  brock: "brock",
};

/** Words that identify a roster entry inside place descriptions, beyond its full name. */
const RESIDENT_ALIASES: Record<string, string[]> = {
  "the-robo-seals": ["robo-seals", "Robo-Seals", "robo-seal"],
  "the-delivery-man": ["delivery man"],
  "the-platypuses": ["platypus", "platypuses"],
  "the-owl": ["owl"],
  "the-mouse": ["mouse"],
  "the-harbormaster": ["harbormaster"],
  "the-rangers": ["rangers"],
  "patch-the-webmaster": ["Patch"],
  "the-adding-machine": ["Adding Machine"],
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (w: string) => new RegExp(`(^|[^A-Za-z0-9-])${esc(w)}([^A-Za-z0-9-]|$)`);

function aliasesFor(e: Pick<RosterEntry, "id" | "name">): string[] {
  const out = new Set<string>([e.name, ...(RESIDENT_ALIASES[e.id] ?? [])]);
  if (e.name.startsWith("The ")) out.add(e.name.slice(4));
  const m = e.name.match(/^([A-Z][\w-]+) (the|of the) /);
  if (m) out.add(m[1]);
  return [...out];
}

const section = (md: string, heading: string): string => {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) throw new Error(`characters.md: missing section "## ${heading}"`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^## /.test(lines[i])) { end = i; break; }
  return lines.slice(start + 1, end).join("\n");
};

function parseBadge(raw: string): { badge: number | null; badgeNote?: string } {
  const t = raw.trim().replace(/\.$/, "");
  const m = t.match(/^(\d+)\b[^]*$/);
  if (m) return { badge: Number(m[1]), badgeNote: t.length > m[1].length ? t.slice(m[1].length).replace(/^[,\s]+/, "") : undefined };
  return { badge: null, badgeNote: t.replace(/^none[,.]?\s*/i, "") || undefined };
}

function parseProfiles(body: string, tier: Tier): RosterEntry[] {
  const out: RosterEntry[] = [];
  const parts = body.split(/^### /m).slice(1);
  for (const part of parts) {
    const [headingLine, ...rest] = part.split("\n");
    const name = headingLine.split(",")[0].trim();
    const text = rest.join("\n");
    const badgeLine = text.match(/\*\*Badge:\*\*\s*([^]*?)\s*\*\*Look:\*\*\s*([^\n]*)/);
    if (!badgeLine) throw new Error(`characters.md: "${name}" is missing its Badge/Look line`);
    const after = text.slice((badgeLine.index ?? 0) + badgeLine[0].length);
    const saysIdx = after.search(/\*\*Says:\*\*/);
    const hookIdx = after.search(/\*\*Story hook:\*\*/);
    if (saysIdx < 0 || hookIdx < 0) throw new Error(`characters.md: "${name}" is missing Says or Story hook`);
    const says = after.slice(saysIdx).match(/\*\*Says:\*\*\s*([^\n]*)/)![1].trim();
    const hook = after.slice(hookIdx).match(/\*\*Story hook:\*\*\s*([^]*?)(?:\n\n|$)/)![1].trim();
    const background = after.slice(0, saysIdx).trim();
    const id = kebab(name);
    out.push({ id, tier, name, ...parseBadge(badgeLine[1]), look: badgeLine[2].trim(), background, says, hook, spriteId: CANON_SPRITES[id] ?? id });
  }
  return out;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const tableRows = (body: string): string[][] =>
  body.split("\n").filter((l) => l.trim().startsWith("|")).map(cells).filter((r) => !r.every((c) => /^-+$/.test(c))).slice(1);

export function parseRoster(md: string): RosterEntry[] {
  const travelers = parseProfiles(section(md, "The travelers"), "traveler");
  const keepers = parseProfiles(section(md, "Keepers of Primeland"), "keeper");
  const citizens: RosterEntry[] = tableRows(section(md, "The A-to-Z citizens")).map((r) => {
    if (r.length !== 5) throw new Error(`characters.md: citizen row should have 5 columns: ${r.join(" | ")}`);
    const m = r[0].match(/^([A-Z])\s*·\s*(\d+)$/);
    if (!m) throw new Error(`characters.md: bad Badge cell "${r[0]}" (expected "A · 2")`);
    const id = kebab(r[1]);
    return { id, tier: "citizen", name: r[1], letter: m[1], badge: Number(m[2]), look: r[2], background: r[3], hook: r[3], says: r[4].replace(/^"|"$/g, ""), spriteId: CANON_SPRITES[id] ?? id };
  });
  const folk: RosterEntry[] = tableRows(section(md, "Folk without badges")).map((r) => {
    if (r.length !== 5) throw new Error(`characters.md: folk row should have 5 columns: ${r.join(" | ")}`);
    const id = kebab(r[0]);
    return { id, tier: "folk", name: r[0], home: r[1], badge: null, badgeNote: r[3], look: r[2], background: r[3], hook: "", says: r[4], spriteId: CANON_SPRITES[id] ?? id };
  });
  return [...travelers, ...keepers, ...citizens, ...folk];
}

export function parsePlaces(md: string, roster: RosterEntry[]): Place[] {
  const places: Place[] = [];
  let region = "";
  const chunks = md.split(/^(?=#{2,3} )/m);
  for (const chunk of chunks) {
    const [head, ...rest] = chunk.split("\n");
    if (/^## /.test(head)) { region = head.replace(/^## /, "").trim(); continue; }
    const m = head.match(/^### (?:(\d+)\.\s+)?(.+)$/);
    if (!m) continue;
    const description = rest.join("\n").replace(/\n---\s*$/m, "").trim();
    const name = m[2].trim();
    places.push({ id: kebab(name), number: m[1] ? Number(m[1]) : null, name, region, description, residents: [] });
  }
  for (const p of places) {
    p.residents = roster
      .filter((e) => e.tier !== "traveler")
      .filter((e) => aliasesFor(e).some((a) => wordRe(a).test(p.description)))
      .map((e) => e.id);
  }
  return places;
}

/** First place whose name appears in `text`, by position in the text. */
function firstPlaceIn(text: string, places: Place[]): Place | undefined {
  let best: { at: number; p: Place } | undefined;
  for (const p of places) {
    const at = text.toLowerCase().indexOf(p.name.toLowerCase().replace(/^the /, ""));
    if (at >= 0 && (!best || at < best.at)) best = { at, p };
  }
  return best?.p;
}

/** Fill each citizen's and folk's `home` with a place id: the place their own text names, else one that lists them. */
export function assignHomes(roster: RosterEntry[], places: Place[]) {
  for (const e of roster) {
    if (e.tier !== "citizen" && e.tier !== "folk") continue;
    const named = firstPlaceIn(e.tier === "folk" ? (e.home ?? "") : e.background, places);
    const listed = places.find((p) => p.residents.includes(e.id));
    const hit = named ?? listed;
    if (hit) e.home = hit.id;
    else if (e.tier === "citizen") delete e.home;
  }
}

export function checkRoster(roster: RosterEntry[], places: Place[]): string[] {
  const errors: string[] = [];
  const counted = roster.filter((e) => e.tier !== "folk");
  if (counted.length !== ROSTER_COUNT) errors.push(`expected ${ROSTER_COUNT} roster entries (not counting folk), found ${counted.length}`);

  const ids = new Set<string>();
  for (const e of roster) { if (ids.has(e.id)) errors.push(`duplicate id "${e.id}"`); ids.add(e.id); }

  const citizens = roster.filter((e) => e.tier === "citizen");
  for (const c of citizens) if (c.badge == null || !isPrime(c.badge)) errors.push(`${c.name}: badge ${c.badge} is not prime`);

  const seen = new Map<number, string>();
  for (const e of roster) {
    if (e.badge == null) continue;
    if (seen.has(e.badge)) errors.push(`${e.name} and ${seen.get(e.badge)} share badge ${e.badge}`);
    seen.set(e.badge, e.name);
  }

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i), want = nthPrime(i + 1);
    if (!citizens.some((c) => c.letter === letter && c.badge === want)) errors.push(`letter ${letter} has no citizen with badge ${want}`);
  }

  const second = ["Qubit", "Rate", "Sal", "True", "Total"];
  const wantSecond: number[] = [];
  for (let n = 102; wantSecond.length < second.length; n++) if (isPrime(n)) wantSecond.push(n);
  second.forEach((name, i) => {
    const c = citizens.find((x) => x.name === name);
    if (!c) errors.push(`second-column citizen "${name}" not found`);
    else if (c.badge !== wantSecond[i]) errors.push(`${name} should wear ${wantSecond[i]} but wears ${c.badge}`);
  });

  for (const f of roster.filter((e) => e.tier === "folk")) {
    if (f.badge != null) errors.push(`folk "${f.name}" must not have a badge`);
    const where = places.filter((p) => (f.home ?? "").toLowerCase().includes(p.name.toLowerCase().replace(/^the /, "")));
    if (!where.length) errors.push(`folk "${f.name}": "${f.home}" matches no place in locations.md`);
  }
  for (const e of roster) if (e.tier === "citizen" && e.home && !places.some((p) => p.id === e.home)) errors.push(`${e.name}: home "${e.home}" is not a place`);

  const unnumbered = places.filter((p) => p.number == null).length;
  const numbered = places.filter((p) => p.number != null).length;
  if (unnumbered !== UNNUMBERED_PLACES || numbered !== NUMBERED_PLACES)
    errors.push(`expected ${UNNUMBERED_PLACES} unnumbered and ${NUMBERED_PLACES} numbered places, found ${unnumbered} and ${numbered}`);
  const nums = places.filter((p) => p.number != null).map((p) => p.number).sort((a, b) => a! - b!);
  nums.forEach((n, i) => { if (n !== i + 1) errors.push(`numbered places skip or repeat around ${n}`); });
  return errors;
}

export function buildAll(charactersMd: string, locationsMd: string) {
  const roster = parseRoster(charactersMd);
  const places = parsePlaces(locationsMd, roster);
  // folk keep the "Where" text until homes are resolved for the check
  const folkWhere = new Map(roster.filter((e) => e.tier === "folk").map((e) => [e.id, e.home]));
  const rosterForCheck = roster.map((e) => ({ ...e }));
  const errors = checkRoster(rosterForCheck, places);
  assignHomes(roster, places);
  for (const e of roster) if (e.tier === "folk" && !e.home) e.home = folkWhere.get(e.id);
  return { roster, places, errors };
}
