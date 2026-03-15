import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, userResources, userExploration, zones } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

const init = new Hono<AppEnv>();

// GET /api/init — single auth check, returns user + status + resources in parallel
init.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");

  const [userRow, resourceRows, expRow] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).then(r => r[0] ?? null),
    db.select().from(userResources).where(eq(userResources.userId, userId)),
    db.select().from(userExploration).where(eq(userExploration.userId, userId)).then(r => r[0] ?? null),
  ]);

  let status = null;
  if (expRow) {
    const zone = await db.select().from(zones).where(eq(zones.id, expRow.zoneId)).then(r => r[0] ?? null);
    const tickSec = zone?.tickSec ?? 0;
    const elapsedSinceLastTick = Math.floor((Date.now() - expRow.lastTickAt.getTime()) / 1000);
    const nextTickIn = Math.max(0, tickSec - elapsedSinceLastTick);
    status = { ...expRow, tickSec, nextTickIn };
  }

  const resources = Object.fromEntries(resourceRows.map(r => [r.resourceType, r.amount]));

  return c.json({
    success: true,
    data: { user: userRow, status, resources },
  });
});

export default init;
