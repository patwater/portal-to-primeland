// Renders the family's blocks as story material for the user message. This is the only place family
// input enters a prompt, and it never goes in a system block.
import puzzles from "../../../content/puzzles.json";
import { roster, places } from "../world";
import { wordBudget } from "../checks";
import type { Answers, FamilyBlocks } from "../schemas";

type Puzzle = { id: string; name: string; setup: string; truth: string; kidFriendlyResolutions: string[] };

const N2: Record<string, string> = {
  story: "Let the story choose one of the four candidates in Part VII.",
  qubit: "Qubit, the spinning top who is yes and no until someone looks.",
  platypuses: "The platypuses, who fit no box and cannot be stamped.",
  one: "The number 1, neither prime nor composite.",
  traveler: "The traveler, the one with no number who answered the scissors with a count all their own.",
};
const COMPANION: Record<string, string> = {
  scout: "Scout the Watchdog, a nervous dog tangled in a smartwatch that translates his barks.",
  cat: "A curious cat, who picks up a gadget in the portal in Scout's spirit.",
  robot: "A pocket robot, who picks up a gadget in the portal in Scout's spirit.",
  none: "No companion.",
};
const ARRIVAL: Record<string, string> = {
  hill: "the long and lonesome hill", porch: "the family's front porch", grandma: "grandma's house", park: "the park",
};
const ENDING: Record<string, string> = {
  dinner: "home in time for dinner", souvenir: "back through the box with a souvenir", cliffhanger: "a cliffhanger that sets up the next chapter",
};

export const puzzleFor = (id: string): Puzzle => (puzzles as Puzzle[]).find((p) => p.id === id) ?? (puzzles as Puzzle[])[0];
const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? id;
const placeOf = (id: string) => places.find((p) => p.id === id)?.name ?? id;
const line = (k: string, v: string | undefined) => (v && v.trim() ? `${k}: ${v.trim()}` : "");

export function familyInput(b: FamilyBlocks): string {
  const companion = b.companion === "real"
    ? `The family's real pet, ${[b.petName, b.petKind, b.petDetail].filter(Boolean).join(", ") || "unnamed"}. It picks up a gadget in the portal in Scout's spirit.`
    : COMPANION[b.companion];
  const arrival = b.arrival === "custom" ? b.arrivalCustom || "somewhere of the family's choosing" : ARRIVAL[b.arrival];
  const lines = [
    line("Traveler's name", b.name), line("Nickname used in dialogue", b.nickname), `Age: ${b.age}`,
    line("Looks like", b.look), line("Shouts when excited", b.shout), line("Answer to \"What's your count?\"", b.count),
    line("Loves right now", b.loves.filter(Boolean).join("; ")), line("Giggles at", b.giggle),
    `Companion: ${companion}`, `The box shows up at: ${arrival}`,
    b.brock ? `Include the Brock prologue. Brock's toy is called: ${b.thingamajig || "the thingamajig"}.` : "No Brock prologue: start with the traveler finding the box.",
    line("Places to visit (besides the landing and the Scissor Gate, which every edition passes through)", b.places.map(placeOf).join("; ")),
    line("Keepers to meet", b.keepers.map(nameOf).join("; ")), line("Citizens to meet", b.citizens.map(nameOf).join("; ")),
    b.surprise ? `Fill the background with a ${b.density === "few" ? "few" : b.density === "lots" ? "lot of" : "handful of"} extra citizens suited to the places.` : "No extra background citizens.",
    `Resolve the blip in N2 with: ${N2[b.n2] ?? N2.story}`,
    `Mood: ${b.mood}`, `Rhyme: ${b.rhyme}`, `Math depth: ${b.math}`, `Ending: ${ENDING[b.ending]}`,
    line("Title", b.title), line("Dedication (use as written if given)", b.dedication), line("Byline (use as written if given)", b.byline),
    line("Anything to avoid, absolutely", b.avoid), line("Something from real life to weave in sideways", b.realLife),
  ].filter(Boolean);
  return `<family_input>\n${lines.join("\n")}\n</family_input>`;
}

export function answersInput(a: Answers): string {
  if (!a.length) return "";
  return `<answers>\n${a.map((x) => `${x.id}${x.askKid ? " (the kid answered)" : ""}: ${x.text}`).join("\n")}\n</answers>`;
}

export function storytellerUser(b: FamilyBlocks, a: Answers): string {
  const p = puzzleFor(b.puzzle);
  const { min, max } = wordBudget(b.age);
  const ideal = b.age <= 4 ? "35 to 70" : b.age <= 6 ? "60 to 110" : "90 to 150";
  return [
    `<puzzle>\nName: ${p.name}\nSetup: ${p.setup}\nTruth: ${p.truth}\nKid-friendly resolutions: ${p.kidFriendlyResolutions.join(" / ")}\n</puzzle>`,
    familyInput(b), answersInput(a),
    `<shape>\nPronouns: none given, so refer to the traveler by name, nickname, or "the tot" and write around he and she.\nPages: exactly ${b.length}, numbered 1 to ${b.length}. Words per page: ${ideal} (never fewer than ${min} or more than ${max}).\n</shape>`,
  ].filter(Boolean).join("\n\n");
}

export function interviewerUser(b: FamilyBlocks): string {
  return familyInput(b);
}
