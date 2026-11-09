import { Hono } from "hono";
import { version } from "./prompts/content";

type Env = { Bindings: { STUDIO_PASSWORD?: string } };
const app = new Hono<Env>();

// Public. Never includes file contents, only hashes.
app.get("/api/health", (c) =>
  c.json({
    commit: version.commit,
    builtAt: version.builtAt,
    hashes: { soul: version.soul, characters: version.characters, locations: version.locations },
  }),
);

/** Constant-time string comparison so the studio password can't be guessed by timing. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// The roster studio gate. The password is a Worker secret; nothing about it ships to the client.
app.get("/api/studio/check", (c) => {
  const secret = c.env.STUDIO_PASSWORD;
  if (!secret) return c.json({ error: "studio not configured" }, 503);
  const given = (c.req.header("Authorization") ?? "").replace(/^Bearer /, "");
  return same(given, secret) ? c.json({ ok: true }) : c.json({ error: "no" }, 401);
});

app.all("/api/*", (c) => c.json({ error: "The scissors haven't learned that route yet." }, 404));

export default app;
