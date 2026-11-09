// Per-session and per-IP limits on creating new books. A "session" is an anonymous browser, identified by an
// opaque cookie; there are no accounts. Counts live in KV with a TTL, so a session resets on its own.
import { randomId, sha256, type StorageEnv } from "./storage";

export type LimitEnv = StorageEnv & { SESSION_BOOK_LIMIT?: string; SESSION_TTL_HOURS?: string; IP_DAILY_BOOK_LIMIT?: string };

export const COOKIE = "portal_sid";
const num = (v: string | undefined, d: number) => (v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
export const sessionLimit = (env: LimitEnv) => num(env.SESSION_BOOK_LIMIT, 2);
const ttlSeconds = (env: LimitEnv) => Math.max(60, Math.round(num(env.SESSION_TTL_HOURS, 24) * 3600));
const ipLimit = (env: LimitEnv) => num(env.IP_DAILY_BOOK_LIMIT, 6);

export function readSession(cookieHeader: string | undefined): string | null {
  const m = (cookieHeader ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9]{24})(?:;|$)`));
  return m ? m[1] : null;
}
export const newSession = () => randomId(24);
export const sessionCookie = (sid: string, env: LimitEnv, secure: boolean) =>
  `${COOKIE}=${sid}; Path=/; Max-Age=${ttlSeconds(env)}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;

const sessionKey = (sid: string) => `session:${sid}:books`;
// The IP is hashed with the date, so no raw address is stored and the count resets each day.
const ipKey = async (ip: string, now: Date) => `ip:${(await sha256(`${ip}|${now.toISOString().slice(0, 10)}`)).slice(0, 32)}:books`;

const read = async (kv: KVNamespace, key: string) => Number((await kv.get(key)) ?? 0);

export async function booksLeft(env: LimitEnv, sid: string | null): Promise<number> {
  if (!env.BOOKS) return sessionLimit(env);
  return Math.max(0, sessionLimit(env) - (sid ? await read(env.BOOKS, sessionKey(sid)) : 0));
}

export type Reservation = { ok: true; release: () => Promise<void> } | { ok: false; reason: "session" | "ip" };

/** Takes one book from the session and from the IP's daily allowance, or says which one is used up. `release` gives them back (a failed book is not charged). */
export async function reserveBook(env: LimitEnv, sid: string, ip: string, now = new Date()): Promise<Reservation> {
  const kv = env.BOOKS;
  if (!kv) return { ok: true, release: async () => {} };
  const sk = sessionKey(sid), ik = await ipKey(ip, now);
  const [used, ipUsed] = await Promise.all([read(kv, sk), read(kv, ik)]);
  if (used >= sessionLimit(env)) return { ok: false, reason: "session" };
  if (ipUsed >= ipLimit(env)) return { ok: false, reason: "ip" };
  await Promise.all([kv.put(sk, String(used + 1), { expirationTtl: ttlSeconds(env) }), kv.put(ik, String(ipUsed + 1), { expirationTtl: 2 * 86400 })]);
  return {
    ok: true,
    release: async () => {
      const [u, i] = await Promise.all([read(kv, sk), read(kv, ik)]);
      await Promise.all([kv.put(sk, String(Math.max(0, u - 1)), { expirationTtl: ttlSeconds(env) }), kv.put(ik, String(Math.max(0, i - 1)), { expirationTtl: 2 * 86400 })]);
    },
  };
}

const WORDS = ["no", "one", "two", "three", "four", "five", "six"];
export const limitMessage = (env: LimitEnv, reason: "session" | "ip") => {
  const n = sessionLimit(env);
  return reason === "session"
    ? `You've opened ${WORDS[n] ?? n} ${n === 1 ? "portal" : "portals"}, which is all one visit gets. Your books are still here to read, and the Delivery Man will have more boxes tomorrow.`
    : "The Delivery Man has handed out a lot of boxes from this address today. Please come back tomorrow.";
};
