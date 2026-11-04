"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Disc3,
  ExternalLink,
  ListMusic,
  Music,
  Pause,
  Play,
  Plus,
  Radio,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
  X,
  Youtube,
} from "lucide-react";
import { useSharedMusic } from "@/context/SharedMusicContext";
import { useAudio } from "@/context/AudioContext";
import { extractYouTubeId } from "@/components/music/JockieMusicBot";
import type { CoupleProfile, SharedPlaylistItem } from "@/lib/types";

export interface SharedMusicPlayerModalProps {
  open: boolean;
  onClose: () => void;
  profile: CoupleProfile;
}

function formatTime(sec: number): string {
  if (isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function SharedMusicPlayerModal({
  open,
  onClose,
  profile,
}: SharedMusicPlayerModalProps) {
  const { playPop, playSuccess } = useAudio();
  const {
    playlist,
    activeTrackIndex,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlayPause,
    seekTrack,
    switchTrack,
    nextTrack,
    prevTrack,
    setVolume,
    uploadCustomTrack,
    addToPlaylist,
    removeFromPlaylist,
  } = useSharedMusic();

  const [openAddSong, setOpenAddSong] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Convert URLs to appropriate embed info
  const getEmbedInfo = (item?: SharedPlaylistItem | null) => {
    if (!item) return null;
    const url = item.url.trim();

    // YouTube
    const ytMatch = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i
    );
    if (ytMatch) {
      return {
        type: "youtube" as const,
        embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`,
      };
    }

    // Spotify
    const spTrackMatch = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/i);
    if (spTrackMatch) {
      return {
        type: "spotify" as const,
        embedUrl: `https://open.spotify.com/embed/track/${spTrackMatch[1]}?utm_source=generator&theme=0`,
      };
    }
    const spPlaylistMatch = url.match(
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/i
    );
    if (spPlaylistMatch) {
      return {
        type: "spotify" as const,
        embedUrl: `https://open.spotify.com/embed/playlist/${spPlaylistMatch[1]}?utm_source=generator&theme=0`,
      };
    }

    // Direct Audio / File
    return {
      type: "audio" as const,
      src: url,
    };
  };

  const embedInfo = getEmbedInfo(currentTrack);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    playPop();

    try {
      await uploadCustomTrack(file);
      playSuccess();
      setOpenAddSong(false);
    } catch (err) {
      console.error("Gagal mengunggah:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAddUrlSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    playPop();
    let sourceType: "youtube" | "spotify" | "file" | "custom_url" = "custom_url";
    if (newUrl.includes("youtube.com") || newUrl.includes("youtu.be")) {
      sourceType = "youtube";
    } else if (newUrl.includes("spotify.com")) {
      sourceType = "spotify";
    }

    await addToPlaylist({
      title: newTitle.trim(),
      artist:
        newArtist.trim() ||
        `${profile.role === "user_a" ? profile.userAName : profile.userBName}'s Pick`,
      source: sourceType,
      url: newUrl.trim(),
    });

    playSuccess();
    setNewTitle("");
    setNewArtist("");
    setNewUrl("");
    setOpenAddSong(false);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTrack(val);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="w-full max-w-lg rounded-[32px] bg-white dark:bg-slate-900 border border-pink-100 dark:border-slate-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden transition-colors"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-pink-50 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-pink-100 to-sky-100 dark:from-purple-900/40 dark:to-slate-800 border border-pink-200 dark:border-purple-800 flex items-center justify-center text-rose-500 shadow-xs">
                  <Disc3 className={`h-5 w-5 ${isPlaying ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1E293B] dark:text-white flex items-center gap-2">
                    <span>Playlist Berdua</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-600 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-200/80 dark:border-pink-800">
                      <Radio className="h-2.5 w-2.5 text-rose-500 animate-pulse" />
                      Listen Together Sync
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Play/pause &amp; detik lagu tersinkronisasi otomatis di kedua layar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playPop();
                  onClose();
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Tutup (musik tetap menyala di latar belakang)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Active Player Card */}
              <div className="rounded-2xl bg-gradient-to-br from-pink-50/70 via-white to-sky-50/70 dark:from-slate-800/90 dark:via-purple-950/20 dark:to-slate-800/90 border border-pink-100 dark:border-slate-700 p-5 shadow-xs text-center relative overflow-hidden">
                {/* Vinyl Record Centerpiece */}
                <div className="flex justify-center mb-3">
                  <motion.div
                    animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                    transition={
                      isPlaying
                        ? { repeat: Infinity, duration: 6, ease: "linear" }
                        : { duration: 0.3 }
                    }
                    className="h-24 w-24 rounded-full bg-slate-900 border-4 border-pink-200 dark:border-purple-600 shadow-lg flex items-center justify-center relative select-none"
                  >
                    <div className="h-9 w-9 rounded-full bg-pink-100 dark:bg-slate-800 flex items-center justify-center border-2 border-white text-xs">
                      💖
                    </div>
                  </motion.div>
                </div>

                <h4 className="text-base font-extrabold text-[#1E293B] dark:text-white truncate">
                  {currentTrack?.title || "Tidak ada lagu yang dipilih"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {currentTrack?.artist || "Sanrio Couple Space"} • ditambahkan oleh{" "}
                  {currentTrack?.added_by || "Pasanganmu"}
                </p>

                {/* Embed Renderers for YouTube / Spotify */}
                {embedInfo?.type === "youtube" && (
                  <div className="mt-3 p-4 rounded-2xl bg-slate-900 text-white text-center space-y-2 border border-rose-500/30 shadow-md">
                    <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-xs">
                      <Youtube className="h-4 w-4" />
                      <span>Jockie Music Bot Player Aktif</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Audio YouTube disinkronkan langsung ke kedua perangkat secara live.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("jockie-command", {
                              detail: { text: `!play ${currentTrack?.url}` },
                            })
                          );
                        }}
                        className="rounded-full bg-rose-500 hover:bg-rose-600 px-3 py-1 text-xs font-bold text-white shadow-xs cursor-pointer"
                      >
                        Putar Lagu Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("jockie-command", {
                              detail: { text: "!sync" },
                            })
                          );
                        }}
                        className="rounded-full bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs font-bold text-sky-400 border border-slate-700 cursor-pointer"
                      >
                        !sync Detik
                      </button>
                    </div>
                  </div>
                )}

                {embedInfo?.type === "spotify" && (
                  <div className="mt-3 rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                    <iframe
                      src={embedInfo.embedUrl}
                      title="Spotify Player"
                      width="100%"
                      height="152"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Scrub bar */}
                {embedInfo?.type === "audio" && (
                  <div className="mt-4 space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeekChange}
                      className="w-full h-1.5 bg-pink-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}

                {/* Player Controls */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playPop();
                      prevTrack();
                    }}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-pink-500 cursor-pointer"
                    title="Lagu Sebelumnya"
                  >
                    <SkipBack className="h-5 w-5" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      playPop();
                      togglePlayPause();
                    }}
                    className="h-12 w-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 flex items-center justify-center text-white shadow-md hover:shadow-pink-300 dark:hover:shadow-purple-900 transition-all cursor-pointer"
                    title={isPlaying ? "Jeda Lagu" : "Putar Lagu Bersama"}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 fill-white" />
                    ) : (
                      <Play className="h-5 w-5 fill-white ml-0.5" />
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playPop();
                      nextTrack();
                    }}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-pink-500 cursor-pointer"
                    title="Lagu Berikutnya"
                  >
                    <SkipForward className="h-5 w-5" />
                  </motion.button>
                </div>

                {/* Volume slider */}
                <div className="flex items-center justify-center gap-2 mt-3 max-w-xs mx-auto">
                  <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-[10px] text-slate-400 font-bold min-w-[28px]">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Playlist Queue Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <ListMusic className="h-4 w-4 text-pink-500" />
                  <h5 className="text-xs font-bold text-[#1E293B] dark:text-white">
                    Daftar Putar ({playlist.length} Lagu)
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playPop();
                    setOpenAddSong(!openAddSong);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-300 hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Lagu</span>
                </button>
              </div>

              {/* Add Song Form Popover */}
              <AnimatePresence>
                {openAddSong && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl border border-pink-200 dark:border-slate-700 bg-pink-50/50 dark:bg-slate-800/80 p-4 space-y-3 overflow-hidden"
                  >
                    <div className="text-xs font-bold text-[#1E293B] dark:text-white">
                      Tambah Lagu ke Playlist Bersama:
                    </div>

                    {/* Method 1: Upload MP3 File */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-pink-100 dark:border-slate-700 text-center">
                      <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-pink-300 hover:text-rose-700">
                        <Upload className="h-4 w-4" />
                        <span>
                          {isUploading ? "Mengunggah..." : "Unggah Berkas Audio (MP3/WAV)"}
                        </span>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Tersimpan di Supabase Storage sehingga bisa diputar berdua
                      </p>
                    </div>

                    <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      — ATAU TAUTAN STREAMING —
                    </div>

                    {/* Method 2: YouTube / Spotify / Direct Audio URL */}
                    <form onSubmit={handleAddUrlSong} className="space-y-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Judul Lagu (contoh: Nadin Amizah - Rayuan Perempuan Gila)"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-300"
                      />
                      <input
                        type="text"
                        value={newArtist}
                        onChange={(e) => setNewArtist(e.target.value)}
                        placeholder="Nama Artis (opsional)"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-300"
                      />
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="Tautan YouTube / Spotify / MP3 URL"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-pink-300"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setOpenAddSong(false)}
                          className="px-3 py-1 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={!newTitle.trim() || !newUrl.trim()}
                          className="px-4 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-xs font-bold text-white shadow-xs disabled:opacity-40"
                        >
                          Simpan Lagu
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Playlist Items List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {playlist.map((track, idx) => {
                  const isActive = idx === activeTrackIndex;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        playPop();
                        switchTrack(idx);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? "bg-pink-50/80 dark:bg-purple-950/40 border-pink-200 dark:border-purple-800 shadow-xs"
                          : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs ${
                            isActive
                              ? "bg-pink-500 text-white font-bold animate-pulse"
                              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400"
                          }`}
                        >
                          {isActive ? (
                            isPlaying ? (
                              <span className="flex items-center gap-0.5 h-3">
                                <span className="w-0.5 h-2.5 bg-white animate-pulse" />
                                <span className="w-0.5 h-3.5 bg-white animate-pulse [animation-delay:0.15s]" />
                                <span className="w-0.5 h-2 bg-white animate-pulse [animation-delay:0.3s]" />
                              </span>
                            ) : (
                              <Pause className="h-3.5 w-3.5 fill-white" />
                            )
                          ) : (
                            <Music className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h6
                            className={`truncate text-xs font-bold ${
                              isActive
                                ? "text-pink-600 dark:text-pink-300"
                                : "text-[#1E293B] dark:text-white"
                            }`}
                          >
                            {track.title}
                          </h6>
                          <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                            {track.artist || "Sanrio Space"} • {track.source}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {playlist.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playPop();
                              removeFromPlaylist(track.id);
                            }}
                            className="p-1.5 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                            title="Hapus dari daftar putar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
