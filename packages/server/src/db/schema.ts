import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  serial,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Static game data ────────────────────────────────────────────────────────

export const sectors = pgTable("sectors", {
  id:           text("id").primaryKey(),          // e.g. "camp3-commercial"
  zoneId:       text("zone_id").notNull(),         // e.g. "camp3"
  regionKey:    text("region_key").notNull().default(""), // e.g. "kirtas"
  name:         text("name").notNull(),
  levelReq:     integer("level_req").notNull().default(1),
  tickSec:      integer("tick_sec").notNull(),
  dangerLevel:  text("danger_level").notNull(),    // "안전"|"보통"|"위험"|"극한"
  jobType:      text("job_type").notNull(),        // "searcher"|"scholar"|"technician"|"trader"
  dropTable:    jsonb("drop_table").notNull().$type<DropEntry[]>(),
  art:          text("art").notNull().default(""),
  desc:         text("desc").notNull().default(""),
});

export type DropEntry = {
  resourceType: string;
  amount: number;
  chance: number; // 0–1
};

// ─── Player ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:             serial("id").primaryKey(),
  username:       text("username").notNull().unique(),
  level:          integer("level").notNull().default(1),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  lastSyncedAt:   timestamp("last_synced_at").notNull().defaultNow(),
});

export const userResources = pgTable("user_resources", {
  userId:       integer("user_id").notNull().references(() => users.id),
  resourceType: text("resource_type").notNull(),
  amount:       real("amount").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.userId, t.resourceType] })]);

export const userJobs = pgTable("user_jobs", {
  userId:     integer("user_id").notNull().references(() => users.id),
  jobType:    text("job_type").notNull(),
  jobPoints:  integer("job_points").notNull().default(0),
  isActive:   boolean("is_active").notNull().default(false),
  isMastered: boolean("is_mastered").notNull().default(false),
}, (t) => [primaryKey({ columns: [t.userId, t.jobType] })]);

export const userStats = pgTable("user_stats", {
  userId:     integer("user_id").notNull().primaryKey().references(() => users.id),
  detection:  integer("detection").notNull().default(0),
  manaSense:  integer("mana_sense").notNull().default(0),
  vitality:   integer("vitality").notNull().default(10),
  crafting:   integer("crafting").notNull().default(0),
});

// ─── Exploration ─────────────────────────────────────────────────────────────

export const userExploration = pgTable("user_exploration", {
  userId:      integer("user_id").notNull().primaryKey().references(() => users.id),
  sectorId:    text("sector_id").notNull().references(() => sectors.id),
  progress:    real("progress").notNull().default(0),   // 0–100
  startedAt:   timestamp("started_at").notNull().defaultNow(),
  lastTickAt:  timestamp("last_tick_at").notNull().defaultNow(),
  isFarming:   boolean("is_farming").notNull().default(false), // true after 100%
});

// ─── Logs ────────────────────────────────────────────────────────────────────

export const explorationLogs = pgTable("exploration_logs", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull().references(() => users.id),
  sectorId:  text("sector_id").notNull().references(() => sectors.id),
  eventType: text("event_type").notNull(), // "resource"|"job_up"|"event"
  data:      jsonb("data").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
