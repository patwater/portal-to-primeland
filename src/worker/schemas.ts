import { z } from "zod";

const clean = (max: number) =>
  z.string().transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max));
const t200 = clean(200).default("");
const t400 = clean(400).default("");

/** The family's blocks as the client sends them. Every free-text field is capped and stripped of control characters. */
export const blocksSchema = z.object({
  name: clean(60).refine((s) => s.length > 0, "name is required"),
  nickname: t200, pronouns: z.enum(["she", "he", "they"]).default("they"),
  age: z.number().int().min(2).max(8).default(4),
  look: t200, shout: t200, count: t200,
  loves: z.array(t200).max(3).default([]), giggle: t200,
  companion: z.enum(["scout", "cat", "robot", "real", "none"]).default("scout"),
  petName: t200, petKind: t200, petDetail: t200,
  arrival: z.enum(["hill", "porch", "grandma", "park", "custom"]).default("hill"), arrivalCustom: t200,
  brock: z.boolean().default(true), thingamajig: t200.default("the thingamajig"),
  places: z.array(z.string().max(80)).max(4).default([]),
  keepers: z.array(z.string().max(80)).max(3).default([]),
  citizens: z.array(z.string().max(80)).max(40).default([]),
  surprise: z.boolean().default(true), density: z.enum(["few", "some", "lots"]).default("some"),
  puzzle: z.string().max(60).default("what-is-4"), n2: z.string().max(20).default("story"),
  mood: z.enum(["calm", "giggly", "adventure"]).default("calm"),
  rhyme: z.enum(["none", "sprinkles", "lots"]).default("sprinkles"),
  math: z.enum(["shapes", "primes", "sieves"]).default("primes"),
  length: z.union([z.literal(6), z.literal(10), z.literal(14)]).default(10),
  ending: z.enum(["dinner", "souvenir", "cliffhanger"]).default("dinner"),
  title: clean(100).default("A Portal to Primeland"), dedication: t200, byline: t200,
  paper: z.enum(["lined", "dots", "grid"]).default("lined"),
  avoid: t400, realLife: t400,
});
export type FamilyBlocks = z.infer<typeof blocksSchema>;

export const answerSchema = z.object({ id: z.string().max(40), text: clean(200), askKid: z.boolean().optional() });
export const answersSchema = z.array(answerSchema).max(6).default([]);
export type Answers = z.infer<typeof answersSchema>;

// ---- Interviewer ----
export const interviewSchema = z.object({
  questions: z.array(z.object({
    id: z.string(), text: z.string().max(200), why: z.string().max(240), askKid: z.boolean(),
    kind: z.enum(["single", "multi", "text"]), options: z.array(z.string().max(80)).max(6),
  })).min(3).max(5),
});
export type Interview = z.infer<typeof interviewSchema>;

// ---- Storyteller ----
export const castMemberSchema = z.object({
  id: z.string(), name: z.string(), tier: z.enum(["traveler", "keeper", "citizen", "folk"]),
  badge: z.number().int().nullable(), look: z.string(), custom: z.boolean(),
});
export const storySchema = z.object({
  title: z.string().max(120), dedication: z.string().max(300), byline: z.string().max(120), n2Resolution: z.string().max(300),
  cast: z.array(castMemberSchema).max(20),
  pages: z.array(z.object({
    id: z.string(), n: z.number().int(), text: z.string().max(1400), place: z.string(), characters: z.array(z.string()).max(8),
    kidPrompt: z.string().max(240).optional(), marginNote: z.string().max(240).optional(),
    art: z.object({ brief: z.string().max(500) }),
  })).min(6).max(14),
});
export type Story = z.infer<typeof storySchema>;

/** JSON Schemas for structured outputs. Shape only; checks.ts and zod enforce sense. */
const s = { type: "string" }, b = { type: "boolean" }, i = { type: "integer" };
const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", properties, required, additionalProperties: false });
export const interviewJsonSchema = obj({
  questions: { type: "array", items: obj({ id: s, text: s, why: s, askKid: b, kind: { type: "string", enum: ["single", "multi", "text"] }, options: { type: "array", items: s } }, ["id", "text", "why", "askKid", "kind", "options"]) },
}, ["questions"]);
export const storyJsonSchema = obj({
  title: s, dedication: s, byline: s, n2Resolution: s,
  cast: { type: "array", items: obj({ id: s, name: s, tier: { type: "string", enum: ["traveler", "keeper", "citizen", "folk"] }, badge: { type: ["integer", "null"] }, look: s, custom: b }, ["id", "name", "tier", "badge", "look", "custom"]) },
  pages: { type: "array", items: obj({ id: s, n: i, text: s, place: s, characters: { type: "array", items: s }, kidPrompt: s, marginNote: s, art: obj({ brief: s }, ["brief"]) }, ["id", "n", "text", "place", "characters", "art"]) },
}, ["title", "dedication", "byline", "n2Resolution", "cast", "pages"]);

// ---- Stored book ----
export const bookSchema = z.object({
  id: z.string(), status: z.enum(["drawing", "ready"]), version: z.number().int(),
  soulVersion: z.object({ commit: z.string(), soul: z.string() }),
  createdAt: z.string(), kidName: z.string(), paper: z.enum(["lined", "dots", "grid"]),
  title: z.string(), dedication: z.string(), byline: z.string(), n2Resolution: z.string(),
  cast: z.array(castMemberSchema),
  pages: z.array(storySchema.shape.pages.element.extend({ locked: z.boolean().optional() })),
});
export type StoredBook = z.infer<typeof bookSchema>;
