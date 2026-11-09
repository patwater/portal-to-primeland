import { assemble } from "./assemble";
import { interviewerUser } from "./family";
import { callClaude, FriendlyError, TANGLED, type ClaudeEnv } from "../claude";
import { checkInterview } from "../checks";
import { interviewJsonSchema, interviewSchema, type FamilyBlocks, type Interview } from "../schemas";

export type InterviewEnv = ClaudeEnv & { MODEL_INTERVIEW?: string };

export async function generateInterview(env: InterviewEnv, blocks: FamilyBlocks, fetchImpl?: typeof fetch): Promise<Interview> {
  const system = assemble("interviewer", { pickedPlaces: blocks.places });
  const base = interviewerUser(blocks);
  let user = base;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callClaude({ env, route: "interview", model: env.MODEL_INTERVIEW ?? "claude-haiku-5-5", system, user, schema: interviewJsonSchema, maxTokens: 1500, timeoutMs: 40_000, fetchImpl });
    const parsed = interviewSchema.safeParse(raw);
    const errors = parsed.success ? checkInterview(parsed.data) : parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`);
    if (parsed.success && !errors.length) return parsed.data;
    user = `${base}\n\n<fix>Your last questions were rejected: ${errors.join("; ")}. Ask again.</fix>`;
  }
  throw new FriendlyError(502, TANGLED, "interview failed checks");
}
