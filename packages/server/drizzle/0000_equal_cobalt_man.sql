CREATE TABLE "exploration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sector_id" text NOT NULL,
	"event_type" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" text PRIMARY KEY NOT NULL,
	"zone_id" text NOT NULL,
	"name" text NOT NULL,
	"level_req" integer DEFAULT 1 NOT NULL,
	"tick_sec" integer NOT NULL,
	"danger_level" text NOT NULL,
	"job_type" text NOT NULL,
	"drop_table" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_exploration" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"sector_id" text NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_tick_at" timestamp DEFAULT now() NOT NULL,
	"is_farming" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_jobs" (
	"user_id" integer NOT NULL,
	"job_type" text NOT NULL,
	"job_points" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_mastered" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_jobs_user_id_job_type_pk" PRIMARY KEY("user_id","job_type")
);
--> statement-breakpoint
CREATE TABLE "user_resources" (
	"user_id" integer NOT NULL,
	"resource_type" text NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	CONSTRAINT "user_resources_user_id_resource_type_pk" PRIMARY KEY("user_id","resource_type")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"detection" integer DEFAULT 0 NOT NULL,
	"mana_sense" integer DEFAULT 0 NOT NULL,
	"vitality" integer DEFAULT 10 NOT NULL,
	"crafting" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "exploration_logs" ADD CONSTRAINT "exploration_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exploration_logs" ADD CONSTRAINT "exploration_logs_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_exploration" ADD CONSTRAINT "user_exploration_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_exploration" ADD CONSTRAINT "user_exploration_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_jobs" ADD CONSTRAINT "user_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_resources" ADD CONSTRAINT "user_resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;