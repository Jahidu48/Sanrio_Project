import { NextRequest, NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  recentMessages: any[];
  musicState: any;
  qna: any;
  notes: any[];
  stamps: any[];
}

// Global in-memory storage persisted across hot-reloads and requests
const globalRooms: Map<string, RoomData> =
  (globalThis as any).__cinnamelo_sync_rooms ||
  ((globalThis as any).__cinnamelo_sync_rooms = new Map());

function getOrCreateRoom(roomId: string): RoomData {
  let room = globalRooms.get(roomId);
  if (!room) {
    room = {
      clients: new Map(),
      recentMessages: [],
      musicState: null,
      qna: null,
      notes: [],
      stamps: [],
    };
    globalRooms.set(roomId, room);
  }
  return room;
}

function getRoomPresence(room: RoomData) {
  let hasUserA = false;
  let hasUserB = false;
  const now = Date.now();

  for (const [, client] of room.clients) {
    // Treat as active if seen within last 45 seconds
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

  // Return local network IP for 2-device WiFi pairing
  if (searchParams.get("action") === "info") {
    return NextResponse.json({
      localIp: getLanIp(),
      timestamp: Date.now(),
    });
  }

  const roomId = searchParams.get("roomId") || "couple-room";
  const role = searchParams.get("role") || "user_a";
  const sessionId =
    searchParams.get("sessionId") ||
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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

      // Broadcast presence update when partner closes tab/browser
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
    const body = await request.json();
    const {
      roomId = "couple-room",
      event,
      payload,
      senderRole,
      senderSessionId,
      ...rest
    } = body;

    const room = getOrCreateRoom(roomId);

    // Update room snapshot cache for late-joining or reloading devices
    if (event === "chat-message" && payload) {
      room.recentMessages = [...room.recentMessages.slice(-49), payload];
    } else if (event === "jockie-sync" && payload) {
      room.musicState = payload;
    } else if (event === "qna-updated" && payload) {
      room.qna = payload;
    } else if (event === "note-upsert" && (rest.note || payload)) {
      const targetNote = rest.note || payload;
      const idx = room.notes.findIndex((n) => n.id === targetNote.id);
      if (idx >= 0) {
        room.notes[idx] = targetNote;
      } else {
        room.notes.unshift(targetNote);
      }
    } else if (event === "note-delete" && rest.noteId) {
      room.notes = room.notes.filter((n) => n.id !== rest.noteId);
    }

    // Format broadcast message
    const msgToSend = {
      type: event,
      payload,
      senderRole,
      senderSessionId,
      ...rest,
    };

    broadcastToRoom(room, JSON.stringify(msgToSend), senderSessionId);

    return NextResponse.json({
      success: true,
      deliveredToCount: room.clients.size,
      presence: getRoomPresence(room),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to process sync event" },
      { status: 400 }
    );
  }
}
