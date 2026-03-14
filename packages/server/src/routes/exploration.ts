import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  sectors,
  users,
  userExploration,
  userResources,
  userJobs,
  explorationLogs,
} from "../db/schema.js";
import { calcTicks } from "../lib/tick.js";

const exploration = new Hono();

// ─── POST /api/exploration/start  { userId, sectorId } ───────────────────────
exploration.post("/start", async (c) => {
  const { userId, sectorId } = await c.req.json<{ userId: number; sectorId: string }>();

  const [sector] = await db.select().from(sectors).where(eq(sectors.id, sectorId));
  if (!sector) return c.json({ success: false, error: "sector not found" }, 404);

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return c.json({ success: false, error: "user not found" }, 404);

  if (user.level < sector.levelReq) {
    return c.json({ success: false, error: `level ${sector.levelReq} required` }, 403);
  }

  const now = new Date();

  await db
    .insert(userExploration)
    .values({
      userId,
      sectorId,
      progress: 0,
      startedAt: now,
      lastTickAt: now,
      isFarming: false,
    })
    .onConflictDoUpdate({
      target: userExploration.userId,
      set: {
        sectorId,
        progress: 0,
        startedAt: now,
        lastTickAt: now,
        isFarming: false,
      },
    });

  return c.json({ success: true, data: { sectorId, startedAt: now } });
});

// ─── POST /api/exploration/sync  { userId } ──────────────────────────────────
exploration.post("/sync", async (c) => {
  const { userId } = await c.req.json<{ userId: number }>();

  const [exp] = await db
    .select()
    .from(userExploration)
    .where(eq(userExploration.userId, userId));

  if (!exp) return c.json({ success: false, error: "no active exploration" }, 404);

  const [sector] = await db.select().from(sectors).where(eq(sectors.id, exp.sectorId));
  if (!sector) return c.json({ success: false, error: "sector not found" }, 404);

  const result = calcTicks({
    lastTickAt: exp.lastTickAt,
    tickSec: sector.tickSec,
    currentProgress: exp.progress,
    dropTable: sector.dropTable,
  });

  if (result.ticks === 0) {
    return c.json({
      success: true,
      data: {
        ticks: 0,
        progress: exp.progress,
        isFarming: exp.isFarming,
        resources: {},
        jobPointsGained: 0,
        nextTickIn: sector.tickSec - Math.floor((Date.now() - exp.lastTickAt.getTime()) / 1000),
      },
    });
  }

  const now = new Date();
  const newProgress = exp.progress + result.progressGain;

  // Update exploration state
  await db
    .update(userExploration)
    .set({
      progress: newProgress,
      lastTickAt: now,
      isFarming: result.isFarming,
    })
    .where(eq(userExploration.userId, userId));

  // Upsert resources
  for (const [resourceType, amount] of Object.entries(result.resources)) {
    await db
      .insert(userResources)
      .values({ userId, resourceType, amount })
      .onConflictDoUpdate({
        target: [userResources.userId, userResources.resourceType],
        set: { amount: sql`${userResources.amount} + ${amount}` },
      });
  }

  // Upsert job points
  if (result.jobPointsGained > 0) {
    await db
      .insert(userJobs)
      .values({ userId, jobType: sector.jobType, jobPoints: result.jobPointsGained, isActive: true })
      .onConflictDoUpdate({
        target: [userJobs.userId, userJobs.jobType],
        set: {
          jobPoints: sql`${userJobs.jobPoints} + ${result.jobPointsGained}`,
          isActive: true,
        },
      });
  }

  // Write log entry (one per sync, not per tick — keeps DB lean)
  await db.insert(explorationLogs).values({
    userId,
    sectorId: exp.sectorId,
    eventType: "resource",
    data: {
      ticks: result.ticks,
      resources: result.resources,
      jobPointsGained: result.jobPointsGained,
      progressGain: result.progressGain,
    },
  });

  // Update lastSyncedAt
  await db
    .update(users)
    .set({ lastSyncedAt: now })
    .where(eq(users.id, userId));

  return c.json({
    success: true,
    data: {
      ticks: result.ticks,
      progress: newProgress,
      isFarming: result.isFarming,
      resources: result.resources,
      jobPointsGained: result.jobPointsGained,
      nextTickIn: sector.tickSec,
    },
  });
});

// ─── POST /api/exploration/stop  { userId } ──────────────────────────────────
exploration.post("/stop", async (c) => {
  const { userId } = await c.req.json<{ userId: number }>();

  await db
    .delete(userExploration)
    .where(eq(userExploration.userId, userId));

  return c.json({ success: true, data: null });
});

// ─── GET /api/exploration/status?userId=1 ────────────────────────────────────
exploration.get("/status", async (c) => {
  const userId = Number(c.req.query("userId"));

  const [exp] = await db
    .select()
    .from(userExploration)
    .where(eq(userExploration.userId, userId));

  if (!exp) return c.json({ success: true, data: null });

  const [sector] = await db.select().from(sectors).where(eq(sectors.id, exp.sectorId));

  const elapsedSinceLastTick = Math.floor((Date.now() - exp.lastTickAt.getTime()) / 1000);
  const nextTickIn = Math.max(0, (sector?.tickSec ?? 0) - elapsedSinceLastTick);

  return c.json({
    success: true,
    data: { ...exp, nextTickIn },
  });
});

export default exploration;
