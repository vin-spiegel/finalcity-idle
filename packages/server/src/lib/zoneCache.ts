import { asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { zones } from "../db/schema.js";

type ZoneRow = typeof zones.$inferSelect;

let cache: ZoneRow[] | null = null;

export async function getZones(): Promise<ZoneRow[]> {
  if (!cache) {
    cache = await db.select().from(zones).orderBy(asc(zones.sortOrder), asc(zones.levelReq));
  }
  return cache;
}

export async function getZone(id: string): Promise<ZoneRow | null> {
  const all = await getZones();
  return all.find(z => z.id === id) ?? null;
}

/** Call after seeding/updating zone data to force a fresh fetch. */
export function invalidateZoneCache() {
  cache = null;
}
