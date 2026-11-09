// Runs after the Vite build. The Claude API key lives only on the server: fail the deploy if anything that
// looks like a key, or the name of a server secret, made it into the client bundle.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = "dist/client";
const bad: { re: RegExp; why: string }[] = [
  { re: /sk-ant-[A-Za-z0-9_-]{8,}/, why: "an Anthropic API key" },
  { re: /ANTHROPIC_API_KEY/, why: "the ANTHROPIC_API_KEY name" },
  { re: /TURNSTILE_SECRET_KEY/, why: "the TURNSTILE_SECRET_KEY name" },
  { re: /x-api-key/i, why: "an x-api-key header" },
  { re: /_zod|ZodError/, why: "zod (server-side validation only; it probes eval and bloats the client)" },
];
const hits: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(js|css|html|json|map|txt)$/.test(f)) continue;
    const text = readFileSync(p, "utf8");
    for (const { re, why } of bad) if (re.test(text)) hits.push(`${p}: ${why}`);
  }
};
walk(root);
if (hits.length) { console.error("secret check failed:\n" + hits.map((h) => `  - ${h}`).join("\n")); process.exit(1); }
console.log("bundle check ok: no secrets in dist/client");
