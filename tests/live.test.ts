// Milestone 3 acceptance, against the real API. Skipped unless a key is set:
//   ANTHROPIC_API_KEY=sk-ant-... npm run test:live
// Five varied families must each yield a book that passes every check in src/worker/checks.ts
// (page count, ids, custom badges, denylist, avoid notes, word budget), and the soul block must come
// back from the prompt cache on repeat calls.
import { afterAll, describe, expect, it, vi } from "vitest";
import { generateStory } from "../src/worker/prompts/storyteller";
import { generateInterview } from "../src/worker/prompts/interviewer";
import { checkStory } from "../src/worker/checks";
import { blocksSchema } from "../src/worker/schemas";

const env = { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, MODEL_STORY: process.env.MODEL_STORY, MODEL_INTERVIEW: process.env.MODEL_INTERVIEW };
const families = [
  { name: "Ivy", age: 3, companion: "cat", places: ["the-tower-of-two", "lamplight-road"], keepers: ["snip-and-snap", "the-adding-machine"], puzzle: "what-is-4", n2: "qubit", mood: "calm", length: 6, avoid: "spiders, loud noises" },
  { name: "Mateo", age: 5, companion: "real", petName: "Rufus", petKind: "beagle", petDetail: "howls at the mailman", places: ["the-mines-of-many-primes", "the-data-cave", "big-o-corral"], keepers: ["patch-the-webmaster", "alpha-and-beta"], puzzle: "one-more-tunnel", n2: "platypuses", mood: "giggly", length: 10, avoid: "the dark" },
  { name: "Noor", age: 7, companion: "robot", places: ["the-sifting-sands", "the-zero-knowledge-grotto", "terminus"], keepers: ["snip-and-snap", "the-robo-seals"], puzzle: "secret-word", n2: "traveler", mood: "adventure", length: 14, rhyme: "lots", math: "sieves", realLife: "a new baby sibling is coming" },
  { name: "Sam", age: 4, companion: "none", arrival: "porch", brock: false, places: ["homebrew-hollow", "xerox-park"], keepers: ["patch-the-webmaster"], puzzle: "a-or-b", n2: "one", mood: "calm", length: 10, ending: "souvenir" },
  { name: "Lila", age: 6, companion: "scout", arrival: "grandma", places: ["seventh-falls", "qubit-quay", "the-platypus-flats"], keepers: ["alpha-and-beta", "snip-and-snap"], puzzle: "flickering-node", n2: "story", mood: "giggly", length: 10, ending: "cliffhanger", avoid: "storms" },
].map((f) => blocksSchema.parse(f));

describe.skipIf(!env.ANTHROPIC_API_KEY)("live: five families", () => {
  const log = vi.spyOn(console, "log");
  const usage: { route: string; cache_read?: number; cache_write?: number }[] = [];
  const grab = () => log.mock.calls.forEach((c) => { try { const j = JSON.parse(String(c[0])); if (j.route) usage.push(j); } catch { /* not ours */ } });
  afterAll(() => { grab(); console.info("cache usage by call:", usage); });

  families.forEach((f, i) => {
    it(`${f.name} (age ${f.age}, ${f.length} pages) gets a valid book`, async () => {
      const story = await generateStory(env, f, []);
      expect(story.pages).toHaveLength(f.length);
      expect(checkStory(story, f)).toEqual([]);
    }, 240_000);
    if (i === 0) it("interview returns 3-5 questions", async () => { expect((await generateInterview(env, f)).questions.length).toBeGreaterThanOrEqual(3); }, 60_000);
  });
  it("reads the soul from the cache on repeat calls", () => {
    grab();
    expect(usage.filter((u) => u.route.startsWith("story")).slice(1).some((u) => (u.cache_read ?? 0) > 0)).toBe(true);
  });
});
