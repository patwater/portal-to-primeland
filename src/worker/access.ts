// The password gate for the book-making area. The password is the STUDIO_PASSWORD secret. A correct password earns a
// signed cookie (HMAC keyed by the password), so changing the password signs everyone out, and nothing about the
// password is stored. If STUDIO_PASSWORD is not set the gate is open, and /api/health says so.
import { sha256, type StorageEnv } from "./storage";

export type AccessEnv = StorageEnv & { STUDIO_PASSWORD?: string };
export const ACCESS_COOKIE = "portal_access";
const DAYS = 7;

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
async function sign(secret: string, expiry: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`access|${expiry}`)));
}
export function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const gateOn = (env: AccessEnv) => !!env.STUDIO_PASSWORD;

export async function hasAccess(env: AccessEnv, cookieHeader: string | undefined, now = Date.now()): Promise<boolean> {
  if (!env.STUDIO_PASSWORD) return true;
  const m = (cookieHeader ?? "").match(new RegExp(`(?:^|;\\s*)${ACCESS_COOKIE}=(\\d{10,13})\\.([0-9a-f]{64})(?:;|$)`));
  if (!m) return false;
  const expiry = Number(m[1]);
  return expiry > now && same(m[2], await sign(env.STUDIO_PASSWORD, expiry));
}

export async function accessCookie(env: AccessEnv, secure: boolean, now = Date.now()): Promise<string> {
  const expiry = now + DAYS * 86400_000;
  return `${ACCESS_COOKIE}=${expiry}.${await sign(env.STUDIO_PASSWORD!, expiry)}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export const passwordOk = (env: AccessEnv, given: string) => !!env.STUDIO_PASSWORD && same(given, env.STUDIO_PASSWORD);

/** Ten wrong guesses per address per fifteen minutes. The address is stored only as a hash. */
export async function takeAttempt(env: AccessEnv, ip: string, now = Date.now()): Promise<boolean> {
  const kv = env.BOOKS;
  if (!kv) return true;
  const key = `access:${(await sha256(`${ip}|${Math.floor(now / 900_000)}`)).slice(0, 32)}`;
  const n = Number((await kv.get(key)) ?? 0);
  if (n >= 10) return false;
  await kv.put(key, String(n + 1), { expirationTtl: 1800 });
  return true;
}
