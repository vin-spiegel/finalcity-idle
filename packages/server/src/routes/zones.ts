import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { sectors } from "../db/schema.js";

const zones = new Hono();

// GET /api/zones — distinct zone list
zones.get("/", async (c) => {
  const rows = await db
    .selectDistinct({ zoneId: sectors.zoneId })
    .from(sectors);

  return c.json({ success: true, data: rows.map((r) => r.zoneId) });
});

// GET /api/zones/:id/sectors
zones.get("/:id/sectors", async (c) => {
  const zoneId = c.req.param("id");
  const rows = await db
    .select()
    .from(sectors)
    .where(eq(sectors.zoneId, zoneId))
    .orderBy(sectors.levelReq);

  return c.json({ success: true, data: rows });
});

export default zones;
