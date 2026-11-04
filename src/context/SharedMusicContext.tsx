"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type {
  CoupleProfile,
  MusicSyncEvent,
  SharedPlaylistItem,
} from "@/lib/types";

export interface PartnerListeningBannerInfo {
  trackTitle: string;
  trackArtist?: string;
  currentTime: number;
  partnerName: string;
  senderRole: string;
}

export interface SharedMusicContextValue {
  playlist: SharedPlaylistItem[];
  activeTrackIndex: number;
  currentTrack: SharedPlaylistItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  partnerBanner: PartnerListeningBannerInfo | null;
  playTrack: (index?: number) => void;
  pauseTrack: () => void;
  togglePlayPause: () => void;
  seekTrack: (seconds: number) => void;
  switchTrack: (index: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (vol: number) => void;
  addToPlaylist: (
    item: Omit<SharedPlaylistItem, "id" | "room_id" | "added_by" | "created_at">
  ) => Promise<void>;
  removeFromPlaylist: (id: string) => void;
  uploadCustomTrack: (file: File) => Promise<void>;
  joinPartnerListening: () => void;
  dismissPartnerBanner: () => void;
}

const SharedMusicContext = createContext<SharedMusicContextValue | null>(null);

const VOLUME_STORAGE_KEY = "cinnamelo_shared_music_volume_v2";

export function SharedMusicProvider({
  children,
  profile,
  playlist,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  musicSyncEvent,
  onBroadcastMusicSync,
}: {
  children: React.ReactNode;
  profile: CoupleProfile;
  playlist: SharedPlaylistItem[];
  onAddToPlaylist: (
    item: Omit<SharedPlaylistItem, "id" | "room_id" | "added_by" | "created_at">
  ) => void;
  onRemoveFromPlaylist: (id: string) => void;
  musicSyncEvent: MusicSyncEvent | null;
  onBroadcastMusicSync: (syncData: {
    action: "play" | "pause" | "seek" | "switch" | "heartbeat";
    trackIndex: number;
    currentTime: number;
  }) => void;
}) {
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [partnerBanner, setPartnerBanner] =
    useState<PartnerListeningBannerInfo | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSyncTriggeredRef = useRef(false);
  const heartbeatTimerRef = useRef<number | null>(null);

  const currentTrack = playlist[activeTrackIndex] || playlist[0] || null;

  // Restore saved volume
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VOLUME_STORAGE_KEY);
      if (saved) {
        const v = parseFloat(saved);
        if (!isNaN(v)) {
          setVolumeState(v);
          if (audioRef.current) audioRef.current.volume = v;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Update volume on audio element
  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, clamped.toString());
    } catch {
      // ignore
    }
  };

  // 1. REACT TO INCOMING REALTIME LISTEN-TOGETHER SYNC EVENTS FROM PARTNER
  useEffect(() => {
    if (!musicSyncEvent) return;
    if (musicSyncEvent.senderRole === profile.role) return;

    isSyncTriggeredRef.current = true;
    const audio = audioRef.current;

    const lag = Math.max(0, (Date.now() - musicSyncEvent.timestamp) / 1000);
    const targetTime =
      musicSyncEvent.currentTime +
      (musicSyncEvent.action === "play" || musicSyncEvent.action === "heartbeat"
        ? lag
        : 0);

    if (
      musicSyncEvent.action === "switch" &&
      typeof musicSyncEvent.trackIndex === "number"
    ) {
      if (musicSyncEvent.trackIndex < playlist.length) {
        setActiveTrackIndex(musicSyncEvent.trackIndex);
        setCurrentTime(0);
        setIsPlaying(true);
        if (audio) {
          audio.currentTime = 0;
          audio
            .play()
            .then(() => {
              setPartnerBanner(null);
            })
            .catch(() => {
              // Autoplay barrier: show join banner
              setPartnerBanner({
                trackTitle:
                  playlist[musicSyncEvent.trackIndex]?.title || "Lagu Bersama",
                trackArtist: playlist[musicSyncEvent.trackIndex]?.artist,
                currentTime: 0,
                partnerName: musicSyncEvent.senderName,
                senderRole: musicSyncEvent.senderRole,
              });
            });
        }
      }
    } else if (musicSyncEvent.action === "play") {
      if (
        typeof musicSyncEvent.trackIndex === "number" &&
        musicSyncEvent.trackIndex !== activeTrackIndex &&
        musicSyncEvent.trackIndex < playlist.length
      ) {
        setActiveTrackIndex(musicSyncEvent.trackIndex);
      }
      setIsPlaying(true);
      if (audio) {
        if (Math.abs(audio.currentTime - targetTime) > 0.8) {
          audio.currentTime = targetTime;
        }
        audio
          .play()
          .then(() => {
            setPartnerBanner(null);
          })
          .catch(() => {
            setPartnerBanner({
              trackTitle: currentTrack?.title || "Lagu Bersama",
              trackArtist: currentTrack?.artist,
              currentTime: targetTime,
              partnerName: musicSyncEvent.senderName,
              senderRole: musicSyncEvent.senderRole,
            });
          });
      }
    } else if (musicSyncEvent.action === "pause") {
      setIsPlaying(false);
      setPartnerBanner(null);
      if (audio) {
        audio.pause();
        if (Math.abs(audio.currentTime - musicSyncEvent.currentTime) > 0.8) {
          audio.currentTime = musicSyncEvent.currentTime;
        }
      }
    } else if (musicSyncEvent.action === "seek") {
      if (
        typeof musicSyncEvent.trackIndex === "number" &&
        musicSyncEvent.trackIndex !== activeTrackIndex &&
        musicSyncEvent.trackIndex < playlist.length
      ) {
        setActiveTrackIndex(musicSyncEvent.trackIndex);
      }
      if (audio) {
        audio.currentTime = musicSyncEvent.currentTime;
        setCurrentTime(musicSyncEvent.currentTime);
      }
    } else if (musicSyncEvent.action === "heartbeat") {
      // Continuous clock sync while partner is playing
      if (
        typeof musicSyncEvent.trackIndex === "number" &&
        musicSyncEvent.trackIndex !== activeTrackIndex &&
        musicSyncEvent.trackIndex < playlist.length
      ) {
        setActiveTrackIndex(musicSyncEvent.trackIndex);
      }
      setIsPlaying(true);
      if (audio) {
        // Drift check: if we are off by more than 0.75s, jump smoothly
        if (Math.abs(audio.currentTime - targetTime) > 0.75) {
          audio.currentTime = targetTime;
        }
        if (audio.paused) {
          audio
            .play()
            .then(() => setPartnerBanner(null))
            .catch(() => {
              setPartnerBanner({
                trackTitle: currentTrack?.title || "Lagu Bersama",
                trackArtist: currentTrack?.artist,
                currentTime: targetTime,
                partnerName: musicSyncEvent.senderName,
                senderRole: musicSyncEvent.senderRole,
              });
            });
        }
      }
    }

    const t = window.setTimeout(() => {
      isSyncTriggeredRef.current = false;
    }, 400);

    return () => window.clearTimeout(t);
  }, [musicSyncEvent, playlist, activeTrackIndex, profile.role, currentTrack]);

  // 2. PERIODIC SYNC HEARTBEAT (Emits every 2.5s while playing to maintain exact second sync)
  useEffect(() => {
    if (!isPlaying) {
      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    heartbeatTimerRef.current = window.setInterval(() => {
      // Only broadcast if not triggered by an incoming partner sync
      if (!isSyncTriggeredRef.current && audioRef.current && isPlaying) {
        onBroadcastMusicSync({
          action: "heartbeat",
          trackIndex: activeTrackIndex,
          currentTime: audioRef.current.currentTime,
        });
      }
    }, 2500);

    return () => {
      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [isPlaying, activeTrackIndex, onBroadcastMusicSync]);

  // 3. Audio source changer
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Check if source is a playable direct audio URL
    const isDirectAudio =
      currentTrack.source === "file" ||
      currentTrack.source === "custom_url" ||
      currentTrack.url.endsWith(".mp3") ||
      currentTrack.url.endsWith(".wav") ||
      currentTrack.url.endsWith(".ogg") ||
      currentTrack.url.includes("/sounds/");

    if (isDirectAudio) {
      if (audio.src !== currentTrack.url && !audio.src.endsWith(currentTrack.url)) {
        audio.src = currentTrack.url;
        audio.load();
      }
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  // Player controls
  const playTrack = useCallback(
    (index?: number) => {
      const idx = typeof index === "number" ? index : activeTrackIndex;
      const bounded = Math.max(0, Math.min(idx, playlist.length - 1));
      setActiveTrackIndex(bounded);
      setIsPlaying(true);
      setPartnerBanner(null);

      const audio = audioRef.current;
      if (audio) {
        audio.play().catch(() => {});
      }

      onBroadcastMusicSync({
        action: typeof index === "number" && index !== activeTrackIndex ? "switch" : "play",
        trackIndex: bounded,
        currentTime: audio?.currentTime || 0,
      });
    },
    [activeTrackIndex, playlist.length, onBroadcastMusicSync]
  );

  const pauseTrack = useCallback(() => {
    setIsPlaying(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    onBroadcastMusicSync({
      action: "pause",
      trackIndex: activeTrackIndex,
      currentTime: audio?.currentTime || 0,
    });
  }, [activeTrackIndex, onBroadcastMusicSync]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  }, [isPlaying, pauseTrack, playTrack]);

  const seekTrack = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      setCurrentTime(seconds);
      if (audio) {
        audio.currentTime = seconds;
      }
      onBroadcastMusicSync({
        action: "seek",
        trackIndex: activeTrackIndex,
        currentTime: seconds,
      });
    },
    [activeTrackIndex, onBroadcastMusicSync]
  );

  const switchTrack = useCallback(
    (index: number) => {
      const bounded = Math.max(0, Math.min(index, playlist.length - 1));
      setActiveTrackIndex(bounded);
      setCurrentTime(0);
      setIsPlaying(true);
      setPartnerBanner(null);

      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }

      onBroadcastMusicSync({
        action: "switch",
        trackIndex: bounded,
        currentTime: 0,
      });
    },
    [playlist.length, onBroadcastMusicSync]
  );

  const nextTrack = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIdx = (activeTrackIndex + 1) % playlist.length;
    switchTrack(nextIdx);
  }, [activeTrackIndex, playlist.length, switchTrack]);

  const prevTrack = useCallback(() => {
    if (playlist.length === 0) return;
    const prevIdx = (activeTrackIndex - 1 + playlist.length) % playlist.length;
    switchTrack(prevIdx);
  }, [activeTrackIndex, playlist.length, switchTrack]);

  const joinPartnerListening = useCallback(() => {
    if (!partnerBanner) return;
    const target = partnerBanner.currentTime;
    setPartnerBanner(null);
    setIsPlaying(true);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = target;
      audio.play().catch(() => {});
    }
  }, [partnerBanner]);

  const dismissPartnerBanner = useCallback(() => {
    setPartnerBanner(null);
  }, []);

  const uploadCustomTrack = async (file: File) => {
    try {
      const supabase = getSupabaseBrowserClient();
      let publicUrl = "";

      if (supabase) {
        const fileExt = file.name.split(".").pop() || "mp3";
        const fileName = `${profile.roomId}/music_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from("music_files")
          .upload(fileName, file, { cacheControl: "3600", upsert: true });

        if (!error) {
          const { data: pubData } = supabase.storage
            .from("music_files")
            .getPublicUrl(fileName);
          publicUrl = pubData?.publicUrl || "";
        }
      }

      if (!publicUrl) {
        // Fallback: local blob url
        publicUrl = URL.createObjectURL(file);
      }

      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
      await onAddToPlaylist({
        title: cleanTitle,
        artist: `${profile.role === "user_a" ? profile.userAName : profile.userBName}'s Pick`,
        source: "file",
        url: publicUrl,
      });

      // Automatically switch to the uploaded track
      switchTrack(playlist.length);
    } catch (err) {
      console.error("Gagal mengunggah musik:", err);
    }
  };

  return (
    <SharedMusicContext.Provider
      value={{
        playlist,
        activeTrackIndex,
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        partnerBanner,
        playTrack,
        pauseTrack,
        togglePlayPause,
        seekTrack,
        switchTrack,
        nextTrack,
        prevTrack,
        setVolume,
        addToPlaylist: async (item) => onAddToPlaylist(item),
        removeFromPlaylist: onRemoveFromPlaylist,
        uploadCustomTrack,
        joinPartnerListening,
        dismissPartnerBanner,
      }}
    >
      {/* 
        GLOBAL PERSISTENT AUDIO ELEMENT
        Never unmounts across tab switches, modal closures, or game play!
      */}
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={nextTrack}
      />
      {children}
    </SharedMusicContext.Provider>
  );
}

export function useSharedMusic() {
  const ctx = useContext(SharedMusicContext);
  if (!ctx) {
    throw new Error(
      "useSharedMusic must be used within a SharedMusicProvider"
    );
  }
  return ctx;
}
