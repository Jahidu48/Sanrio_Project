"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { getDailyPromptForDate, getTodayDateISO } from "@/lib/prompts";
import {
  createInitialGamesState,
  getSeedBucketItems,
  getSeedChatMessages,
  getSeedSharedNotes,
} from "@/lib/gameData";
import type {
  BucketCategory,
  BucketItem,
  CanvasStamp,
  ChatMessage,
  ChatMessageType,
  ChatTypingStatus,
  CoupleGamesState,
  CoupleProfile,
  DailyQnA,
  HeartbeatEvent,
  MusicSyncEvent,
  NoteMood,
  NoteTypingStatus,
  PartnerCursor,
  PartnerMoodStatus,
  PartnerRole,
  SharedNote,
  SharedPlaylistItem,
  StrokeSegment,
  WebRTCSignalMessage,
} from "@/lib/types";
import type { SanrioCharacterId } from "@/lib/sanrioCharacters";

interface UseCoupleRealtimeOptions {
  profile: CoupleProfile;
  onHeartbeatReceived?: (event: HeartbeatEvent) => void;
  onRemoteStroke?: (segment: StrokeSegment) => void;
  onRemoteClearCanvas?: () => void;
  onRemoteMiniDoodleStroke?: (segment: StrokeSegment) => void;
  onRemoteMiniDoodleClear?: () => void;
  onIncomingChatMessage?: (msg: ChatMessage) => void;
  onIncomingCallSignal?: (signal: WebRTCSignalMessage) => void;
  onMusicSyncReceived?: (event: MusicSyncEvent) => void;
}

const LOCAL_QNA_STORAGE_KEY = "cinnamelo_daily_qna_v2";
const LOCAL_STAMPS_STORAGE_KEY = "cinnamelo_canvas_stamps_v2";
const LOCAL_NOTES_STORAGE_KEY = "cinnamelo_shared_notes_v2";
const LOCAL_BUCKET_STORAGE_KEY = "cinnamelo_bucket_list_v2";
const LOCAL_GAMES_STORAGE_KEY = "cinnamelo_couple_games_v2";
const LOCAL_CHAT_STORAGE_KEY = "cinnamelo_chat_messages_v2";
const LOCAL_MOOD_KEY = "cinnamelo_partner_mood_v2";
const LOCAL_PLAYLIST_KEY = "cinnamelo_shared_playlist_v2";

const SEED_PLAYLIST: SharedPlaylistItem[] = [
  {
    id: "track-1-musicbox",
    room_id: "couple-room",
    title: "Cinnamoroll Music Box (Acoustic J-Pop)",
    artist: "Sanrio Melody Studio",
    source: "file",
    url: "/sounds/bgm-musicbox.mp3",
    added_by: "System",
    created_at: new Date().toISOString(),
  },
  {
    id: "track-2-melody",
    room_id: "couple-room",
    title: "My Melody Sweet Lullaby (Pastel Piano)",
    artist: "Sanrio Melody Studio",
    source: "file",
    url: "/sounds/bgm-melody-lullaby.mp3",
    added_by: "System",
    created_at: new Date().toISOString(),
  },
  {
    id: "track-3-kuromi",
    room_id: "couple-room",
    title: "Kuromi Midnight Lo-Fi Beats (Chill Cozy)",
    artist: "Kuromi Lo-Fi Beats",
    source: "file",
    url: "/sounds/bgm-kuromi-lofi.mp3",
    added_by: "System",
    created_at: new Date().toISOString(),
  },
  {
    id: "track-4-sky",
    room_id: "couple-room",
    title: "Pastel Clouds & Sweet Dreams ☁️",
    artist: "ChilledCow Lofi",
    source: "youtube",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    added_by: "System",
    created_at: new Date().toISOString(),
  },
];

export function useCoupleRealtime({
  profile,
  onHeartbeatReceived,
  onRemoteStroke,
  onRemoteClearCanvas,
  onRemoteMiniDoodleStroke,
  onRemoteMiniDoodleClear,
  onIncomingChatMessage,
  onIncomingCallSignal,
  onMusicSyncReceived,
}: UseCoupleRealtimeOptions) {
  const sessionId = useMemo(
    () => `sess_${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  const [connectionMode, setConnectionMode] = useState<
    "supabase" | "local-realtime"
  >(isSupabaseConfigured ? "supabase" : "local-realtime");
  const [onlineRoles, setOnlineRoles] = useState<Set<PartnerRole>>(
    () => new Set([profile.role])
  );
  const [simulatePartnerOnline, setSimulatePartnerOnline] = useState(false);

  const todayISO = useMemo(() => getTodayDateISO(), []);
  const todayQuestion = useMemo(
    () => getDailyPromptForDate(todayISO),
    [todayISO]
  );

  const [todayQnA, setTodayQnA] = useState<DailyQnA>(() => ({
    id: `qna-${profile.roomId}-${todayISO}`,
    room_id: profile.roomId,
    prompt_date: todayISO,
    question: todayQuestion,
    user_a_name: profile.userAName,
    user_b_name: profile.userBName,
    user_a_answer: null,
    user_b_answer: null,
    user_a_answered_at: null,
    user_b_answered_at: null,
    is_unlocked: false,
  }));

  // Canvas state
  const [stamps, setStamps] = useState<CanvasStamp[]>([]);
  const [partnerCursor, setPartnerCursor] = useState<PartnerCursor | null>(null);

  // Shared Collaborative Journal & Bucket List state
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);
  const [partnerTyping, setPartnerTyping] = useState<NoteTypingStatus | null>(
    null
  );

  // 2-Player Couple Games state
  const [gamesState, setGamesState] = useState<CoupleGamesState>(() =>
    createInitialGamesState()
  );

  // Couple Messenger & WebRTC Call state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatTyping, setChatTyping] = useState<ChatTypingStatus | null>(null);
  const [activeIncomingCall, setActiveIncomingCall] =
    useState<WebRTCSignalMessage | null>(null);
  const [callSignalQueue, setCallSignalQueue] =
    useState<WebRTCSignalMessage | null>(null);

  // Sanrio Mood & Synchronized Shared Music state
  const [partnerMood, setPartnerMood] = useState<PartnerMoodStatus | null>(null);
  const [myMood, setMyMood] = useState<PartnerMoodStatus>(() => ({
    role: profile.role,
    characterId:
      (profile.role === "user_a"
        ? profile.userACharacter
        : profile.userBCharacter) || "cinnamoroll",
    statusText: "Kangen ☁️",
    emoji: "☁️",
    updatedAt: Date.now(),
  }));
  const [musicSyncEvent, setMusicSyncEvent] = useState<MusicSyncEvent | null>(
    null
  );
  const [sharedPlaylist, setSharedPlaylist] = useState<SharedPlaylistItem[]>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const saved = window.localStorage.getItem(
            `${LOCAL_PLAYLIST_KEY}:${profile.roomId}`
          );
          if (saved) return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
      return SEED_PLAYLIST;
    }
  );

  const supabaseChannelRef = useRef<RealtimeChannel | null>(null);
  const localBroadcastRef = useRef<BroadcastChannel | null>(null);
  const localPeerMapRef = useRef<
    Map<string, { role: PartnerRole; lastSeen: number }>
  >(new Map());
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  const heartbeatCallbackRef = useRef(onHeartbeatReceived);
  heartbeatCallbackRef.current = onHeartbeatReceived;

  const musicSyncCallbackRef = useRef(onMusicSyncReceived);
  musicSyncCallbackRef.current = onMusicSyncReceived;

  const strokeCallbackRef = useRef(onRemoteStroke);
  strokeCallbackRef.current = onRemoteStroke;

  const clearCanvasCallbackRef = useRef(onRemoteClearCanvas);
  clearCanvasCallbackRef.current = onRemoteClearCanvas;

  const miniDoodleStrokeRef = useRef(onRemoteMiniDoodleStroke);
  miniDoodleStrokeRef.current = onRemoteMiniDoodleStroke;

  const miniDoodleClearRef = useRef(onRemoteMiniDoodleClear);
  miniDoodleClearRef.current = onRemoteMiniDoodleClear;

  const incomingChatCallbackRef = useRef(onIncomingChatMessage);
  incomingChatCallbackRef.current = onIncomingChatMessage;

  const incomingCallCallbackRef = useRef(onIncomingCallSignal);
  incomingCallCallbackRef.current = onIncomingCallSignal;

  const markSeen = useCallback((id: string): boolean => {
    if (seenEventIdsRef.current.has(id)) return true;
    seenEventIdsRef.current.add(id);
    if (seenEventIdsRef.current.size > 500) {
      const first = seenEventIdsRef.current.values().next().value;
      if (first) seenEventIdsRef.current.delete(first);
    }
    return false;
  }, []);

  // Load initial data from Supabase (or localStorage fallback)
  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    async function loadInitialData() {
      // Load local games & stamps regardless so ephemeral playground feels continuous
      try {
        const rawGames = window.localStorage.getItem(
          `${LOCAL_GAMES_STORAGE_KEY}:${profile.roomId}`
        );
        if (rawGames && !cancelled) {
          setGamesState(JSON.parse(rawGames));
        }
        const rawStamps = window.localStorage.getItem(
          `${LOCAL_STAMPS_STORAGE_KEY}:${profile.roomId}`
        );
        if (rawStamps && !cancelled) {
          setStamps(JSON.parse(rawStamps));
        }
      } catch {
        // ignore
      }

      if (supabase) {
        try {
          const { data: qnaRow } = await supabase
            .from("daily_qna")
            .select("*")
            .eq("room_id", profile.roomId)
            .eq("prompt_date", todayISO)
            .maybeSingle();

          if (qnaRow && !cancelled) {
            setTodayQnA(qnaRow as DailyQnA);
          }

          const { data: notesRows } = await supabase
            .from("shared_notes")
            .select("*")
            .eq("room_id", profile.roomId)
            .order("is_pinned", { ascending: false })
            .order("updated_at", { ascending: false });

          if (!cancelled) {
            if (notesRows && notesRows.length > 0) {
              setSharedNotes(notesRows as SharedNote[]);
            } else {
              setSharedNotes(
                getSeedSharedNotes(
                  profile.roomId,
                  profile.userAName,
                  profile.userBName
                )
              );
            }
          }

          const { data: bucketRows } = await supabase
            .from("bucket_list_items")
            .select("*")
            .eq("room_id", profile.roomId)
            .order("created_at", { ascending: false });

          if (!cancelled) {
            if (bucketRows && bucketRows.length > 0) {
              setBucketItems(bucketRows as BucketItem[]);
            } else {
              setBucketItems(
                getSeedBucketItems(
                  profile.roomId,
                  profile.userAName,
                  profile.userBName
                )
              );
            }
          }

          // Load chat messages
          const { data: chatRows } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("room_id", profile.roomId)
            .order("created_at", { ascending: true })
            .limit(250);

          if (!cancelled) {
            if (chatRows && chatRows.length > 0) {
              setChatMessages(chatRows as ChatMessage[]);
            } else {
              const seeded = getSeedChatMessages(
                profile.roomId,
                profile.userAName,
                profile.userBName
              );
              setChatMessages(seeded);
            }
          }

          setConnectionMode("supabase");
          return;
        } catch {
          // Fallback to local cross-tab realtime
        }
      }

      if (cancelled) return;
      setConnectionMode("local-realtime");

      try {
        const rawQnA = window.localStorage.getItem(
          `${LOCAL_QNA_STORAGE_KEY}:${profile.roomId}:${todayISO}`
        );
        if (rawQnA) {
          setTodayQnA(JSON.parse(rawQnA));
        }

        const rawNotes = window.localStorage.getItem(
          `${LOCAL_NOTES_STORAGE_KEY}:${profile.roomId}`
        );
        if (rawNotes) {
          setSharedNotes(JSON.parse(rawNotes));
        } else {
          const seededNotes = getSeedSharedNotes(
            profile.roomId,
            profile.userAName,
            profile.userBName
          );
          setSharedNotes(seededNotes);
          window.localStorage.setItem(
            `${LOCAL_NOTES_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(seededNotes)
          );
        }

        const rawBucket = window.localStorage.getItem(
          `${LOCAL_BUCKET_STORAGE_KEY}:${profile.roomId}`
        );
        if (rawBucket) {
          setBucketItems(JSON.parse(rawBucket));
        } else {
          const seededBucket = getSeedBucketItems(
            profile.roomId,
            profile.userAName,
            profile.userBName
          );
          setBucketItems(seededBucket);
          window.localStorage.setItem(
            `${LOCAL_BUCKET_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(seededBucket)
          );
        }

        // Local chat messages
        const rawChat = window.localStorage.getItem(
          `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`
        );
        if (rawChat) {
          setChatMessages(JSON.parse(rawChat));
        } else {
          const seededChat = getSeedChatMessages(
            profile.roomId,
            profile.userAName,
            profile.userBName
          );
          setChatMessages(seededChat);
          window.localStorage.setItem(
            `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(seededChat)
          );
        }
      } catch {
        // ignore storage errors
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [profile.roomId, profile.userAName, profile.userBName, todayISO]);

  // Subscribe to Supabase Realtime ('couple-room') + Local BroadcastChannel Bridge
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channelName = profile.roomId || "couple-room";

    const applyIncomingNote = (note: SharedNote) => {
      setSharedNotes((prev) => {
        const exists = prev.some((n) => n.id === note.id);
        const next = exists
          ? prev.map((n) => (n.id === note.id ? note : n))
          : [note, ...prev];
        try {
          window.localStorage.setItem(
            `${LOCAL_NOTES_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });
    };

    const applyDeleteNote = (noteId: string) => {
      setSharedNotes((prev) => {
        const next = prev.filter((n) => n.id !== noteId);
        try {
          window.localStorage.setItem(
            `${LOCAL_NOTES_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });
    };

    const applyIncomingBucketList = (items: BucketItem[]) => {
      setBucketItems(items);
      try {
        window.localStorage.setItem(
          `${LOCAL_BUCKET_STORAGE_KEY}:${profile.roomId}`,
          JSON.stringify(items)
        );
      } catch {
        // ignore
      }
    };

    const applyIncomingChatMessage = (msg: ChatMessage) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        try {
          window.localStorage.setItem(
            `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });
      if (msg.sender_role !== profile.role) {
        incomingChatCallbackRef.current?.(msg);

        // If partner executed a bot command (!play, !pause, etc.), execute on receiver too
        if (msg.text?.startsWith("!") && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("jockie-command", { detail: { text: msg.text } })
          );
        }
      }
    };

    const applyChatReaction = (messageId: string, emoji: string, role: PartnerRole) => {
      setChatMessages((prev) => {
        const next = prev.map((m) => {
          if (m.id !== messageId) return m;
          const currentReactions = m.reactions || {};
          const currentRoles = currentReactions[emoji] || [];
          const exists = currentRoles.includes(role);
          const nextRoles = exists
            ? currentRoles.filter((r) => r !== role)
            : [...currentRoles, role];
          const updatedReactions = { ...currentReactions };
          if (nextRoles.length === 0) {
            delete updatedReactions[emoji];
          } else {
            updatedReactions[emoji] = nextRoles;
          }
          return { ...m, reactions: updatedReactions };
        });
        try {
          window.localStorage.setItem(
            `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });
    };

    const applyChatReadStatus = (readerRole: PartnerRole) => {
      if (readerRole === profile.role) return;
      setChatMessages((prev) => {
        const next = prev.map((m) =>
          m.sender_role === profile.role ? { ...m, is_read: true } : m
        );
        try {
          window.localStorage.setItem(
            `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });
    };

    const handleWebRTCSignal = (signal: WebRTCSignalMessage) => {
      if (signal.caller_role === profile.role) return;
      if (signal.type === "call-offer") {
        setActiveIncomingCall(signal);
        incomingCallCallbackRef.current?.(signal);
      } else if (signal.type === "call-end" || signal.type === "call-reject") {
        setActiveIncomingCall(null);
      }
      setCallSignalQueue(signal);
    };

    if (supabase) {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId },
        },
      });

      channel
        .on("broadcast", { event: "heartbeat" }, ({ payload }) => {
          const event = payload as HeartbeatEvent;
          if (!event?.id || markSeen(event.id)) return;
          heartbeatCallbackRef.current?.(event);
        })
        .on("broadcast", { event: "qna-updated" }, ({ payload }) => {
          const updated = payload as DailyQnA;
          if (updated?.prompt_date === todayISO) {
            setTodayQnA(updated);
          }
        })
        .on("broadcast", { event: "canvas-stroke" }, ({ payload }) => {
          const seg = payload as StrokeSegment;
          if (!seg?.id || markSeen(seg.id)) return;
          strokeCallbackRef.current?.(seg);
        })
        .on("broadcast", { event: "canvas-stamp" }, ({ payload }) => {
          const stamp = payload as CanvasStamp;
          if (!stamp?.id || markSeen(stamp.id)) return;
          setStamps((prev) => [...prev, stamp]);
        })
        .on("broadcast", { event: "canvas-clear" }, ({ payload }) => {
          const clearId = (payload as { id?: string })?.id;
          if (clearId && markSeen(clearId)) return;
          setStamps([]);
          clearCanvasCallbackRef.current?.();
        })
        .on("broadcast", { event: "canvas-cursor" }, ({ payload }) => {
          const cursor = payload as PartnerCursor;
          if (cursor && cursor.role !== profile.role) {
            setPartnerCursor(cursor);
          }
        })
        .on("broadcast", { event: "note-upsert" }, ({ payload }) => {
          const msg = payload as { eventId: string; note: SharedNote };
          if (!msg?.eventId || markSeen(msg.eventId)) return;
          applyIncomingNote(msg.note);
        })
        .on("broadcast", { event: "note-delete" }, ({ payload }) => {
          const msg = payload as { eventId: string; noteId: string };
          if (!msg?.eventId || markSeen(msg.eventId)) return;
          applyDeleteNote(msg.noteId);
        })
        .on("broadcast", { event: "note-typing" }, ({ payload }) => {
          const typing = payload as NoteTypingStatus;
          if (typing && typing.role !== profile.role) {
            setPartnerTyping(typing);
          }
        })
        .on("broadcast", { event: "bucket-sync" }, ({ payload }) => {
          const msg = payload as { eventId: string; items: BucketItem[] };
          if (!msg?.eventId || markSeen(msg.eventId)) return;
          applyIncomingBucketList(msg.items);
        })
        .on("broadcast", { event: "games-sync" }, ({ payload }) => {
          const msg = payload as {
            eventId: string;
            state: CoupleGamesState;
          };
          if (!msg?.eventId || markSeen(msg.eventId)) return;
          setGamesState(msg.state);
        })
        .on("broadcast", { event: "mini-doodle-stroke" }, ({ payload }) => {
          const seg = payload as StrokeSegment;
          if (!seg?.id || markSeen(seg.id)) return;
          miniDoodleStrokeRef.current?.(seg);
        })
        .on("broadcast", { event: "mini-doodle-clear" }, ({ payload }) => {
          const id = (payload as { id?: string })?.id;
          if (id && markSeen(id)) return;
          miniDoodleClearRef.current?.();
        })
        .on("broadcast", { event: "chat-message" }, ({ payload }) => {
          const msg = payload as ChatMessage;
          if (!msg?.id || markSeen(msg.id)) return;
          applyIncomingChatMessage(msg);
        })
        .on("broadcast", { event: "chat-typing" }, ({ payload }) => {
          const status = payload as ChatTypingStatus;
          if (status && status.role !== profile.role) {
            setChatTyping(status);
          }
        })
        .on("broadcast", { event: "chat-reaction" }, ({ payload }) => {
          const p = payload as { messageId: string; emoji: string; role: PartnerRole };
          if (p?.messageId && p?.emoji) {
            applyChatReaction(p.messageId, p.emoji, p.role);
          }
        })
        .on("broadcast", { event: "chat-read" }, ({ payload }) => {
          const p = payload as { role: PartnerRole };
          if (p?.role) {
            applyChatReadStatus(p.role);
          }
        })
        .on("broadcast", { event: "webrtc-signal" }, ({ payload }) => {
          const signal = payload as WebRTCSignalMessage;
          if (signal?.id && !markSeen(signal.id)) {
            handleWebRTCSignal(signal);
          }
        })
        .on("broadcast", { event: "partner-mood" }, ({ payload }) => {
          const status = payload as PartnerMoodStatus;
          if (status && status.role !== profile.role) {
            setPartnerMood(status);
          }
        })
        .on("broadcast", { event: "music-sync" }, ({ payload }) => {
          const syncEv = payload as MusicSyncEvent;
          if (syncEv && syncEv.senderRole !== profile.role) {
            setMusicSyncEvent(syncEv);
            musicSyncCallbackRef.current?.(syncEv);
          }
        })
        .on("broadcast", { event: "playlist-sync" }, ({ payload }) => {
          const p = payload as { items: SharedPlaylistItem[] };
          if (p?.items) {
            setSharedPlaylist(p.items);
            try {
              window.localStorage.setItem(
                `${LOCAL_PLAYLIST_KEY}:${profile.roomId}`,
                JSON.stringify(p.items)
              );
            } catch {
              // ignore
            }
          }
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<{
            role: PartnerRole;
            name: string;
          }>();
          const activeRoles = new Set<PartnerRole>([profile.role]);
          Object.values(state).forEach((presences) => {
            presences.forEach((p) => {
              if (p.role) activeRoles.add(p.role);
            });
          });
          setOnlineRoles(activeRoles);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              role: profile.role,
              name:
                profile.role === "user_a"
                  ? profile.userAName
                  : profile.userBName,
              online_at: new Date().toISOString(),
            });
          }
        });

      supabaseChannelRef.current = channel;
    }

    // Local Cross-Tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    let presenceTimer: number | null = null;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel(`cinnamelo:${channelName}`);
      localBroadcastRef.current = bc;

      const recomputeLocalPeers = () => {
        const now = Date.now();
        const active = new Set<PartnerRole>([profile.role]);
        localPeerMapRef.current.forEach((val, key) => {
          if (now - val.lastSeen < 6500) {
            active.add(val.role);
          } else {
            localPeerMapRef.current.delete(key);
          }
        });
        if (!supabase) {
          setOnlineRoles(active);
        }
      };

      bc.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || typeof msg !== "object") return;

        switch (msg.type) {
          case "presence-ping":
            localPeerMapRef.current.set(msg.sessionId, {
              role: msg.role,
              lastSeen: Date.now(),
            });
            recomputeLocalPeers();
            break;
          case "presence-leave":
            localPeerMapRef.current.delete(msg.sessionId);
            recomputeLocalPeers();
            break;
          case "heartbeat": {
            const event = msg.payload as HeartbeatEvent;
            if (!event?.id || markSeen(event.id)) return;
            heartbeatCallbackRef.current?.(event);
            break;
          }
          case "qna-updated": {
            const updated = msg.payload as DailyQnA;
            if (updated?.prompt_date === todayISO) setTodayQnA(updated);
            break;
          }
          case "canvas-stroke": {
            const seg = msg.payload as StrokeSegment;
            if (!seg?.id || markSeen(seg.id)) return;
            strokeCallbackRef.current?.(seg);
            break;
          }
          case "canvas-stamp": {
            const stamp = msg.payload as CanvasStamp;
            if (!stamp?.id || markSeen(stamp.id)) return;
            setStamps((prev) => [...prev, stamp]);
            break;
          }
          case "canvas-clear": {
            if (msg.id && markSeen(msg.id)) return;
            setStamps([]);
            clearCanvasCallbackRef.current?.();
            break;
          }
          case "canvas-cursor": {
            const cursor = msg.payload as PartnerCursor;
            if (cursor && cursor.role !== profile.role) setPartnerCursor(cursor);
            break;
          }
          case "note-upsert": {
            if (!msg.eventId || markSeen(msg.eventId)) return;
            applyIncomingNote(msg.note as SharedNote);
            break;
          }
          case "note-delete": {
            if (!msg.eventId || markSeen(msg.eventId)) return;
            applyDeleteNote(msg.noteId as string);
            break;
          }
          case "note-typing": {
            const typing = msg.payload as NoteTypingStatus;
            if (typing && typing.role !== profile.role) setPartnerTyping(typing);
            break;
          }
          case "bucket-sync": {
            if (!msg.eventId || markSeen(msg.eventId)) return;
            applyIncomingBucketList(msg.items as BucketItem[]);
            break;
          }
          case "games-sync": {
            if (!msg.eventId || markSeen(msg.eventId)) return;
            setGamesState(msg.state as CoupleGamesState);
            break;
          }
          case "mini-doodle-stroke": {
            const seg = msg.payload as StrokeSegment;
            if (!seg?.id || markSeen(seg.id)) return;
            miniDoodleStrokeRef.current?.(seg);
            break;
          }
          case "mini-doodle-clear": {
            if (msg.id && markSeen(msg.id)) return;
            miniDoodleClearRef.current?.();
            break;
          }
          case "chat-message": {
            const m = msg.payload as ChatMessage;
            if (!m?.id || markSeen(m.id)) return;
            applyIncomingChatMessage(m);
            break;
          }
          case "chat-typing": {
            const status = msg.payload as ChatTypingStatus;
            if (status && status.role !== profile.role) setChatTyping(status);
            break;
          }
          case "chat-reaction": {
            const p = msg.payload as { messageId: string; emoji: string; role: PartnerRole };
            if (p?.messageId && p?.emoji) {
              applyChatReaction(p.messageId, p.emoji, p.role);
            }
            break;
          }
          case "chat-read": {
            const p = msg.payload as { role: PartnerRole };
            if (p?.role) applyChatReadStatus(p.role);
            break;
          }
          case "webrtc-signal": {
            const signal = msg.payload as WebRTCSignalMessage;
            if (signal?.id && !markSeen(signal.id)) {
              handleWebRTCSignal(signal);
            }
            break;
          }
          case "partner-mood": {
            const status = msg.payload as PartnerMoodStatus;
            if (status && status.role !== profile.role) {
              setPartnerMood(status);
            }
            break;
          }
          case "music-sync": {
            const syncEv = msg.payload as MusicSyncEvent;
            if (syncEv && syncEv.senderRole !== profile.role) {
              setMusicSyncEvent(syncEv);
              musicSyncCallbackRef.current?.(syncEv);
            }
            break;
          }
          case "playlist-sync": {
            const items = msg.payload?.items as SharedPlaylistItem[];
            if (items) {
              setSharedPlaylist(items);
              try {
                window.localStorage.setItem(
                  `${LOCAL_PLAYLIST_KEY}:${profile.roomId}`,
                  JSON.stringify(items)
                );
              } catch {
                // ignore
              }
            }
            break;
          }
        }
      };

      bc.postMessage({ type: "presence-ping", sessionId, role: profile.role });
      presenceTimer = window.setInterval(() => {
        bc?.postMessage({
          type: "presence-ping",
          sessionId,
          role: profile.role,
        });
        recomputeLocalPeers();
      }, 2500);
    }

    return () => {
      if (presenceTimer) window.clearInterval(presenceTimer);
      if (bc) {
        bc.postMessage({ type: "presence-leave", sessionId });
        bc.close();
      }
      localBroadcastRef.current = null;
      if (supabase && supabaseChannelRef.current) {
        supabase.removeChannel(supabaseChannelRef.current);
        supabaseChannelRef.current = null;
      }
    };
  }, [
    markSeen,
    profile.role,
    profile.roomId,
    profile.userAName,
    profile.userBName,
    sessionId,
    todayISO,
  ]);

  // --------------------------------------------------------------------------
  // HOME ACTIONS (Heartbeat & Daily Secret Envelope)
  // --------------------------------------------------------------------------
  const sendHeartbeat = useCallback(async () => {
    const senderName =
      profile.role === "user_a" ? profile.userAName : profile.userBName;
    const event: HeartbeatEvent = {
      id: `hb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderRole: profile.role,
      senderName,
      timestamp: Date.now(),
    };
    markSeen(event.id);
    heartbeatCallbackRef.current?.(event);

    await supabaseChannelRef.current?.send({
      type: "broadcast",
      event: "heartbeat",
      payload: event,
    });
    localBroadcastRef.current?.postMessage({ type: "heartbeat", payload: event });
  }, [markSeen, profile.role, profile.userAName, profile.userBName]);

  const submitDailyAnswer = useCallback(
    async (answerText: string, overrideRole?: PartnerRole) => {
      const targetRole = overrideRole ?? profile.role;
      const trimmed = answerText.trim();
      if (!trimmed) return;

      const nowISO = new Date().toISOString();
      const nextA = targetRole === "user_a" ? trimmed : todayQnA.user_a_answer;
      const nextB = targetRole === "user_b" ? trimmed : todayQnA.user_b_answer;
      const unlocked = Boolean(nextA?.trim() && nextB?.trim());

      const optimisticRow: DailyQnA = {
        ...todayQnA,
        user_a_name: profile.userAName,
        user_b_name: profile.userBName,
        user_a_answer: nextA,
        user_b_answer: nextB,
        user_a_answered_at:
          targetRole === "user_a" ? nowISO : todayQnA.user_a_answered_at,
        user_b_answered_at:
          targetRole === "user_b" ? nowISO : todayQnA.user_b_answered_at,
        is_unlocked: unlocked,
        updated_at: nowISO,
      };

      setTodayQnA(optimisticRow);
      try {
        window.localStorage.setItem(
          `${LOCAL_QNA_STORAGE_KEY}:${profile.roomId}:${todayISO}`,
          JSON.stringify(optimisticRow)
        );
      } catch {
        // ignore
      }

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("daily_qna").upsert(
          {
            room_id: profile.roomId,
            prompt_date: todayISO,
            question: optimisticRow.question,
            user_a_name: profile.userAName,
            user_b_name: profile.userBName,
            user_a_answer: optimisticRow.user_a_answer,
            user_b_answer: optimisticRow.user_b_answer,
            user_a_answered_at: optimisticRow.user_a_answered_at,
            user_b_answered_at: optimisticRow.user_b_answered_at,
          },
          { onConflict: "room_id,prompt_date" }
        );
      }

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "qna-updated",
        payload: optimisticRow,
      });
      localBroadcastRef.current?.postMessage({
        type: "qna-updated",
        payload: optimisticRow,
      });
    },
    [profile.role, profile.roomId, profile.userAName, profile.userBName, todayISO, todayQnA]
  );

  const resetTodayPrompt = useCallback(
    async (newQuestion?: string) => {
      const resetRow: DailyQnA = {
        ...todayQnA,
        question: newQuestion ?? todayQnA.question,
        user_a_answer: null,
        user_b_answer: null,
        user_a_answered_at: null,
        user_b_answered_at: null,
        is_unlocked: false,
      };
      setTodayQnA(resetRow);
      try {
        window.localStorage.setItem(
          `${LOCAL_QNA_STORAGE_KEY}:${profile.roomId}:${todayISO}`,
          JSON.stringify(resetRow)
        );
      } catch {
        // ignore
      }

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "qna-updated",
        payload: resetRow,
      });
      localBroadcastRef.current?.postMessage({
        type: "qna-updated",
        payload: resetRow,
      });
    },
    [profile.roomId, todayISO, todayQnA]
  );

  // --------------------------------------------------------------------------
  // CANVAS ACTIONS
  // --------------------------------------------------------------------------
  const broadcastStroke = useCallback(
    (segment: Omit<StrokeSegment, "id" | "senderRole">) => {
      const fullSegment: StrokeSegment = {
        ...segment,
        id: `seg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderRole: profile.role,
      };
      markSeen(fullSegment.id);
      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "canvas-stroke",
        payload: fullSegment,
      });
      localBroadcastRef.current?.postMessage({
        type: "canvas-stroke",
        payload: fullSegment,
      });
    },
    [markSeen, profile.role]
  );

  const placeStamp = useCallback(
    (stampInput: Omit<CanvasStamp, "id" | "senderRole" | "createdAt">) => {
      const stamp: CanvasStamp = {
        ...stampInput,
        id: `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderRole: profile.role,
        createdAt: Date.now(),
      };
      markSeen(stamp.id);
      setStamps((prev) => {
        const next = [...prev, stamp];
        try {
          window.localStorage.setItem(
            `${LOCAL_STAMPS_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "canvas-stamp",
        payload: stamp,
      });
      localBroadcastRef.current?.postMessage({
        type: "canvas-stamp",
        payload: stamp,
      });
    },
    [markSeen, profile.role, profile.roomId]
  );

  const clearSharedCanvas = useCallback(() => {
    const clearId = `clr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    markSeen(clearId);
    setStamps([]);
    try {
      window.localStorage.removeItem(
        `${LOCAL_STAMPS_STORAGE_KEY}:${profile.roomId}`
      );
    } catch {
      // ignore
    }
    supabaseChannelRef.current?.send({
      type: "broadcast",
      event: "canvas-clear",
      payload: { id: clearId },
    });
    localBroadcastRef.current?.postMessage({
      type: "canvas-clear",
      id: clearId,
    });
  }, [markSeen, profile.roomId]);

  const broadcastCursor = useCallback(
    (x: number, y: number, color: string) => {
      const cursor: PartnerCursor = {
        role: profile.role,
        name:
          profile.role === "user_a" ? profile.userAName : profile.userBName,
        x,
        y,
        color,
        updatedAt: Date.now(),
      };
      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "canvas-cursor",
        payload: cursor,
      });
      localBroadcastRef.current?.postMessage({
        type: "canvas-cursor",
        payload: cursor,
      });
    },
    [profile.role, profile.userAName, profile.userBName]
  );

  // --------------------------------------------------------------------------
  // SHARED NOTES ACTIONS
  // --------------------------------------------------------------------------
  const syncSharedNote = useCallback(
    async (note: SharedNote) => {
      const eventId = `nt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      markSeen(eventId);

      setSharedNotes((prev) => {
        const exists = prev.some((n) => n.id === note.id);
        const next = exists
          ? prev.map((n) => (n.id === note.id ? note : n))
          : [note, ...prev];
        try {
          window.localStorage.setItem(
            `${LOCAL_NOTES_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("shared_notes").upsert(note, { onConflict: "id" });
      }

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "note-upsert",
        payload: { eventId, note },
      });
      localBroadcastRef.current?.postMessage({
        type: "note-upsert",
        eventId,
        note,
      });
    },
    [markSeen, profile.roomId]
  );

  const createSharedNote = useCallback(
    async (mood: NoteMood = "romance") => {
      const now = new Date().toISOString();
      const author =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const newNote: SharedNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        room_id: profile.roomId,
        title: "",
        content: "",
        mood,
        is_pinned: false,
        last_edited_by: author,
        updated_at: now,
        created_at: now,
      };
      await syncSharedNote(newNote);
      return newNote;
    },
    [profile.role, profile.roomId, profile.userAName, profile.userBName, syncSharedNote]
  );

  const upsertSharedNote = useCallback(
    async (note: SharedNote) => {
      const author =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const updated: SharedNote = {
        ...note,
        last_edited_by: author,
        updated_at: new Date().toISOString(),
      };
      await syncSharedNote(updated);

      // broadcast typing indicator to partner
      const typingPayload: NoteTypingStatus = {
        noteId: note.id,
        role: profile.role,
        name: author,
        timestamp: Date.now(),
      };
      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "note-typing",
        payload: typingPayload,
      });
      localBroadcastRef.current?.postMessage({
        type: "note-typing",
        payload: typingPayload,
      });
    },
    [profile.role, profile.userAName, profile.userBName, syncSharedNote]
  );

  const deleteSharedNote = useCallback(
    async (noteId: string) => {
      const eventId = `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      markSeen(eventId);

      setSharedNotes((prev) => {
        const next = prev.filter((n) => n.id !== noteId);
        try {
          window.localStorage.setItem(
            `${LOCAL_NOTES_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("shared_notes").delete().eq("id", noteId);
      }

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "note-delete",
        payload: { eventId, noteId },
      });
      localBroadcastRef.current?.postMessage({
        type: "note-delete",
        eventId,
        noteId,
      });
    },
    [markSeen, profile.roomId]
  );

  // --------------------------------------------------------------------------
  // BUCKET LIST ACTIONS
  // --------------------------------------------------------------------------
  const syncBucketItems = useCallback(
    async (items: BucketItem[]) => {
      const eventId = `bkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      markSeen(eventId);
      setBucketItems(items);
      try {
        window.localStorage.setItem(
          `${LOCAL_BUCKET_STORAGE_KEY}:${profile.roomId}`,
          JSON.stringify(items)
        );
      } catch {
        // ignore
      }

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "bucket-sync",
        payload: { eventId, items },
      });
      localBroadcastRef.current?.postMessage({
        type: "bucket-sync",
        eventId,
        items,
      });
    },
    [markSeen, profile.roomId]
  );

  const addBucketItem = useCallback(
    async (title: string, category: BucketCategory = "date") => {
      const author =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const newItem: BucketItem = {
        id: `bucket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        room_id: profile.roomId,
        title: title.trim(),
        category,
        is_completed: false,
        completed_by: null,
        created_by: author,
        created_at: new Date().toISOString(),
      };
      const next = [newItem, ...bucketItems];
      syncBucketItems(next);

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("bucket_list_items").insert(newItem);
      }
    },
    [bucketItems, profile.role, profile.roomId, profile.userAName, profile.userBName, syncBucketItems]
  );

  const toggleBucketItem = useCallback(
    async (itemId: string) => {
      const author =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const next = bucketItems.map((item) => {
        if (item.id !== itemId) return item;
        const nextDone = !item.is_completed;
        return {
          ...item,
          is_completed: nextDone,
          completed_by: nextDone ? author : null,
        };
      });
      syncBucketItems(next);

      const target = next.find((i) => i.id === itemId);
      const supabase = getSupabaseBrowserClient();
      if (supabase && target) {
        await supabase
          .from("bucket_list_items")
          .update({
            is_completed: target.is_completed,
            completed_by: target.completed_by,
          })
          .eq("id", itemId);
      }
    },
    [bucketItems, profile.role, profile.userAName, profile.userBName, syncBucketItems]
  );

  const deleteBucketItem = useCallback(
    async (itemId: string) => {
      const next = bucketItems.filter((item) => item.id !== itemId);
      syncBucketItems(next);

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("bucket_list_items").delete().eq("id", itemId);
      }
    },
    [bucketItems, syncBucketItems]
  );

  // --------------------------------------------------------------------------
  // 2-PLAYER REALTIME GAMES ACTIONS
  // --------------------------------------------------------------------------
  const updateGamesState = useCallback(
    (updater: (prev: CoupleGamesState) => CoupleGamesState) => {
      setGamesState((prev) => {
        const next = updater(prev);
        const eventId = `gm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        markSeen(eventId);
        try {
          window.localStorage.setItem(
            `${LOCAL_GAMES_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }

        supabaseChannelRef.current?.send({
          type: "broadcast",
          event: "games-sync",
          payload: { eventId, state: next },
        });
        localBroadcastRef.current?.postMessage({
          type: "games-sync",
          eventId,
          state: next,
        });
        return next;
      });
    },
    [markSeen, profile.roomId]
  );

  const broadcastMiniDoodleStroke = useCallback(
    (segment: Omit<StrokeSegment, "id" | "senderRole">) => {
      const fullSegment: StrokeSegment = {
        ...segment,
        id: `mseg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderRole: profile.role,
      };
      markSeen(fullSegment.id);
      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "mini-doodle-stroke",
        payload: fullSegment,
      });
      localBroadcastRef.current?.postMessage({
        type: "mini-doodle-stroke",
        payload: fullSegment,
      });
    },
    [markSeen, profile.role]
  );

  const clearMiniDoodle = useCallback(() => {
    const id = `mclr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    markSeen(id);
    supabaseChannelRef.current?.send({
      type: "broadcast",
      event: "mini-doodle-clear",
      payload: { id },
    });
    localBroadcastRef.current?.postMessage({
      type: "mini-doodle-clear",
      id,
    });
  }, [markSeen]);

  // --------------------------------------------------------------------------
  // COUPLE MESSENGER ACTIONS (Chat, Attachments & WebRTC Call)
  // --------------------------------------------------------------------------
  const sendChatMessage = useCallback(
    async (
      input: {
        type: ChatMessageType;
        text?: string;
        media_url?: string;
        file_name?: string;
        file_size?: number;
        audio_duration?: number;
        location?: { lat: number; lng: number; label?: string };
        reply_to?: { id: string; sender_name: string; text: string };
        is_scratch_card?: boolean;
      }
    ) => {
      const senderName =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const senderChar =
        profile.role === "user_a"
          ? profile.userACharacter
          : profile.userBCharacter;

      const newMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        room_id: profile.roomId,
        sender_role: profile.role,
        sender_name: senderName,
        sender_character: senderChar,
        type: input.type,
        text: input.text?.trim() || "",
        media_url: input.media_url,
        file_name: input.file_name,
        file_size: input.file_size,
        audio_duration: input.audio_duration,
        location: input.location,
        reply_to: input.reply_to,
        is_scratch_card: input.is_scratch_card,
        reactions: {},
        is_read: false,
        created_at: new Date().toISOString(),
      };

      markSeen(newMsg.id);
      setChatMessages((prev) => {
        const next = [...prev, newMsg];
        try {
          window.localStorage.setItem(
            `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        supabase
          .from("chat_messages")
          .insert(newMsg)
          .then(
            () => {},
            () => {}
          );
      }

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "chat-message",
        payload: newMsg,
      });
      localBroadcastRef.current?.postMessage({
        type: "chat-message",
        payload: newMsg,
      });
    },
    [markSeen, profile.role, profile.roomId, profile.userACharacter, profile.userAName, profile.userBCharacter, profile.userBName]
  );

  const sendChatTyping = useCallback(() => {
    const senderName =
      profile.role === "user_a" ? profile.userAName : profile.userBName;
    const status: ChatTypingStatus = {
      role: profile.role,
      name: senderName,
      timestamp: Date.now(),
    };
    supabaseChannelRef.current?.send({
      type: "broadcast",
      event: "chat-typing",
      payload: status,
    });
    localBroadcastRef.current?.postMessage({
      type: "chat-typing",
      payload: status,
    });
  }, [profile.role, profile.userAName, profile.userBName]);

  const addChatReaction = useCallback(
    (messageId: string, emoji: string) => {
      setChatMessages((prev) => {
        const next = prev.map((m) => {
          if (m.id !== messageId) return m;
          const currentReactions = m.reactions || {};
          const currentRoles = currentReactions[emoji] || [];
          const exists = currentRoles.includes(profile.role);
          const nextRoles = exists
            ? currentRoles.filter((r) => r !== profile.role)
            : [...currentRoles, profile.role];
          const updatedReactions = { ...currentReactions };
          if (nextRoles.length === 0) {
            delete updatedReactions[emoji];
          } else {
            updatedReactions[emoji] = nextRoles;
          }
          return { ...m, reactions: updatedReactions };
        });
        try {
          window.localStorage.setItem(
            `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });

      const payload = { messageId, emoji, role: profile.role };
      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "chat-reaction",
        payload,
      });
      localBroadcastRef.current?.postMessage({
        type: "chat-reaction",
        payload,
      });
    },
    [profile.role, profile.roomId]
  );

  const markChatMessagesAsRead = useCallback(() => {
    setChatMessages((prev) => {
      const next = prev.map((m) =>
        m.sender_role !== profile.role ? { ...m, is_read: true } : m
      );
      try {
        window.localStorage.setItem(
          `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`,
          JSON.stringify(next)
        );
      } catch {
        // ignore
      }
      return next;
    });

    supabaseChannelRef.current?.send({
      type: "broadcast",
      event: "chat-read",
      payload: { role: profile.role },
    });
    localBroadcastRef.current?.postMessage({
      type: "chat-read",
      payload: { role: profile.role },
    });
  }, [profile.role, profile.roomId]);

  const sendCallSignal = useCallback(
    (
      signalInput: Omit<
        WebRTCSignalMessage,
        "id" | "room_id" | "caller_role" | "caller_name" | "timestamp"
      >
    ) => {
      const senderName =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const signal: WebRTCSignalMessage = {
        ...signalInput,
        id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        room_id: profile.roomId,
        caller_role: profile.role,
        caller_name: senderName,
        timestamp: Date.now(),
      };
      markSeen(signal.id);

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: signal,
      });
      localBroadcastRef.current?.postMessage({
        type: "webrtc-signal",
        payload: signal,
      });
    },
    [markSeen, profile.role, profile.roomId, profile.userAName, profile.userBName]
  );

  const dismissIncomingCall = useCallback(() => {
    setActiveIncomingCall(null);
  }, []);

  const updateMood = useCallback(
    (input: {
      characterId?: SanrioCharacterId;
      statusText: string;
      emoji: string;
    }) => {
      const charId: SanrioCharacterId =
        input.characterId ||
        (profile.role === "user_a"
          ? profile.userACharacter
          : profile.userBCharacter) ||
        "cinnamoroll";
      const newMood: PartnerMoodStatus = {
        role: profile.role,
        characterId: charId,
        statusText: input.statusText,
        emoji: input.emoji,
        updatedAt: Date.now(),
      };
      setMyMood(newMood);

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "partner-mood",
        payload: newMood,
      });
      localBroadcastRef.current?.postMessage({
        type: "partner-mood",
        payload: newMood,
      });
    },
    [profile.role, profile.userACharacter, profile.userBCharacter]
  );

  const broadcastMusicSync = useCallback(
    (syncData: {
      action: "play" | "pause" | "seek" | "switch" | "heartbeat";
      trackIndex: number;
      currentTime: number;
    }) => {
      const senderName =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const syncEvent: MusicSyncEvent = {
        type: "music-sync",
        action: syncData.action,
        trackIndex: syncData.trackIndex,
        currentTime: syncData.currentTime,
        senderRole: profile.role,
        senderName,
        timestamp: Date.now(),
      };
      setMusicSyncEvent(syncEvent);

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "music-sync",
        payload: syncEvent,
      });
      localBroadcastRef.current?.postMessage({
        type: "music-sync",
        payload: syncEvent,
      });
    },
    [profile.role, profile.userAName, profile.userBName]
  );

  const addToPlaylist = useCallback(
    (
      itemInput: Omit<
        SharedPlaylistItem,
        "id" | "room_id" | "added_by" | "created_at"
      >
    ) => {
      const senderName =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const newItem: SharedPlaylistItem = {
        ...itemInput,
        id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        room_id: profile.roomId,
        added_by: senderName,
        created_at: new Date().toISOString(),
      };

      setSharedPlaylist((prev) => {
        const next = [...prev, newItem];
        try {
          window.localStorage.setItem(
            `${LOCAL_PLAYLIST_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });

      supabaseChannelRef.current?.send({
        type: "broadcast",
        event: "playlist-sync",
        payload: { items: [...sharedPlaylist, newItem] },
      });
      localBroadcastRef.current?.postMessage({
        type: "playlist-sync",
        payload: { items: [...sharedPlaylist, newItem] },
      });
    },
    [profile.role, profile.roomId, profile.userAName, profile.userBName, sharedPlaylist]
  );

  const removeFromPlaylist = useCallback(
    (trackId: string) => {
      setSharedPlaylist((prev) => {
        const next = prev.filter((t) => t.id !== trackId);
        try {
          window.localStorage.setItem(
            `${LOCAL_PLAYLIST_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        supabaseChannelRef.current?.send({
          type: "broadcast",
          event: "playlist-sync",
          payload: { items: next },
        });
        localBroadcastRef.current?.postMessage({
          type: "playlist-sync",
          payload: { items: next },
        });
        return next;
      });
    },
    [profile.roomId]
  );

  const unreadChatCount = useMemo(() => {
    return chatMessages.filter(
      (m) => m.sender_role !== profile.role && !m.is_read
    ).length;
  }, [chatMessages, profile.role]);

  const bothPartnersOnline =
    simulatePartnerOnline ||
    (onlineRoles.has("user_a") && onlineRoles.has("user_b"));

  return {
    connectionMode,
    bothPartnersOnline,
    simulatePartnerOnline,
    setSimulatePartnerOnline,
    todayQnA,
    stamps,
    partnerCursor,
    sharedNotes,
    bucketItems,
    partnerTyping,
    gamesState,
    chatMessages,
    chatTyping,
    activeIncomingCall,
    callSignalQueue,
    unreadChatCount,
    myMood,
    partnerMood,
    updateMood,
    musicSyncEvent,
    broadcastMusicSync,
    sharedPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    sendHeartbeat,
    submitDailyAnswer,
    resetTodayPrompt,
    broadcastStroke,
    placeStamp,
    clearSharedCanvas,
    broadcastCursor,
    createSharedNote,
    upsertSharedNote,
    deleteSharedNote,
    addBucketItem,
    toggleBucketItem,
    deleteBucketItem,
    updateGamesState,
    broadcastMiniDoodleStroke,
    clearMiniDoodle,
    sendChatMessage,
    sendChatTyping,
    addChatReaction,
    markChatMessagesAsRead,
    sendCallSignal,
    dismissIncomingCall,
  };
}
