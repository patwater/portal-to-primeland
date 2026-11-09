import { Hono } from "hono";
import { version } from "./prompts/content";
import { FriendlyError, TANGLED } from "./claude";
import { answersSchema, blocksSchema, type StoredBook } from "./schemas";
import { generateInterview, type InterviewEnv } from "./prompts/interviewer";
import { generateStory, type StoryEnv } from "./prompts/storyteller";
import { getBook, randomId, randomToken, saveBook, sha256, takeBudget, type StorageEnv } from "./storage";

export type Bindings = InterviewEnv & StoryEnv & StorageEnv & {
  STUDIO_PASSWORD?: string; TURNSTILE_SECRET_KEY?: string; TURNSTILE_SITE_KEY?: string; TURNSTILE_VERIFY_URL?: string;
  GEN_LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> };
};
const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

// Public. Never includes file contents, only hashes.
app.get("/api/health", (c) =>
  c.json({ commit: version.commit, builtAt: version.builtAt, hashes: { soul: version.soul, characters: version.characters, locations: version.locations } }),
);
app.get("/api/config", (c) => c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY ?? "" }));

/** Constant-time string comparison so the studio password can't be guessed by timing. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
app.get("/api/studio/check", (c) => {
  const secret = c.env.STUDIO_PASSWORD;
  if (!secret) return c.json({ error: "studio not configured" }, 503);
  const given = (c.req.header("Authorization") ?? "").replace(/^Bearer /, "");
  return same(given, secret) ? c.json({ ok: true }) : c.json({ error: "no" }, 401);
});

const ip = (c: { req: { header(n: string): string | undefined } }) => c.req.header("cf-connecting-ip") ?? "local";

async function limited(c: { env: Bindings; req: { header(n: string): string | undefined } }): Promise<boolean> {
  if (!c.env.GEN_LIMITER) return false;
  return !(await c.env.GEN_LIMITER.limit({ key: ip(c) })).success;
}

async function turnstileOk(env: Bindings, token: string | undefined, remoteIp: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY || !token) return false;
  try {
    const r = await fetchImpl(env.TURNSTILE_VERIFY_URL ?? "https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: remoteIp }),
    });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch { return false; }
}

const friendly = (c: { json(b: unknown, s?: number): Response }, e: unknown) => {
  if (e instanceof FriendlyError) return c.json({ error: e.userMessage }, e.status as 400);
  console.log(JSON.stringify({ route: "error", kind: (e as Error)?.name ?? "unknown" })); // never the message: it could hold a name
  return c.json({ error: TANGLED }, 500);
};

app.post("/api/interview", async (c) => {
  try {
    if (await limited(c)) return c.json({ error: "Not so fast, please. The Delivery Man needs a moment." }, 429);
    const body = (await c.req.json().catch(() => null)) as { blocks?: unknown } | null;
    const blocks = blocksSchema.safeParse(body?.blocks);
    if (!blocks.success) return c.json({ error: "The Delivery Man needs at least a name for the label." }, 400);
    return c.json(await generateInterview(c.env, blocks.data));
  } catch (e) { return friendly(c, e); }
});

app.post("/api/books", async (c) => {
  try {
    if (await limited(c)) return c.json({ error: "Not so fast, please. The Delivery Man needs a moment." }, 429);
    const body = (await c.req.json().catch(() => null)) as { blocks?: unknown; answers?: unknown; turnstileToken?: string } | null;
    const blocks = blocksSchema.safeParse(body?.blocks);
    const answers = answersSchema.safeParse(body?.answers ?? []);
    if (!blocks.success || !answers.success) return c.json({ error: "The Delivery Man needs at least a name for the label." }, 400);
    if (!(await turnstileOk(c.env, body?.turnstileToken, ip(c)))) return c.json({ error: "The doorman wasn't sure you were a grown-up. Please try the check again." }, 403);
    if (!(await takeBudget(c.env))) return c.json({ error: "The Delivery Man has run out of boxes for today. Please come back tomorrow." }, 429);

    const story = await generateStory(c.env, blocks.data, answers.data);
    const id = randomId(16), editToken = randomToken();
    const book: StoredBook = {
      id, status: "drawing", version: 1, soulVersion: { commit: version.commit, soul: version.soul }, createdAt: new Date().toISOString(),
      kidName: blocks.data.name, paper: blocks.data.paper,
      title: blocks.data.title || story.title, dedication: blocks.data.dedication || story.dedication, byline: blocks.data.byline || story.byline,
      n2Resolution: story.n2Resolution, cast: story.cast, pages: story.pages,
    };
    await saveBook(c.env, book, await sha256(editToken));
    return c.json({ id, editToken, book });
  } catch (e) { return friendly(c, e); }
});

// Public to anyone with the id. Edit tokens and their hashes never leave the server.
app.get("/api/books/:id", async (c) => {
  try {
    const book = await getBook(c.env, c.req.param("id"));
    return book ? c.json(book) : c.json({ error: "That book has wandered off." }, 404);
  } catch (e) { return friendly(c, e); }
});
app.get("/api/books/:id/versions/:n", async (c) => {
  try {
    const n = Number(c.req.param("n"));
    const book = Number.isInteger(n) && n > 0 ? await getBook(c.env, c.req.param("id"), n) : null;
    return book ? c.json(book) : c.json({ error: "That edition has wandered off." }, 404);
  } catch (e) { return friendly(c, e); }
});

app.all("/api/*", (c) => c.json({ error: "The scissors haven't learned that route yet." }, 404));

export default app;
