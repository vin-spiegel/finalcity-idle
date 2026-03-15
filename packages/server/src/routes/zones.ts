import { Hono } from "hono";
import { db } from "../db/index.js";
import { zones } from "../db/schema.js";

const zonesRoute = new Hono();

// GET /api/zones — flat list with parentId (client builds tree)
zonesRoute.get("/", async (c) => {
  const rows = await db
    .select({
      id:          zones.id,
      parentId:    zones.parentId,
      name:        zones.name,
      desc:        zones.desc,
      art:         zones.art,
      levelReq:    zones.levelReq,
      dangerLevel: zones.dangerLevel,
      tickSec:     zones.tickSec,
      jobType:     zones.jobType,
    })
    .from(zones)
    .orderBy(zones.levelReq);

  return c.json({ success: true, data: rows });
});

export default zonesRoute;
