# A Portal to Primeland

A custom picture-book microsite. A parent fills in blocks about their kid, answers a few questions from the Delivery Man, and the Storyteller writes a short illustrated edition set in Primeland. The family reads it together, records the kid's reactions page by page, and sends it back through the portal for a better edition. The full specification is [`build-brief.md`](build-brief.md). The world lives in [`content/`](content): `SOUL.md`, `characters.md`, `locations.md` and `puzzles.json`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (Worker and client together)
npm test           # unit and route tests (the live-API test skips without a key)
npm run build      # roster checks, content hashes, type-check, tests, build, secret scan
```

For local runs, create `.dev.vars` (gitignored):

```
ANTHROPIC_API_KEY=sk-ant-...
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA   # Cloudflare's always-pass test secret
STUDIO_PASSWORD=choose-something
```

`TURNSTILE_SITE_KEY` in `wrangler.jsonc` is Cloudflare's matching test site key. `ANTHROPIC_BASE_URL` and `TURNSTILE_VERIFY_URL` are optional overrides that let a local run talk to mock servers.

## Deploy

1. `npx wrangler secret put ANTHROPIC_API_KEY`, `TURNSTILE_SECRET_KEY` and `STUDIO_PASSWORD`.
2. Create a Turnstile widget in the Cloudflare dashboard and put its public site key in `TURNSTILE_SITE_KEY` (`wrangler.jsonc`).
3. Connect the repo to Cloudflare Workers Builds (build command `npm run build`, deploy command `npx wrangler deploy`, production branch `main`). If the build command is left empty, the repo still deploys: a `postinstall` step builds the app inside Workers Builds (`WORKERS_CI=1`), because `wrangler deploy` needs the build output the Vite plugin generates. A GitHub Actions fallback is in `.github/workflows/deploy.yml`. The `BOOKS` KV namespace is provisioned on first deploy.
4. For a custom domain, uncomment `routes` in `wrangler.jsonc`.
5. After each push, open `/api/health` to confirm the new `soul` hash is live.

Verify binding syntax in `wrangler.jsonc` against current Cloudflare docs before the first deploy.

## Keys that disappear after a deploy

A deploy replaces the Worker's settings with `wrangler.jsonc`, which deletes plain **Text** variables that were only ever added in the dashboard. Add keys (`ANTHROPIC_API_KEY`, `STUDIO_PASSWORD`, `TURNSTILE_SECRET_KEY`) as type **Secret** in the Worker's Variables and Secrets, or with `npx wrangler secret put <NAME>`: secrets survive every deploy. `keep_vars` is also on in `wrangler.jsonc` as a safety net. The "Build" section of the settings (build variables) is a different list and is not available to the running Worker.

## Troubleshooting

- **"The doorman wasn't sure you were a grown-up."** Cloudflare rejected the Turnstile token. The usual cause is a site key and secret key from different widgets. Cloudflare's dummy site key (`1x00000000000000000000AA`, the widget that says "For testing only") only works with the dummy secret `1x0000000000000000000000000000000AA`; a real widget's site key needs that widget's real secret. The response carries Cloudflare's error code, and the Worker logs it (Workers Observability is on in `wrangler.jsonc`).
- **"The Delivery Man dropped his clipboard."** The interview call failed. Check the Worker logs for a `"route":"error"` line: `ANTHROPIC_API_KEY is not set` or an `upstream status` number says why.

## The studio password

`STUDIO_PASSWORD` is one password for the book-making area: the blocks form, the Delivery Man's questions, the card game, and the server calls that write books. Visitors see a "studio door" until they enter it. A correct password gives a signed, HttpOnly cookie that lasts 7 days (it is keyed by the password, so changing the password signs everyone out), and wrong guesses are limited to ten per address per fifteen minutes. Reading a finished book by its share link, the citizens page and the sample edition stay public, and editing a book still needs its private edit link. The roster studio (`/studio/roster`) uses the same password with its own check.

Set it with `npx wrangler secret put STUDIO_PASSWORD` or as a Secret in the Worker's Variables and Secrets. **If it isn't set the gate is open**: open `/api/health` and look for `"accessGate": true` to confirm it is on.

## Limits on new books

Each anonymous browser session may make **two** new books (`SESSION_BOOK_LIMIT`). A session is a cookie (`portal_sid`, HttpOnly) that lasts `SESSION_TTL_HOURS` (24) from the first book; there are no accounts. A book that fails is not charged, and reading, drawing and revising existing books doesn't count. Because anyone can clear a cookie, each IP address is also held to `IP_DAILY_BOOK_LIMIT` (6) books a day, stored only as a hash. The global `DAILY_BOOK_BUDGET` and the per-minute rate limit still apply. The interview page tells visitors how many books they have left. To test beyond two books, raise `SESSION_BOOK_LIMIT` in `wrangler.jsonc` or clear the cookie.

## Turning Turnstile off

`wrangler.jsonc` sets `TURNSTILE_ENABLED` to `"false"`: the server skips the Turnstile check and the page hides the widget. The per-IP rate limit and the daily book budget (`DAILY_BOOK_BUDGET`) still apply. To turn it back on, set it to `"true"` (or remove the line) and make sure the site key and secret key come from the same widget.

## How to change Primeland

- **Add or edit a character.** Edit `content/characters.md` (new citizens take the next unused prime), run `npm run roster`, run `npm run draw-roster -- --only <id>` for the new sheet, approve it at `/studio/roster`, and redeploy.
- **Add a place.** Add a `###` section to `content/locations.md` under the right region and redeploy.
- **Change the voice or values.** Edit `content/SOUL.md` and redeploy. Every new book uses the new soul, and existing books keep the text they already have until they are revised.
- **Redraw the canon sprites.** Put the notebook PDFs in `assets-src/` (gitignored, because the repo is public) and run `npm run sprites`.

## How it fits together

- **Content pipeline.** The three content files are bundled into the Worker at build time and are the only world material that reaches a prompt. Every system prompt starts with the soul, marked for prompt caching. Family details only ever appear in the user message. Each book is stamped with the soul's hash and the commit.
- **Routes.** Interview, book creation (Turnstile, rate limit and a daily budget), the Sketch Artist (cast sheets and per-page art), feedback, revision, past editions, restore and delete. Anything that changes a book needs the private edit token, of which only a SHA-256 hash is stored.
- **Checks.** The roster parser fails the build on a bad badge. Stories, revisions and drawings are validated on the server (page count, ids, badges, banned names, house style, the family's avoid list, locked pages, drawing format) with one retry and a friendly error.
- **Privacy.** Nothing about a family is logged. Books expire after 400 days and can be deleted at any time. `public/_headers` sets a strict content security policy.

## Checks you can run

- `npm run test:live` with `ANTHROPIC_API_KEY` set runs five varied families through the real Storyteller and confirms the soul is read from the prompt cache.
- `npm run hand-sheets` regenerates the 42 hand-authored placeholder roster sheets (no key needed). `npm run draw-roster` (needs a key) replaces them with Sketch Artist drawings, except any you replaced with your own PNG.
- `npm run build` fails if anything that looks like an API key reaches `dist/client`.

## Fonts

Patrick Hand, Caveat, and Gochi Hand are self-hosted from `public/fonts/` (SIL OFL, via Fontsource). Patrick could later make a font from his own handwriting (for example with Calligraphr) and swap it in by editing the `@font-face` rules in `src/app/styles.css`.

## License

Creative Commons BY-NC-SA 4.0, see [`LICENSE.md`](LICENSE.md).
