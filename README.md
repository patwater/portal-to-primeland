# A Portal to Primeland

A custom picture-book microsite: a parent fills in blocks about their kid, the Storyteller writes a short illustrated edition set in Primeland, and the family revises it after each bedtime reading. The full specification is in [`build-brief.md`](build-brief.md). The world lives in three files in [`content/`](content): `SOUL.md`, `characters.md`, and `locations.md`.

## Status

Milestone 1 (static shell and sample edition) is built: landing page, the blocks form, the page-turning reader with a hand-authored sample edition, the print stylesheet, and the content pipeline (`/api/health`). Milestones 2 to 6 follow the brief.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # writes content hashes, type-checks, runs tests, builds client and Worker
```

Local secrets (later milestones) go in `.dev.vars`, which is gitignored. Production secrets are set with `npx wrangler secret put ANTHROPIC_API_KEY`.

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
