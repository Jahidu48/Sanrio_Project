"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cloud, Heart, Sparkles, Users } from "lucide-react";
import { CinnamorollCharacter } from "@/components/characters/CinnamorollCharacter";
import { CoupleTogetherBadge } from "@/components/characters/CoupleTogetherBadge";
import type { SanrioCharacterId } from "@/lib/sanrioCharacters";
import type { HeartbeatEvent } from "@/lib/types";

export interface RippleWave {
  id: string;
  createdAt: number;
}

export interface HeartbeatOrbProps {
  bothPartnersOnline: boolean;
  simulatePartnerOnline: boolean;
  onToggleSimulateOnline: () => void;
  userAName: string;
  userBName: string;
  userACharacter?: SanrioCharacterId;
  userBCharacter?: SanrioCharacterId;
  ripples: RippleWave[];
  activeToast: HeartbeatEvent | null;
  characterBurstKey: number;
  heartbeatCount: number;
  onSendHeartbeat: () => void;
}

export function HeartbeatOrb({
  bothPartnersOnline,
  simulatePartnerOnline,
  onToggleSimulateOnline,
  userAName,
  userBName,
  userACharacter = "cinnamoroll",
  userBCharacter = "my-melody",
  ripples,
  activeToast,
  characterBurstKey,
  heartbeatCount,
  onSendHeartbeat,
}: HeartbeatOrbProps) {
  const handleHeartbeatClick = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }
    onSendHeartbeat();
  };

  return (
    <section
      className="saas-glow-card p-6 sm:p-7 gpu-layer"
      style={{ transform: "translateZ(0)", willChange: "transform" }}
    >
      {/* Signature SaaS Soft Radial Pastel Aura */}
      <div className="pointer-events-none absolute -top-16 left-1/4 h-52 w-52 rounded-full bg-[#BAE6FD]/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-1/4 h-52 w-52 rounded-full bg-[#FECDD3]/35 blur-3xl" />

      {/* Top Row: Authentic Presence Indicator & Live Heartbeat Counter */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-sky-100 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-white">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              bothPartnersOnline
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"
                : "bg-sky-400"
            }`}
          />
          <span>
            {bothPartnersOnline
              ? "Berdua Aktif Bersama 💖"
              : "Menunggu Pasangan Online"}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-50/80 dark:bg-pink-950/50 border border-pink-200/70 dark:border-pink-800/70 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-pink-300">
          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
          <span>{heartbeatCount} Detak Rindu</span>
        </div>
      </div>

      {/* Floating Realtime Toast Notification */}
      <div className="relative z-30 min-h-[44px] flex items-center justify-center mb-1">
        <AnimatePresence mode="wait">
          {activeToast ? (
            <motion.div
              key={activeToast.id}
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-pink-200 dark:border-purple-700 px-4 py-2 text-xs sm:text-sm font-semibold text-[#1E293B] dark:text-white shadow-pill"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FECDD3]/60 dark:bg-pink-900/60 text-rose-500 dark:text-pink-300">
                <Heart className="h-3 w-3 fill-rose-500 dark:fill-pink-400" />
              </span>
              <span>Pasanganmu sedang memikirkanmu ☁️💖</span>
            </motion.div>
          ) : (
            <motion.p
              key="idle-caption"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
            >
              <Cloud className="h-3.5 w-3.5 text-sky-400 dark:text-sky-300" />
              <span>Ketuk Cinnamoroll untuk mengirim gelombang rindu secara realtime</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Centerpiece Orb Stage with Multi-Layered Concentric Ripples */}
      <div className="relative my-4 flex min-h-[230px] items-center justify-center">
        {/* Soft Static Concentric Guide Rings */}
        <div className="pointer-events-none absolute h-44 w-44 rounded-full border border-[#BAE6FD]/45 dark:border-purple-800/40 bg-gradient-to-b from-[#BAE6FD]/15 to-[#FECDD3]/15 dark:from-purple-900/10 dark:to-pink-900/10" />
        <div className="pointer-events-none absolute h-60 w-60 rounded-full border border-[#FECDD3]/35 dark:border-purple-800/30" />

        {/* Realtime Triggered Multi-Layer Pastel Pink & Sky Blue Ripples */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <React.Fragment key={ripple.id}>
              {/* Tailwind animate-ping fast inner aura */}
              <motion.span
                initial={{ opacity: 0.65, scale: 0.75 }}
                animate={{ opacity: 0, scale: 1.9 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="pointer-events-none absolute h-40 w-40 rounded-full bg-[#BAE6FD]/45 animate-ping transform-gpu"
              />
              {/* Outer Sky Blue Concentric Wave */}
              <motion.div
                initial={{ opacity: 0.85, scale: 0.65 }}
                animate={{ opacity: 0, scale: 2.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.75, ease: "easeOut" }}
                className="pointer-events-none absolute h-44 w-44 rounded-full border-[3px] border-[#BAE6FD] shadow-[0_0_25px_rgba(186,230,253,0.75)] transform-gpu"
              />
              {/* Middle Pastel Pink Concentric Wave */}
              <motion.div
                initial={{ opacity: 0.85, scale: 0.6 }}
                animate={{ opacity: 0, scale: 2.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.65, delay: 0.16, ease: "easeOut" }}
                className="pointer-events-none absolute h-44 w-44 rounded-full border-[3px] border-[#FECDD3] shadow-[0_0_25px_rgba(254,205,211,0.8)] transform-gpu"
              />
              {/* Inner Soft Lavender Shimmer Wave */}
              <motion.div
                initial={{ opacity: 0.75, scale: 0.55 }}
                animate={{ opacity: 0, scale: 1.75 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, delay: 0.32, ease: "easeOut" }}
                className="pointer-events-none absolute h-44 w-44 rounded-full border-2 border-[#E9D5FF] bg-[#FECDD3]/10 transform-gpu"
              />
            </React.Fragment>
          ))}
        </AnimatePresence>

        {/* Character Stage: Duo Holding Glowing Red Heart if BOTH online, else Floating Cloud Cinnamoroll */}
        <div className="relative z-10 transform-gpu">
          <AnimatePresence mode="wait">
            {bothPartnersOnline ? (
              <motion.div
                key="couple-online"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="transform-gpu"
              >
                <CoupleTogetherBadge
                  userAName={userAName}
                  userBName={userBName}
                  userACharacter={userACharacter}
                  userBCharacter={userBCharacter}
                  externalBurstKey={characterBurstKey}
                  onTapHeart={handleHeartbeatClick}
                />
              </motion.div>
            ) : (
              <motion.div
                key="cinnamoroll-solo"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.35 }}
                className="transform-gpu"
              >
                <CinnamorollCharacter
                  size={182}
                  characterId={userACharacter}
                  showCloud
                  externalBurstKey={characterBurstKey}
                  onTapCharacter={handleHeartbeatClick}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Action Button & Sent Counter */}
      <div className="relative z-10 mt-2 flex flex-col items-center gap-2.5">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleHeartbeatClick}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#BAE6FD]/80 via-[#FECDD3]/80 to-[#E9D5FF]/80 dark:from-sky-900/80 dark:via-pink-900/80 dark:to-purple-900/80 px-6 py-2.5 text-sm font-bold text-[#1E293B] dark:text-white border border-pink-200 dark:border-purple-700 shadow-sm hover:shadow-md transition-all"
        >
          <Sparkles className="h-4 w-4 text-rose-500 dark:text-pink-400" />
          <span>Kirim Detak Rindu</span>
        </motion.button>

        {heartbeatCount > 0 && (
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {heartbeatCount} gelombang rindu terkirim di sesi ini ☁️
          </p>
        )}
      </div>
    </section>
  );
}
