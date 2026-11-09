export type Blocks = {
  name: string; nickname: string; pronouns: "she" | "he" | "they"; age: number; look: string; shout: string; count: string;
  loves: [string, string, string]; giggle: string;
  companion: "scout" | "cat" | "robot" | "real" | "none"; petName: string; petKind: string; petDetail: string;
  arrival: "hill" | "porch" | "grandma" | "park" | "custom"; arrivalCustom: string; brock: boolean; thingamajig: string;
  places: string[]; keepers: string[]; surprise: boolean; density: "few" | "some" | "lots";
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
  places: [], keepers: ["chris-and-steve"], surprise: true, density: "some",
  puzzle: "what-is-4", n2: "story", mood: "calm", rhyme: "sprinkles", math: "primes", length: 10, ending: "dinner",
  title: "A Portal to Primeland", dedication: "", byline: "", paper: "lined",
  avoid: "", realLife: "",
};

// Strip control characters and cap length (200 for most fields, 400 for the grown-up notes).
export function clean(v: string, max = 200): string {
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max);
}

/** Placeholder place list for M1. M2 replaces this with src/generated/places.json parsed from content/locations.md. */
export const placeOptions: { id: string; name: string; region: string }[] = [
  { id: "tower-of-two", name: "The Tower of Two", region: "The Heart" },
  { id: "protocol-plaza", name: "Protocol Plaza", region: "The Heart" },
  { id: "lamplight-road", name: "Lamplight Road", region: "The Heart" },
  { id: "mines-of-many-primes", name: "The Mines of Many Primes", region: "Underground" },
  { id: "data-cave", name: "The Data Cave", region: "Underground" },
  { id: "seventh-falls", name: "Seventh Falls", region: "The Waters" },
  { id: "qubit-quay", name: "Qubit Quay", region: "The Waters" },
  { id: "platypus-flats", name: "The Platypus Flats", region: "The Waters" },
  { id: "alphabet-bazaar", name: "The Alphabet Bazaar", region: "The Market" },
  { id: "homebrew-hollow", name: "Homebrew Hollow", region: "The Market" },
  { id: "xerox-park", name: "Xerox Park", region: "The Market" },
  { id: "sifting-sands", name: "The Sifting Sands", region: "The Edges" },
  { id: "remainder-row", name: "Remainder Row", region: "The Edges" },
  { id: "zero-knowledge-grotto", name: "The Zero Knowledge Grotto", region: "The Edges" },
  { id: "big-o-corral", name: "Big O Corral", region: "The Edges" },
  { id: "electronic-frontier", name: "The Electronic Frontier", region: "The Edges" },
  { id: "terminus", name: "Terminus", region: "The Edges" },
];

export const keeperOptions = [
  { id: "adding-machine", name: "The Adding Machine", says: "Ka-chunk! And one more makes..." },
  { id: "alpha-and-beta", name: "Alpha and Beta", says: "A or B?" },
  { id: "chris-and-steve", name: "Chris and Steve", says: "What's your count?" },
  { id: "patch", name: "Patch the Webmaster", says: "It's a very sophisticated system." },
  { id: "robo-seals", name: "The Robo-Seals", says: "Ork ork, approved!" },
];

export const puzzleOptions = [
  { id: "what-is-4", name: "What is 4?" },
  { id: "flickering-node", name: "The flickering node" },
  { id: "a-or-b", name: "A or B?" },
  { id: "the-sieve", name: "The Great Sieve" },
  { id: "one-more-tunnel", name: "One more tunnel" },
  { id: "twin-cottages", name: "Do the twins go on forever?" },
  { id: "secret-word", name: "The secret word" },
  { id: "least-common-landing", name: "Where do we meet?" },
  { id: "connect-the-dots", name: "Connect the dots" },
  { id: "rules-in-chalk", name: "The rule about rules" },
];

export const n2Options = [
  { id: "story", name: "Let the story decide", teaser: "" },
  { id: "qubit", name: "Qubit", teaser: "A spinning top that is yes and no, until somebody looks." },
  { id: "platypuses", name: "The platypuses", teaser: "Duck bills and beaver tails that fit no box at all." },
  { id: "one", name: "The number 1", teaser: "Not prime, not the other thing, and standing outside the gate." },
  { id: "traveler", name: "The traveler herself", teaser: "The one with no number, who answered “Gray!”" },
];
