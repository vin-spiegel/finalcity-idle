import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  users,
  userExploration,
  userResources,
  userJobs,
} from "../db/schema.js";
import { getZone } from "../lib/zoneCache.js";
import { calcTicks } from "../lib/tick.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

const exploration = new Hono<AppEnv>();

// ─── Shared: process pending ticks and persist results ───────────────────────

function deriveProgress(startedAt: Date, lastTickAt: Date, tickSec: number): number {
  return Math.min(
    Math.floor((lastTickAt.getTime() - startedAt.getTime()) / (tickSec * 1000)),
    100,
  );
}

async function flushTicks(userId: number) {
  const [exp] = await db
    .select()
    .from(userExploration)
    .where(eq(userExploration.userId, userId));

  if (!exp) return null;

  // Zone from in-memory cache — no DB round-trip
  const zone = await getZone(exp.zoneId);
  if (!zone?.tickSec || !zone.dropTable) return null;

  const currentProgress = deriveProgress(exp.startedAt, exp.lastTickAt, zone.tickSec);

  const result = calcTicks({
    lastTickAt:      exp.lastTickAt,
    tickSec:         zone.tickSec,
    currentProgress,
    dropTable:       zone.dropTable,
  });

  if (result.ticks === 0) {
    const nextTickIn = zone.tickSec - Math.floor((Date.now() - exp.lastTickAt.getTime()) / 1000);
    return { result, zone, nextTickIn: Math.max(0, nextTickIn), progress: currentProgress };
  }

  // Advance lastTickAt to the exact tick boundary (not wall-clock now)
  const newLastTickAt = new Date(exp.lastTickAt.getTime() + result.ticks * zone.tickSec * 1000);
  const newProgress   = currentProgress + result.progressGain;

  await Promise.all([
    db.update(userExploration)
      .set({ lastTickAt: newLastTickAt, isFarming: result.isFarming })
      .where(eq(userExploration.userId, userId)),

    ...Object.entries(result.resources).map(([resourceType, amount]) =>
      db.insert(userResources)
        .values({ userId, resourceType, amount })
        .onConflictDoUpdate({
          target: [userResources.userId, userResources.resourceType],
          set: { amount: sql`${userResources.amount} + ${amount}` },
        })
    ),

    ...(result.jobPointsGained > 0 && zone.jobType
      ? [db.insert(userJobs)
          .values({ userId, jobType: zone.jobType, jobPoints: result.jobPointsGained, isActive: true })
          .onConflictDoUpdate({
            target: [userJobs.userId, userJobs.jobType],
            set: {
              jobPoints: sql`${userJobs.jobPoints} + ${result.jobPointsGained}`,
              isActive: true,
            },
          })]
      : []),
  ]);

  const nextTickIn = Math.max(0, zone.tickSec - Math.floor((Date.now() - newLastTickAt.getTime()) / 1000));
  return { result, zone, nextTickIn, progress: newProgress };
}

// ─── POST /api/exploration/start  { zoneId } ─────────────────────────────────
exploration.post("/start", requireAuth, async (c) => {
  const userId = c.get("userId");
  const { zoneId } = await c.req.json<{ zoneId: string }>();

  // Zone from cache + user from DB in parallel
  const [zone, [user]] = await Promise.all([
    getZone(zoneId),
    db.select().from(users).where(eq(users.id, userId)),
  ]);

  if (!zone)         return c.json({ success: false, error: "zone not found" }, 404);
  if (!zone.tickSec) return c.json({ success: false, error: "not an explorable zone" }, 400);
  if (!user)         return c.json({ success: false, error: "user not found" }, 404);

  if (user.level < zone.levelReq) {
    return c.json({ success: false, error: `level ${zone.levelReq} required` }, 403);
  }

  const now = new Date();
  await db
    .insert(userExploration)
    .values({ userId, zoneId, startedAt: now, lastTickAt: now, isFarming: false })
    .onConflictDoUpdate({
      target: userExploration.userId,
      set: { zoneId, startedAt: now, lastTickAt: now, isFarming: false },
    });

  return c.json({ success: true, data: { zoneId, startedAt: now } });
});

// ─── POST /api/exploration/sync ──────────────────────────────────────────────
exploration.post("/sync", requireAuth, async (c) => {
  const userId = c.get("userId");

  const flushed = await flushTicks(userId);
  if (!flushed) return c.json({ success: false, error: "no active exploration" }, 404);

  const { result, progress, zone, nextTickIn } = flushed;

  return c.json({
    success: true,
    data: {
      ticks:           result.ticks,
      progress,
      isFarming:       result.isFarming,
      resources:       result.resources,
      jobPointsGained: result.jobPointsGained,
      tickSec:         zone.tickSec,
      nextTickIn,
    },
  });
});

// ─── POST /api/exploration/stop ──────────────────────────────────────────────
exploration.post("/stop", requireAuth, async (c) => {
  const userId = c.get("userId");

  // Flush any pending ticks before stopping so nothing is lost
  await flushTicks(userId);
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

  const zone     = await getZone(exp.zoneId);
  const tickSec  = zone?.tickSec ?? 0;
  const nextTickIn = Math.max(0, tickSec - Math.floor((Date.now() - exp.lastTickAt.getTime()) / 1000));
  const progress   = deriveProgress(exp.startedAt, exp.lastTickAt, tickSec);

  return c.json({ success: true, data: { ...exp, tickSec, nextTickIn, progress } });
});

export default exploration;
