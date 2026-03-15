import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const client = postgres(connectionString, {
  max:             5,    // Railway free tier has connection limits
  connect_timeout: 10,   // fail fast if DB unreachable
});
export const db = drizzle(client, { schema });
