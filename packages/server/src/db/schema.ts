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
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// ─── Auth (better-auth managed tables) ───────────────────────────────────────

export const authUser = pgTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image:         text("image"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export const authSession = pgTable("session", {
  id:        text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token:     text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId:    text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
});

export const authAccount = pgTable("account", {
  id:                    text("id").primaryKey(),
  accountId:             text("account_id").notNull(),
  providerId:            text("provider_id").notNull(),
  userId:                text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  accessToken:           text("access_token"),
  refreshToken:          text("refresh_token"),
  idToken:               text("id_token"),
  accessTokenExpiresAt:  timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope:                 text("scope"),
  password:              text("password"),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});

export const authVerification = pgTable("verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow(),
});

// ─── Static game data ────────────────────────────────────────────────────────

export type DropEntry = {
  resourceType: string;
  chance:       number;  // 0–1
  minQty:       number;
  maxQty:       number;
  onComplete?:  boolean; // if true, only drops when exploration progress reaches 100
};

// Recursive zone tree: branches have children, leaves have tickSec/dropTable
export const zones = pgTable("zones", {
  id:          text("id").primaryKey(),
  parentId:    text("parent_id").references((): AnyPgColumn => zones.id),
  name:        text("name").notNull(),
  desc:        text("desc").notNull().default(""),
  art:         text("art").notNull().default(""),
  levelReq:    integer("level_req").notNull().default(1),
  dangerLevel: text("danger_level").notNull().default("안전"),
  // leaf-only (null for branch nodes):
  tickSec:     integer("tick_sec"),
  actionType:  text("action_type"),
  jobType:     text("job_type"),
  dropTable:   jsonb("drop_table").$type<DropEntry[]>(),
});

// ─── Player ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:        serial("id").primaryKey(),
  authId:    text("auth_id").unique().references(() => authUser.id),
  username:  text("username").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  userId:    integer("user_id").notNull().primaryKey().references(() => users.id),
  detection: integer("detection").notNull().default(0),
  manaSense: integer("mana_sense").notNull().default(0),
  vitality:  integer("vitality").notNull().default(10),
  crafting:  integer("crafting").notNull().default(0),
});

// ─── Exploration ─────────────────────────────────────────────────────────────

export const userExploration = pgTable("user_exploration", {
  userId:     integer("user_id").notNull().primaryKey().references(() => users.id),
  zoneId:     text("zone_id").notNull().references(() => zones.id),
  startedAt:  timestamp("started_at").notNull().defaultNow(),
  lastTickAt: timestamp("last_tick_at").notNull().defaultNow(),
  isFarming:  boolean("is_farming").notNull().default(false),
});

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").references(() => users.id),
  username:  text("username").notNull(),
  body:      text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

