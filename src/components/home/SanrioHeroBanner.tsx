"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ImageIcon,
  MessageCircleHeart,
  Sparkles,
  Gamepad2,
  Users2,
} from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import {
  getSanrioCharacter,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";
import type { AppTab, CoupleProfile } from "@/lib/types";

export interface SanrioHeroBannerProps {
  profile: CoupleProfile;
  bothPartnersOnline: boolean;
  onNavigateTab: (tab: AppTab) => void;
  onOpenCharacterModal: () => void;
  onSendWaitingPing?: () => void;
}

const BANNER_STORAGE_KEY = "cinnamelo_hero_banner_v1";
const BANNER_MODE_KEY = "cinnamelo_banner_mode_v1";

const BANNERS = [
  {
    id: "supercute",
    name: "Rainbow Adventure 🌈",
    src: "/characters/sanrio-banner-supercute.jpg",
    alt: "Sanrio Characters Super Cute Adventures with Rainbow and Flowers",
  },
  {
    id: "balloons",
    name: "Pastel Sky Balloons 🎈",
    src: "/characters/sanrio-banner-balloons.jpg",
    alt: "Sanrio Characters with Pastel Sky, Hot Air Balloons and Clouds",
  },
];

function getCharacterAnimation(id?: SanrioCharacterId) {
  if (id === "cinnamoroll") {
    return {
      animate: { y: [0, -9, 0], rotate: [0, 2, -2, 0] },
      transition: { repeat: Infinity, duration: 3.4, ease: "easeInOut" as const },
    };
  }
  if (id === "my-melody") {
    return {
      animate: { y: [0, -5, 0], rotate: [-2, 3, -2], scale: [1, 1.02, 1] },
      transition: { repeat: Infinity, duration: 4.0, ease: "easeInOut" as const },
    };
  }
  if (id === "kuromi") {
    return {
      animate: { y: [0, -11, 0], scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] },
      transition: { repeat: Infinity, duration: 2.3, ease: "easeInOut" as const },
    };
  }
  return {
    animate: { y: [0, -7, 0], rotate: [0, 1.5, -1.5, 0] },
    transition: { repeat: Infinity, duration: 3.6, ease: "easeInOut" as const },
  };
}

export function SanrioHeroBanner({
  profile,
  bothPartnersOnline,
  onNavigateTab,
  onOpenCharacterModal,
  onSendWaitingPing,
}: SanrioHeroBannerProps) {
  const { playPop } = useAudio();
  const [waitingPingSent, setWaitingPingSent] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [bannerMode, setBannerMode] = useState<"duo" | "landscape">("duo");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BANNER_STORAGE_KEY);
      if (saved) {
        const idx = parseInt(saved, 10);
        if (!isNaN(idx) && idx >= 0 && idx < BANNERS.length) {
          setActiveBannerIndex(idx);
        }
      }
      const savedMode = window.localStorage.getItem(BANNER_MODE_KEY);
      if (savedMode === "landscape" || savedMode === "duo") {
        setBannerMode(savedMode);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleBannerMode = () => {
    playPop();
    const nextMode = bannerMode === "duo" ? "landscape" : "duo";
    setBannerMode(nextMode);
    try {
      window.localStorage.setItem(BANNER_MODE_KEY, nextMode);
    } catch {
      // ignore
    }
  };

  const handleToggleBannerTheme = () => {
    playPop();
    const next = (activeBannerIndex + 1) % BANNERS.length;
    setActiveBannerIndex(next);
    try {
      window.localStorage.setItem(BANNER_STORAGE_KEY, next.toString());
    } catch {
      // ignore
    }
  };

  const currentBanner = BANNERS[activeBannerIndex];
  const metaA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const metaB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi,";
    if (h < 15) return "Selamat siang,";
    if (h < 19) return "Selamat sore,";
    return "Selamat malam,";
  }, []);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[var(--border-color)] shadow-[0_16px_40px_-14px_rgba(244,114,182,0.22)] dark:shadow-[0_16px_40px_-14px_rgba(192,132,252,0.18)] bg-[var(--bg-card)] text-[var(--text-main)]">
      {/* 1. Header Visual Display (Toggle between Duo Characters HD & 16:9 Landscape Artwork) */}
      <div className="relative w-full overflow-hidden bg-sky-50 dark:bg-slate-950 pt-2 pb-1">
        <AnimatePresence mode="wait">
          {bannerMode === "duo" ? (
            <motion.div
              key="banner-duo"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-md mx-auto h-48 sm:h-56 flex items-center justify-center overflow-hidden rounded-3xl relative px-4"
            >
              {/* Soft romantic backdrop aura */}
              <div className="absolute inset-0 bg-gradient-to-r from-sky-100/80 via-pink-100/70 to-purple-100/80 dark:from-slate-800/80 dark:via-purple-950/40 dark:to-slate-800/80 rounded-3xl border border-pink-200/50 dark:border-slate-700/60 shadow-inner" />

              <div className="relative z-10 flex items-center justify-around h-full w-full py-2">
                {/* User A Character (e.g. Cinnamoroll floating) */}
                <motion.div
                  className="flex flex-col items-center justify-center h-full max-h-36 sm:max-h-44 w-1/3 text-center transform-gpu"
                  {...getCharacterAnimation(profile.userACharacter)}
                >
                  <img
                    src={metaA.svgPath}
                    alt={metaA.name}
                    className="max-h-full w-auto object-contain mx-auto transition-transform duration-300 drop-shadow-md select-none pointer-events-none"
                    draggable={false}
                  />
                  <span className="mt-1 text-[10px] sm:text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-sky-200/60 dark:border-sky-800 shadow-xs truncate max-w-full">
                    {profile.userAName}
                  </span>
                </motion.div>

                {/* Floating Love Heart Centerpiece */}
                <motion.div
                  animate={{ scale: [1, 1.25, 1], rotate: [0, 6, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                  className="flex flex-col items-center justify-center text-2xl sm:text-3xl select-none transform-gpu"
                >
                  <span>💖</span>
                  <span className="text-[9px] font-bold text-pink-500 dark:text-pink-400 mt-0.5 tracking-wider uppercase">
                    Forever
                  </span>
                </motion.div>

                {/* User B Character (e.g. My Melody / Kuromi) */}
                <motion.div
                  className="flex flex-col items-center justify-center h-full max-h-36 sm:max-h-44 w-1/3 text-center transform-gpu"
                  {...getCharacterAnimation(profile.userBCharacter)}
                >
                  <img
                    src={metaB.svgPath}
                    alt={metaB.name}
                    className="max-h-full w-auto object-contain mx-auto transition-transform duration-300 drop-shadow-md select-none pointer-events-none"
                    draggable={false}
                  />
                  <span className="mt-1 text-[10px] sm:text-[11px] font-bold text-pink-700 dark:text-pink-300 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-full border border-pink-200/60 dark:border-pink-800 shadow-xs truncate max-w-full">
                    {profile.userBName}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentBanner.id}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className="relative w-full h-[180px] sm:h-[240px] md:h-[280px] overflow-hidden"
            >
              <img
                src={currentBanner.src}
                alt={currentBanner.alt}
                className="w-full h-full object-cover object-center select-none pointer-events-none"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Top Controls: Banner View Toggle & Character Picker */}
        <div className="absolute top-3 inset-x-4 z-20 flex items-center justify-between pointer-events-auto">
          {/* Banner View Switcher Pill */}
          <div className="flex items-center gap-1.5">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleToggleBannerMode}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/70 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold text-[#1E293B] dark:text-white shadow-sm hover:bg-white transition-all"
              title="Ganti Mode Tampilan (Karakter Berdua / Panorama 16:9)"
            >
              <Users2 className="h-3.5 w-3.5 text-pink-500" />
              <span>{bannerMode === "duo" ? "Mode: Karakter Berdua" : "Mode: Panorama 16:9"}</span>
            </motion.button>

            {bannerMode === "landscape" && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleToggleBannerTheme}
                className="inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/70 dark:border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-white transition-all"
                title="Ganti Gambar Panorama"
              >
                <ImageIcon className="h-3.5 w-3.5 text-sky-500" />
                <span className="hidden sm:inline">{currentBanner.name}</span>
              </motion.button>
            )}
          </div>

          {/* 19 Karakter Sanrio Modal Launcher */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              playPop();
              onOpenCharacterModal();
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/70 dark:border-slate-700 px-3 py-1.5 text-[11px] font-bold text-[#1E293B] dark:text-white shadow-sm hover:bg-white transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>19 Karakter</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </motion.button>
        </div>
      </div>

      {/* 2. Glassmorphic Greeting & Interactive Couple Action Bar */}
      <div className="relative z-10 px-5 sm:px-7 pb-6 pt-1 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#BAE6FD]/40 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800 px-3 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
              <span className={`h-2 w-2 rounded-full ${bothPartnersOnline ? "bg-rose-500 animate-pulse" : "bg-sky-400"}`} />
              <span>{bothPartnersOnline ? "Kalian Sedang Online Bersama 💖" : "Ruang Cinta 2-Arah"}</span>
            </div>
            {!bothPartnersOnline && onSendWaitingPing && (
              <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => { playPop(); onSendWaitingPing(); setWaitingPingSent(true); setTimeout(() => setWaitingPingSent(false), 3000); }} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-xs cursor-pointer active:scale-95 transition-all" title="Beri tahu pasangan bahwa kamu sedang menunggu di web"><Sparkles className="h-2.5 w-2.5" /><span>{waitingPingSent ? "Panggilan Terkirim! 💌" : "Panggil Pasangan (Aku Menunggu) 💌"}</span></motion.button>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1E293B] dark:text-white leading-tight">
            {greeting}{" "}
            <span className="text-[#0284C7] dark:text-pink-400">
              {profile.userAName} &amp; {profile.userBName}! 👋
            </span>
          </h2>

          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-300 max-w-md">
            {bothPartnersOnline
              ? "Waktunya saling sapa di obrolan, kirim detak rindu, atau tantang pasanganmu main game!"
              : "Setiap momen kecil berdua adalah memori berharga yang tersimpan selamanya."}
          </p>
        </div>

        {/* Quick Action Pill Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              playPop();
              onNavigateTab("chat");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0284C7] to-sky-500 dark:from-purple-600 dark:to-pink-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-[0_8px_20px_-4px_rgba(2,132,199,0.5)] dark:shadow-[0_8px_20px_-4px_rgba(168,85,247,0.45)] hover:opacity-95 transition-opacity"
          >
            <MessageCircleHeart className="h-4 w-4" />
            <span>Buka Chat Berdua</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              playPop();
              onNavigateTab("play");
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#1E293B] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Gamepad2 className="h-4 w-4 text-purple-500 dark:text-pink-400" />
            <span>Main Game 🎮</span>
          </motion.button>
        </div>
      </div>
    </section>
  );
}
