import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import api from "./routes/api.js";
import { auth } from "./lib/auth.js";
import { attachChatWs } from "./routes/chat.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.BETTER_AUTH_URL ?? "",
    ],
    allowHeaders:     ["Content-Type", "Authorization"],
    allowMethods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders:    ["Set-Cookie"],
    credentials:      true,
  }),
);

// better-auth handles all /api/auth/* routes
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api", api);

app.use("*", serveStatic({ root: "./dist/public" }));
app.use("*", serveStatic({ path: "./dist/public/index.html" }));

const port = Number(process.env.PORT) || 3000;

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`🏙️  FinalCity server running on http://localhost:${port}`);
});

attachChatWs(server as Parameters<typeof attachChatWs>[0]);
