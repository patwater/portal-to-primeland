import { assemble } from "./assemble";
import { storytellerUser } from "./family";
import { callClaude, FriendlyError, TANGLED, type ClaudeEnv } from "../claude";
import { checkStory } from "../checks";
import { storyJsonSchema, storySchema, type Answers, type FamilyBlocks, type Story } from "../schemas";

export type StoryEnv = ClaudeEnv & { MODEL_STORY?: string };

/** Writes the edition, runs the sense checks, and retries once with the specific errors (brief 9.3). */
export async function generateStory(env: StoryEnv, blocks: FamilyBlocks, answers: Answers, fetchImpl?: typeof fetch): Promise<Story> {
  const system = assemble("storyteller");
  const base = storytellerUser(blocks, answers);
  let user = base;
  let lastErrors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callClaude({ env, route: attempt ? "story-retry" : "story", model: env.MODEL_STORY ?? "claude-sonnet-5-5", system, user, schema: storyJsonSchema, maxTokens: 8000, timeoutMs: 120_000, fetchImpl });
    const parsed = storySchema.safeParse(raw);
    lastErrors = parsed.success ? checkStory(parsed.data, blocks) : parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`);
    if (parsed.success && !lastErrors.length) return parsed.data;
    user = `${base}\n\n<fix>Your last draft was rejected for these reasons. Write the whole book again and fix every one of them:\n${lastErrors.map((e) => `- ${e}`).join("\n")}\n</fix>`;
  }
  console.log(JSON.stringify({ route: "story", rejected: lastErrors.length }));
  throw new FriendlyError(502, TANGLED, `story failed checks: ${lastErrors.length}`);
}
