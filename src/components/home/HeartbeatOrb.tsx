"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { CinnamorollCharacter } from "@/components/characters/CinnamorollCharacter";
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
  userACharacter = "cinnamoroll",
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
      className="scrapbook-card p-5 sm:p-6 gpu-layer"
      style={{ transform: "translateZ(0)", willChange: "transform" }}
    >
      {/* Top Row: Section Title & Heartbeat Counter */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-display text-base font-bold text-[#2D232E] dark:text-[#FAF5F7]">
            Detak Rindu
          </h3>
          <p className="text-xs text-[#6E5A68] dark:text-[#B8A6B5]">
            Ketuk karakter di tengah untuk mengirim getaran rindu ke HP pasanganmu
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-pink-300">
          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
          <span>{heartbeatCount} terkirim hari ini</span>
        </div>
      </div>

      {/* Live Toast Feedback */}
      <div className="relative z-30 min-h-[36px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {activeToast && (
            <motion.div
              key={activeToast.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
              className="inline-flex items-center gap-2 rounded-full bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#4E3B4D] px-4 py-1.5 text-xs font-semibold text-[#2D232E] dark:text-[#FAF5F7] shadow-sm"
            >
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              <span>{activeToast.senderName} baru saja mengirim detak rindu!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Centerpiece Ripple Stage */}
      <div className="relative my-2 flex min-h-[200px] items-center justify-center">
        {/* Soft Concentric Guide Circles */}
        <div className="pointer-events-none absolute h-40 w-40 rounded-full border border-dashed border-[#F3D8DF] dark:border-[#3B2E40] bg-[#FFFBF5] dark:bg-[#281F2C]" />
        <div className="pointer-events-none absolute h-56 w-56 rounded-full border border-dashed border-[#F3D8DF]/70 dark:border-[#3B2E40]/70" />

        {/* Triggered Pastel Ripples */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <React.Fragment key={ripple.id}>
              <motion.div
                initial={{ opacity: 0.85, scale: 0.65 }}
                animate={{ opacity: 0, scale: 2.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                className="pointer-events-none absolute h-40 w-40 rounded-full border-[3px] border-[#BAE6FD] transform-gpu"
              />
              <motion.div
                initial={{ opacity: 0.85, scale: 0.6 }}
                animate={{ opacity: 0, scale: 1.95 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, delay: 0.14, ease: "easeOut" }}
                className="pointer-events-none absolute h-40 w-40 rounded-full border-[3px] border-[#FECDD3] transform-gpu"
              />
            </React.Fragment>
          ))}
        </AnimatePresence>

        {/* Interactive Mascot Button */}
        <div className="relative z-10 transform-gpu">
          <CinnamorollCharacter
            size={168}
            characterId={userACharacter}
            showCloud
            externalBurstKey={characterBurstKey}
            onTapCharacter={handleHeartbeatClick}
          />
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="relative z-10 mt-2 flex flex-col items-center">
        <button
          type="button"
          onClick={handleHeartbeatClick}
          className="inline-flex items-center gap-2 rounded-full bg-rose-500 hover:bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Heart className="h-4 w-4 fill-white" />
          <span>Kirim Detak Rindu</span>
        </button>
      </div>
    </section>
  );
}
