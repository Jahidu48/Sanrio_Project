"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ChevronRight,
  Gamepad2,
  Heart,
  ImageIcon,
  MessageCircleHeart,
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
    name: "Pelangi Sanrio",
    src: "/characters/sanrio-banner-supercute.jpg",
    alt: "Ilustrasi Karakter Sanrio di Taman Pelangi",
  },
  {
    id: "balloons",
    name: "Balon Udara",
    src: "/characters/sanrio-banner-balloons.jpg",
    alt: "Ilustrasi Karakter Sanrio dengan Balon Udara Pastel",
  },
];

function getCharacterAnimation(id?: SanrioCharacterId) {
  if (id === "cinnamoroll") {
    return {
      animate: { y: [0, -7, 0] },
      transition: { repeat: Infinity, duration: 3.6, ease: "easeInOut" as const },
    };
  }
  if (id === "my-melody") {
    return {
      animate: { y: [0, -5, 0] },
      transition: { repeat: Infinity, duration: 4.0, ease: "easeInOut" as const },
    };
  }
  return {
    animate: { y: [0, -6, 0] },
    transition: { repeat: Infinity, duration: 3.8, ease: "easeInOut" as const },
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
    } catch {}
  };

  const handleToggleBannerTheme = () => {
    playPop();
    const next = (activeBannerIndex + 1) % BANNERS.length;
    setActiveBannerIndex(next);
    try {
      window.localStorage.setItem(BANNER_STORAGE_KEY, next.toString());
    } catch {}
  };

  const currentBanner = BANNERS[activeBannerIndex];
  const metaA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const metaB = getSanrioCharacter(profile.userBCharacter, "my-melody");
  const partnerName =
    profile.role === "user_a" ? profile.userBName : profile.userAName;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi,";
    if (h < 15) return "Selamat siang,";
    if (h < 19) return "Selamat sore,";
    return "Selamat malam,";
  }, []);

  return (
    <section className="scrapbook-card overflow-hidden">
      {/* 1. Panggung Pasangan (Toggle between Duo Scrapbook Stage & Panorama Artwork) */}
      <div className="relative w-full overflow-hidden bg-[#FFFBF5] dark:bg-[#1E1721] pt-3 pb-2 px-3 sm:px-5">
        <AnimatePresence mode="wait">
          {bannerMode === "duo" ? (
            <motion.div
              key="banner-duo"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg mx-auto h-44 sm:h-52 flex items-center justify-center overflow-hidden rounded-3xl scrapbook-stitched bg-[#FFFDF9] dark:bg-[#251D29] relative px-4"
            >
              <div className="relative z-10 flex items-center justify-around h-full w-full py-2">
                {/* Partner A Card */}
                <motion.div
                  className="flex flex-col items-center justify-center h-full max-h-36 sm:max-h-40 w-1/3 text-center transform-gpu pointer-events-none"
                  {...getCharacterAnimation(profile.userACharacter)}
                >
                  <img
                    src={metaA.svgPath}
                    alt={metaA.name}
                    className="max-h-24 sm:max-h-28 w-auto object-contain mx-auto select-none pointer-events-none"
                    draggable={false}
                  />
                  <span className="mt-1.5 text-xs font-bold text-[#2D232E] dark:text-[#FAF5F7] bg-[#E0F2FE] dark:bg-sky-950/80 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 truncate max-w-full">
                    {profile.userAName}
                  </span>
                </motion.div>

                {/* Center Heart Stamp */}
                <div className="flex flex-col items-center justify-center select-none pointer-events-none">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/60 border border-[#F3D8DF] dark:border-rose-800 text-rose-500">
                    <Heart className="h-5 w-5 fill-rose-500" />
                  </div>
                  <span className="text-[11px] font-bold text-rose-500 dark:text-pink-300 mt-1">
                    Selamanya
                  </span>
                </div>

                {/* Partner B Card */}
                <motion.div
                  className="flex flex-col items-center justify-center h-full max-h-36 sm:max-h-40 w-1/3 text-center transform-gpu pointer-events-none"
                  {...getCharacterAnimation(profile.userBCharacter)}
                >
                  <img
                    src={metaB.svgPath}
                    alt={metaB.name}
                    className="max-h-24 sm:max-h-28 w-auto object-contain mx-auto select-none pointer-events-none"
                    draggable={false}
                  />
                  <span className="mt-1.5 text-xs font-bold text-[#2D232E] dark:text-[#FAF5F7] bg-[#FFE4E6] dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 truncate max-w-full">
                    {profile.userBName}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentBanner.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full h-[180px] sm:h-[230px] overflow-hidden rounded-2xl border border-[#F3D8DF] dark:border-[#3B2E40]"
            >
              <img
                src={currentBanner.src}
                alt={currentBanner.alt}
                className="w-full h-full object-cover object-center select-none pointer-events-none"
                draggable={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Controls: Banner View Toggle & Character Picker */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleBannerMode}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40] px-3 py-1 text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7] hover:border-rose-300 transition-colors cursor-pointer"
              title="Ganti tampilan panggung"
            >
              <Users2 className="h-3.5 w-3.5 text-rose-500" />
              <span>{bannerMode === "duo" ? "Tampilan: Berdua" : "Tampilan: Gambar"}</span>
            </button>

            {bannerMode === "landscape" && (
              <button
                type="button"
                onClick={handleToggleBannerTheme}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40] px-3 py-1 text-xs font-semibold text-[#6E5A68] dark:text-[#B8A6B5] hover:border-rose-300 transition-colors cursor-pointer"
                title="Ganti gambar latar"
              >
                <ImageIcon className="h-3.5 w-3.5 text-sky-500" />
                <span>{currentBanner.name}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              playPop();
              onOpenCharacterModal();
            }}
            className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white dark:bg-[#221B25] border border-[#F3D8DF] dark:border-[#3B2E40] px-3 py-1 text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7] hover:border-rose-300 transition-colors cursor-pointer"
          >
            <span>Ganti Karakter</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#6E5A68]" />
          </button>
        </div>
      </div>

      {/* 2. Greeting & Couple Action Bar */}
      <div className="px-5 sm:px-7 pb-6 pt-4 border-t border-[#F3D8DF] dark:border-[#3B2E40] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-3 py-1 text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7]">
              <span
                className={`h-2 w-2 rounded-full ${
                  bothPartnersOnline ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span>
                {bothPartnersOnline
                  ? `${partnerName} sedang online bersama kamu`
                  : `Menunggu ${partnerName} online`}
              </span>
            </div>

            {!bothPartnersOnline && onSendWaitingPing && (
              <button
                type="button"
                onClick={() => {
                  playPop();
                  onSendWaitingPing();
                  setWaitingPingSent(true);
                  setTimeout(() => setWaitingPingSent(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-pink-300 px-3 py-1 text-xs font-bold hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                title="Kirim pengingat ke perangkat pasangan"
              >
                <Bell className="h-3 w-3" />
                <span>
                  {waitingPingSent
                    ? "Panggilan terkirim!"
                    : `Panggil ${partnerName}`}
                </span>
              </button>
            )}
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#2D232E] dark:text-[#FAF5F7] leading-tight">
            {greeting}{" "}
            <span className="text-rose-500 dark:text-pink-400">
              {profile.userAName} &amp; {profile.userBName}
            </span>
          </h2>

          <p className="mt-1 text-xs sm:text-sm text-[#6E5A68] dark:text-[#B8A6B5] max-w-md">
            {bothPartnersOnline
              ? "Kalian berdua sedang aktif. Yuk ngobrol, kirim detak rindu, atau main bareng!"
              : "Tinggalkan surat rahasia, catatan jurnal, atau coretan lucu untuk pasanganmu."}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              playPop();
              onNavigateTab("chat");
            }}
            className="inline-flex items-center gap-2 rounded-full bg-rose-500 hover:bg-rose-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <MessageCircleHeart className="h-4 w-4" />
            <span>Buka Obrolan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playPop();
              onNavigateTab("play");
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#2D232E] dark:text-[#FAF5F7] hover:border-rose-300 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Gamepad2 className="h-4 w-4 text-rose-500 dark:text-pink-400" />
            <span>Main Game</span>
          </button>
        </div>
      </div>
    </section>
  );
}
