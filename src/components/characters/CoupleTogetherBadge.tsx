"use client";

import React from "react";
import { motion } from "framer-motion";
import { CinnamorollCharacter } from "./CinnamorollCharacter";
import { MyMelodyCharacter } from "./MyMelodyCharacter";
import type { SanrioCharacterId } from "@/lib/sanrioCharacters";

export interface CoupleTogetherBadgeProps {
  userAName: string;
  userBName: string;
  userACharacter?: SanrioCharacterId;
  userBCharacter?: SanrioCharacterId;
  onTapHeart?: () => void;
  externalBurstKey?: number;
}

export function CoupleTogetherBadge({
  userAName,
  userBName,
  userACharacter = "cinnamoroll",
  userBCharacter = "my-melody",
  onTapHeart,
  externalBurstKey = 0,
}: CoupleTogetherBadgeProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        {/* Soft Ambient Duo Aura */}
        <div className="pointer-events-none absolute -inset-4 rounded-full bg-gradient-to-r from-[#BAE6FD]/35 via-[#FECDD3]/45 to-[#E9D5FF]/35 blur-2xl" />

        {/* Partner A Character on Left */}
        <div className="-mr-4 z-10">
          <CinnamorollCharacter
            size={128}
            characterId={userACharacter}
            showCloud={false}
            externalBurstKey={externalBurstKey}
            onTapCharacter={onTapHeart}
          />
        </div>

        {/* Center Glowing Red Heart Held Together */}
        <motion.button
          type="button"
          onClick={onTapHeart}
          aria-label="Kirim detak cinta bersama"
          animate={{
            scale: [1, 1.16, 1, 1.12, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.9,
            ease: "easeInOut",
          }}
          className="relative z-20 -mx-1 mt-3 flex h-14 w-14 items-center justify-center rounded-full focus:outline-none"
        >
          <span className="absolute inset-0 rounded-full bg-rose-400/50 blur-md animate-ping" />
          <span className="absolute -inset-1.5 rounded-full bg-rose-500/30 blur-lg" />
          <svg
            viewBox="0 0 36 36"
            className="relative h-11 w-11 drop-shadow-[0_0_16px_rgba(244,63,94,0.85)]"
            fill="none"
          >
            <path
              d="M18 31.5C18 31.5 5 23.2 5 13.4C5 8.6 8.8 5 13.3 5C15.9 5 17.3 6.3 18 7.8C18.7 6.3 20.1 5 22.7 5C27.2 5 31 8.6 31 13.4C31 23.2 18 31.5 18 31.5Z"
              fill="#F43F5E"
              stroke="#334155"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <ellipse
              cx="12.5"
              cy="11.5"
              rx="2.6"
              ry="1.5"
              transform="rotate(-25 12.5 11.5)"
              fill="#FFE4E6"
              opacity="0.85"
            />
          </svg>
        </motion.button>

        {/* Partner B Character on Right */}
        <div className="-ml-3 z-10">
          <MyMelodyCharacter
            size={122}
            characterId={userBCharacter}
            withEnvelope={false}
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-rose-50/95 border border-pink-200 px-3.5 py-1 text-xs font-semibold text-rose-600 shadow-sm"
      >
        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        <span>
          {userAName} &amp; {userBName} sedang online bersama
        </span>
      </motion.div>
    </div>
  );
}
