"use client";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Palette,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { DOODLE_WORDS } from "@/lib/gameData";
import type {
  CoupleGamesState,
  CoupleProfile,
  StrokeSegment,
} from "@/lib/types";

export interface MiniDoodleCanvasHandle {
  drawRemoteSegment: (seg: StrokeSegment) => void;
  clearCanvas: () => void;
}

export interface DoodleGuessGameProps {
  profile: CoupleProfile;
  state: CoupleGamesState["doodle"];
  miniCanvasRef: React.RefObject<MiniDoodleCanvasHandle | null>;
  onUpdate: (
    updater: (prev: CoupleGamesState["doodle"]) => CoupleGamesState["doodle"]
  ) => void;
  onBroadcastStroke: (
    seg: Omit<StrokeSegment, "id" | "senderRole">
  ) => void;
  onClearMiniDoodle: () => void;
}

const MINI_COLORS = ["#334155", "#38BDF8", "#FB7185", "#A855F7", "#F59E0B"];

export function DoodleGuessGame({
  profile,
  state,
  miniCanvasRef,
  onUpdate,
  onBroadcastStroke,
  onClearMiniDoodle,
}: DoodleGuessGameProps) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<Array<Omit<StrokeSegment, "id" | "senderRole">>>([]);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState("#334155");
  const [guessInput, setGuessInput] = useState("");

  const currentItem = DOODLE_WORDS[state.wordIndex % DOODLE_WORDS.length];
  const isDrawer = profile.role === state.drawer;
  const drawerName =
    state.drawer === "user_a" ? profile.userAName : profile.userBName;
  const guesserName =
    state.drawer === "user_a" ? profile.userBName : profile.userAName;

  const maskedWord = currentItem.word
    .split("")
    .map((ch) => (ch === " " ? "   " : "_"))
    .join(" ");

  const renderSeg = useCallback(
    (seg: {
      prevX: number;
      prevY: number;
      x: number;
      y: number;
      color: string;
      strokeWidth: number;
    }) => {
      const canvas = canvasElRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = seg.strokeWidth;
      ctx.beginPath();
      ctx.moveTo(seg.prevX * rect.width, seg.prevY * rect.height);
      ctx.lineTo(seg.x * rect.width, seg.y * rect.height);
      ctx.stroke();
      ctx.restore();
    },
    []
  );

  const syncSize = useCallback(() => {
    const canvas = canvasElRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    historyRef.current.forEach((s) => renderSeg(s));
  }, [renderSeg]);

  useEffect(() => {
    syncSize();
    window.addEventListener("resize", syncSize);
    return () => window.removeEventListener("resize", syncSize);
  }, [syncSize]);

  const clearLocalCanvas = useCallback(() => {
    historyRef.current = [];
    const canvas = canvasElRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useImperativeHandle(
    miniCanvasRef,
    () => ({
      drawRemoteSegment(seg: StrokeSegment) {
        historyRef.current.push(seg);
        renderSeg(seg);
      },
      clearCanvas() {
        clearLocalCanvas();
      },
    }),
    [clearLocalCanvas, renderSeg]
  );

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || state.isSolved) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getCoords(e);
    lastPosRef.current = pos;

    const dot = {
      strokeId: `d_${Date.now()}`,
      prevX: pos.x,
      prevY: pos.y,
      x: pos.x + 0.001,
      y: pos.y + 0.001,
      color,
      strokeWidth: 4.5,
      isEraser: false,
    };
    historyRef.current.push(dot);
    renderSeg(dot);
    onBroadcastStroke(dot);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current || !lastPosRef.current) return;
    const pos = getCoords(e);
    const seg = {
      strokeId: "d_move",
      prevX: lastPosRef.current.x,
      prevY: lastPosRef.current.y,
      x: pos.x,
      y: pos.y,
      color,
      strokeWidth: 4.5,
      isEraser: false,
    };
    lastPosRef.current = pos;
    historyRef.current.push(seg);
    renderSeg(seg);
    onBroadcastStroke(seg);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const handleClear = () => {
    clearLocalCanvas();
    onClearMiniDoodle();
  };

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = guessInput.trim();
    if (!cleaned || state.isSolved) return;

    const normalizedGuess = cleaned.toUpperCase().replace(/\s+/g, " ");
    const isCorrect = normalizedGuess === currentItem.word;
    const myName =
      profile.role === "user_a" ? profile.userAName : profile.userBName;

    onUpdate((prev) => ({
      ...prev,
      isSolved: prev.isSolved || isCorrect,
      teamScore: isCorrect ? prev.teamScore + 10 : prev.teamScore,
      guesses: [
        ...prev.guesses.slice(-6),
        {
          id: `g_${Date.now()}`,
          senderRole: profile.role,
          senderName: myName,
          text: cleaned,
          isCorrect,
        },
      ],
    }));
    setGuessInput("");
  };

  const handleNextWordAndSwap = () => {
    clearLocalCanvas();
    onClearMiniDoodle();
    onUpdate((prev) => ({
      round: prev.round + 1,
      drawer: prev.drawer === "user_a" ? "user_b" : "user_a",
      wordIndex: (prev.wordIndex + 1) % DOODLE_WORDS.length,
      guesses: [],
      isSolved: false,
      teamScore: prev.teamScore,
    }));
  };

  return (
    <div className="rounded-3xl border border-pink-100 bg-white/90 backdrop-blur-md p-6 shadow-card space-y-4">
      {/* Header & Team Score */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-pink-100/70 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-500 dark:text-sky-400">
            Ronde #{state.round} • Pelukis: {drawerName}
          </span>
          <h3 className="text-base font-bold text-[#1E293B] dark:text-white">
            Tebak Gambar Pasangan 🎨
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#BAE6FD]/45 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800 px-3 py-1 text-xs font-bold text-[#1E293B] dark:text-white">
            Skor Kompak: {state.teamScore} poin
          </span>
          <button
            type="button"
            onClick={handleNextWordAndSwap}
            className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-pink-200 dark:hover:border-purple-600"
            title="Tukar giliran pelukis & kata baru"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Tukar Peran</span>
          </button>
        </div>
      </div>

      {/* Secret Word Banner (Drawer sees word, Guesser sees blanks & category) */}
      <div className="rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        {isDrawer ? (
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-rose-400" />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Kamu <strong>Pelukis</strong>! Gambar kata ini tanpa menulis huruf:{" "}
              <strong className="rounded-lg bg-[#FECDD3]/55 dark:bg-pink-950/80 px-2 py-0.5 text-[#1E293B] dark:text-pink-300 tracking-wider">
                {currentItem.word}
              </strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-sky-500" />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              <strong>{drawerName}</strong> sedang menggambar! Kategori:{" "}
              <strong className="text-slate-700 dark:text-white">{currentItem.category}</strong> •{" "}
              <span className="font-mono font-bold text-[#1E293B] dark:text-white">
                {state.isSolved ? currentItem.word : maskedWord}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Live Synced Mini Doodle Stage */}
      <div
        ref={wrapRef}
        className="relative h-56 w-full rounded-2xl border border-pink-100 dark:border-slate-700 sanrio-dotted-grid overflow-hidden"
      >
        <canvas
          ref={canvasElRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`block w-full h-full touch-none ${
            isDrawer && !state.isSolved ? "cursor-crosshair" : "cursor-default"
          }`}
        />

        {isDrawer && !state.isSolved && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-pink-100 dark:border-slate-700 px-3 py-1.5 shadow-sm">
            {MINI_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setColor(hex)}
                className={`h-5 w-5 rounded-full border ${
                  color === hex ? "scale-120 ring-2 ring-[#1E293B] dark:ring-purple-400" : "border-white"
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 text-slate-400 hover:text-rose-500 dark:hover:text-pink-400"
              title="Hapus gambar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Solved Banner OR Guess Chat Input */}
      {state.isSolved ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-center space-y-2"
        >
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Tebakan Benar! Jawabannya: {currentItem.word} 🎉
          </p>
          <div>
            <button
              type="button"
              onClick={handleNextWordAndSwap}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95"
            >
              <span>Lanjut &amp; Gantian Menggambar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmitGuess} className="flex items-center gap-2">
          <input
            type="text"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            placeholder={
              isDrawer
                ? `Menunggu ${guesserName} menebak (atau bantu tes ketik di sini)...`
                : `Ketik tebakanmu di sini, ${guesserName}...`
            }
            className="flex-1 rounded-full border border-pink-100 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 px-4 py-2.5 text-xs text-[#1E293B] dark:text-white placeholder:text-slate-400 focus:border-pink-300 dark:focus:border-purple-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!guessInput.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40 shadow-xs hover:opacity-95 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Tebak</span>
          </button>
        </form>
      )}

      {/* Recent Guesses Feed */}
      {state.guesses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {state.guesses.map((g) => (
            <span
              key={g.id}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                g.isCorrect
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              <strong>{g.senderName}:</strong> {g.text} {g.isCorrect ? "✅" : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
