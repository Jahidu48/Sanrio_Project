"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  getSanrioCharacter,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";

export interface SanrioAvatarProps {
  characterId?: SanrioCharacterId | string | null;
  size?: number;
  animateMode?: "float" | "breathe" | "bounce" | "none";
  className?: string;
}

export function SanrioAvatar({
  characterId = "cinnamoroll",
  size = 56,
  animateMode = "none",
  className = "",
}: SanrioAvatarProps) {
  const meta = getSanrioCharacter(characterId);

  const imgEl = (
    <img
      src={meta.svgPath}
      alt={meta.name}
      width={size}
      height={size}
      draggable={false}
      className={`select-none object-contain pointer-events-none drop-shadow-[0_6px_12px_rgba(51,65,85,0.08)] ${className}`}
      style={{ width: size, height: size }}
    />
  );

  if (animateMode === "float") {
    return (
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="inline-flex items-center justify-center"
      >
        {imgEl}
      </motion.div>
    );
  }

  if (animateMode === "breathe") {
    return (
      <motion.div
        animate={{ scale: [1, 1.045, 1], rotate: [-2.5, 2.5, -2.5] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
        className="inline-flex items-center justify-center"
      >
        {imgEl}
      </motion.div>
    );
  }

  if (animateMode === "bounce") {
    return (
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        className="inline-flex items-center justify-center"
      >
        {imgEl}
      </motion.div>
    );
  }

  return imgEl;
}
