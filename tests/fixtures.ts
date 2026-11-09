import type { FamilyBlocks, Interview, Story } from "../src/worker/schemas";
import { blocksSchema } from "../src/worker/schemas";

export const blocks = (over: Record<string, unknown> = {}): FamilyBlocks =>
  blocksSchema.parse({ name: "Zzyzx", age: 4, companion: "cat", keepers: ["snip-and-snap"], brock: true, length: 10, ...over });

const PLACES = ["the-long-and-lonesome-hill", "the-long-and-lonesome-hill", "the-bubble-wrap-landing", "the-scissor-gate", "the-data-lake",
  "the-data-lake", "the-scissor-gate", "terminus", "qubit-quay", "the-long-and-lonesome-hill"];

const WORDS = "A small kid ran up the hill and found a big blue box with a flap that wobbled in the wind, so everyone gathered round to peek inside and giggle, and then the cat sneezed twice, which made the whole box rattle like a drum on a very busy afternoon.";

export function story(n = 10, over: Partial<Story> = {}): Story {
  return {
    title: "A Portal to Primeland", dedication: "For Zzyzx, who knows a box is a door.", byline: "by a grown-up & Zzyzx", n2Resolution: "qubit",
    cast: [
      { id: "zzyzx", name: "Zzyzx", tier: "traveler", badge: null, look: "round-headed kid", custom: true },
      { id: "biscuit", name: "Biscuit the cat", tier: "traveler", badge: null, look: "a cat with a bell", custom: true },
    ],
    pages: Array.from({ length: n }, (_, i) => ({
      id: `p${i + 1}`, n: i + 1, text: WORDS, place: PLACES[i % PLACES.length],
      characters: i === 3 ? ["zzyzx", "biscuit", "snip-and-snap"] : ["zzyzx", "biscuit"],
      art: { brief: "The kid and the cat by the box." },
    })),
    ...over,
  };
}

export const interview = (over: Partial<Interview> = {}): Interview => ({
  questions: [
    { id: "box", text: "What does your kid do when they find a box?", why: "Boxes are my specialty.", askKid: false, kind: "single", options: ["Climbs in", "Peeks", "Wears it"] },
    { id: "kid", text: "What would YOU say to a spider with eight metal legs?", why: "Patch is very friendly.", askKid: true, kind: "single", options: ["Hi!", "Wow", "Hello legs"] },
    { id: "extra", text: "Anything else the scissors should know?", why: "They love details.", askKid: false, kind: "text", options: [] },
  ],
  ...over,
});

/** In-memory KV that behaves like Workers KV for the calls the Worker makes. */
export function memoryKV() {
  const m = new Map<string, string>();
  return {
    store: m,
    async get(k: string, type?: string) { const v = m.get(k); return v == null ? null : type === "json" ? JSON.parse(v) : v; },
    async put(k: string, v: string) { m.set(k, v); },
    async delete(k: string) { m.delete(k); },
    async list({ prefix = "" }: { prefix?: string } = {}) { return { keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true, cursor: "" }; },
  } as unknown as KVNamespace & { store: Map<string, string> };
}

export const anthropicReply = (payload: unknown, usage: Record<string, number> = {}) =>
  new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(payload) }], stop_reason: "end_turn", usage }), { status: 200 });
