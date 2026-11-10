import { NextRequest, NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ACTIVE_ROOMS = 200;
const ROOM_IDLE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const MAX_POST_BODY_BYTES = 1_500_000; // 1.5 MB payload cap
const RATE_LIMIT_WINDOW_MS = 10_000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 140; // Allows 60fps canvas strokes while blocking floods

function sanitizeRoomId(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "couple-room";
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned || "couple-room";
}

function getLanIp(): string {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      const list = nets[name];
      if (!list) continue;
      for (const net of list) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {}
  return "localhost";
}

interface ConnectedClient {
  id: string;
  role: string;
  controller: ReadableStreamDefaultController;
  lastSeen: number;
}

interface RoomData {
  clients: Map<string, ConnectedClient>;
  lastActivityAt: number;
  recentMessages: any[];
  musicState: any;
  qna: any;
  notes: any[];
  stamps: any[];
  coupleMeta: any;
  anniversary: any;
  heartbeatCount: number;
  moods: Record<string, any>;
  gamesState: any;
  bucketItems: any[];
  playlist: any[];
}

// Global in-memory storage persisted across hot-reloads and requests
const globalRooms: Map<string, RoomData> =
  (globalThis as any).__cinnamelo_sync_rooms ||
  ((globalThis as any).__cinnamelo_sync_rooms = new Map());

const rateLimitMap: Map<string, { count: number; resetAt: number }> =
  (globalThis as any).__cinnamelo_rate_limits ||
  ((globalThis as any).__cinnamelo_rate_limits = new Map());

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_REQUESTS_PER_WINDOW;
}

function pruneIdleRoomsIfNeeded() {
  if (globalRooms.size < MAX_ACTIVE_ROOMS) return;
  const now = Date.now();

  for (const [id, room] of globalRooms) {
    if (room.clients.size === 0 && now - room.lastActivityAt > ROOM_IDLE_TTL_MS) {
      globalRooms.delete(id);
    }
  }

  // If still at capacity, evict the oldest room with 0 active clients
  if (globalRooms.size >= MAX_ACTIVE_ROOMS) {
    let oldestId: string | null = null;
    let oldestTs = Infinity;
    for (const [id, room] of globalRooms) {
      if (room.clients.size === 0 && room.lastActivityAt < oldestTs) {
        oldestTs = room.lastActivityAt;
        oldestId = id;
      }
    }
    if (oldestId) {
      globalRooms.delete(oldestId);
    }
  }
}

function getOrCreateRoom(rawRoomId: string): RoomData {
  const roomId = sanitizeRoomId(rawRoomId);
  let room = globalRooms.get(roomId);
  if (!room) {
    pruneIdleRoomsIfNeeded();
    room = {
      clients: new Map(),
      lastActivityAt: Date.now(),
      recentMessages: [],
      musicState: null,
      qna: null,
      notes: [],
      stamps: [],
      coupleMeta: null,
      anniversary: null,
      heartbeatCount: 0,
      moods: {},
      gamesState: null,
      bucketItems: [],
      playlist: [],
    };
    globalRooms.set(roomId, room);
  } else {
    room.lastActivityAt = Date.now();
  }
  return room;
}

function getRoomPresence(room: RoomData) {
  let hasUserA = false;
  let hasUserB = false;
  const now = Date.now();

  for (const [, client] of room.clients) {
    if (now - client.lastSeen < 45000) {
      if (client.role === "user_a") hasUserA = true;
      if (client.role === "user_b") hasUserB = true;
    }
  }

  return {
    user_a: hasUserA,
    user_b: hasUserB,
    bothOnline: hasUserA && hasUserB,
    totalDevices: room.clients.size,
  };
}

function broadcastToRoom(
  room: RoomData,
  payloadStr: string,
  excludeSessionId?: string
) {
  const encoder = new TextEncoder();
  const chunk = encoder.encode(`data: ${payloadStr}\n\n`);
  const deadClientIds: string[] = [];

  for (const [id, client] of room.clients) {
    if (excludeSessionId && id === excludeSessionId) continue;
    try {
      client.controller.enqueue(chunk);
    } catch {
      deadClientIds.push(id);
    }
  }

  for (const deadId of deadClientIds) {
    room.clients.delete(deadId);
  }
}

/**
 * GET /api/realtime-sync?roomId=...&role=...&sessionId=...
 * Server-Sent Events stream for instant 2-device bidirectional synchronization
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("action") === "info") {
    return NextResponse.json({
      localIp: getLanIp(),
      timestamp: Date.now(),
    });
  }

  const roomId = sanitizeRoomId(searchParams.get("roomId"));
  const rawRole = searchParams.get("role");
  const role = rawRole === "user_b" ? "user_b" : "user_a";
  const sessionId = (
    searchParams.get("sessionId") ||
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  ).slice(0, 64);

  const room = getOrCreateRoom(roomId);
  const encoder = new TextEncoder();

  let keepAliveInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const client: ConnectedClient = {
        id: sessionId,
        role,
        controller,
        lastSeen: Date.now(),
      };
      room.clients.set(sessionId, client);

      // 1. Send initial connection snapshot
      const presence = getRoomPresence(room);
      const snapshotEvent = {
        type: "snapshot",
        payload: {
          presence,
          musicState: room.musicState,
          recentMessages: room.recentMessages,
          qna: room.qna,
          notes: room.notes,
          coupleMeta: room.coupleMeta,
          anniversary: room.anniversary,
          heartbeatCount: room.heartbeatCount,
          moods: room.moods,
          gamesState: room.gamesState,
          bucketItems: room.bucketItems,
          playlist: room.playlist,
        },
      };
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(snapshotEvent)}\n\n`)
      );

      // 2. Broadcast updated presence to partner device
      broadcastToRoom(
        room,
        JSON.stringify({
          type: "presence",
          payload: presence,
        }),
        sessionId
      );

      // 3. Keep-alive ping every 15s to prevent timeouts
      keepAliveInterval = setInterval(() => {
        try {
          client.lastSeen = Date.now();
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (keepAliveInterval) clearInterval(keepAliveInterval);
          room.clients.delete(sessionId);
        }
      }, 15000);
    },
    cancel() {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      room.clients.delete(sessionId);

      const presence = getRoomPresence(room);
      broadcastToRoom(
        room,
        JSON.stringify({
          type: "presence",
          payload: presence,
        })
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * POST /api/realtime-sync
 * Dispatches sync events (chat, music, heartbeat, strokes, QnA, notes) to peer devices
 */
export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_POST_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Ukuran data terlalu besar (Maks 1.5MB)." },
        { status: 413 }
      );
    }

    const rawText = await request.text();
    if (rawText.length > MAX_POST_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Ukuran data terlalu besar (Maks 1.5MB)." },
        { status: 413 }
      );
    }

    const body = JSON.parse(rawText);
    const {
      roomId: rawRoomId = "couple-room",
      event,
      payload,
      senderRole,
      senderSessionId,
      ...rest
    } = body;

    const roomId = sanitizeRoomId(rawRoomId);
    const rateKey = `${roomId}:${senderSessionId || senderRole || "anon"}`;
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json(
        { ok: false, error: "Terlalu banyak permintaan sinkronisasi." },
        { status: 429 }
      );
    }

    const room = getOrCreateRoom(roomId);

    // Update room snapshot cache with bounded collections
    if (event === "chat-message" && payload) {
      room.recentMessages = [...room.recentMessages.slice(-49), payload];
    } else if (event === "jockie-sync" && payload) {
      room.musicState = payload;
    } else if (event === "qna-updated" && payload) {
      room.qna = payload;
    } else if (event === "couple-meta-sync" && payload) {
      room.coupleMeta = {
        ...payload,
        updatedAt: Math.max(
          Date.now(),
          Number(payload.updatedAt) || 0,
          (room.coupleMeta?.updatedAt || 0) + 1
        ),
      };
    } else if (event === "anniversary-sync" && payload) {
      room.anniversary = {
        ...payload,
        updatedAt: Math.max(
          Date.now(),
          Number(payload.updatedAt) || 0,
          (room.anniversary?.updatedAt || 0) + 1
        ),
      };
    } else if (event === "heartbeat") {
      room.heartbeatCount = (room.heartbeatCount || 0) + 1;
    } else if (event === "partner-mood" && payload?.role) {
      room.moods[payload.role] = payload;
    } else if (event === "games-sync" && (rest.state || payload?.state)) {
      room.gamesState = rest.state || payload.state;
    } else if (event === "bucket-sync" && (rest.items || payload?.items)) {
      const items = rest.items || payload.items;
      if (Array.isArray(items)) {
        room.bucketItems = items.slice(0, 150);
      }
    } else if (event === "playlist-sync" && payload?.items) {
      if (Array.isArray(payload.items)) {
        room.playlist = payload.items.slice(0, 100);
      }
    } else if (event === "note-upsert" && (rest.note || payload)) {
      const targetNote = rest.note || payload;
      const idx = room.notes.findIndex((n) => n.id === targetNote.id);
      if (idx >= 0) {
        room.notes[idx] = targetNote;
      } else {
        room.notes = [targetNote, ...room.notes].slice(0, 100);
      }
    } else if (event === "note-delete" && rest.noteId) {
      room.notes = room.notes.filter((n) => n.id !== rest.noteId);
    }

    const msgToSend = {
      type: event,
      payload,
      senderRole,
      senderSessionId,
      ...rest,
    };

    broadcastToRoom(room, JSON.stringify(msgToSend), senderSessionId);

    return NextResponse.json({
      ok: true,
      presence: getRoomPresence(room),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Invalid sync payload" },
      { status: 400 }
    );
  }
}
