"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SanrioCharacterSlot } from "./SanrioCharacterSlot";
import {
  getSanrioCharacter,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";

interface FloatingHeart {
  id: number;
  x: number;
  delay: number;
  scale: number;
  color: string;
}

export interface CinnamorollCharacterProps {
  size?: number;
  imageSrc?: string;
  characterId?: SanrioCharacterId;
  showCloud?: boolean;
  /** Increment this counter externally (e.g. from Supabase Realtime) to trigger ear-flap & hearts */
  externalBurstKey?: number;
  onTapCharacter?: () => void;
  className?: string;
}

const HEART_COLORS = ["#FECDD3", "#BAE6FD", "#E9D5FF", "#FDA4AF"];

export function CinnamorollCharacter({
  size = 168,
  imageSrc,
  characterId = "cinnamoroll",
  showCloud = true,
  externalBurstKey = 0,
  onTapCharacter,
  className = "",
}: CinnamorollCharacterProps) {
  const [flapCount, setFlapCount] = useState(0);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const meta = getSanrioCharacter(characterId, "cinnamoroll");
  const resolvedSrc = imageSrc || meta.svgPath;

  const triggerJoyfulBounce = () => {
    setFlapCount((prev) => prev + 1);

    const now = Date.now();
    const spawned: FloatingHeart[] = Array.from({ length: 7 }).map((_, idx) => ({
      id: now + idx + Math.random(),
      x: (idx - 3) * 21 + (Math.random() * 10 - 5),
      delay: idx * 0.055,
      scale: 0.78 + Math.random() * 0.45,
      color: HEART_COLORS[idx % HEART_COLORS.length],
    }));

    setHearts((prev) => [...prev.slice(-12), ...spawned]);

    window.setTimeout(() => {
      setHearts((prev) =>
        prev.filter((h) => !spawned.some((s) => s.id === h.id))
      );
    }, 1800);
  };

  useEffect(() => {
    if (externalBurstKey > 0) {
      triggerJoyfulBounce();
    }
  }, [externalBurstKey]);

  const handleTap = () => {
    triggerJoyfulBounce();
    onTapCharacter?.();
  };

  const charImgSize = showCloud ? Math.round(size * 0.84) : size;

  return (
    <div
      className={`relative inline-flex items-center justify-center cursor-pointer touch-manipulation ${className}`}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      aria-label={`Ketuk ${meta.name} untuk mengirim detak rindu`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleTap();
        }
      }}
    >
      {/* Floating Pastel Hearts spawned on tap / partner ping */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-20">
        <AnimatePresence>
          {hearts.map((heart) => (
            <motion.svg
              key={heart.id}
              initial={{ opacity: 0, y: 4, x: heart.x * 0.4, scale: 0.3 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -96 - Math.abs(heart.x) * 0.35,
                x: heart.x,
                scale: heart.scale,
                rotate: heart.x > 0 ? 15 : -15,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.45, delay: heart.delay, ease: "easeOut" }}
              width="22"
              height="22"
              viewBox="0 0 24 24"
              className="absolute drop-shadow-sm"
            >
              <path
                d="M12 21s-7.5-4.65-9.5-9.1C.9 8.3 3.4 4.5 7.2 4.5c2.1 0 3.7 1.15 4.8 2.75 1.1-1.6 2.7-2.75 4.8-2.75 3.8 0 6.3 3.8 4.7 7.4C19.5 16.35 12 21 12 21z"
                fill={heart.color}
                stroke="#334155"
                strokeWidth="1.4"
              />
            </motion.svg>
          ))}
        </AnimatePresence>
      </div>

      {/* Continuous Gentle Floating Wrapper */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        whileTap={{ scale: 0.94 }}
        className="relative flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Pastel Fluffy Cloud Cushion Underneath */}
        {showCloud && (
          <svg
            viewBox="0 0 220 90"
            className="pointer-events-none absolute bottom-0 w-full h-[54%] drop-shadow-[0_10px_20px_rgba(186,230,253,0.5)]"
            fill="none"
          >
            <ellipse cx="110" cy="70" rx="76" ry="16" fill="#E0F2FE" />
            <path
              d="M42 66C29 66 20 57 23 45C25 34 36 29 48 31C55 19 72 14 86 21C95 11 115 10 127 19C140 12 159 17 166 30C179 29 192 38 192 50C192 61 180 68 166 68H42Z"
              fill="#FFFFFF"
              stroke="#BAE6FD"
              strokeWidth="3.2"
            />
            <ellipse cx="70" cy="52" rx="16" ry="5.5" fill="#F0F9FF" />
            <ellipse cx="148" cy="53" rx="18" ry="5.5" fill="#F0F9FF" />
          </svg>
        )}

        {/* Joyful Ear-Flap & Bounce Layer */}
        <motion.div
          key={flapCount}
          animate={
            flapCount > 0
              ? {
                  scaleX: [1, 1.12, 0.94, 1.05, 1],
                  scaleY: [1, 0.92, 1.1, 0.97, 1],
                  rotate: [0, -6, 6, -3, 0],
                  y: [0, -14, 2, -5, 0],
                }
              : undefined
          }
          transition={{ duration: 0.68, ease: "easeOut" }}
          className={showCloud ? "relative z-10 -mt-3" : "relative z-10"}
        >
          <SanrioCharacterSlot
            imageSrc={resolvedSrc}
            alt={meta.name}
            size={charImgSize}
            className="drop-shadow-[0_8px_16px_rgba(51,65,85,0.08)]"
          >
            <span />
          </SanrioCharacterSlot>
        </motion.div>
      </motion.div>
    </div>
  );
}
