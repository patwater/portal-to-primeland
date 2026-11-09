import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import app from "../src/worker/index";
import { memoryKV } from "./fixtures";

const env = { ANTHROPIC_API_KEY: "sk", TURNSTILE_SECRET_KEY: "t", BOOKS: memoryKV() } as never;
const post = (path: string, body: string, headers: Record<string, string> = {}) =>
  app.fetch(new Request(`http://x${path}`, { method: "POST", body, headers: { "content-type": "application/json", ...headers } }), env);

describe("worker hardening", () => {
  it("refuses oversized bodies, declared or not, before doing any work", async () => {
    const big = JSON.stringify({ blocks: { name: "x", look: "y".repeat(70_000) } });
    expect((await post("/api/interview", big)).status).toBe(413);
    expect((await post("/api/books", big, { "content-length": String(big.length) })).status).toBe(413);
  });
  it("sends no-store and nosniff on every API response", async () => {
    for (const res of [await app.fetch(new Request("http://x/api/health"), env), await app.fetch(new Request("http://x/api/nope"), env)]) {
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });
  it("answers malformed JSON with a friendly 400, not a stack trace", async () => {
    const res = await post("/api/interview", "{not json");
    expect(res.status).toBe(400);
    expect(await res.text()).not.toMatch(/SyntaxError|at \w+ \(/);
  });
});

describe("static headers", () => {
  const headers = readFileSync("public/_headers", "utf8");
  it("sets a strict content security policy", () => {
    expect(headers).toMatch(/Content-Security-Policy:/);
    expect(headers).toMatch(/script-src 'self' https:\/\/challenges\.cloudflare\.com;/);
    expect(headers).toMatch(/frame-ancestors 'none'/);
    expect(headers).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline/);
  });
});
