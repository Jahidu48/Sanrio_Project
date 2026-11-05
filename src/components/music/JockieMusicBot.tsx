"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Disc3,
  ExternalLink,
  Headphones,
  ListMusic,
  Maximize2,
  Minimize2,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  SkipForward,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Youtube,
} from "lucide-react";
import type { CoupleProfile, MusicQueueItem, MusicRoomState } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useSharedMusic } from "@/context/SharedMusicContext";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|music\.youtube\.com\/watch\?v=)([\w-]{11})/i
  );
  if (match) return match[1];

  try {
    const parsed = new URL(trimmed);
    const vParam = parsed.searchParams.get("v");
    if (vParam && /^[\w-]{11}$/.test(vParam)) {
      return vParam;
    }
  } catch {}

  return null;
}

export interface JockieMusicBotHandle {
  executeCommand: (cmd: string, args?: string) => Promise<string>;
  getRoomState: () => MusicRoomState;
}

export interface JockieMusicBotProps {
  profile: CoupleProfile;
  onRoomStateChange?: (state: MusicRoomState) => void;
  initialState?: Partial<MusicRoomState>;
}

const STORAGE_ROOM_KEY = "cinnamelo_jockie_music_state_v1";

export const JockieMusicBot = forwardRef<JockieMusicBotHandle, JockieMusicBotProps>(
  function JockieMusicBot(
    { profile, onRoomStateChange, initialState },
    ref
  ) {
    const { pauseTrack: pauseLocalBgm } = useSharedMusic();

    const [roomState, setRoomState] = useState<MusicRoomState>({
      videoId: initialState?.videoId || "jfKfPfyJRdk",
      url: initialState?.url || "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      title: initialState?.title || "Lofi Hip Hop Radio — Beats to Relax/Study to",
      isPlaying: initialState?.isPlaying ?? false,
      startedAtServerTime: initialState?.startedAtServerTime || Date.now(),
      pausedAtSeconds: initialState?.pausedAtSeconds || 0,
      updatedBy: initialState?.updatedBy || "System",
      queue: initialState?.queue || [],
    });

    const [isApiReady, setIsApiReady] = useState(false);
    const [needsUnlock, setNeedsUnlock] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playerStatusText, setPlayerStatusText] = useState("Jockie Bot Standby 🎵");
    const [isMuted, setIsMuted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [queueInputUrl, setQueueInputUrl] = useState("");
    const [embedErrorNotice, setEmbedErrorNotice] = useState(false);

    const playerRef = useRef<any>(null);
    const isPlayerInitializedRef = useRef(false);
    const pendingPlayVideoIdRef = useRef<string | null>(null);
    const channelRef = useRef<any>(null);
    const localBroadcastRef = useRef<BroadcastChannel | null>(null);

    // Keep fresh reference of roomState for asynchronous callbacks (e.g. onStateChange ENDED)
    const roomStateRef = useRef(roomState);
    useEffect(() => {
      roomStateRef.current = roomState;
    }, [roomState]);

    // ------------------------------------------------------------------------
    // 1. DYNAMIC YOUTUBE IFRAME JS API INJECTOR
    // ------------------------------------------------------------------------
    useEffect(() => {
      if (typeof window === "undefined") return;

      if (window.YT && window.YT.Player) {
        setIsApiReady(true);
        return;
      }

      const existingTag = document.getElementById("youtube-iframe-api-script");
      if (!existingTag) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        setIsApiReady(true);
      };
    }, []);

    // ------------------------------------------------------------------------
    // 2. SUPABASE REALTIME & CROSS-TAB BROADCAST CHANNEL SETUP
    // ------------------------------------------------------------------------
    useEffect(() => {
      const channelName = `music-room:${profile.roomId}`;
      const supabase = getSupabaseBrowserClient();

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        localBroadcastRef.current = new BroadcastChannel(channelName);
        localBroadcastRef.current.onmessage = (event) => {
          if (event.data?.type === "jockie-sync" && event.data.payload) {
            handleRemoteStateUpdate(event.data.payload);
          }
        };
      }

      if (supabase) {
        const ch = supabase.channel(channelName, {
          config: { broadcast: { self: false } },
        });

        ch.on("broadcast", { event: "jockie-sync" }, ({ payload }) => {
          if (payload) {
            handleRemoteStateUpdate(payload);
          }
        })
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "music_room_state",
              filter: `room_id=eq.${profile.roomId}`,
            },
            (payload: any) => {
              if (payload.new) {
                const row = payload.new;
                handleRemoteStateUpdate({
                  videoId: row.video_id,
                  url: row.url,
                  title: row.title,
                  isPlaying: row.is_playing,
                  startedAtServerTime: Number(row.started_at_server_time),
                  pausedAtSeconds: Number(row.paused_at_seconds),
                  updatedBy: row.updated_by,
                  queue: Array.isArray(row.queue) ? row.queue : [],
                });
              }
            }
          )
          .subscribe();

        channelRef.current = ch;
      }

      // Restore saved state from local storage on mount
      try {
        const saved = window.localStorage.getItem(STORAGE_ROOM_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.videoId) {
            setRoomState({
              ...parsed,
              queue: Array.isArray(parsed.queue) ? parsed.queue : [],
            });
          }
        }
      } catch {
        // ignore
      }

      return () => {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }
        if (localBroadcastRef.current) {
          localBroadcastRef.current.close();
        }
      };
    }, [profile.roomId]);

    // Broadcast state out
    const broadcastState = useCallback(
      (nextState: MusicRoomState) => {
        setRoomState(nextState);
        onRoomStateChange?.(nextState);

        try {
          window.localStorage.setItem(STORAGE_ROOM_KEY, JSON.stringify(nextState));
        } catch {
          // ignore
        }

        channelRef.current?.send({
          type: "broadcast",
          event: "jockie-sync",
          payload: nextState,
        });

        localBroadcastRef.current?.postMessage({
          type: "jockie-sync",
          payload: nextState,
        });

        // 3. Network SSE Hub Broadcast (cross-device sync across phone & PC)
        if (typeof window !== "undefined") {
          fetch("/api/realtime-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId: profile.roomId,
              event: "jockie-sync",
              payload: nextState,
              senderRole: profile.role,
            }),
          }).catch(() => {});
        }

        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          Promise.resolve(
            supabase.from("music_room_state").upsert({
              room_id: profile.roomId,
              video_id: nextState.videoId,
              url: nextState.url,
              title: nextState.title,
              is_playing: nextState.isPlaying,
              started_at_server_time: nextState.startedAtServerTime,
              paused_at_seconds: nextState.pausedAtSeconds,
              updated_by: nextState.updatedBy,
              queue: nextState.queue || [],
              updated_at: new Date().toISOString(),
            })
          ).catch(() => {});
        }
      },
      [profile.roomId, onRoomStateChange]
    );

    // ------------------------------------------------------------------------
    // 3. REMOTE STATE REACTION
    // ------------------------------------------------------------------------
    const handleRemoteStateUpdate = useCallback(
      (remote: MusicRoomState) => {
        if (!remote || !remote.videoId) return;

        setRoomState({
          ...remote,
          queue: Array.isArray(remote.queue) ? remote.queue : [],
        });
        onRoomStateChange?.(remote);

        // Stop local background MP3 so they don't clash
        pauseLocalBgm();

        const player = playerRef.current;
        if (!player || !isPlayerInitializedRef.current) {
          pendingPlayVideoIdRef.current = remote.videoId;
          return;
        }

        try {
          if (player.getVideoData && player.getVideoData()?.video_id !== remote.videoId) {
            player.loadVideoById({
              videoId: remote.videoId,
              startSeconds: remote.pausedAtSeconds,
            });
          }

          if (remote.isPlaying) {
            const targetTime =
              remote.pausedAtSeconds + (Date.now() - remote.startedAtServerTime) / 1000;
            player.seekTo?.(targetTime, true);
            const playPromise = player.playVideo?.();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => setNeedsUnlock(true));
            }
          } else {
            player.pauseVideo?.();
            player.seekTo?.(remote.pausedAtSeconds, true);
          }
        } catch {
          setNeedsUnlock(true);
        }
      },
      [onRoomStateChange, pauseLocalBgm]
    );

    // ------------------------------------------------------------------------
    // 4. ON ENDED HANDLER (AUTO-PLAY NEXT IN QUEUE OR CLEAN RESET)
    // ------------------------------------------------------------------------
    const handleTrackEnded = useCallback(() => {
      const current = roomStateRef.current;
      const currentQueue = current.queue || [];

      if (currentQueue.length > 0) {
        const nextTrack = currentQueue[0];
        const remainingQueue = currentQueue.slice(1);
        const nextVidId = nextTrack.videoId || extractYouTubeId(nextTrack.url);

        if (nextVidId && playerRef.current && playerRef.current.loadVideoById) {
          try {
            playerRef.current.unMute?.();
            playerRef.current.loadVideoById(nextVidId);
            playerRef.current.playVideo();
          } catch (e) {
            console.warn("loadVideoById error in onEnded", e);
          }
        }

        const nextState: MusicRoomState = {
          videoId: nextVidId || "",
          url: nextTrack.url,
          title: nextTrack.title || `YouTube (${nextVidId})`,
          isPlaying: true,
          startedAtServerTime: Date.now(),
          pausedAtSeconds: 0,
          updatedBy: "Jockie Queue",
          queue: remainingQueue,
        };
        broadcastState(nextState);
        setPlayerStatusText(`Memutar lagu berikutnya dari antrean 🎶`);
      } else {
        // Queue is completely empty: cleanly reset without throwing error
        if (playerRef.current && playerRef.current.pauseVideo) {
          try {
            playerRef.current.pauseVideo();
          } catch {}
        }
        const nextState: MusicRoomState = {
          ...current,
          isPlaying: false,
          pausedAtSeconds: 0,
          queue: [],
          updatedBy: "System (Lagu Selesai)",
        };
        broadcastState(nextState);
        setPlayerStatusText("Lagu selesai 🎵 (Antrean kosong)");
      }
    }, [broadcastState]);

    // ------------------------------------------------------------------------
    // 5. INSTANTIATE YT.PLAYER (ONCE)
    // ------------------------------------------------------------------------
    useEffect(() => {
      if (!isApiReady) return;
      if (isPlayerInitializedRef.current) return;

      const container = document.getElementById("global-jockie-yt-player");
      if (!container) return;

      try {
        const player = new window.YT.Player("global-jockie-yt-player", {
          height: "100%",
          width: "100%",
          videoId: roomState.videoId || "jfKfPfyJRdk",
          playerVars: {
            autoplay: roomState.isPlaying ? 1 : 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            fs: 1,
            playsinline: 1,
            origin: typeof window !== "undefined" ? window.location.origin : "",
          },
          events: {
            onReady: (event: any) => {
              playerRef.current = event.target;
              isPlayerInitializedRef.current = true;
              setDuration(event.target.getDuration() || 0);
              setPlayerStatusText("Jockie Bot Terhubung 🎵");

              if (pendingPlayVideoIdRef.current) {
                const vid = pendingPlayVideoIdRef.current;
                pendingPlayVideoIdRef.current = null;
                event.target.loadVideoById(vid);
                event.target.playVideo();
                return;
              }

              if (roomState.isPlaying) {
                const targetTime =
                  roomState.pausedAtSeconds +
                  (Date.now() - roomState.startedAtServerTime) / 1000;
                event.target.seekTo(targetTime, true);
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 1) {
                // PLAYING
                setNeedsUnlock(false);
                setEmbedErrorNotice(false);
                setPlayerStatusText("Sedang Memutar... 🎵");
              } else if (event.data === 2) {
                // PAUSED
                setPlayerStatusText("Jeda ⏸️");
              } else if (event.data === 0) {
                // ENDED: Auto-advance queue or reset cleanly
                handleTrackEnded();
              }
            },
            onError: (err: any) => {
              if (err.data === 150 || err.data === 101) {
                setEmbedErrorNotice(true);
                setPlayerStatusText("⚠️ Video ini dibatasi hak cipta YouTube (Error 150). Coba link versi lirik/cover!");
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("jockie-embed-error", {
                      detail: { videoId: roomState.videoId, error: 150 },
                    })
                  );
                }
              } else if (err.data === 2) {
                setPlayerStatusText("Parameter link video tidak valid");
              } else if (err.data === 100) {
                setPlayerStatusText("Video tidak ditemukan atau bersifat privat");
              } else {
                setPlayerStatusText("Video tidak dapat disematkan / dibatasi");
              }
              console.warn("[JockieYT error]", err);
            },
          },
        });
      } catch (e) {
        console.warn("Could not create YT Player", e);
      }
    }, [isApiReady, roomState.isPlaying, roomState.videoId, roomState.pausedAtSeconds, roomState.startedAtServerTime, handleTrackEnded]);

    // ------------------------------------------------------------------------
    // 6. EXACT TIMESTAMP DRIFT CORRECTION (THE DISCORD BOT FORMULA)
    // ------------------------------------------------------------------------
    useEffect(() => {
      if (!roomState.isPlaying) return;

      const interval = window.setInterval(() => {
        const player = playerRef.current;
        if (!player || typeof player.getCurrentTime !== "function") return;

        const currentPos = player.getCurrentTime();
        setCurrentTime(currentPos);
        setDuration(player.getDuration() || duration);

        const targetTime =
          roomState.pausedAtSeconds +
          (Date.now() - roomState.startedAtServerTime) / 1000;

        const drift = Math.abs(currentPos - targetTime);

        if (drift > 2) {
          player.seekTo(targetTime, true);
          player.playVideo();
          setPlayerStatusText(`Sinkronisasi Jockie Bot (drift: ${drift.toFixed(1)}s)`);
        }
      }, 2500);

      return () => window.clearInterval(interval);
    }, [roomState.isPlaying, roomState.startedAtServerTime, roomState.pausedAtSeconds, duration]);

    // ------------------------------------------------------------------------
    // 7. COMMAND HANDLER IMPLEMENTATION (!play, !stop, !pause, !resume, !sync, !skip)
    // ------------------------------------------------------------------------
    const executeCommand = useCallback(
      async (command: string, arg?: string): Promise<string> => {
        const cmd = command.toLowerCase().trim();
        const player = playerRef.current;
        const senderName =
          profile.role === "user_a" ? profile.userAName : profile.userBName;

        pauseLocalBgm();

        // 1. COMMAND: !stop (Instant stop, clear queue, reset state)
        if (cmd === "!stop" || cmd === "stop") {
          if (player) {
            try {
              player.pauseVideo?.();
              player.seekTo?.(0, true);
            } catch {}
          }
          const next: MusicRoomState = {
            ...roomState,
            isPlaying: false,
            pausedAtSeconds: 0,
            queue: [],
            updatedBy: senderName,
          };
          broadcastState(next);
          setEmbedErrorNotice(false);
          setPlayerStatusText("Musik dihentikan & antrean dikosongkan 🛑");
          return `🛑 [Jockie Music Bot] Musik dihentikan seketika dan antrean telah dikosongkan oleh ${senderName}.`;
        }

        // 2. COMMAND: !play
        if (cmd === "!play" || cmd === "play") {
          if (!arg) {
            if (player && player.playVideo) {
              player.unMute?.();
              player.playVideo();
            }
            const next: MusicRoomState = {
              ...roomState,
              isPlaying: true,
              startedAtServerTime: Date.now(),
              updatedBy: senderName,
            };
            broadcastState(next);
            setIsDismissed(false);
            setIsMinimized(false);
            setEmbedErrorNotice(false);
            return `🎵 Melanjutkan lagu "${roomState.title}"`;
          }

          const vidId = extractYouTubeId(arg);
          if (!vidId) {
            return `⚠️ URL YouTube tidak valid. Contoh: !play https://youtu.be/...`;
          }

          if (player && player.loadVideoById) {
            try {
              player.unMute?.();
              player.loadVideoById(vidId);
              player.playVideo();
            } catch (err) {
              console.warn("loadVideoById error:", err);
            }
          } else {
            pendingPlayVideoIdRef.current = vidId;
          }

          const next: MusicRoomState = {
            ...roomState,
            videoId: vidId,
            url: arg,
            title: `YouTube (${vidId})`,
            isPlaying: true,
            startedAtServerTime: Date.now(),
            pausedAtSeconds: 0,
            updatedBy: senderName,
          };

          broadcastState(next);
          setIsDismissed(false);
          setIsMinimized(false);
          setEmbedErrorNotice(false);
          return `🎶 [Jockie Music Bot] Memutar video baru bersama: ${arg}`;
        }

        // 3. COMMAND: !pause
        if (cmd === "!pause" || cmd === "pause") {
          const currentPos = player?.getCurrentTime ? player.getCurrentTime() : currentTime;
          if (player && player.pauseVideo) {
            player.pauseVideo();
          }
          const next: MusicRoomState = {
            ...roomState,
            isPlaying: false,
            pausedAtSeconds: currentPos,
            updatedBy: senderName,
          };
          broadcastState(next);
          return `⏸️ [Jockie Music Bot] Musik dijeda di ${Math.floor(currentPos)} detik oleh ${senderName}.`;
        }

        // 4. COMMAND: !resume
        if (cmd === "!resume" || cmd === "resume") {
          if (player && player.playVideo) {
            player.unMute?.();
            player.playVideo();
          }
          const next: MusicRoomState = {
            ...roomState,
            isPlaying: true,
            startedAtServerTime: Date.now(),
            updatedBy: senderName,
          };
          broadcastState(next);
          setIsDismissed(false);
          setIsMinimized(false);
          setEmbedErrorNotice(false);
          return `▶️ [Jockie Music Bot] Melanjutkan pemutaran musik oleh ${senderName}.`;
        }

        // 5. COMMAND: !sync
        if (cmd === "!sync" || cmd === "sync") {
          const targetTime =
            roomState.pausedAtSeconds +
            (roomState.isPlaying
              ? (Date.now() - roomState.startedAtServerTime) / 1000
              : 0);

          if (player && player.seekTo) {
            player.seekTo(targetTime, true);
            if (roomState.isPlaying) {
              player.unMute?.();
              player.playVideo();
            }
          }

          broadcastState({
            ...roomState,
            updatedBy: `${senderName} (Forced Sync)`,
          });

          return `🔄 [Jockie Music Bot] Sinkronisasi kedua layar berhasil! Posisi: ${Math.floor(
            targetTime
          )}s`;
        }

        // 6. COMMAND: !skip (Skip to next in queue if available, or fallback lofi)
        if (cmd === "!skip" || cmd === "skip") {
          const currentQueue = roomState.queue || [];
          if (currentQueue.length > 0) {
            const nextTrack = currentQueue[0];
            const remainingQueue = currentQueue.slice(1);
            const nextVid = nextTrack.videoId || extractYouTubeId(nextTrack.url) || "jfKfPfyJRdk";
            if (player && player.loadVideoById) {
              try {
                player.unMute?.();
                player.loadVideoById(nextVid);
                player.playVideo();
              } catch {}
            }
            const next: MusicRoomState = {
              videoId: nextVid,
              url: nextTrack.url,
              title: nextTrack.title,
              isPlaying: true,
              startedAtServerTime: Date.now(),
              pausedAtSeconds: 0,
              updatedBy: senderName,
              queue: remainingQueue,
            };
            broadcastState(next);
            setIsDismissed(false);
            setEmbedErrorNotice(false);
            return `⏭️ [Jockie Music Bot] Melewati track. Memutar lagu antrean: ${nextTrack.title}`;
          } else {
            const altId = "jfKfPfyJRdk";
            if (player && player.loadVideoById) {
              player.unMute?.();
              player.loadVideoById(altId);
              player.playVideo();
            }
            const next: MusicRoomState = {
              videoId: altId,
              url: `https://www.youtube.com/watch?v=${altId}`,
              title: "Lofi Hip Hop Radio — Beats to Relax/Study to",
              isPlaying: true,
              startedAtServerTime: Date.now(),
              pausedAtSeconds: 0,
              updatedBy: senderName,
              queue: [],
            };
            broadcastState(next);
            setIsDismissed(false);
            setEmbedErrorNotice(false);
            return `⏭️ [Jockie Music Bot] Antrean kosong. Memutar Lofi Beats Chill Hop.`;
          }
        }

        return `Perintah tidak dikenal. Coba: !play <url>, !stop, !pause, !resume, !sync, !skip`;
      },
      [profile, roomState, broadcastState, currentTime, pauseLocalBgm]
    );

    useImperativeHandle(ref, () => ({
      executeCommand,
      getRoomState: () => roomState,
    }));

    // Listen to global custom events dispatched from chat or UI
    useEffect(() => {
      const handleGlobalBotCommand = (e: CustomEvent<{ text: string }>) => {
        const text = e.detail?.text || "";
        const parts = text.trim().split(/\s+/);
        const cmd = parts[0];
        const arg = parts.slice(1).join(" ");
        executeCommand(cmd, arg);
      };

      window.addEventListener(
        "jockie-command" as any,
        handleGlobalBotCommand as EventListener
      );
      return () => {
        window.removeEventListener(
          "jockie-command" as any,
          handleGlobalBotCommand as EventListener
        );
      };
    }, [executeCommand]);

    // Listen to network SSE sync events dispatched from partner device
    useEffect(() => {
      const handleRemoteJockieSync = (e: CustomEvent<MusicRoomState>) => {
        if (e.detail) {
          handleRemoteStateUpdate(e.detail);
        }
      };

      window.addEventListener(
        "remote-jockie-sync" as any,
        handleRemoteJockieSync as EventListener
      );
      return () => {
        window.removeEventListener(
          "remote-jockie-sync" as any,
          handleRemoteJockieSync as EventListener
        );
      };
    }, [handleRemoteStateUpdate]);

    // Autoplay unlock handler
    const handleUnlockAudio = () => {
      setNeedsUnlock(false);
      const player = playerRef.current;
      if (player) {
        try {
          player.unMute?.();
          const targetTime =
            roomState.pausedAtSeconds +
            (roomState.isPlaying
              ? (Date.now() - roomState.startedAtServerTime) / 1000
              : 0);
          player.seekTo?.(targetTime, true);
          player.playVideo?.();
        } catch {
          // ignore
        }
      }
    };

    const togglePlayPause = () => {
      if (roomState.isPlaying) {
        executeCommand("!pause");
      } else {
        executeCommand("!resume");
      }
    };

    const toggleMute = () => {
      const player = playerRef.current;
      if (!player) return;
      if (isMuted) {
        player.unMute?.();
        setIsMuted(false);
      } else {
        player.mute?.();
        setIsMuted(true);
      }
    };

    // ------------------------------------------------------------------------
    // 8. QUEUE MANAGEMENT ACTIONS ("Tambah ke Antrean" & "Putar Setelah Ini")
    // ------------------------------------------------------------------------
    const handleAddSongToQueue = (playNext = false) => {
      const trimmed = queueInputUrl.trim();
      if (!trimmed) return;
      const vidId = extractYouTubeId(trimmed);
      if (!vidId) {
        alert("URL YouTube tidak valid!");
        return;
      }
      const senderName =
        profile.role === "user_a" ? profile.userAName : profile.userBName;
      const newTrack: MusicQueueItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: `YouTube (${vidId})`,
        url: trimmed,
        videoId: vidId,
        addedBy: senderName,
      };

      const player = playerRef.current;
      const currentQueue = roomState.queue || [];

      if (!roomState.isPlaying) {
        // Nothing is playing: start playing immediately
        if (player && player.loadVideoById) {
          try {
            player.unMute?.();
            player.loadVideoById(vidId);
            player.playVideo();
          } catch {}
        }
        const next: MusicRoomState = {
          videoId: vidId,
          url: trimmed,
          title: newTrack.title,
          isPlaying: true,
          startedAtServerTime: Date.now(),
          pausedAtSeconds: 0,
          updatedBy: senderName,
          queue: currentQueue,
        };
        broadcastState(next);
        setEmbedErrorNotice(false);
      } else {
        // Currently playing: insert into queue
        let updatedQueue: MusicQueueItem[];
        if (playNext) {
          // Putar Setelah Ini: index 0
          updatedQueue = [newTrack, ...currentQueue];
          setPlayerStatusText(`Lagu ditambahkan ke "Putar Setelah Ini" ⏩`);
        } else {
          // Tambah ke Antrean: append
          updatedQueue = [...currentQueue, newTrack];
          setPlayerStatusText(`Lagu ditambahkan ke antrean ➕`);
        }
        const next: MusicRoomState = {
          ...roomState,
          queue: updatedQueue,
          updatedBy: senderName,
        };
        broadcastState(next);
      }

      setQueueInputUrl("");
    };

    const handleRemoveQueueItem = (id: string) => {
      const currentQueue = roomState.queue || [];
      const nextQueue = currentQueue.filter((item) => item.id !== id);
      const next: MusicRoomState = {
        ...roomState,
        queue: nextQueue,
        updatedBy:
          profile.role === "user_a" ? profile.userAName : profile.userBName,
      };
      broadcastState(next);
    };

    const handlePlayFallbackLofi = () => {
      const altId = "jfKfPfyJRdk";
      const player = playerRef.current;
      if (player && player.loadVideoById) {
        try {
          player.unMute?.();
          player.loadVideoById(altId);
          player.playVideo();
        } catch {}
      }
      const next: MusicRoomState = {
        ...roomState,
        videoId: altId,
        url: `https://www.youtube.com/watch?v=${altId}`,
        title: "Lofi Hip Hop Radio — Beats to Relax/Study to",
        isPlaying: true,
        startedAtServerTime: Date.now(),
        pausedAtSeconds: 0,
        updatedBy: "Jockie Fallback",
      };
      broadcastState(next);
      setEmbedErrorNotice(false);
    };

    return (
      <>
        {/* 
          1. PERSISTENT YOUTUBE IFRAME CONTAINER 
          Rendered permanently in DOM so playback NEVER stops across tab changes.
        */}
        <div
          className={`transition-all duration-300 z-40 ${
            isExpanded
              ? "fixed inset-x-4 top-20 sm:top-24 sm:right-6 sm:left-auto sm:w-96 rounded-3xl bg-slate-950 p-3 shadow-2xl border border-pink-300/40"
              : "fixed -left-[9999px] top-0 w-80 h-48 opacity-10 pointer-events-none overflow-hidden"
          }`}
        >
          {isExpanded && (
            <div className="flex items-center justify-between pb-2 text-white text-xs px-1">
              <span className="font-bold flex items-center gap-1.5">
                <Youtube className="h-4 w-4 text-red-500" />
                Live Video Screen
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-white/20 rounded-full cursor-pointer"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
            <div id="global-jockie-yt-player" className="h-full w-full" />
          </div>
        </div>

        {/* 
          2. MINIMIZED FLOATING SPINNING VINYL PILL (Mobile & Corner Friendly)
        */}
        <AnimatePresence>
          {isMinimized && !isDismissed && (
            <motion.button
              type="button"
              onClick={() => setIsMinimized(false)}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-pink-300 dark:border-purple-600 p-2 shadow-2xl text-slate-800 dark:text-white cursor-pointer group"
              title="Buka Jockie Music Bot 🎧"
            >
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-600 text-white shadow-md">
                <Disc3
                  className={`h-5 w-5 ${
                    roomState.isPlaying ? "animate-spin [animation-duration:3s]" : ""
                  }`}
                />
                {(roomState.queue || []).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow-xs">
                    {(roomState.queue || []).length}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block max-w-[120px] pr-2">
                <p className="text-[11px] font-bold truncate text-pink-600 dark:text-pink-300">
                  {roomState.title || "Jockie Bot"}
                </p>
                <p className="text-[9px] text-slate-400 truncate">
                  {roomState.isPlaying ? "Sedang Memutar 🎵" : "Jeda ⏸️"}
                </p>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* 
          3. FULL FLOATING SANRIO JOCKIE BOT ISLAND 
          Shows real-time status, synchronized player controls, queue & add track.
        */}
        <AnimatePresence>
          {!isMinimized && !isDismissed && (roomState.isPlaying || roomState.url) && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-[92vw] max-w-sm rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-pink-200 dark:border-slate-800 p-3 shadow-xl text-slate-800 dark:text-slate-100"
            >
              {/* Top Row: Mascot Header & Controls */}
              <div className="flex items-center justify-between pb-1.5 border-b border-pink-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-xs">
                    <Headphones className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold tracking-tight">
                      Jockie Music Bot 🎵
                    </h5>
                    <p className="text-[9px] text-slate-400 truncate max-w-[140px]">
                      oleh: {roomState.updatedBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Minimize into Spinning Vinyl Pill Button */}
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    title="Kecilkan ke Ikon CD Berputar"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  {/* Show Video Screen Button */}
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    title={isExpanded ? "Sembunyikan Video" : "Lihat Video"}
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {/* Dismiss Floating Bar Button */}
                  <button
                    type="button"
                    onClick={() => setIsDismissed(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Tutup Widget Musik"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Autoplay Unlock Notice if blocked */}
              {needsUnlock && (
                <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 p-2 text-center">
                  <button
                    type="button"
                    onClick={handleUnlockAudio}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 hover:bg-rose-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs animate-bounce cursor-pointer"
                  >
                    <Headphones className="h-3 w-3" />
                    <span>Tap to Join Audio Room 🎧</span>
                  </button>
                  <p className="mt-1 text-[9px] text-rose-600 dark:text-rose-300">
                    Browser membatasi suara otomatis. Ketuk tombol untuk menyinkronkan audio!
                  </p>
                </div>
              )}

              {/* Copyright Restriction (Error 150/101) Notice */}
              {embedErrorNotice && (
                <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 p-2 text-left">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-amber-800 dark:text-amber-200">
                      <strong className="block font-bold">
                        Video Dibatasi Hak Cipta YouTube (Error 150)
                      </strong>
                      Pemilik video resmi (misal MV artis) melarang pemutaran di luar aplikasi YouTube.
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePlayFallbackLofi}
                      className="rounded-full bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-0.5 text-[10px] font-bold cursor-pointer"
                    >
                      Putar Lofi Chill 🎵
                    </button>
                    {(roomState.queue || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => executeCommand("!skip")}
                        className="rounded-full bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-0.5 text-[10px] font-bold cursor-pointer"
                      >
                        Lanjut Antrean ⏭️
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Track Title & Live Status */}
              <div className="mt-2">
                <p className="text-xs font-bold text-pink-600 dark:text-pink-400 truncate max-w-[280px]">
                  {roomState.title || "YouTube Track"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[280px] italic">
                  {playerStatusText}
                </p>
              </div>

              {/* Playback Controls & Command Buttons */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Play / Pause Toggle */}
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-xs cursor-pointer active:scale-95"
                    title={roomState.isPlaying ? "Jeda Musik (!pause)" : "Putar Musik (!resume)"}
                  >
                    {roomState.isPlaying ? (
                      <Pause className="h-3 w-3 fill-white" />
                    ) : (
                      <Play className="h-3 w-3 fill-white ml-0.5" />
                    )}
                  </button>

                  {/* Stop Command (!stop) */}
                  <button
                    type="button"
                    onClick={() => executeCommand("!stop")}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 shadow-2xs cursor-pointer"
                    title="Stop Musik & Bersihkan Antrean (!stop)"
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </button>

                  {/* Skip Track (!skip) */}
                  <button
                    type="button"
                    onClick={() => executeCommand("!skip")}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
                    title="Lewati Lagu (!skip)"
                  >
                    <SkipForward className="h-3 w-3" />
                  </button>

                  {/* Mute Toggle */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                    title={isMuted ? "Bunyikan" : "Bisukan"}
                  >
                    {isMuted ? (
                      <VolumeX className="h-3 w-3 text-rose-500" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </button>

                  {/* Forced Sync Button */}
                  <button
                    type="button"
                    onClick={() => executeCommand("!sync")}
                    className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 border border-sky-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 cursor-pointer"
                    title="Paksa Sinkronkan Detik Kedua Layar"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>!sync</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Queue Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowQueue(!showQueue)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors ${
                      showQueue
                        ? "bg-pink-500 text-white"
                        : "bg-pink-100 dark:bg-purple-950/80 text-pink-700 dark:text-pink-300 hover:bg-pink-200"
                    }`}
                    title="Lihat Daftar Antrean Lagu"
                  >
                    <ListMusic className="h-3 w-3" />
                    <span>{(roomState.queue || []).length}</span>
                  </button>

                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {Math.floor(currentTime / 60)}:
                    {Math.floor(currentTime % 60).toString().padStart(2, "0")}
                  </div>
                </div>
              </div>

              {/* 
                4. COMPACT QUEUE ACCORDION & ADD ACTIONS ("Tambah ke Antrean" / "Putar Setelah Ini") 
              */}
              <AnimatePresence>
                {showQueue && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2.5 overflow-hidden border-t border-pink-100 dark:border-slate-800 pt-2"
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <ListMusic className="h-3 w-3 text-pink-500" />
                        Antrean Musik Berdua ({(roomState.queue || []).length})
                      </span>
                      {(roomState.queue || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => executeCommand("!stop")}
                          className="text-[9px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      )}
                    </div>

                    {/* Upcoming Song List */}
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 my-1">
                      {(roomState.queue || []).length === 0 ? (
                        <p className="text-[9px] text-slate-400 italic py-1">
                          Antrean masih kosong. Tambahkan lagu YouTube di bawah!
                        </p>
                      ) : (
                        (roomState.queue || []).map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/80 px-2 py-1 text-[10px]"
                          >
                            <span className="truncate max-w-[190px] font-medium text-slate-700 dark:text-slate-200">
                              <span className="text-pink-500 font-bold mr-1">
                                #{index + 1}
                              </span>
                              {item.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveQueueItem(item.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                              title="Hapus dari antrean"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add URL Form with Two Action Options */}
                    <div className="mt-2 space-y-1.5">
                      <input
                        type="text"
                        value={queueInputUrl}
                        onChange={(e) => setQueueInputUrl(e.target.value)}
                        placeholder="Tempel link YouTube di sini..."
                        className="w-full rounded-xl border border-pink-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-400"
                      />

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddSongToQueue(true)}
                          disabled={!queueInputUrl.trim()}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-pink-100 hover:bg-pink-200 dark:bg-pink-950 dark:hover:bg-pink-900 text-pink-700 dark:text-pink-300 py-1 text-[10px] font-bold disabled:opacity-40 cursor-pointer transition-all"
                          title="Masukkan ke urutan pertama berikutnya"
                        >
                          <SkipForward className="h-2.5 w-2.5" />
                          <span>Putar Setelah Ini</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddSongToQueue(false)}
                          disabled={!queueInputUrl.trim()}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white py-1 text-[10px] font-bold disabled:opacity-40 cursor-pointer shadow-2xs transition-all"
                          title="Masukkan ke urutan paling belakang"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          <span>Tambah Antrean</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
);
