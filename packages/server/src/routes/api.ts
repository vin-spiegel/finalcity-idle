import { Hono } from "hono";

const api = new Hono();

api.get("/health", (c) => c.json({ status: "ok" }));

export default api;
