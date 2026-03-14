import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, userResources, userJobs } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

const user = new Hono<AppEnv>();

// GET /api/user/me — current user (from session)
user.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");

  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) return c.json({ success: false, error: "not found" }, 404);

  return c.json({ success: true, data: u });
});

// GET /api/user/me/resources
user.get("/me/resources", requireAuth, async (c) => {
  const userId = c.get("userId");

  const rows = await db
    .select()
    .from(userResources)
    .where(eq(userResources.userId, userId));

  const resources = Object.fromEntries(rows.map((r) => [r.resourceType, r.amount]));
  return c.json({ success: true, data: resources });
});

// GET /api/user/me/jobs
user.get("/me/jobs", requireAuth, async (c) => {
  const userId = c.get("userId");

  const rows = await db
    .select()
    .from(userJobs)
    .where(eq(userJobs.userId, userId));

  return c.json({ success: true, data: rows });
});

export default user;
