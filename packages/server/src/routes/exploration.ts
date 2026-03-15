import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  zones,
  users,
  userExploration,
  userResources,
  userJobs,
  explorationLogs,
} from "../db/schema.js";
import { calcTicks } from "../lib/tick.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

const exploration = new Hono<AppEnv>();

// ─── POST /api/exploration/start  { zoneId } ─────────────────────────────────
exploration.post("/start", requireAuth, async (c) => {
  const userId = c.get("userId");
  const { zoneId } = await c.req.json<{ zoneId: string }>();

  const [zone] = await db.select().from(zones).where(eq(zones.id, zoneId));
  if (!zone)         return c.json({ success: false, error: "zone not found" }, 404);
  if (!zone.tickSec) return c.json({ success: false, error: "not an explorable zone" }, 400);

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return c.json({ success: false, error: "user not found" }, 404);

  if (user.level < zone.levelReq) {
    return c.json({ success: false, error: `level ${zone.levelReq} required` }, 403);
  }

  const now = new Date();

  await db
    .insert(userExploration)
    .values({ userId, zoneId, progress: 0, startedAt: now, lastTickAt: now, isFarming: false })
    .onConflictDoUpdate({
      target: userExploration.userId,
      set: { zoneId, progress: 0, startedAt: now, lastTickAt: now, isFarming: false },
    });

  return c.json({ success: true, data: { zoneId, startedAt: now } });
});

// ─── POST /api/exploration/sync ──────────────────────────────────────────────
exploration.post("/sync", requireAuth, async (c) => {
  const userId = c.get("userId");

  const [exp] = await db
    .select()
    .from(userExploration)
    .where(eq(userExploration.userId, userId));

  if (!exp) return c.json({ success: false, error: "no active exploration" }, 404);

  const [zone] = await db.select().from(zones).where(eq(zones.id, exp.zoneId));
  if (!zone || !zone.tickSec || !zone.dropTable) {
    return c.json({ success: false, error: "zone not found" }, 404);
  }

  const result = calcTicks({
    lastTickAt:      exp.lastTickAt,
    tickSec:         zone.tickSec,
    currentProgress: exp.progress,
    dropTable:       zone.dropTable,
  });

  if (result.ticks === 0) {
    return c.json({
      success: true,
      data: {
        ticks: 0, progress: exp.progress, isFarming: exp.isFarming,
        resources: {}, jobPointsGained: 0,
        tickSec: zone.tickSec,
        nextTickIn: zone.tickSec - Math.floor((Date.now() - exp.lastTickAt.getTime()) / 1000),
      },
    });
  }

  const now = new Date();
  const newProgress = exp.progress + result.progressGain;

  await db
    .update(userExploration)
    .set({ progress: newProgress, lastTickAt: now, isFarming: result.isFarming })
    .where(eq(userExploration.userId, userId));

  for (const [resourceType, amount] of Object.entries(result.resources)) {
    await db
      .insert(userResources)
      .values({ userId, resourceType, amount })
      .onConflictDoUpdate({
        target: [userResources.userId, userResources.resourceType],
        set: { amount: sql`${userResources.amount} + ${amount}` },
      });
  }

  if (result.jobPointsGained > 0 && zone.jobType) {
    await db
      .insert(userJobs)
      .values({ userId, jobType: zone.jobType, jobPoints: result.jobPointsGained, isActive: true })
      .onConflictDoUpdate({
        target: [userJobs.userId, userJobs.jobType],
        set: {
          jobPoints: sql`${userJobs.jobPoints} + ${result.jobPointsGained}`,
          isActive: true,
        },
      });
  }

  await db.insert(explorationLogs).values({
    userId, zoneId: exp.zoneId, eventType: "resource",
    data: {
      ticks: result.ticks, resources: result.resources,
      jobPointsGained: result.jobPointsGained, progressGain: result.progressGain,
    },
  });

  await db
    .update(users)
    .set({ lastSyncedAt: now })
    .where(eq(users.id, userId));

  return c.json({
    success: true,
    data: {
      ticks: result.ticks, progress: newProgress, isFarming: result.isFarming,
      resources: result.resources, jobPointsGained: result.jobPointsGained,
      tickSec: zone.tickSec,
      nextTickIn: zone.tickSec,
    },
  });
});

// ─── POST /api/exploration/stop ──────────────────────────────────────────────
exploration.post("/stop", requireAuth, async (c) => {
  const userId = c.get("userId");
  await db.delete(userExploration).where(eq(userExploration.userId, userId));
  return c.json({ success: true, data: null });
});

// ─── GET /api/exploration/status ─────────────────────────────────────────────
exploration.get("/status", requireAuth, async (c) => {
  const userId = c.get("userId");

  const [exp] = await db
    .select()
    .from(userExploration)
    .where(eq(userExploration.userId, userId));

  if (!exp) return c.json({ success: true, data: null });

  const [zone] = await db.select().from(zones).where(eq(zones.id, exp.zoneId));
  const elapsedSinceLastTick = Math.floor((Date.now() - exp.lastTickAt.getTime()) / 1000);
  const tickSec   = zone?.tickSec ?? 0;
  const nextTickIn = Math.max(0, tickSec - elapsedSinceLastTick);

  return c.json({ success: true, data: { ...exp, tickSec, nextTickIn } });
});

export default exploration;
