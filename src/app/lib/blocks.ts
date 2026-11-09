export type Blocks = {
  name: string; nickname: string; pronouns: "she" | "he" | "they"; age: number; look: string; shout: string; count: string;
  loves: [string, string, string]; giggle: string;
  companion: "scout" | "cat" | "robot" | "real" | "none"; petName: string; petKind: string; petDetail: string;
  arrival: "hill" | "porch" | "grandma" | "park" | "custom"; arrivalCustom: string; brock: boolean; thingamajig: string;
  places: string[]; keepers: string[]; citizens: string[]; surprise: boolean; density: "few" | "some" | "lots";
  puzzle: string; n2: string; mood: "calm" | "giggly" | "adventure"; rhyme: "none" | "sprinkles" | "lots";
  math: "shapes" | "primes" | "sieves"; length: 6 | 10 | 14; ending: "dinner" | "souvenir" | "cliffhanger";
  title: string; dedication: string; byline: string; paper: "lined" | "dots" | "grid";
  avoid: string; realLife: string;
};

export const defaultBlocks: Blocks = {
  name: "", nickname: "", pronouns: "she", age: 4, look: "", shout: "", count: "",
  loves: ["", "", ""], giggle: "",
  companion: "scout", petName: "", petKind: "", petDetail: "",
  arrival: "hill", arrivalCustom: "", brock: true, thingamajig: "the thingamajig",
  places: [], keepers: ["chris-and-steve"], citizens: [], surprise: true, density: "some",
  puzzle: "what-is-4", n2: "story", mood: "calm", rhyme: "sprinkles", math: "primes", length: 10, ending: "dinner",
  title: "A Portal to Primeland", dedication: "", byline: "", paper: "lined",
  avoid: "", realLife: "",
};

// Strip control characters and cap length (200 for most fields, 400 for the grown-up notes).
export function clean(v: string, max = 200): string {
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max);
}

import puzzles from "../../../content/puzzles.json";
export const puzzleOptions = (puzzles as { id: string; name: string }[]).map(({ id, name }) => ({ id, name }));

export const n2Options = [
  { id: "story", name: "Let the story decide", teaser: "" },
  { id: "qubit", name: "Qubit", teaser: "A spinning top that is yes and no, until somebody looks." },
  { id: "platypuses", name: "The platypuses", teaser: "Duck bills and beaver tails that fit no box at all." },
  { id: "one", name: "The number 1", teaser: "Not prime, not the other thing, and standing outside the gate." },
  { id: "traveler", name: "The traveler herself", teaser: "The one with no number, who answered “Gray!”" },
];
