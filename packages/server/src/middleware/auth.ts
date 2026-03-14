import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { auth } from "../lib/auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import type { AppEnv } from "../types.js";

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const [gameUser] = await db
    .select()
    .from(users)
    .where(eq(users.authId, session.user.id));

  if (!gameUser) {
    return c.json({ success: false, error: "Game user not found" }, 404);
  }

  c.set("userId", gameUser.id);
  await next();
}
