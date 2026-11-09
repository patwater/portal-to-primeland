// Cloudflare Workers Builds runs `npm ci` and then `npx wrangler deploy`. If the dashboard's "Build command"
// is empty, nothing has built the app by then, and wrangler cannot find the assets directory the Vite plugin
// generates. So, only inside Workers Builds (WORKERS_CI=1), build once right after install when no build exists.
// With a build command set (`npm run build`) this still works: the later build is just a repeat.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (process.env.WORKERS_CI === "1" && !existsSync("dist/client/index.html")) {
  console.log("Workers Builds: no build output found, running `npm run build` first.");
  const r = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: process.platform === "win32" });
  process.exit(r.status ?? 1);
}
