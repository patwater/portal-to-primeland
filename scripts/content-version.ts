import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const h = (f: string) =>
  createHash("sha256").update(readFileSync(`content/${f}`)).digest("hex").slice(0, 12);

function commit(): string {
  const env = process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA;
  if (env) return env;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unknown";
  }
}

const out = {
  commit: commit(),
  builtAt: new Date().toISOString(),
  soul: h("SOUL.md"),
  characters: h("characters.md"),
  locations: h("locations.md"),
};
mkdirSync("src/generated", { recursive: true });
writeFileSync("src/generated/content-version.json", JSON.stringify(out, null, 2) + "\n");
console.log("content-version:", out);
