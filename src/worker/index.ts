import { Hono } from "hono";
import { version } from "./prompts/content";

const app = new Hono();

// Public. Never includes file contents, only hashes.
app.get("/api/health", (c) =>
  c.json({
    commit: version.commit,
    builtAt: version.builtAt,
    hashes: { soul: version.soul, characters: version.characters, locations: version.locations },
  }),
);

app.all("/api/*", (c) => c.json({ error: "The scissors haven't learned that route yet." }, 404));

export default app;
