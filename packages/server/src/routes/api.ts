import { Hono } from "hono";
import user from "./user.js";
import zones from "./zones.js";
import exploration from "./exploration.js";
import init from "./init.js";

const api = new Hono();

api.get("/health", (c) => c.json({ status: "ok" }));

api.route("/init", init);
api.route("/user", user);
api.route("/zones", zones);
api.route("/exploration", exploration);

export default api;
