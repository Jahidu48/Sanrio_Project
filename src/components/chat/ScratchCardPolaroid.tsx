"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Eye, CheckCircle2 } from "lucide-react";
import { useAudio } from "@/context/AudioContext";

export interface ScratchCardPolaroidProps {
  imageSrc: string;
  caption?: string;
  timestamp?: string;
  onFullyRevealed?: () => void;
  className?: string;
}

export function ScratchCardPolaroid({
  imageSrc,
  caption,
  timestamp,
  onFullyRevealed,
  className = "",
}: ScratchCardPolaroidProps) {
  const { playPop, playSuccess } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const isDrawingRef = useRef(false);

  // Initialize Canvas Scratch Layer
  useEffect(() => {
    if (isRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Size canvas to container
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 280;
    const height = rect.height || 280;
    canvas.width = width;
    canvas.height = height;

    // Draw foil shimmer background
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#FBCFE8"); // soft pink
    grad.addColorStop(0.5, "#E0E7FF"); // soft lavender
    grad.addColorStop(1, "#FECDD3"); // pastel rose
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Overlay soft polka dots pattern
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    for (let x = 12; x < width; x += 22) {
      for (let y = 12; y < height; y += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Text instructions
    ctx.fillStyle = "#831843"; // deep berry
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🪙 GOSOK DI SINI 🪙", width / 2, height / 2 - 12);

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#9D174D";
    ctx.fillText("Kartu Rahasia Pasanganmu 💖", width / 2, height / 2 + 10);
  }, [isRevealed]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isRevealed) return;
    isDrawingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    scratch(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    checkScratchProgress();
  };

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isRevealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    scratch(e);
  };

  const checkScratchProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let transparentCount = 0;
      const totalPixels = data.length / 4;

      // Sample every 8th pixel for speed
      for (let i = 3; i < data.length; i += 32) {
        if (data[i] === 0) {
          transparentCount += 8;
        }
      }

      const percent = Math.min(100, Math.round((transparentCount / totalPixels) * 100));
      setScratchPercent(percent);

      if (percent >= 38) {
        // Automatically uncover completely
        playSuccess();
        setIsRevealed(true);
        onFullyRevealed?.();
      }
    } catch {
      // ignore
    }
  };

  const handleRevealAll = () => {
    playSuccess();
    setIsRevealed(true);
    onFullyRevealed?.();
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full max-w-[280px] p-3 pb-4 rounded-2xl bg-white dark:bg-slate-800 border border-pink-200/80 dark:border-slate-700 shadow-md hover:shadow-lg transition-transform duration-300 hover:rotate-0 -rotate-1 ${className}`}
    >
      {/* Polaroid Image Area */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-pink-100 dark:border-slate-700 select-none">
        <img
          src={imageSrc}
          alt={caption || "Foto Kartu Gosok"}
          className="h-full w-full object-cover object-center pointer-events-none"
        />

        {/* Scratch Canvas Overlay */}
        <AnimatePresence>
          {!isRevealed && (
            <motion.canvas
              ref={canvasRef}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing touch-none"
              title="Gosok layar untuk melihat foto rahasia!"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Polaroid Handwritten Caption & Reveal Button */}
      <div className="mt-2.5 flex items-center justify-between gap-1.5 px-0.5">
        <div className="min-w-0 flex-1">
          {caption && (
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {caption}
            </p>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {timestamp || "Kartu Gosok Sanrio"} •{" "}
            {isRevealed ? (
              <span className="text-emerald-500 font-bold">Terbuka ✨</span>
            ) : (
              <span className="text-pink-500 font-bold">
                {scratchPercent}% Tergosok
              </span>
            )}
          </p>
        </div>

        {!isRevealed && (
          <button
            type="button"
            onClick={handleRevealAll}
            className="rounded-full bg-pink-100 dark:bg-slate-700 p-1.5 text-pink-600 dark:text-pink-300 hover:bg-pink-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            title="Buka langsung tanpa gosok"
          >
            <Eye className="h-3 w-3" />
            <span>Buka</span>
          </button>
        )}
      </div>
    </div>
  );
}
