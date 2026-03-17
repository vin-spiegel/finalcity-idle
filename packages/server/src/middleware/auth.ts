import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import type { AppEnv } from "../types.js";

// ── Session cache ────────────────────────────────────────────
// Caches sessionToken → userId to avoid 2-3 DB round-trips per request.
// TTL is short (5 min) so stale/revoked sessions are detected promptly.
const SESSION_TTL_MS = 5 * 60 * 1000;
type CacheEntry = { userId: number; expiresAt: number };
const sessionCache = new Map<string, CacheEntry>();

function extractSessionToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)better-auth\.session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const token = extractSessionToken(c.req.raw.headers.get("cookie") ?? "");

  // ── Development Bypass ─────────────────────────────────────
  // If we're in development and have no session, try to find or create a dev user.
  if (process.env.NODE_ENV === "development" && !token) {
    const [devUser] = await db.select().from(users).limit(1);
    if (devUser) {
      c.set("userId", devUser.id);
      return next();
    }
  }

  // ── Cache hit: skip all DB queries ──────────────────────
  if (token) {
    const cached = sessionCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      c.set("userId", cached.userId);
      return next();
    }
  }

  // ── Cache miss: full auth (first request or after TTL expiry) ──
  const t0 = Date.now();
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }
  const t1 = Date.now();

  const [gameUser] = await db
    .select()
    .from(users)
    .where(eq(users.authId, session.user.id));
  const t2 = Date.now();

  console.log(`[auth] cache miss — getSession=${t1 - t0}ms usersLookup=${t2 - t1}ms`);

  if (!gameUser) {
    return c.json({ success: false, error: "Game user not found" }, 404);
  }

  if (token) {
    sessionCache.set(token, { userId: gameUser.id, expiresAt: Date.now() + SESSION_TTL_MS });
  }

  c.set("userId", gameUser.id);
  await next();
}
