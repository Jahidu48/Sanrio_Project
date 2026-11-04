"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Disc3, Play, Volume2, X } from "lucide-react";
import { useSharedMusic } from "@/context/SharedMusicContext";
import { useAudio } from "@/context/AudioContext";

function formatSec(sec: number): string {
  if (isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function PartnerListeningBanner() {
  const { partnerBanner, joinPartnerListening, dismissPartnerBanner } =
    useSharedMusic();
  const { playPop, playSuccess } = useAudio();

  if (!partnerBanner) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Pemberitahuan musik bersama pasangan"
        initial={{ opacity: 0, y: -24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-pink-200 dark:border-purple-800 p-3 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 dark:bg-purple-950/80 border border-pink-200 dark:border-purple-700 shadow-xs">
              <Disc3 className="h-5 w-5 text-rose-500 animate-spin [animation-duration:4s]" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-bold text-rose-600 dark:text-pink-300 flex items-center gap-1">
                <span>{partnerBanner.partnerName} sedang memutar:</span>
              </p>
              <h4 className="truncate text-xs font-extrabold text-[#1E293B] dark:text-white">
                {partnerBanner.trackTitle}
              </h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                Menit {formatSec(partnerBanner.currentTime)} • Listen Together Sync 💖
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                playSuccess();
                joinPartnerListening();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>Gabung</span>
            </motion.button>

            <button
              type="button"
              onClick={() => {
                playPop();
                dismissPartnerBanner();
              }}
              className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Abaikan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
