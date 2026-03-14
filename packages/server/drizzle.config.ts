import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

// Load root .env when running from packages/server
try { process.loadEnvFile(resolve(import.meta.dirname, "../../../.env")); } catch {}


export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
