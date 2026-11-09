# A Portal to Primeland

A custom picture-book microsite: a parent fills in blocks about their kid, the Storyteller writes a short illustrated edition set in Primeland, and the family revises it after each bedtime reading. The full specification is in [`build-brief.md`](build-brief.md). The world lives in three files in [`content/`](content): `SOUL.md`, `characters.md`, and `locations.md`.

## Status

Milestones 1 and 2 are built. M1: landing page, the blocks form, the page-turning reader with a hand-authored sample edition, the print stylesheet, and the content pipeline (`/api/health`). M2: roster and places parsers with badge checks (`npm run roster`), canon sprites and sketchbook extras extracted from `assets-src/` (`npm run sprites`), the map, citizen badge cards, the card-flipping game, and the `/studio/roster` review page. Roster sheets for characters without a canon sprite are drawn by `npm run draw-roster` (needs `ANTHROPIC_API_KEY`). M3: Worker routes (`/api/interview`, `/api/books`, `/api/books/:id`), the prompt assembler with prompt caching, the Claude wrapper, output checks, Turnstile, rate limiting and a daily budget, plus the interview page, loading scene and generated-book reader. M4: the Sketch Artist (`/api/books/:id/cast-sheet`, `/api/books/:id/pages/:pageId/art`), cast sheets for the hero, companion and invented citizens, sprite placement with validation, and progressive page loading in the reader. M5: feedback stamps and notes (private to the edit link), the Reviser and its patch (locked pages are enforced in code, not just the prompt), changelog, past editions, restore, and delete. Restoring edition N saves a copy of it as the newest edition, so history is never rewritten. Milestone 6 follows the brief.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # writes content hashes, type-checks, runs tests, builds client and Worker
```

Local secrets (later milestones) go in `.dev.vars`, which is gitignored. Production secrets are set with `npx wrangler secret put ANTHROPIC_API_KEY`.

## Secrets and bindings

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY   # from your Turnstile widget
npx wrangler secret put STUDIO_PASSWORD
```

`TURNSTILE_SITE_KEY` in `wrangler.jsonc` is Cloudflare's always-pass **test** key. Replace it with your widget's public site key before launch. The `BOOKS` KV namespace is provisioned automatically on first deploy. For local runs, copy the same names into `.dev.vars` (Turnstile test secret: `1x0000000000000000000000000000000AA`). `ANTHROPIC_BASE_URL` and `TURNSTILE_VERIFY_URL` are optional overrides for pointing a local run at mock servers.

To check milestone 3 against the real API (five varied families, plus the prompt cache): `ANTHROPIC_API_KEY=sk-ant-... npm run test:live`.

## Deploy

Connect the repo to Cloudflare Workers Builds with build command `npm run build` and deploy command `npx wrangler deploy`, production branch `main`. A GitHub Actions fallback is in `.github/workflows/deploy.yml`. After a push, open `/api/health` to confirm the new `soul` hash is live. Verify binding syntax in `wrangler.jsonc` against current Cloudflare docs before the first deploy.

## How to change Primeland

- **Add or edit a character.** Edit `content/characters.md` (new citizens take the next unused prime), run `npm run roster`, approve the new sheet at `/studio/roster`, and redeploy. (The roster build and studio arrive in milestone 2.)
- **Add a place.** Add a `###` section to `content/locations.md` under the right region and redeploy.
- **Change the voice or values.** Edit `content/SOUL.md` and redeploy. Every new book uses the new soul, and existing books keep the text they already have until they are revised.

## Fonts

Patrick Hand, Caveat, and Gochi Hand are self-hosted from `public/fonts/` (SIL OFL, via Fontsource). Patrick could later make a font from his own handwriting (for example with Calligraphr) and swap it in by editing the `@font-face` rules in `src/app/styles.css`.

## License

Creative Commons BY-NC-SA 4.0, see [`LICENSE.md`](LICENSE.md).
