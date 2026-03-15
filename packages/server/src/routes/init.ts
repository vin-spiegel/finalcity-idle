import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, userResources, userExploration, zones } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

const init = new Hono<AppEnv>();

// Simple in-memory zone cache (zones are static data)
let zoneCache: (typeof zones.$inferSelect)[] | null = null;
async function getZones() {
  if (!zoneCache) {
    zoneCache = await db.select().from(zones).orderBy(zones.levelReq);
  }
  return zoneCache;
}

// GET /api/init — single auth check, returns everything in parallel
init.get("/", requireAuth, async (c) => {
  const t0 = Date.now();
  const userId = c.get("userId");

  // Fetch zones + user data all in parallel
  const [zoneRows, userRow, resourceRows, expRow] = await Promise.all([
    getZones(),
    db.select().from(users).where(eq(users.id, userId)).then(r => r[0] ?? null),
    db.select().from(userResources).where(eq(userResources.userId, userId)),
    db.select().from(userExploration).where(eq(userExploration.userId, userId)).then(r => r[0] ?? null),
  ]);

  let status = null;
  if (expRow) {
    // Find zone from already-fetched zoneRows — no extra DB query
    const zone = zoneRows.find(z => z.id === expRow.zoneId) ?? null;
    const tickSec = zone?.tickSec ?? 0;
    const nextTickIn = Math.max(0, tickSec - Math.floor((Date.now() - expRow.lastTickAt.getTime()) / 1000));
    const progress = Math.min(
      Math.floor((expRow.lastTickAt.getTime() - expRow.startedAt.getTime()) / (tickSec * 1000)),
      100,
    );
    status = { ...expRow, tickSec, nextTickIn, progress };
  }

  const resources = Object.fromEntries(resourceRows.map(r => [r.resourceType, r.amount]));

  console.log(`[init] ${Date.now() - t0}ms userId=${userId}`);

  return c.json({
    success: true,
    data: { user: userRow, status, resources, zones: zoneRows },
  });
});

export default init;
