try { process.loadEnvFile(new URL("../../.env", import.meta.url).pathname); } catch {}
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import api from "./routes/api.js";

const app = new Hono();

app.use("*", logger());

app.route("/api", api);

app.use("*", serveStatic({ root: "./dist/public" }));
app.use("*", serveStatic({ path: "./dist/public/index.html" }));

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`🏙️  FinalCity server running on http://localhost:${port}`);
});
