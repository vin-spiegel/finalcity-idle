import type { DropEntry } from "../db/schema.js";

export type TickResult = {
  ticks: number;
  progressGain: number;       // 0–100 range, capped at 100
  resources: Record<string, number>;
  jobPointsGained: number;
  isFarming: boolean;
};

/**
 * Calculate offline ticks since lastTickAt.
 * progressPerTick = 100 / 100 ticks to complete (fixed: each sector needs 100 ticks to explore).
 */
export function calcTicks(params: {
  lastTickAt: Date;
  tickSec: number;
  currentProgress: number;
  dropTable: DropEntry[];
}): TickResult {
  const { lastTickAt, tickSec, currentProgress, dropTable } = params;

  const elapsedMs = Date.now() - lastTickAt.getTime();
  const ticks = Math.floor(elapsedMs / (tickSec * 1000));

  if (ticks === 0) {
    return { ticks: 0, progressGain: 0, resources: {}, jobPointsGained: 0, isFarming: currentProgress >= 100 };
  }

  // Each sector needs 100 ticks to reach 100% exploration
  const progressPerTick = 1; // 1% per tick
  const rawProgress = currentProgress + ticks * progressPerTick;
  const newProgress = Math.min(rawProgress, 100);
  const progressGain = newProgress - currentProgress;
  const isFarming = rawProgress >= 100;

  // Resource accumulation
  const resources: Record<string, number> = {};
  for (let i = 0; i < ticks; i++) {
    const tickProgress = currentProgress + i + 1;
    const isCompletionTick = tickProgress === 100;

    for (const entry of dropTable) {
      // onComplete drops only happen once when progress hits exactly 100
      if (entry.onComplete && !isCompletionTick) continue;

      if (Math.random() < entry.chance) {
        const qty = Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty;
        resources[entry.resourceType] = (resources[entry.resourceType] ?? 0) + qty;
      }
    }
  }

  return {
    ticks,
    progressGain,
    resources,
    jobPointsGained: ticks,
    isFarming,
  };
}
