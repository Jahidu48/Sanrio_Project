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
  ChevronDown,
  ChevronUp,
  Disc3,
  ExternalLink,
  Headphones,
  Maximize2,
  Minimize2,
  Music2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Youtube,
} from "lucide-react";
import type { CoupleProfile, MusicRoomState } from "@/lib/types";
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
  return match ? match[1] : null;
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
    });

    const [isApiReady, setIsApiReady] = useState(false);
    const [needsUnlock, setNeedsUnlock] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playerStatusText, setPlayerStatusText] = useState("Jockie Bot Standby 🎵");
    const [isMuted, setIsMuted] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    const playerRef = useRef<any>(null);
    const isPlayerInitializedRef = useRef(false);
    const pendingPlayVideoIdRef = useRef<string | null>(null);
    const channelRef = useRef<any>(null);
    const localBroadcastRef = useRef<BroadcastChannel | null>(null);

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
            setRoomState(parsed);
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

        setRoomState(remote);
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
    // 4. INSTANTIATE YT.PLAYER (ONCE)
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
                setNeedsUnlock(false);
                setPlayerStatusText("Sedang Memutar...");
              } else if (event.data === 2) {
                setPlayerStatusText("Jeda");
              }
            },
            onError: (err: any) => {
              if (err.data === 150 || err.data === 101) {
                setPlayerStatusText("Video ini dibatasi hak cipta YouTube (embed diblokir). Coba link versi lirik/cover!");
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
    }, [isApiReady, roomState.isPlaying, roomState.videoId, roomState.pausedAtSeconds, roomState.startedAtServerTime]);

    // ------------------------------------------------------------------------
    // 5. EXACT TIMESTAMP DRIFT CORRECTION (THE DISCORD BOT FORMULA)
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
    // 6. COMMAND HANDLER IMPLEMENTATION (!play, !pause, !resume, !sync, !skip)
    // ------------------------------------------------------------------------
    const executeCommand = useCallback(
      async (command: string, arg?: string): Promise<string> => {
        const cmd = command.toLowerCase().trim();
        const player = playerRef.current;
        const senderName =
          profile.role === "user_a" ? profile.userAName : profile.userBName;

        pauseLocalBgm();

        if (cmd === "!play" || cmd === "play") {
          if (!arg) {
            if (player && player.playVideo) {
              player.unMute?.();
              player.playVideo();
            }
            const next = {
              ...roomState,
              isPlaying: true,
              startedAtServerTime: Date.now(),
              updatedBy: senderName,
            };
            broadcastState(next);
            setIsDismissed(false);
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
          return `🎶 [Jockie Music Bot] Memutar video baru bersama: ${arg}`;
        }

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
          return `▶️ [Jockie Music Bot] Melanjutkan pemutaran musik oleh ${senderName}.`;
        }

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

        if (cmd === "!skip" || cmd === "skip") {
          const altId = "5qap5aO4i9A";
          if (player && player.loadVideoById) {
            player.unMute?.();
            player.loadVideoById(altId);
            player.playVideo();
          }
          const next: MusicRoomState = {
            videoId: altId,
            url: `https://www.youtube.com/watch?v=${altId}`,
            title: "Lofi Beats Chill Hop",
            isPlaying: true,
            startedAtServerTime: Date.now(),
            pausedAtSeconds: 0,
            updatedBy: senderName,
          };
          broadcastState(next);
          setIsDismissed(false);
          return `⏭️ [Jockie Music Bot] Lagu dilewati oleh ${senderName}. Memutar track berikutnya!`;
        }

        return `Perintah tidak dikenal. Coba: !play <url>, !pause, !resume, !sync, !skip`;
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
              : "fixed bottom-2 right-2 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
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
          2. FLOATING SANRIO JOCKIE BOT ISLAND 
          Shows real-time status and synchronized player controls.
        */}
        <AnimatePresence>
          {!isDismissed && (roomState.isPlaying || roomState.url) && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 max-w-sm rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-pink-200 dark:border-slate-800 p-3 shadow-xl text-slate-800 dark:text-slate-100"
            >
              {/* Top Row: Mascot Header & Dismiss */}
              <div className="flex items-center justify-between pb-1.5 border-b border-pink-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-xs">
                    <Headphones className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold tracking-tight">
                      Jockie Music Bot 🎵
                    </h5>
                    <p className="text-[9px] text-slate-400 truncate max-w-[150px]">
                      oleh: {roomState.updatedBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
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
                  <button
                    type="button"
                    onClick={() => setIsDismissed(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Kecilkan Bar"
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

              {/* Track Title & Live Status */}
              <div className="mt-2">
                <p className="text-xs font-bold text-pink-600 dark:text-pink-400 truncate max-w-[240px]">
                  {roomState.title || "YouTube Track"}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[240px] italic">
                  {playerStatusText}
                </p>
              </div>

              {/* Playback Controls & Sync */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-xs cursor-pointer active:scale-95"
                    title={roomState.isPlaying ? "Jeda Musik" : "Putar Musik"}
                  >
                    {roomState.isPlaying ? (
                      <Pause className="h-3 w-3 fill-white" />
                    ) : (
                      <Play className="h-3 w-3 fill-white ml-0.5" />
                    )}
                  </button>

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

                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {Math.floor(currentTime / 60)}:
                  {Math.floor(currentTime % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
);
