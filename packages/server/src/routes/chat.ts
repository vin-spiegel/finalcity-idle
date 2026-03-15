import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatMessages } from "../db/schema.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatMsg = {
  id:       number;
  username: string;
  body:     string;
  time:     string; // HH:MM
};

type C2S = { type: 'send'; userId: number | null; username: string; body: string };
type S2C = { type: 'history'; messages: ChatMsg[] }
         | { type: 'message'; msg: ChatMsg };

// ─── State ────────────────────────────────────────────────────────────────────

const clients = new Set<WebSocket>();

function broadcast(payload: S2C) {
  const text = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(text);
  }
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Attach to HTTP server ────────────────────────────────────────────────────

export function attachChatWs(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (ws) => {
    clients.add(ws);

    // Send history (last 50)
    const rows = await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);

    const history: ChatMsg[] = rows.reverse().map(r => ({
      id:       r.id,
      username: r.username,
      body:     r.body,
      time:     new Date(r.createdAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      }),
    }));

    ws.send(JSON.stringify({ type: 'history', messages: history } satisfies S2C));

    ws.on('message', async (raw) => {
      let data: C2S;
      try { data = JSON.parse(raw.toString()); } catch { return; }
      if (data.type !== 'send') return;

      const body = data.body.trim().slice(0, 200);
      if (!body) return;

      const [saved] = await db
        .insert(chatMessages)
        .values({ userId: data.userId ?? null, username: data.username, body })
        .returning();

      broadcast({
        type: 'message',
        msg: { id: saved.id, username: saved.username, body: saved.body, time: nowHHMM() },
      });
    });

    ws.on('close', () => clients.delete(ws));
  });
}
