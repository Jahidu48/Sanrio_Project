"use client";

import React from "react";
import { motion } from "framer-motion";
import { SanrioCharacterSlot } from "./SanrioCharacterSlot";
import {
  getSanrioCharacter,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";

export interface MyMelodyCharacterProps {
  size?: number;
  imageSrc?: string;
  characterId?: SanrioCharacterId;
  /** Holds a cute sealed pastel pink love letter envelope */
  withEnvelope?: boolean;
  /** Gently swings/bobs when perched on top of the Journal header */
  swingLegs?: boolean;
  className?: string;
}

export function MyMelodyCharacter({
  size = 128,
  imageSrc,
  characterId = "my-melody",
  withEnvelope = false,
  swingLegs = false,
  className = "",
}: MyMelodyCharacterProps) {
  const meta = getSanrioCharacter(characterId, "my-melody");
  const resolvedSrc = imageSrc || meta.svgPath;

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      animate={{
        scale: [1, 1.04, 1],
        rotate: [-3, 3, -3],
        y: swingLegs ? [0, -3, 0, 2, 0] : 0,
      }}
      transition={{
        repeat: Infinity,
        duration: 2.5,
        ease: "easeInOut",
      }}
    >
      <SanrioCharacterSlot
        imageSrc={resolvedSrc}
        alt={meta.name}
        size={size}
        className="drop-shadow-[0_8px_16px_rgba(254,205,211,0.45)]"
      >
        <span />
      </SanrioCharacterSlot>

      {/* Cute Sealed Pastel Love Letter Badge Held in Front */}
      {withEnvelope && (
        <motion.div
          animate={{ y: [0, -2.5, 0], rotate: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-1.5 -right-1 z-20 drop-shadow-sm"
        >
          <svg width="44" height="32" viewBox="0 0 56 38" fill="none">
            <rect
              x="2"
              y="2"
              width="52"
              height="34"
              rx="7"
              fill="#FFF1F2"
              stroke="#334155"
              strokeWidth="2.6"
            />
            <path
              d="M5 5L28 21L51 5"
              stroke="#FDA4AF"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M28 26C28 26 20.5 21 20.5 16.5C20.5 14.2 22.4 12.5 24.6 12.5C26.1 12.5 27.3 13.3 28 14.5C28.7 13.3 29.9 12.5 31.4 12.5C33.6 12.5 35.5 14.2 35.5 16.5C35.5 21 28 26 28 26Z"
              fill="#FB7185"
              stroke="#334155"
              strokeWidth="2"
            />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}
