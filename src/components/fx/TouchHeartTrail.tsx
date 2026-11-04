"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface TrailParticle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  size: number;
  rotation: number;
  driftX: number;
  color?: string;
}

const TRAIL_EMOJIS = ["💖", "✨", "⭐", "🌸", "☁️", "💕", "🎀"];

export function TouchHeartTrail() {
  const [particles, setParticles] = useState<TrailParticle[]>([]);

  useEffect(() => {
    let lastMoveTime = 0;

    const spawnParticle = (clientX: number, clientY: number, count = 1) => {
      const now = Date.now();
      const newItems: TrailParticle[] = [];

      for (let i = 0; i < count; i++) {
        const id = now + Math.random() + i;
        const emoji =
          TRAIL_EMOJIS[Math.floor(Math.random() * TRAIL_EMOJIS.length)];
        const size = Math.floor(Math.random() * 8) + 14; // 14px - 22px
        const rotation = (Math.random() - 0.5) * 45;
        const driftX = (Math.random() - 0.5) * 36;

        newItems.push({
          id,
          x: clientX,
          y: clientY,
          emoji,
          size,
          rotation,
          driftX,
        });
      }

      setParticles((prev) => [...prev.slice(-24), ...newItems]);

      // Auto prune after animation completes
      setTimeout(() => {
        setParticles((prev) =>
          prev.filter((p) => !newItems.some((n) => n.id === p.id))
        );
      }, 950);
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Tap/click spawns 2 cute particles
      spawnParticle(e.clientX, e.clientY, 2);
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Only spawn on drag or move when button is pressed (or mobile touch drag)
      if (e.pointerType === "touch") return; if (e.buttons === 0 && e.pointerType === "mouse") return;
      const now = performance.now();
      if (now - lastMoveTime < 45) return; // throttle 45ms
      lastMoveTime = now;

      spawnParticle(e.clientX, e.clientY, 1);
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden select-none"
      aria-hidden="true"
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              opacity: 0.95,
              scale: 0.6,
              x: p.x - p.size / 2,
              y: p.y - p.size / 2,
              rotate: 0,
            }}
            animate={{
              opacity: 0,
              scale: 1.15,
              x: p.x + p.driftX,
              y: p.y - 48,
              rotate: p.rotation,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.85,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              fontSize: `${p.size}px`,
              lineHeight: 1,
              filter: "drop-shadow(0 2px 6px rgba(244,114,182,0.45))",
            }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
