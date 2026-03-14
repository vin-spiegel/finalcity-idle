import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, userResources, userJobs, userStats } from "../db/schema.js";

const user = new Hono();

// POST /api/user  { username }  — local dev only, no auth
user.post("/", async (c) => {
  const { username } = await c.req.json<{ username: string }>();

  const [existing] = await db.select().from(users).where(eq(users.username, username));
  if (existing) return c.json({ success: true, data: existing });

  const [created] = await db.insert(users).values({ username }).returning();

  // Init stats row
  await db.insert(userStats).values({ userId: created.id }).onConflictDoNothing();

  return c.json({ success: true, data: created }, 201);
});

// GET /api/user/:id
user.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));

  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) return c.json({ success: false, error: "not found" }, 404);

  return c.json({ success: true, data: u });
});

// GET /api/user/:id/resources
user.get("/:id/resources", async (c) => {
  const userId = Number(c.req.param("id"));

  const rows = await db
    .select()
    .from(userResources)
    .where(eq(userResources.userId, userId));

  const resources = Object.fromEntries(rows.map((r) => [r.resourceType, r.amount]));
  return c.json({ success: true, data: resources });
});

// GET /api/user/:id/jobs
user.get("/:id/jobs", async (c) => {
  const userId = Number(c.req.param("id"));

  const rows = await db
    .select()
    .from(userJobs)
    .where(eq(userJobs.userId, userId));

  return c.json({ success: true, data: rows });
});

export default user;
