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
  CoupleRoomMeta,
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
import {
  SANRIO_CHARACTER_MAP,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";
import { notifyPartnerWaiting } from "@/lib/notifications";

export type NetworkConnectionStatus = "connected" | "reconnecting" | "offline";

interface UseCoupleRealtimeOptions {
  profile: CoupleProfile;
  onRemoteProfileMeta?: (meta: CoupleRoomMeta) => void;
  onHeartbeatReceived?: (event: HeartbeatEvent) => void;
  onRemoteStroke?: (segment: StrokeSegment) => void;
  onRemoteClearCanvas?: () => void;
  onRemoteMiniDoodleStroke?: (segment: StrokeSegment) => void;
  onRemoteMiniDoodleClear?: () => void;
  onIncomingChatMessage?: (msg: ChatMessage) => void;
  onIncomingCallSignal?: (signal: WebRTCSignalMessage) => void;
  onMusicSyncReceived?: (event: MusicSyncEvent) => void;
}

interface SyncTimestampsMap {
  gamesUpdatedAt: number;
  notesUpdatedAt: number;
  bucketUpdatedAt: number;
  playlistUpdatedAt: number;
  stampsClearedAt: number;
}

interface RoomSyncSnapshotPayload {
  senderRole: PartnerRole;
  coupleMeta?: CoupleRoomMeta;
  anniversary?: { date: string; updatedAt: number };
  heartbeatCount?: number;
  senderMood?: PartnerMoodStatus;
  todayQnA?: DailyQnA;
  gamesState?: CoupleGamesState;
  gamesUpdatedAt?: number;
  stamps?: CanvasStamp[];
  stampsClearedAt?: number;
  sharedNotes?: SharedNote[];
  notesUpdatedAt?: number;
  bucketItems?: BucketItem[];
  bucketUpdatedAt?: number;
  sharedPlaylist?: SharedPlaylistItem[];
  playlistUpdatedAt?: number;
  recentChatMessages?: ChatMessage[];
}

const LOCAL_QNA_STORAGE_KEY = "cinnamelo_daily_qna_v2";
const LOCAL_STAMPS_STORAGE_KEY = "cinnamelo_canvas_stamps_v2";
const LOCAL_NOTES_STORAGE_KEY = "cinnamelo_shared_notes_v2";
const LOCAL_BUCKET_STORAGE_KEY = "cinnamelo_bucket_list_v2";
const LOCAL_GAMES_STORAGE_KEY = "cinnamelo_couple_games_v2";
const LOCAL_CHAT_STORAGE_KEY = "cinnamelo_chat_messages_v2";
const LOCAL_MOOD_KEY = "cinnamelo_partner_mood_v2";
const LOCAL_PLAYLIST_KEY = "cinnamelo_shared_playlist_v2";
const LOCAL_META_STORAGE_KEY = "cinnamelo_couple_meta_v2";
const LOCAL_ANNIVERSARY_KEY = "cinnamelo_anniversary_v2";
const LEGACY_ANNIVERSARY_KEY = "cinnamelo_anniversary_date_v1";
const LOCAL_HEARTBEAT_COUNT_KEY = "cinnamelo_heartbeat_count_v2";
const LOCAL_SYNC_TS_KEY = "cinnamelo_sync_ts_v2";
const DEFAULT_ANNIVERSARY_DATE = "2024-01-01";

function isValidSanrioChar(val: unknown): val is SanrioCharacterId {
  return typeof val === "string" && val in SANRIO_CHARACTER_MAP;
}

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
  onRemoteProfileMeta,
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

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const [connectionMode, setConnectionMode] = useState<
    "supabase" | "local-realtime"
  >(isSupabaseConfigured ? "supabase" : "local-realtime");
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isChannelReconnecting, setIsChannelReconnecting] =
    useState<boolean>(false);
  const [onlineRoles, setOnlineRoles] = useState<Set<PartnerRole>>(
    () => new Set([profile.role])
  );
  const [simulatePartnerOnline, setSimulatePartnerOnline] = useState(false);

  const onlineRolesRef = useRef<Set<PartnerRole>>(onlineRoles);
  onlineRolesRef.current = onlineRoles;
  const partnerLastSeenAtRef = useRef<number>(0);
  const partnerOfflineGraceTimerRef = useRef<number | null>(null);
  const lastRoomSyncRequestAtRef = useRef<number>(0);

  const todayISO = useMemo(() => getTodayDateISO(), []);
  const todayQuestion = useMemo(
    () => getDailyPromptForDate(todayISO),
    [todayISO]
  );

  // Synced Couple Anniversary Date & Heartbeat Count
  const [anniversaryDate, setAnniversaryDate] = useState<string>(
    DEFAULT_ANNIVERSARY_DATE
  );
  const anniversaryRef = useRef<{ date: string; updatedAt: number }>({
    date: DEFAULT_ANNIVERSARY_DATE,
    updatedAt: 0,
  });

  const [heartbeatCount, setHeartbeatCount] = useState<number>(0);
  const heartbeatCountRef = useRef<number>(0);
  heartbeatCountRef.current = heartbeatCount;

  const coupleMetaRef = useRef<CoupleRoomMeta>({
    userAName: profile.userAName,
    userBName: profile.userBName,
    userACharacter: profile.userACharacter || "cinnamoroll",
    userBCharacter: profile.userBCharacter || "my-melody",
    updatedAt: 0,
  });

  const syncTimestampsRef = useRef<SyncTimestampsMap>({
    gamesUpdatedAt: 0,
    notesUpdatedAt: 0,
    bucketUpdatedAt: 0,
    playlistUpdatedAt: 0,
    stampsClearedAt: 0,
  });

  const persistSyncTimestamps = useCallback(
    (patch: Partial<SyncTimestampsMap>) => {
      syncTimestampsRef.current = {
        ...syncTimestampsRef.current,
        ...patch,
      };
      try {
        window.localStorage.setItem(
          `${LOCAL_SYNC_TS_KEY}:${profileRef.current.roomId}`,
          JSON.stringify(syncTimestampsRef.current)
        );
      } catch {
        // ignore
      }
    },
    []
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
  const todayQnARef = useRef(todayQnA);
  todayQnARef.current = todayQnA;

  // Canvas state
  const [stamps, setStamps] = useState<CanvasStamp[]>([]);
  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;
  const [partnerCursor, setPartnerCursor] = useState<PartnerCursor | null>(null);

  // Shared Collaborative Journal & Bucket List state
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const sharedNotesRef = useRef(sharedNotes);
  sharedNotesRef.current = sharedNotes;
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);
  const bucketItemsRef = useRef(bucketItems);
  bucketItemsRef.current = bucketItems;
  const [partnerTyping, setPartnerTyping] = useState<NoteTypingStatus | null>(
    null
  );

  // 2-Player Couple Games state
  const [gamesState, setGamesState] = useState<CoupleGamesState>(() =>
    createInitialGamesState()
  );
  const gamesStateRef = useRef(gamesState);
  gamesStateRef.current = gamesState;

  // Couple Messenger & WebRTC Call state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
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
    updatedAt: 0,
  }));
  const myMoodRef = useRef(myMood);
  myMoodRef.current = myMood;

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
  const sharedPlaylistRef = useRef(sharedPlaylist);
  sharedPlaylistRef.current = sharedPlaylist;

  const supabaseChannelRef = useRef<RealtimeChannel | null>(null);
  const localBroadcastRef = useRef<BroadcastChannel | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  const remoteProfileMetaCallbackRef = useRef(onRemoteProfileMeta);
  remoteProfileMetaCallbackRef.current = onRemoteProfileMeta;

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

  // Keep myMood & partnerMood aligned with local device role and chosen Sanrio avatar
  useEffect(() => {
    const myChar: SanrioCharacterId =
      (profile.role === "user_a"
        ? profile.userACharacter
        : profile.userBCharacter) ||
      (profile.role === "user_a" ? "cinnamoroll" : "my-melody");
    const otherRole: PartnerRole =
      profile.role === "user_a" ? "user_b" : "user_a";

    try {
      const savedMyMood = window.localStorage.getItem(
        `${LOCAL_MOOD_KEY}:${profile.roomId}:${profile.role}`
      );
      if (savedMyMood) {
        const parsed = JSON.parse(savedMyMood) as PartnerMoodStatus;
        const nextMyMood: PartnerMoodStatus = {
          role: profile.role,
          characterId: myChar,
          statusText: parsed.statusText || "Kangen ☁️",
          emoji: parsed.emoji || "☁️",
          updatedAt: parsed.updatedAt || 0,
        };
        myMoodRef.current = nextMyMood;
        setMyMood(nextMyMood);
      } else {
        const nextMyMood: PartnerMoodStatus = {
          role: profile.role,
          characterId: myChar,
          statusText: "Kangen ☁️",
          emoji: "☁️",
          updatedAt: 0,
        };
        myMoodRef.current = nextMyMood;
        setMyMood(nextMyMood);
      }

      const savedPartnerMood = window.localStorage.getItem(
        `${LOCAL_MOOD_KEY}:${profile.roomId}:${otherRole}`
      );
      if (savedPartnerMood) {
        const parsedP = JSON.parse(savedPartnerMood) as PartnerMoodStatus;
        setPartnerMood({
          ...parsedP,
          role: otherRole,
        });
      }
    } catch {
      // ignore
    }
  }, [
    profile.roomId,
    profile.role,
    profile.userACharacter,
    profile.userBCharacter,
  ]);

  // Keep coupleMetaRef synced when local profile loads saved customizations
  useEffect(() => {
    const uA = profile.userACharacter || "cinnamoroll";
    const uB = profile.userBCharacter || "my-melody";
    const isCustomized =
      profile.userAName !== "Awan" ||
      profile.userBName !== "Melodi" ||
      uA !== "cinnamoroll" ||
      uB !== "my-melody";

    try {
      const savedRoomMeta = window.localStorage.getItem(
        `${LOCAL_META_STORAGE_KEY}:${profile.roomId}`
      );
      if (savedRoomMeta) {
        const parsed = JSON.parse(savedRoomMeta) as CoupleRoomMeta;
        if (parsed && typeof parsed.updatedAt === "number") {
          coupleMetaRef.current = parsed;
          if (
            parsed.updatedAt > 0 &&
            (parsed.userAName !== profile.userAName ||
              parsed.userBName !== profile.userBName ||
              parsed.userACharacter !== uA ||
              parsed.userBCharacter !== uB)
          ) {
            remoteProfileMetaCallbackRef.current?.(parsed);
          }
          return;
        }
      }
    } catch {
      // ignore
    }

    coupleMetaRef.current = {
      userAName: profile.userAName,
      userBName: profile.userBName,
      userACharacter: uA,
      userBCharacter: uB,
      updatedAt:
        coupleMetaRef.current.updatedAt > 0
          ? coupleMetaRef.current.updatedAt
          : isCustomized
          ? 1
          : 0,
    };
  }, [
    profile.roomId,
    profile.userAName,
    profile.userBName,
    profile.userACharacter,
    profile.userBCharacter,
  ]);

  // Keep Supabase Presence metadata updated when nickname changes without tearing down channel
  useEffect(() => {
    if (!supabaseChannelRef.current) return;
    const myName =
      profile.role === "user_a" ? profile.userAName : profile.userBName;
    supabaseChannelRef.current
      .track({
        role: profile.role,
        name: myName,
        online_at: new Date().toISOString(),
        visibility:
          typeof document !== "undefined"
            ? document.visibilityState
            : "visible",
      })
      .catch(() => {});
  }, [profile.role, profile.userAName, profile.userBName]);

  const markSeen = useCallback((id: string): boolean => {
    if (seenEventIdsRef.current.has(id)) return true;
    seenEventIdsRef.current.add(id);
    if (seenEventIdsRef.current.size > 500) {
      const first = seenEventIdsRef.current.values().next().value;
      if (first) seenEventIdsRef.current.delete(first);
    }
    return false;
  }, []);

  // Load initial data: ALWAYS hydrate from room-scoped localStorage first, then merge Supabase rows if available
  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    async function loadInitialData() {
      const currentProfile = profileRef.current;

      // 1. Instant Room-Scoped Local Hydration (protects against missing SQL tables on reload!)
      try {
        const rawTs = window.localStorage.getItem(
          `${LOCAL_SYNC_TS_KEY}:${profile.roomId}`
        );
        if (rawTs && !cancelled) {
          syncTimestampsRef.current = {
            ...syncTimestampsRef.current,
            ...JSON.parse(rawTs),
          };
        }

        const rawAnniv = window.localStorage.getItem(
          `${LOCAL_ANNIVERSARY_KEY}:${profile.roomId}`
        );
        if (rawAnniv && !cancelled) {
          const parsedAnniv = JSON.parse(rawAnniv) as {
            date: string;
            updatedAt: number;
          };
          if (parsedAnniv?.date) {
            anniversaryRef.current = {
              date: parsedAnniv.date,
              updatedAt: parsedAnniv.updatedAt ?? 1,
            };
            setAnniversaryDate(parsedAnniv.date);
          }
        } else {
          const legacyAnniv = window.localStorage.getItem(
            LEGACY_ANNIVERSARY_KEY
          );
          if (legacyAnniv && !cancelled) {
            anniversaryRef.current = {
              date: legacyAnniv,
              updatedAt: legacyAnniv !== DEFAULT_ANNIVERSARY_DATE ? 1 : 0,
            };
            setAnniversaryDate(legacyAnniv);
          }
        }

        const rawHb = window.localStorage.getItem(
          `${LOCAL_HEARTBEAT_COUNT_KEY}:${profile.roomId}:${todayISO}`
        );
        if (rawHb && !cancelled) {
          const count = parseInt(rawHb, 10);
          if (!isNaN(count) && count >= 0) {
            heartbeatCountRef.current = count;
            setHeartbeatCount(count);
          }
        }

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

        const rawPlaylist = window.localStorage.getItem(
          `${LOCAL_PLAYLIST_KEY}:${profile.roomId}`
        );
        if (rawPlaylist && !cancelled) {
          setSharedPlaylist(JSON.parse(rawPlaylist));
        }

        const rawQnA = window.localStorage.getItem(
          `${LOCAL_QNA_STORAGE_KEY}:${profile.roomId}:${todayISO}`
        );
        if (rawQnA && !cancelled) {
          setTodayQnA(JSON.parse(rawQnA));
        }

        const rawNotes = window.localStorage.getItem(
          `${LOCAL_NOTES_STORAGE_KEY}:${profile.roomId}`
        );
        if (!cancelled) {
          if (rawNotes) {
            setSharedNotes(JSON.parse(rawNotes));
          } else {
            const seededNotes = getSeedSharedNotes(
              profile.roomId,
              currentProfile.userAName,
              currentProfile.userBName
            );
            setSharedNotes(seededNotes);
          }
        }

        const rawBucket = window.localStorage.getItem(
          `${LOCAL_BUCKET_STORAGE_KEY}:${profile.roomId}`
        );
        if (!cancelled) {
          if (rawBucket) {
            setBucketItems(JSON.parse(rawBucket));
          } else {
            const seededBucket = getSeedBucketItems(
              profile.roomId,
              currentProfile.userAName,
              currentProfile.userBName
            );
            setBucketItems(seededBucket);
          }
        }

        const rawChat = window.localStorage.getItem(
          `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`
        );
        if (!cancelled) {
          if (rawChat) {
            setChatMessages(JSON.parse(rawChat));
          } else {
            const seededChat = getSeedChatMessages(
              profile.roomId,
              currentProfile.userAName,
              currentProfile.userBName
            );
            setChatMessages(seededChat);
          }
        }
      } catch {
        // ignore storage errors
      }

      // 2. Optional Supabase Database Merge (only overwrites when table exists & has rows!)
      if (supabase) {
        setConnectionMode("supabase");
        try {
          const { data: qnaRow, error: qnaErr } = await supabase
            .from("daily_qna")
            .select("*")
            .eq("room_id", profile.roomId)
            .eq("prompt_date", todayISO)
            .maybeSingle();

          if (!qnaErr && qnaRow && !cancelled) {
            setTodayQnA(qnaRow as DailyQnA);
            try {
              window.localStorage.setItem(
                `${LOCAL_QNA_STORAGE_KEY}:${profile.roomId}:${todayISO}`,
                JSON.stringify(qnaRow)
              );
            } catch {}
          }

          const { data: notesRows, error: notesErr } = await supabase
            .from("shared_notes")
            .select("*")
            .eq("room_id", profile.roomId)
            .order("is_pinned", { ascending: false })
            .order("updated_at", { ascending: false });

          if (!notesErr && notesRows && notesRows.length > 0 && !cancelled) {
            setSharedNotes(notesRows as SharedNote[]);
            try {
              window.localStorage.setItem(
                `${LOCAL_NOTES_STORAGE_KEY}:${profile.roomId}`,
                JSON.stringify(notesRows)
              );
            } catch {}
          }

          const { data: bucketRows, error: bucketErr } = await supabase
            .from("bucket_list_items")
            .select("*")
            .eq("room_id", profile.roomId)
            .order("created_at", { ascending: false });

          if (!bucketErr && bucketRows && bucketRows.length > 0 && !cancelled) {
            setBucketItems(bucketRows as BucketItem[]);
            try {
              window.localStorage.setItem(
                `${LOCAL_BUCKET_STORAGE_KEY}:${profile.roomId}`,
                JSON.stringify(bucketRows)
              );
            } catch {}
          }

          const { data: chatRows, error: chatErr } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("room_id", profile.roomId)
            .order("created_at", { ascending: true })
            .limit(250);

          if (!chatErr && chatRows && chatRows.length > 0 && !cancelled) {
            setChatMessages((prev) => {
              const map = new Map(prev.map((m) => [m.id, m]));
              for (const row of chatRows as ChatMessage[]) {
                map.set(row.id, row);
              }
              const merged = Array.from(map.values()).sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );
              try {
                window.localStorage.setItem(
                  `${LOCAL_CHAT_STORAGE_KEY}:${profile.roomId}`,
                  JSON.stringify(merged)
                );
              } catch {}
              return merged;
            });
          }
        } catch {
          // Realtime Broadcast continues working even if SQL tables are unprovisioned
        }
        return;
      }

      if (!cancelled) {
        setConnectionMode("local-realtime");
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [profile.roomId, todayISO]);

  // Unified Multi-Channel Real-time Broadcaster (Supabase + Local BroadcastChannel + SSE Hub)
  const emitRealtime = useCallback(
    (event: string, payload: any, extra: Record<string, any> = {}) => {
      // 1. Supabase Realtime Broadcast (self: false)
      supabaseChannelRef.current?.send({
        type: "broadcast",
        event,
        payload,
        ...extra,
      });

      // 2. Local Cross-Tab Broadcast Channel (within same browser)
      try {
        const safeData = JSON.parse(
          JSON.stringify({
            type: event,
            payload,
            sessionId,
            ...extra,
          })
        );
        localBroadcastRef.current?.postMessage(safeData);
      } catch (err) {
        console.debug(
          "BroadcastChannel postMessage skipped non-cloneable:",
          err
        );
      }

      // 3. Network SSE Hub API (Instant sync between phone and PC over local/LAN network)
      if (typeof window !== "undefined") {
        fetch("/api/realtime-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: profile.roomId,
            event,
            payload,
            senderRole: profile.role,
            senderSessionId: sessionId,
            ...extra,
          }),
        }).catch(() => {});
      }
    },
    [profile.roomId, profile.role, sessionId]
  );

  // ==========================================================================
  // HYBRID PRESENCE ENGINE (Supabase Presence + Broadcast Ping-Pong + Grace)
  // ==========================================================================
  const partnerRole: PartnerRole =
    profile.role === "user_a" ? "user_b" : "user_a";

  const markPartnerActive = useCallback(() => {
    partnerLastSeenAtRef.current = Date.now();
    if (partnerOfflineGraceTimerRef.current) {
      window.clearTimeout(partnerOfflineGraceTimerRef.current);
      partnerOfflineGraceTimerRef.current = null;
    }
    setOnlineRoles((prev) => {
      if (prev.has(profile.role) && prev.has(partnerRole)) {
        return prev;
      }
      return new Set<PartnerRole>([profile.role, partnerRole]);
    });
  }, [partnerRole, profile.role]);

  // ==========================================================================
  // SHARED ROOM STATE RECONCILIATION HELPERS (LWW + MERGE ACROSS ALL TRANSPORTS)
  // ==========================================================================
  const applyIncomingCoupleMeta = useCallback(
    (incoming?: CoupleRoomMeta | null) => {
      if (!incoming || typeof incoming !== "object") return;
      const incomingUpdatedAt = incoming.updatedAt ?? 0;
      const localUpdatedAt = coupleMetaRef.current.updatedAt ?? 0;

      // Never let an unedited default (updatedAt: 0) or older payload overwrite newer edits
      if (incomingUpdatedAt <= 0) return;
      if (localUpdatedAt > 0 && incomingUpdatedAt < localUpdatedAt) return;

      const normalized: CoupleRoomMeta = {
        userAName:
          incoming.userAName?.trim() ||
          coupleMetaRef.current.userAName ||
          "Awan",
        userBName:
          incoming.userBName?.trim() ||
          coupleMetaRef.current.userBName ||
          "Melodi",
        userACharacter: isValidSanrioChar(incoming.userACharacter)
          ? incoming.userACharacter
          : coupleMetaRef.current.userACharacter || "cinnamoroll",
        userBCharacter: isValidSanrioChar(incoming.userBCharacter)
          ? incoming.userBCharacter
          : coupleMetaRef.current.userBCharacter || "my-melody",
        updatedAt: incomingUpdatedAt,
        updatedByRole: incoming.updatedByRole,
      };

      const changed =
        normalized.userAName !== profileRef.current.userAName ||
        normalized.userBName !== profileRef.current.userBName ||
        normalized.userACharacter !== profileRef.current.userACharacter ||
        normalized.userBCharacter !== profileRef.current.userBCharacter;

      coupleMetaRef.current = normalized;
      try {
        window.localStorage.setItem(
          `${LOCAL_META_STORAGE_KEY}:${profileRef.current.roomId}`,
          JSON.stringify(normalized)
        );
      } catch {
        // ignore
      }

      if (changed) {
        remoteProfileMetaCallbackRef.current?.(normalized);
      }
    },
    []
  );

  const applyIncomingAnniversary = useCallback(
    (incoming?: { date: string; updatedAt: number } | null) => {
      if (!incoming?.date) return;
      const incomingUpdatedAt = incoming.updatedAt ?? 0;
      const localUpdatedAt = anniversaryRef.current.updatedAt ?? 0;
      if (incomingUpdatedAt <= 0) return;
      if (localUpdatedAt > 0 && incomingUpdatedAt < localUpdatedAt) return;

      anniversaryRef.current = {
        date: incoming.date,
        updatedAt: incomingUpdatedAt,
      };
      setAnniversaryDate(incoming.date);
      try {
        window.localStorage.setItem(
          `${LOCAL_ANNIVERSARY_KEY}:${profileRef.current.roomId}`,
          JSON.stringify(anniversaryRef.current)
        );
        window.localStorage.setItem(LEGACY_ANNIVERSARY_KEY, incoming.date);
      } catch {
        // ignore
      }
    },
    []
  );

  const applyIncomingHeartbeatCount = useCallback(
    (remoteCount?: number) => {
      if (typeof remoteCount !== "number" || isNaN(remoteCount)) return;
      if (remoteCount > heartbeatCountRef.current) {
        heartbeatCountRef.current = remoteCount;
        setHeartbeatCount(remoteCount);
        try {
          window.localStorage.setItem(
            `${LOCAL_HEARTBEAT_COUNT_KEY}:${profileRef.current.roomId}:${todayISO}`,
            String(remoteCount)
          );
        } catch {
          // ignore
        }
      }
    },
    [todayISO]
  );

  const applyIncomingPartnerMood = useCallback(
    (status?: PartnerMoodStatus | null) => {
      if (!status || status.role === profileRef.current.role) return;
      setPartnerMood((prev) => {
        if (
          prev &&
          prev.updatedAt > 0 &&
          status.updatedAt > 0 &&
          status.updatedAt < prev.updatedAt
        ) {
          return prev;
        }
        if (
          prev &&
          prev.statusText === status.statusText &&
          prev.characterId === status.characterId &&
          prev.emoji === status.emoji
        ) {
          return prev;
        }
        try {
          window.localStorage.setItem(
            `${LOCAL_MOOD_KEY}:${profileRef.current.roomId}:${status.role}`,
            JSON.stringify(status)
          );
        } catch {
          // ignore
        }
        return status;
      });
    },
    []
  );

  const buildPresencePayload = useCallback(() => {
    const p = profileRef.current;
    const myName = p.role === "user_a" ? p.userAName : p.userBName;
    const visibility =
      typeof document !== "undefined" ? document.visibilityState : "visible";
    return {
      role: p.role,
      name: myName,
      visibility,
      timestamp: Date.now(),
      sessionId,
      mood: myMoodRef.current,
      coupleMeta: coupleMetaRef.current,
      anniversary: anniversaryRef.current,
      heartbeatCount: heartbeatCountRef.current,
    };
  }, [sessionId]);

  const buildRoomSyncSnapshot = useCallback((): RoomSyncSnapshotPayload => {
    const compactChat = chatMessagesRef.current
      .slice(-40)
      .filter((m) => !m.media_url || m.media_url.length < 24000);

    return {
      senderRole: profileRef.current.role,
      coupleMeta: coupleMetaRef.current,
      anniversary: anniversaryRef.current,
      heartbeatCount: heartbeatCountRef.current,
      senderMood: myMoodRef.current,
      todayQnA: todayQnARef.current,
      gamesState: gamesStateRef.current,
      gamesUpdatedAt: syncTimestampsRef.current.gamesUpdatedAt,
      stamps: stampsRef.current.slice(-120),
      stampsClearedAt: syncTimestampsRef.current.stampsClearedAt,
      sharedNotes: sharedNotesRef.current,
      notesUpdatedAt: syncTimestampsRef.current.notesUpdatedAt,
      bucketItems: bucketItemsRef.current,
      bucketUpdatedAt: syncTimestampsRef.current.bucketUpdatedAt,
      sharedPlaylist: sharedPlaylistRef.current,
      playlistUpdatedAt: syncTimestampsRef.current.playlistUpdatedAt,
      recentChatMessages: compactChat,
    };
  }, []);

  const applyRoomSyncSnapshot = useCallback(
    (snap?: RoomSyncSnapshotPayload | null) => {
      if (!snap || snap.senderRole === profileRef.current.role) return;

      const roomId = profileRef.current.roomId;

      applyIncomingCoupleMeta(snap.coupleMeta);
      applyIncomingAnniversary(snap.anniversary);
      applyIncomingHeartbeatCount(snap.heartbeatCount);
      applyIncomingPartnerMood(snap.senderMood);

      // Merge Daily QnA answers for today so neither partner's answer is lost
      if (snap.todayQnA && snap.todayQnA.prompt_date === todayISO) {
        setTodayQnA((prev) => {
          const nextA = prev.user_a_answer || snap.todayQnA?.user_a_answer || null;
          const nextB = prev.user_b_answer || snap.todayQnA?.user_b_answer || null;
          if (
            nextA === prev.user_a_answer &&
            nextB === prev.user_b_answer &&
            snap.todayQnA?.question === prev.question
          ) {
            return prev;
          }
          const merged: DailyQnA = {
            ...prev,
            question: snap.todayQnA?.question || prev.question,
            user_a_answer: nextA,
            user_b_answer: nextB,
            user_a_answered_at:
              prev.user_a_answered_at || snap.todayQnA?.user_a_answered_at || null,
            user_b_answered_at:
              prev.user_b_answered_at || snap.todayQnA?.user_b_answered_at || null,
            is_unlocked: Boolean(nextA?.trim() && nextB?.trim()),
          };
          try {
            window.localStorage.setItem(
              `${LOCAL_QNA_STORAGE_KEY}:${roomId}:${todayISO}`,
              JSON.stringify(merged)
            );
          } catch {}
          return merged;
        });
      }

      // Reconcile Playground Games State (LWW)
      if (
        snap.gamesState &&
        (snap.gamesUpdatedAt ?? 0) > syncTimestampsRef.current.gamesUpdatedAt
      ) {
        persistSyncTimestamps({ gamesUpdatedAt: snap.gamesUpdatedAt });
        setGamesState(snap.gamesState);
        try {
          window.localStorage.setItem(
            `${LOCAL_GAMES_STORAGE_KEY}:${roomId}`,
            JSON.stringify(snap.gamesState)
          );
        } catch {}
      }

      // Reconcile Canvas Stamps (respect clear timestamp + union by stamp.id)
      if (Array.isArray(snap.stamps)) {
        const remoteClear = snap.stampsClearedAt ?? 0;
        const localClear = syncTimestampsRef.current.stampsClearedAt ?? 0;
        const maxClear = Math.max(remoteClear, localClear);
        if (remoteClear > localClear) {
          persistSyncTimestamps({ stampsClearedAt: remoteClear });
        }
        setStamps((prev) => {
          const map = new Map<string, CanvasStamp>();
          for (const s of prev) {
            if (s.createdAt >= maxClear) map.set(s.id, s);
          }
          for (const s of snap.stamps || []) {
            if (s.createdAt >= maxClear) map.set(s.id, s);
          }
          const merged = Array.from(map.values()).sort(
            (a, b) => a.createdAt - b.createdAt
          );
          if (merged.length === prev.length) return prev;
          try {
            window.localStorage.setItem(
              `${LOCAL_STAMPS_STORAGE_KEY}:${roomId}`,
              JSON.stringify(merged)
            );
          } catch {}
          return merged;
        });
      }

      // Reconcile Shared Notes (LWW when edited)
      if (
        Array.isArray(snap.sharedNotes) &&
        (snap.notesUpdatedAt ?? 0) > syncTimestampsRef.current.notesUpdatedAt
      ) {
        persistSyncTimestamps({ notesUpdatedAt: snap.notesUpdatedAt });
        setSharedNotes(snap.sharedNotes);
        try {
          window.localStorage.setItem(
            `${LOCAL_NOTES_STORAGE_KEY}:${roomId}`,
            JSON.stringify(snap.sharedNotes)
          );
        } catch {}
      }

      // Reconcile Bucket List (LWW when edited)
      if (
        Array.isArray(snap.bucketItems) &&
        (snap.bucketUpdatedAt ?? 0) > syncTimestampsRef.current.bucketUpdatedAt
      ) {
        persistSyncTimestamps({ bucketUpdatedAt: snap.bucketUpdatedAt });
        setBucketItems(snap.bucketItems);
        try {
          window.localStorage.setItem(
            `${LOCAL_BUCKET_STORAGE_KEY}:${roomId}`,
            JSON.stringify(snap.bucketItems)
          );
        } catch {}
      }

      // Reconcile Shared Playlist (LWW when edited)
      if (
        Array.isArray(snap.sharedPlaylist) &&
        (snap.playlistUpdatedAt ?? 0) >
          syncTimestampsRef.current.playlistUpdatedAt
      ) {
        persistSyncTimestamps({ playlistUpdatedAt: snap.playlistUpdatedAt });
        setSharedPlaylist(snap.sharedPlaylist);
        try {
          window.localStorage.setItem(
            `${LOCAL_PLAYLIST_KEY}:${roomId}`,
            JSON.stringify(snap.sharedPlaylist)
          );
        } catch {}
      }

      // Merge Recent Chat Messages by ID
      if (
        Array.isArray(snap.recentChatMessages) &&
        snap.recentChatMessages.length > 0
      ) {
        setChatMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          let addedOrChanged = false;
          for (const m of snap.recentChatMessages || []) {
            if (!map.has(m.id)) {
              map.set(m.id, m);
              addedOrChanged = true;
            }
          }
          if (!addedOrChanged) return prev;
          const merged = Array.from(map.values()).sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
          try {
            window.localStorage.setItem(
              `${LOCAL_CHAT_STORAGE_KEY}:${roomId}`,
              JSON.stringify(merged)
            );
          } catch {}
          return merged;
        });
      }
    },
    [
      applyIncomingAnniversary,
      applyIncomingCoupleMeta,
      applyIncomingHeartbeatCount,
      applyIncomingPartnerMood,
      persistSyncTimestamps,
      todayISO,
    ]
  );

  const syncPresenceNow = useCallback(() => {
    const myName =
      profileRef.current.role === "user_a"
        ? profileRef.current.userAName
        : profileRef.current.userBName;
    const visibility =
      typeof document !== "undefined" ? document.visibilityState : "visible";

    setOnlineRoles((prev) => {
      if (prev.has(profile.role)) return prev;
      const next = new Set<PartnerRole>();
      next.add(profile.role);
      if (prev.has(partnerRole)) next.add(partnerRole);
      return next;
    });

    if (supabaseChannelRef.current) {
      supabaseChannelRef.current
        .track({
          role: profile.role,
          name: myName,
          online_at: new Date().toISOString(),
          visibility,
        })
        .catch(() => {});
    }

    emitRealtime("presence-ping", buildPresencePayload());

    const now = Date.now();
    if (now - lastRoomSyncRequestAtRef.current > 4000) {
      lastRoomSyncRequestAtRef.current = now;
      emitRealtime("room-sync-request", {
        requesterRole: profile.role,
        timestamp: now,
      });
    }
  }, [buildPresencePayload, emitRealtime, partnerRole, profile.role]);

  const schedulePartnerOfflineGrace = useCallback(() => {
    if (!onlineRolesRef.current.has(partnerRole)) return;
    if (partnerOfflineGraceTimerRef.current) return;

    // Probe partner immediately before marking offline (anti-flicker on 4G/WiFi handoff)
    emitRealtime("presence-ping", buildPresencePayload());

    // 9-second Grace Period before transitioning partner to offline
    partnerOfflineGraceTimerRef.current = window.setTimeout(() => {
      partnerOfflineGraceTimerRef.current = null;
      const elapsed = Date.now() - partnerLastSeenAtRef.current;
      if (elapsed >= 8500) {
        setOnlineRoles(new Set<PartnerRole>([profile.role]));
      }
    }, 9000);
  }, [buildPresencePayload, emitRealtime, partnerRole, profile.role]);

  // Lifecycle & Tab Focus Auto-Resync (visibilitychange, focus, online/offline)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncPresenceNow();
      }
    };
    const handleFocus = () => {
      syncPresenceNow();
    };
    const handleOnline = () => {
      setIsBrowserOnline(true);
      setIsChannelReconnecting(false);
      syncPresenceNow();
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPresenceNow]);

  // Subscribe to Supabase Realtime ('couple-room') + Local BroadcastChannel + SSE Bridge
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channelName = profile.roomId || "couple-room";

    // Ensure current role is always in onlineRoles upon role switch
    setOnlineRoles((prev) => {
      const next = new Set<PartnerRole>([profile.role]);
      if (
        prev.has(partnerRole) &&
        Date.now() - partnerLastSeenAtRef.current < 12000
      ) {
        next.add(partnerRole);
      }
      return next;
    });

    const replyPresencePong = () => {
      emitRealtime("presence-pong", buildPresencePayload());
    };

    const handlePresencePayload = (p: any, shouldReplyPong: boolean) => {
      if (!p || !p.role || p.role === profile.role) return;
      markPartnerActive();
      if (p.mood) applyIncomingPartnerMood(p.mood);
      if (p.coupleMeta) applyIncomingCoupleMeta(p.coupleMeta);
      if (p.anniversary) applyIncomingAnniversary(p.anniversary);
      if (typeof p.heartbeatCount === "number") {
        applyIncomingHeartbeatCount(p.heartbeatCount);
      }
      if (shouldReplyPong) {
        replyPresencePong();
      }
    };

    const applyIncomingNote = (note: SharedNote) => {
      persistSyncTimestamps({ notesUpdatedAt: Date.now() });
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
      persistSyncTimestamps({ notesUpdatedAt: Date.now() });
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
      persistSyncTimestamps({ bucketUpdatedAt: Date.now() });
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
        markPartnerActive();
        incomingChatCallbackRef.current?.(msg);

        // If partner executed a bot command (!play, !pause, etc.), execute on receiver too
        if (msg.text?.startsWith("!") && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("jockie-command", { detail: { text: msg.text } })
          );
        }
      }
    };

    const applyChatReaction = (
      messageId: string,
      emoji: string,
      role: PartnerRole
    ) => {
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
      markPartnerActive();
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
      markPartnerActive();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sanrio-webrtc-signal", { detail: signal })
        );
      }
      if (signal.type === "call-offer" && !signal.is_renegotiation) {
        setActiveIncomingCall(signal);
        incomingCallCallbackRef.current?.(signal);
      } else if (
        signal.type === "call-end" ||
        signal.type === "call-reject" ||
        signal.type === "call-busy"
      ) {
        setActiveIncomingCall(null);
      }
      setCallSignalQueue(signal);
    };

    if (supabase) {
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: sessionId },
        },
      });

      channel
        .on("broadcast", { event: "presence-ping" }, ({ payload }) => {
          handlePresencePayload(payload, true);
        })
        .on("broadcast", { event: "presence-pong" }, ({ payload }) => {
          handlePresencePayload(payload, false);
        })
        .on("broadcast", { event: "presence-leave" }, ({ payload }) => {
          const p = payload as { role?: PartnerRole };
          if (!p?.role || p.role !== profile.role) {
            schedulePartnerOfflineGrace();
          }
        })
        .on("broadcast", { event: "couple-meta-sync" }, ({ payload }) => {
          markPartnerActive();
          applyIncomingCoupleMeta(payload as CoupleRoomMeta);
        })
        .on("broadcast", { event: "anniversary-sync" }, ({ payload }) => {
          markPartnerActive();
          applyIncomingAnniversary(
            payload as { date: string; updatedAt: number }
          );
        })
        .on("broadcast", { event: "room-sync-request" }, ({ payload }) => {
          const p = payload as { requesterRole?: PartnerRole };
          if (!p?.requesterRole || p.requesterRole !== profile.role) {
            markPartnerActive();
            emitRealtime("room-sync-snapshot", buildRoomSyncSnapshot());
          }
        })
        .on("broadcast", { event: "room-sync-snapshot" }, ({ payload }) => {
          markPartnerActive();
          applyRoomSyncSnapshot(payload as RoomSyncSnapshotPayload);
        })
        .on("broadcast", { event: "heartbeat" }, ({ payload }) => {
          const event = payload as HeartbeatEvent & { heartbeatCount?: number };
          if (!event?.id || markSeen(event.id)) return;
          if (event.senderRole !== profile.role) markPartnerActive();
          const nextCount = Math.max(
            heartbeatCountRef.current + 1,
            event.heartbeatCount || 0
          );
          heartbeatCountRef.current = nextCount;
          setHeartbeatCount(nextCount);
          try {
            window.localStorage.setItem(
              `${LOCAL_HEARTBEAT_COUNT_KEY}:${profile.roomId}:${todayISO}`,
              String(nextCount)
            );
          } catch {}
          heartbeatCallbackRef.current?.(event);
        })
        .on("broadcast", { event: "qna-updated" }, ({ payload }) => {
          const updated = payload as DailyQnA;
          if (updated?.prompt_date === todayISO) {
            setTodayQnA(updated);
            try {
              window.localStorage.setItem(
                `${LOCAL_QNA_STORAGE_KEY}:${profile.roomId}:${todayISO}`,
                JSON.stringify(updated)
              );
            } catch {}
          }
        })
        .on("broadcast", { event: "canvas-stroke" }, ({ payload }) => {
          const seg = payload as StrokeSegment;
          if (!seg?.id || markSeen(seg.id)) return;
          if (seg.senderRole !== profile.role) markPartnerActive();
          strokeCallbackRef.current?.(seg);
        })
        .on("broadcast", { event: "canvas-stamp" }, ({ payload }) => {
          const stamp = payload as CanvasStamp;
          if (!stamp?.id || markSeen(stamp.id)) return;
          if (stamp.senderRole !== profile.role) markPartnerActive();
          setStamps((prev) => {
            const next = [...prev, stamp];
            try {
              window.localStorage.setItem(
                `${LOCAL_STAMPS_STORAGE_KEY}:${profile.roomId}`,
                JSON.stringify(next)
              );
            } catch {}
            return next;
          });
        })
        .on("broadcast", { event: "canvas-clear" }, ({ payload }) => {
          const clearId = (payload as { id?: string })?.id;
          if (clearId && markSeen(clearId)) return;
          persistSyncTimestamps({ stampsClearedAt: Date.now() });
          setStamps([]);
          try {
            window.localStorage.removeItem(
              `${LOCAL_STAMPS_STORAGE_KEY}:${profile.roomId}`
            );
          } catch {}
          clearCanvasCallbackRef.current?.();
        })
        .on("broadcast", { event: "canvas-cursor" }, ({ payload }) => {
          const cursor = payload as PartnerCursor;
          if (cursor && cursor.role !== profile.role) {
            markPartnerActive();
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
            markPartnerActive();
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
          persistSyncTimestamps({ gamesUpdatedAt: Date.now() });
          setGamesState(msg.state);
          try {
            window.localStorage.setItem(
              `${LOCAL_GAMES_STORAGE_KEY}:${profile.roomId}`,
              JSON.stringify(msg.state)
            );
          } catch {}
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
            markPartnerActive();
            setChatTyping(status);
          }
        })
        .on("broadcast", { event: "chat-reaction" }, ({ payload }) => {
          const p = payload as {
            messageId: string;
            emoji: string;
            role: PartnerRole;
          };
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
            markPartnerActive();
            applyIncomingPartnerMood(status);
          }
        })
        .on("broadcast", { event: "music-sync" }, ({ payload }) => {
          const syncEv = payload as MusicSyncEvent;
          if (syncEv && syncEv.senderRole !== profile.role) {
            markPartnerActive();
            setMusicSyncEvent(syncEv);
            musicSyncCallbackRef.current?.(syncEv);
          }
        })
        .on("broadcast", { event: "playlist-sync" }, ({ payload }) => {
          const p = payload as { items: SharedPlaylistItem[] };
          if (p?.items) {
            persistSyncTimestamps({ playlistUpdatedAt: Date.now() });
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
        .on("broadcast", { event: "partner-waiting-ping" }, ({ payload }) => {
          const p = payload as { senderRole: PartnerRole; senderName: string };
          if (p && p.senderRole !== profile.role) {
            markPartnerActive();
            notifyPartnerWaiting(p.senderName);
          }
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<{
            role: PartnerRole;
            name: string;
            visibility?: string;
          }>();
          let sawPartner = false;
          Object.values(state).forEach((presences) => {
            presences.forEach((p) => {
              if (p.role === partnerRole) {
                sawPartner = true;
              }
            });
          });
          if (sawPartner) {
            markPartnerActive();
          } else {
            schedulePartnerOfflineGrace();
          }
        })
        .on("presence", { event: "join" }, ({ newPresences }) => {
          (newPresences as Array<{ role?: PartnerRole }>).forEach((p) => {
            if (p.role === partnerRole) {
              markPartnerActive();
              replyPresencePong();
            }
          });
        })
        .on("presence", { event: "leave" }, () => {
          schedulePartnerOfflineGrace();
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            setIsChannelReconnecting(false);
            const curName =
              profileRef.current.role === "user_a"
                ? profileRef.current.userAName
                : profileRef.current.userBName;
            await channel.track({
              role: profile.role,
              name: curName,
              online_at: new Date().toISOString(),
              visibility:
                typeof document !== "undefined"
                  ? document.visibilityState
                  : "visible",
            });
            // Immediately emit enriched presence-ping + full room-sync-request
            channel.send({
              type: "broadcast",
              event: "presence-ping",
              payload: buildPresencePayload(),
            });
            channel.send({
              type: "broadcast",
              event: "room-sync-request",
              payload: {
                requesterRole: profile.role,
                timestamp: Date.now(),
              },
            });
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setIsChannelReconnecting(true);
          }
        });

      supabaseChannelRef.current = channel;
    }

    // Local Cross-Tab BroadcastChannel & Network SSE Stream
    let bc: BroadcastChannel | null = null;
    let presenceHeartbeatTimer: number | null = null;
    let eventSource: EventSource | null = null;

    const handleBridgeEvent = (msg: any) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.sessionId === sessionId || msg.senderSessionId === sessionId) {
        return;
      }

      switch (msg.type) {
        case "presence-ping": {
          handlePresencePayload(msg.payload || msg, true);
          break;
        }
        case "presence-pong": {
          handlePresencePayload(msg.payload || msg, false);
          break;
        }
        case "presence-leave":
          schedulePartnerOfflineGrace();
          break;
        case "couple-meta-sync": {
          markPartnerActive();
          applyIncomingCoupleMeta(msg.payload as CoupleRoomMeta);
          break;
        }
        case "anniversary-sync": {
          markPartnerActive();
          applyIncomingAnniversary(
            msg.payload as { date: string; updatedAt: number }
          );
          break;
        }
        case "room-sync-request": {
          const p = (msg.payload || msg) as { requesterRole?: PartnerRole };
          if (!p?.requesterRole || p.requesterRole !== profile.role) {
            markPartnerActive();
            emitRealtime("room-sync-snapshot", buildRoomSyncSnapshot());
          }
          break;
        }
        case "room-sync-snapshot": {
          markPartnerActive();
          applyRoomSyncSnapshot(msg.payload as RoomSyncSnapshotPayload);
          break;
        }
        case "heartbeat": {
          const event = msg.payload as HeartbeatEvent & {
            heartbeatCount?: number;
          };
          if (!event?.id || markSeen(event.id)) return;
          if (event.senderRole !== profile.role) markPartnerActive();
          const nextCount = Math.max(
            heartbeatCountRef.current + 1,
            event.heartbeatCount || 0
          );
          heartbeatCountRef.current = nextCount;
          setHeartbeatCount(nextCount);
          try {
            window.localStorage.setItem(
              `${LOCAL_HEARTBEAT_COUNT_KEY}:${profile.roomId}:${todayISO}`,
              String(nextCount)
            );
          } catch {}
          heartbeatCallbackRef.current?.(event);
          break;
        }
        case "qna-updated": {
          const updated = msg.payload as DailyQnA;
          if (updated?.prompt_date === todayISO) {
            setTodayQnA(updated);
            try {
              window.localStorage.setItem(
                `${LOCAL_QNA_STORAGE_KEY}:${profile.roomId}:${todayISO}`,
                JSON.stringify(updated)
              );
            } catch {}
          }
          break;
        }
        case "canvas-stroke": {
          const seg = msg.payload as StrokeSegment;
          if (!seg?.id || markSeen(seg.id)) return;
          if (seg.senderRole !== profile.role) markPartnerActive();
          strokeCallbackRef.current?.(seg);
          break;
        }
        case "canvas-stamp": {
          const stamp = msg.payload as CanvasStamp;
          if (!stamp?.id || markSeen(stamp.id)) return;
          if (stamp.senderRole !== profile.role) markPartnerActive();
          setStamps((prev) => {
            const next = [...prev, stamp];
            try {
              window.localStorage.setItem(
                `${LOCAL_STAMPS_STORAGE_KEY}:${profile.roomId}`,
                JSON.stringify(next)
              );
            } catch {}
            return next;
          });
          break;
        }
        case "canvas-clear": {
          if (msg.id && markSeen(msg.id)) return;
          persistSyncTimestamps({ stampsClearedAt: Date.now() });
          setStamps([]);
          try {
            window.localStorage.removeItem(
              `${LOCAL_STAMPS_STORAGE_KEY}:${profile.roomId}`
            );
          } catch {}
          clearCanvasCallbackRef.current?.();
          break;
        }
        case "canvas-cursor": {
          const cursor = msg.payload as PartnerCursor;
          if (cursor && cursor.role !== profile.role) {
            markPartnerActive();
            setPartnerCursor(cursor);
          }
          break;
        }
        case "note-upsert": {
          if (!msg.eventId || markSeen(msg.eventId)) return;
          applyIncomingNote((msg.note || msg.payload) as SharedNote);
          break;
        }
        case "note-delete": {
          if (!msg.eventId || markSeen(msg.eventId)) return;
          applyDeleteNote(msg.noteId as string);
          break;
        }
        case "note-typing": {
          const typing = msg.payload as NoteTypingStatus;
          if (typing && typing.role !== profile.role) {
            markPartnerActive();
            setPartnerTyping(typing);
          }
          break;
        }
        case "bucket-sync": {
          if (!msg.eventId || markSeen(msg.eventId)) return;
          applyIncomingBucketList((msg.items || msg.payload) as BucketItem[]);
          break;
        }
        case "games-sync": {
          if (!msg.eventId || markSeen(msg.eventId)) return;
          const nextG = (msg.state || msg.payload) as CoupleGamesState;
          persistSyncTimestamps({ gamesUpdatedAt: Date.now() });
          setGamesState(nextG);
          try {
            window.localStorage.setItem(
              `${LOCAL_GAMES_STORAGE_KEY}:${profile.roomId}`,
              JSON.stringify(nextG)
            );
          } catch {}
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
          if (status && status.role !== profile.role) {
            markPartnerActive();
            setChatTyping(status);
          }
          break;
        }
        case "chat-reaction": {
          const p = msg.payload as {
            messageId: string;
            emoji: string;
            role: PartnerRole;
          };
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
            markPartnerActive();
            applyIncomingPartnerMood(status);
          }
          break;
        }
        case "music-sync": {
          const syncEv = msg.payload as MusicSyncEvent;
          if (syncEv && syncEv.senderRole !== profile.role) {
            markPartnerActive();
            setMusicSyncEvent(syncEv);
            musicSyncCallbackRef.current?.(syncEv);
          }
          break;
        }
        case "playlist-sync": {
          const items = (msg.payload?.items ||
            msg.payload) as SharedPlaylistItem[];
          if (Array.isArray(items)) {
            persistSyncTimestamps({ playlistUpdatedAt: Date.now() });
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
        case "partner-waiting-ping": {
          const p = msg.payload as {
            senderRole: PartnerRole;
            senderName: string;
          };
          if (p && p.senderRole !== profile.role) {
            markPartnerActive();
            notifyPartnerWaiting(p.senderName);
          }
          break;
        }
        case "jockie-sync": {
          if (typeof window !== "undefined" && msg.payload) {
            window.dispatchEvent(
              new CustomEvent("remote-jockie-sync", { detail: msg.payload })
            );
          }
          break;
        }
      }
    };

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel(`cinnamelo:${channelName}`);
      localBroadcastRef.current = bc;
      bc.onmessage = (ev) => {
        handleBridgeEvent(ev.data);
      };
    }

    // Network Cross-Device SSE Stream (Instant 2-way sync across local LAN devices)
    if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
      try {
        const sseUrl = `/api/realtime-sync?roomId=${encodeURIComponent(
          profile.roomId
        )}&role=${encodeURIComponent(
          profile.role
        )}&sessionId=${encodeURIComponent(sessionId)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
          if (!supabase) {
            setIsChannelReconnecting(false);
          }
        };

        eventSource.onerror = () => {
          if (!supabase) {
            setIsChannelReconnecting(true);
          }
        };

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (!data || typeof data !== "object") return;

            // 1. Initial snapshot on connect (Never wipe Supabase presence on serverless instances!)
            if (data.type === "snapshot" && data.payload) {
              const p = data.payload.presence;
              if (p && p[partnerRole]) {
                markPartnerActive();
              }
              if (data.payload.coupleMeta) {
                applyIncomingCoupleMeta(data.payload.coupleMeta);
              }
              if (data.payload.anniversary) {
                applyIncomingAnniversary(data.payload.anniversary);
              }
              if (typeof data.payload.heartbeatCount === "number") {
                applyIncomingHeartbeatCount(data.payload.heartbeatCount);
              }
              if (data.payload.moods?.[partnerRole]) {
                applyIncomingPartnerMood(data.payload.moods[partnerRole]);
              }
              if (data.payload.gamesState) {
                setGamesState(data.payload.gamesState);
              }
              if (
                Array.isArray(data.payload.bucketItems) &&
                data.payload.bucketItems.length > 0
              ) {
                setBucketItems(data.payload.bucketItems);
              }
              if (
                Array.isArray(data.payload.playlist) &&
                data.payload.playlist.length > 0
              ) {
                setSharedPlaylist(data.payload.playlist);
              }
              if (
                Array.isArray(data.payload.recentMessages) &&
                data.payload.recentMessages.length > 0
              ) {
                setChatMessages((prev) => {
                  const map = new Map(prev.map((m) => [m.id, m]));
                  for (const msg of data.payload.recentMessages) {
                    map.set(msg.id, msg);
                  }
                  return Array.from(map.values()).sort(
                    (a, b) =>
                      new Date(a.created_at).getTime() -
                      new Date(b.created_at).getTime()
                  );
                });
              }
              if (data.payload.musicState && typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("remote-jockie-sync", {
                    detail: data.payload.musicState,
                  })
                );
              }
              if (
                data.payload.qna &&
                data.payload.qna.prompt_date === todayISO
              ) {
                setTodayQnA(data.payload.qna);
              }
              return;
            }

            // 2. Presence updates from LAN SSE hub
            if (data.type === "presence" && data.payload) {
              const p = data.payload;
              if (p[partnerRole]) {
                markPartnerActive();
              } else if (!supabase) {
                schedulePartnerOfflineGrace();
              }
              return;
            }

            // 3. Skip echo of own messages sent via SSE
            if (data.senderSessionId === sessionId) return;

            // 4. Forward to dispatcher
            handleBridgeEvent(data);
          } catch {
            // ignore
          }
        };
      } catch (err) {
        console.warn("[SSE connection failed]", err);
      }
    }

    // Immediate enriched broadcast ping + snapshot request on room entry / role switch
    emitRealtime("presence-ping", buildPresencePayload());
    emitRealtime("room-sync-request", {
      requesterRole: profile.role,
      timestamp: Date.now(),
    });

    // Periodic Heartbeat Ping-Pong keepalive every 8s while active
    presenceHeartbeatTimer = window.setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) {
        emitRealtime("presence-ping", buildPresencePayload());
      }
    }, 8000);

    return () => {
      if (presenceHeartbeatTimer) {
        window.clearInterval(presenceHeartbeatTimer);
      }
      if (bc) {
        try {
          bc.postMessage({
            type: "presence-leave",
            role: profile.role,
            sessionId,
          });
        } catch {}
        bc.close();
      }
      if (eventSource) {
        eventSource.close();
      }
      localBroadcastRef.current = null;
      if (supabase && supabaseChannelRef.current) {
        supabase.removeChannel(supabaseChannelRef.current);
        supabaseChannelRef.current = null;
      }
    };
  }, [
    applyIncomingAnniversary,
    applyIncomingCoupleMeta,
    applyIncomingHeartbeatCount,
    applyIncomingPartnerMood,
    applyRoomSyncSnapshot,
    buildPresencePayload,
    buildRoomSyncSnapshot,
    emitRealtime,
    markPartnerActive,
    markSeen,
    partnerRole,
    persistSyncTimestamps,
    profile.role,
    profile.roomId,
    schedulePartnerOfflineGrace,
    sessionId,
    todayISO,
  ]);

  // --------------------------------------------------------------------------
  // SHARED COUPLE METADATA & ANNIVERSARY SYNC ACTIONS
  // --------------------------------------------------------------------------
  const broadcastProfileMeta = useCallback(
    (nextProfile: CoupleProfile) => {
      const meta: CoupleRoomMeta = {
        userAName: nextProfile.userAName?.trim() || "Awan",
        userBName: nextProfile.userBName?.trim() || "Melodi",
        userACharacter: nextProfile.userACharacter || "cinnamoroll",
        userBCharacter: nextProfile.userBCharacter || "my-melody",
        updatedAt: Date.now(),
        updatedByRole: nextProfile.role,
      };
      coupleMetaRef.current = meta;
      try {
        window.localStorage.setItem(
          `${LOCAL_META_STORAGE_KEY}:${nextProfile.roomId}`,
          JSON.stringify(meta)
        );
      } catch {
        // ignore
      }
      if (nextProfile.roomId === profileRef.current.roomId) {
        emitRealtime("couple-meta-sync", meta);
      }
    },
    [emitRealtime]
  );

  const updateAnniversaryDate = useCallback(
    (nextDate: string) => {
      const trimmed = nextDate.trim();
      if (!trimmed) return;
      const record = {
        date: trimmed,
        updatedAt: Date.now(),
      };
      anniversaryRef.current = record;
      setAnniversaryDate(trimmed);
      try {
        window.localStorage.setItem(
          `${LOCAL_ANNIVERSARY_KEY}:${profile.roomId}`,
          JSON.stringify(record)
        );
        window.localStorage.setItem(LEGACY_ANNIVERSARY_KEY, trimmed);
      } catch {
        // ignore
      }
      emitRealtime("anniversary-sync", record);
    },
    [emitRealtime, profile.roomId]
  );

  // --------------------------------------------------------------------------
  // HOME ACTIONS (Heartbeat & Daily Secret Envelope)
  // --------------------------------------------------------------------------
  const sendHeartbeat = useCallback(async () => {
    const senderName =
      profile.role === "user_a" ? profile.userAName : profile.userBName;
    const nextCount = heartbeatCountRef.current + 1;
    heartbeatCountRef.current = nextCount;
    setHeartbeatCount(nextCount);
    try {
      window.localStorage.setItem(
        `${LOCAL_HEARTBEAT_COUNT_KEY}:${profile.roomId}:${todayISO}`,
        String(nextCount)
      );
    } catch {}

    const event: HeartbeatEvent & { heartbeatCount?: number } = {
      id: `hb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      senderRole: profile.role,
      senderName,
      timestamp: Date.now(),
      heartbeatCount: nextCount,
    };
    markSeen(event.id);
    heartbeatCallbackRef.current?.(event);

    emitRealtime("heartbeat", event);
  }, [
    emitRealtime,
    markSeen,
    profile.role,
    profile.roomId,
    profile.userAName,
    profile.userBName,
    todayISO,
  ]);

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

      emitRealtime("qna-updated", optimisticRow);
    },
    [emitRealtime, profile.role, profile.roomId, profile.userAName, profile.userBName, todayISO, todayQnA]
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

      emitRealtime("qna-updated", resetRow);
    },
    [emitRealtime, profile.roomId, todayISO, todayQnA]
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
      emitRealtime("canvas-stroke", fullSegment);
    },
    [emitRealtime, markSeen, profile.role]
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

      emitRealtime("canvas-stamp", stamp);
    },
    [emitRealtime, markSeen, profile.role, profile.roomId]
  );

  const clearSharedCanvas = useCallback(() => {
    const clearId = `clr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    markSeen(clearId);
    persistSyncTimestamps({ stampsClearedAt: Date.now() });
    setStamps([]);
    try {
      window.localStorage.removeItem(
        `${LOCAL_STAMPS_STORAGE_KEY}:${profile.roomId}`
      );
    } catch {
      // ignore
    }
    emitRealtime("canvas-clear", { id: clearId }, { id: clearId });
  }, [emitRealtime, markSeen, persistSyncTimestamps, profile.roomId]);

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
      emitRealtime("canvas-cursor", cursor);
    },
    [emitRealtime, profile.role, profile.userAName, profile.userBName]
  );

  // --------------------------------------------------------------------------
  // SHARED NOTES ACTIONS
  // --------------------------------------------------------------------------
  const syncSharedNote = useCallback(
    async (note: SharedNote) => {
      const eventId = `nt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      markSeen(eventId);
      persistSyncTimestamps({ notesUpdatedAt: Date.now() });

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

      emitRealtime("note-upsert", { eventId, note }, { eventId, note });
    },
    [emitRealtime, markSeen, persistSyncTimestamps, profile.roomId]
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
      emitRealtime("note-typing", typingPayload);
    },
    [emitRealtime, profile.role, profile.userAName, profile.userBName, syncSharedNote]
  );

  const deleteSharedNote = useCallback(
    async (noteId: string) => {
      const eventId = `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      markSeen(eventId);
      persistSyncTimestamps({ notesUpdatedAt: Date.now() });

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

      emitRealtime("note-delete", { eventId, noteId }, { eventId, noteId });
    },
    [emitRealtime, markSeen, persistSyncTimestamps, profile.roomId]
  );

  // --------------------------------------------------------------------------
  // BUCKET LIST ACTIONS
  // --------------------------------------------------------------------------
  const syncBucketItems = useCallback(
    async (items: BucketItem[]) => {
      const eventId = `bkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      markSeen(eventId);
      persistSyncTimestamps({ bucketUpdatedAt: Date.now() });
      setBucketItems(items);
      try {
        window.localStorage.setItem(
          `${LOCAL_BUCKET_STORAGE_KEY}:${profile.roomId}`,
          JSON.stringify(items)
        );
      } catch {
        // ignore
      }

      emitRealtime("bucket-sync", { eventId, items }, { eventId, items });
    },
    [emitRealtime, markSeen, persistSyncTimestamps, profile.roomId]
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
        persistSyncTimestamps({ gamesUpdatedAt: Date.now() });
        try {
          window.localStorage.setItem(
            `${LOCAL_GAMES_STORAGE_KEY}:${profile.roomId}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }

        emitRealtime(
          "games-sync",
          { eventId, state: next },
          { eventId, state: next }
        );
        return next;
      });
    },
    [emitRealtime, markSeen, persistSyncTimestamps, profile.roomId]
  );

  const broadcastMiniDoodleStroke = useCallback(
    (segment: Omit<StrokeSegment, "id" | "senderRole">) => {
      const fullSegment: StrokeSegment = {
        ...segment,
        id: `mseg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderRole: profile.role,
      };
      markSeen(fullSegment.id);
      emitRealtime("mini-doodle-stroke", fullSegment);
    },
    [emitRealtime, markSeen, profile.role]
  );

  const clearMiniDoodle = useCallback(() => {
    const id = `mclr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    markSeen(id);
    emitRealtime("mini-doodle-clear", { id }, { id });
  }, [emitRealtime, markSeen]);

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

      emitRealtime("chat-message", newMsg);

      // If sender entered a Jockie bot command (!play, !stop, !pause, etc.), trigger locally too!
      if (newMsg.text?.startsWith("!") && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("jockie-command", { detail: { text: newMsg.text } })
        );
      }
    },
    [emitRealtime, markSeen, profile.role, profile.roomId, profile.userACharacter, profile.userAName, profile.userBCharacter, profile.userBName]
  );

  const sendChatTyping = useCallback(() => {
    const senderName =
      profile.role === "user_a" ? profile.userAName : profile.userBName;
    const status: ChatTypingStatus = {
      role: profile.role,
      name: senderName,
      timestamp: Date.now(),
    };
    emitRealtime("chat-typing", status);
  }, [emitRealtime, profile.role, profile.userAName, profile.userBName]);

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
      emitRealtime("chat-reaction", payload);
    },
    [emitRealtime, profile.role, profile.roomId]
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

    emitRealtime("chat-read", { role: profile.role });
  }, [emitRealtime, profile.role, profile.roomId]);

  const sendCallSignal = useCallback(
    (
      signalInput: Omit<
        WebRTCSignalMessage,
        "id" | "room_id" | "caller_role" | "caller_name" | "timestamp"
      >
    ) => {
      const senderName =
        profile.role === "user_a" ? profile.userAName : profile.userBName;

      // Ensure sdp and candidate are plain objects, never uncloneable DOM instances
      const safeSdp = signalInput.sdp
        ? {
            type: signalInput.sdp.type,
            sdp: signalInput.sdp.sdp,
          }
        : undefined;

      const safeCandidate = signalInput.candidate
        ? {
            candidate: signalInput.candidate.candidate,
            sdpMid: signalInput.candidate.sdpMid,
            sdpMLineIndex: signalInput.candidate.sdpMLineIndex,
            usernameFragment: (signalInput.candidate as any)?.usernameFragment,
          }
        : undefined;

      const signal: WebRTCSignalMessage = {
        ...signalInput,
        sdp: safeSdp,
        candidate: safeCandidate,
        id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        room_id: profile.roomId,
        caller_role: profile.role,
        caller_name: senderName,
        timestamp: Date.now(),
      };
      markSeen(signal.id);

      emitRealtime("webrtc-signal", signal);
    },
    [emitRealtime, markSeen, profile.role, profile.roomId, profile.userAName, profile.userBName]
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
      myMoodRef.current = newMood;
      setMyMood(newMood);
      try {
        window.localStorage.setItem(
          `${LOCAL_MOOD_KEY}:${profile.roomId}:${profile.role}`,
          JSON.stringify(newMood)
        );
      } catch {
        // ignore
      }

      emitRealtime("partner-mood", newMood);
    },
    [
      emitRealtime,
      profile.role,
      profile.roomId,
      profile.userACharacter,
      profile.userBCharacter,
    ]
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

      emitRealtime("music-sync", syncEvent);
    },
    [emitRealtime, profile.role, profile.userAName, profile.userBName]
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

      persistSyncTimestamps({ playlistUpdatedAt: Date.now() });
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
        emitRealtime("playlist-sync", { items: next });
        return next;
      });
    },
    [
      emitRealtime,
      persistSyncTimestamps,
      profile.role,
      profile.roomId,
      profile.userAName,
      profile.userBName,
    ]
  );

  const removeFromPlaylist = useCallback(
    (trackId: string) => {
      persistSyncTimestamps({ playlistUpdatedAt: Date.now() });
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
        emitRealtime("playlist-sync", { items: next });
        return next;
      });
    },
    [emitRealtime, persistSyncTimestamps, profile.roomId]
  );

  const unreadChatCount = useMemo(() => {
    return chatMessages.filter(
      (m) => m.sender_role !== profile.role && !m.is_read
    ).length;
  }, [chatMessages, profile.role]);

  const sendPartnerWaitingPing = useCallback(() => {
    const senderName =
      profile.role === "user_a" ? profile.userAName : profile.userBName;
    emitRealtime("partner-waiting-ping", {
      senderRole: profile.role,
      senderName,
      sentAt: Date.now(),
    });
  }, [emitRealtime, profile.role, profile.userAName, profile.userBName]);

  const bothPartnersOnline =
    simulatePartnerOnline ||
    (onlineRoles.has("user_a") && onlineRoles.has("user_b"));

  const networkStatus: NetworkConnectionStatus = !isBrowserOnline
    ? "offline"
    : isChannelReconnecting
    ? "reconnecting"
    : "connected";

  return {
    connectionMode,
    networkStatus,
    syncPresenceNow,
    onlineRoles,
    bothPartnersOnline,
    simulatePartnerOnline,
    setSimulatePartnerOnline,
    sendPartnerWaitingPing,
    anniversaryDate,
    updateAnniversaryDate,
    heartbeatCount,
    broadcastProfileMeta,
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
