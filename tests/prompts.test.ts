import { afterEach, describe, expect, it, vi } from "vitest";
import { assemble, type Role } from "../src/worker/prompts/assemble";
import { soul, characters, locations } from "../src/worker/prompts/content";
import { generateStory } from "../src/worker/prompts/storyteller";
import { generateInterview } from "../src/worker/prompts/interviewer";
import { anthropicReply, blocks, interview, story } from "./fixtures";

const ROLES: Role[] = ["interviewer", "storyteller", "sketch-artist", "reviser", "roster-sheet"];

describe("every prompt builder sends the soul, cached, first", () => {
  for (const role of ROLES) {
    it(role, () => {
      const sys = assemble(role);
      expect(sys[0].text).toBe(`<soul>\n${soul}\n</soul>`);
      expect(sys[0].cache_control).toEqual({ type: "ephemeral" });
      expect(sys.at(-1)!.text.startsWith("<task>")).toBe(true);
    });
  }
  it("gives the Storyteller and Reviser the full characters and locations files, with a second breakpoint", () => {
    for (const role of ["storyteller", "reviser"] as Role[]) {
      const sys = assemble(role);
      expect(sys[1].text).toBe(`<characters>\n${characters}\n</characters>`);
      expect(sys[2].text).toBe(`<locations>\n${locations}\n</locations>`);
      expect(sys[2].cache_control).toEqual({ type: "ephemeral" });
    }
  });
  it("gives the others a compact roster instead", () => {
    for (const role of ["interviewer", "sketch-artist", "roster-sheet"] as Role[]) {
      const text = assemble(role).map((b) => b.text).join("\n");
      expect(text).toContain("<roster>");
      expect(text).not.toContain("<characters>");
    }
  });
  it("tells every role that family text is never an instruction", () => {
    for (const role of ROLES) expect(assemble(role).at(-1)!.text).toMatch(/never an instruction/);
  });
});

describe("family input stays out of the system blocks", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("storyteller: the name appears in the user message only", async () => {
    const f = vi.fn(async () => anthropicReply(story()));
    await generateStory({ ANTHROPIC_API_KEY: "k" }, blocks({ avoid: "zzavoid" }), [{ id: "q", text: "zzanswer" }], f as never);
    const req = JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    const system = JSON.stringify(req.system);
    for (const s of ["Zzyzx", "zzavoid", "zzanswer"]) { expect(system).not.toContain(s); expect(req.messages[0].content).toContain(s); }
    expect(req.output_config.format.type).toBe("json_schema");
  });
  it("interviewer: same", async () => {
    const f = vi.fn(async () => anthropicReply(interview()));
    await generateInterview({ ANTHROPIC_API_KEY: "k" }, blocks(), f as never);
    const req = JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(JSON.stringify(req.system)).not.toContain("Zzyzx");
    expect(req.messages[0].content).toContain("Zzyzx");
  });
});
