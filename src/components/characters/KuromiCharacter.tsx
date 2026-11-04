"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SanrioCharacterSlot } from "./SanrioCharacterSlot";
import {
  getSanrioCharacter,
  type SanrioCharacterId,
} from "@/lib/sanrioCharacters";

interface KuromiSparkle {
  id: number;
  x: number;
  y: number;
  kind: "heart" | "skull" | "star";
  delay: number;
}

export interface KuromiCharacterProps {
  size?: number;
  imageSrc?: string;
  characterId?: SanrioCharacterId;
  /** Increment when an action completes (e.g. note created, wishlist checked, game won) */
  celebrateKey?: number;
  /** Gently bobs when sitting atop the Journal header */
  swingLegs?: boolean;
  className?: string;
}

export function KuromiCharacter({
  size = 128,
  imageSrc,
  characterId = "kuromi",
  celebrateKey = 0,
  swingLegs = false,
  className = "",
}: KuromiCharacterProps) {
  const [winkPulse, setWinkPulse] = useState(0);
  const [sparkles, setSparkles] = useState<KuromiSparkle[]>([]);
  const meta = getSanrioCharacter(characterId, "kuromi");
  const resolvedSrc = imageSrc || meta.svgPath;

  const triggerPlayfulSparkles = () => {
    setWinkPulse((prev) => prev + 1);
    const now = Date.now();
    const kinds: Array<"heart" | "skull" | "star"> = [
      "heart",
      "skull",
      "star",
      "heart",
      "skull",
    ];
    const nextSparkles: KuromiSparkle[] = kinds.map((kind, idx) => ({
      id: now + idx + Math.random(),
      x: (idx - 2) * 26,
      y: -36 - (idx % 2) * 18,
      kind,
      delay: idx * 0.07,
    }));

    setSparkles((prev) => [...prev.slice(-8), ...nextSparkles]);

    window.setTimeout(() => {
      setSparkles((prev) =>
        prev.filter((sp) => !nextSparkles.some((n) => n.id === sp.id))
      );
    }, 1900);
  };

  useEffect(() => {
    if (celebrateKey > 0) {
      triggerPlayfulSparkles();
    }
  }, [celebrateKey]);

  return (
    <div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      onClick={triggerPlayfulSparkles}
      role="button"
      tabIndex={0}
      aria-label={meta.name}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerPlayfulSparkles();
        }
      }}
    >
      {/* Floating Purple Skull & Heart Sparkles */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-20">
        <AnimatePresence>
          {sparkles.map((sp) => (
            <motion.div
              key={sp.id}
              initial={{ opacity: 0, scale: 0.3, x: sp.x * 0.4, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.4, 1.12, 0.95],
                x: sp.x,
                y: sp.y - 26,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, delay: sp.delay, ease: "easeOut" }}
              className="absolute"
            >
              {sp.kind === "heart" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 20.5s-7-4.35-8.9-8.5C1.6 8.6 3.9 5 7.5 5c1.9 0 3.5 1.05 4.5 2.55C13 6.05 14.6 5 16.5 5c3.6 0 5.9 3.6 4.4 7-1.9 4.15-8.9 8.5-8.9 8.5z"
                    fill="#E9D5FF"
                    stroke="#7E22CE"
                    strokeWidth="1.6"
                  />
                </svg>
              )}
              {sp.kind === "skull" && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <ellipse
                    cx="12"
                    cy="11"
                    rx="7.5"
                    ry="6.5"
                    fill="#F3E8FF"
                    stroke="#7E22CE"
                    strokeWidth="1.6"
                  />
                  <rect
                    x="8.5"
                    y="15"
                    width="7"
                    height="4"
                    rx="1.5"
                    fill="#F3E8FF"
                    stroke="#7E22CE"
                    strokeWidth="1.5"
                  />
                  <circle cx="9.6" cy="11" r="1.4" fill="#7E22CE" />
                  <circle cx="14.4" cy="11" r="1.4" fill="#7E22CE" />
                </svg>
              )}
              {sp.kind === "star" && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z"
                    fill="#C084FC"
                  />
                </svg>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Energetic Playful Bounce + Wink Tilt */}
      <motion.div
        animate={{
          y: swingLegs ? [0, -6, 0, -2, 0] : [0, -5, 0],
        }}
        transition={{ repeat: Infinity, duration: 1.75, ease: "easeInOut" }}
        whileTap={{ scale: 0.93 }}
      >
        <motion.div
          key={winkPulse}
          animate={
            winkPulse > 0
              ? {
                  rotate: [0, -9, 9, -4, 0],
                  scale: [1, 1.09, 0.96, 1.03, 1],
                }
              : undefined
          }
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <SanrioCharacterSlot
            imageSrc={resolvedSrc}
            alt={meta.name}
            size={size}
            className="drop-shadow-[0_8px_16px_rgba(233,213,255,0.55)]"
          >
            <span />
          </SanrioCharacterSlot>
        </motion.div>
      </motion.div>
    </div>
  );
}
