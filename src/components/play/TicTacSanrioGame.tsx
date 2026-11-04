"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Gift, RotateCcw, Trophy } from "lucide-react";
import { getSanrioCharacter } from "@/lib/sanrioCharacters";
import type { CoupleGamesState, CoupleProfile, PartnerRole } from "@/lib/types";

export interface TicTacSanrioGameProps {
  profile: CoupleProfile;
  state: CoupleGamesState["tictac"];
  onUpdate: (
    updater: (prev: CoupleGamesState["tictac"]) => CoupleGamesState["tictac"]
  ) => void;
}

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkBoardWinner(board: Array<PartnerRole | null>): {
  winner: PartnerRole | "draw" | null;
  line: number[] | null;
} {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: "draw", line: null };
  }
  return { winner: null, line: null };
}

function SanrioBoardToken({
  svgPath,
  alt,
  tilt = -12,
}: {
  svgPath: string;
  alt: string;
  tilt?: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0.3, rotate: tilt }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      className="flex items-center justify-center p-1.5"
    >
      <img
        src={svgPath}
        alt={alt}
        draggable={false}
        className="h-12 w-12 sm:h-14 sm:w-14 object-contain select-none pointer-events-none drop-shadow-sm"
      />
    </motion.div>
  );
}

export function TicTacSanrioGame({
  profile,
  state,
  onUpdate,
}: TicTacSanrioGameProps) {
  const [editingReward, setEditingReward] = useState(false);
  const [rewardDraft, setRewardDraft] = useState(state.rewardText);
  const [allowSoloBothSides, setAllowSoloBothSides] = useState(false);

  const charA = getSanrioCharacter(profile.userACharacter, "cinnamoroll");
  const charB = getSanrioCharacter(profile.userBCharacter, "my-melody");

  const isMyTurn = allowSoloBothSides || state.currentTurn === profile.role;
  const activeTurnName =
    state.currentTurn === "user_a" ? profile.userAName : profile.userBName;

  const handleCellClick = (index: number) => {
    if (state.winner || state.board[index] !== null || !isMyTurn) return;

    onUpdate((prev) => {
      if (prev.winner || prev.board[index] !== null) return prev;
      const actor = allowSoloBothSides ? prev.currentTurn : profile.role;
      if (actor !== prev.currentTurn) return prev;

      const nextBoard = [...prev.board];
      nextBoard[index] = actor;

      const { winner, line } = checkBoardWinner(nextBoard);
      return {
        ...prev,
        board: nextBoard,
        currentTurn: actor === "user_a" ? "user_b" : "user_a",
        winner,
        winningLine: line,
        scoreA: winner === "user_a" ? prev.scoreA + 1 : prev.scoreA,
        scoreB: winner === "user_b" ? prev.scoreB + 1 : prev.scoreB,
      };
    });
  };

  const handleResetBoard = () => {
    onUpdate((prev) => ({
      ...prev,
      board: Array(9).fill(null),
      winner: null,
      winningLine: null,
      currentTurn: prev.winner === "user_a" ? "user_b" : "user_a",
    }));
  };

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate((prev) => ({
      ...prev,
      rewardText: rewardDraft.trim() || "Yang menang boleh request 1 hal manis!",
    }));
    setEditingReward(false);
  };

  return (
    <div className="saas-glow-card p-6 space-y-5">
      <div className="pointer-events-none absolute -top-12 left-1/3 h-40 w-40 rounded-full bg-[#BAE6FD]/30 blur-3xl" />

      {/* Scoreboard Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#BAE6FD]/35 dark:bg-sky-950/40 px-3.5 py-2 border border-sky-200/70 dark:border-sky-800">
          <img
            src={charA.svgPath}
            alt={charA.name}
            className="h-8 w-8 object-contain"
          />
          <div>
            <p className="text-xs font-bold text-[#1E293B] dark:text-white">
              {profile.userAName}
            </p>
            <p className="text-[11px] text-sky-700 dark:text-sky-300 font-semibold">
              {state.scoreA} menang
            </p>
          </div>
        </div>

        <div className="text-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            VS
          </span>
          <p className="text-xs font-bold text-[#1E293B] dark:text-white">
            {state.winner
              ? "Permainan Selesai!"
              : `Giliran: ${activeTurnName}`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl bg-[#FECDD3]/40 dark:bg-pink-950/40 px-3.5 py-2 border border-pink-200/70 dark:border-pink-800">
          <img
            src={charB.svgPath}
            alt={charB.name}
            className="h-8 w-8 object-contain"
          />
          <div>
            <p className="text-xs font-bold text-[#1E293B] dark:text-white">
              {profile.userBName}
            </p>
            <p className="text-[11px] text-rose-600 dark:text-pink-300 font-semibold">
              {state.scoreB} menang
            </p>
          </div>
        </div>
      </div>

      {/* Sweet Winner Stake / Prize Box */}
      <div className="relative z-10 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-pink-100 dark:border-slate-700 p-3.5">
        {editingReward ? (
          <form onSubmit={handleSaveReward} className="flex items-center gap-2">
            <input
              type="text"
              value={rewardDraft}
              onChange={(e) => setRewardDraft(e.target.value)}
              placeholder="Tulis hadiah manis untuk pemenang..."
              className="flex-1 rounded-xl border border-pink-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-[#1E293B] dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-[#1E293B] dark:bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white"
            >
              Simpan
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#1E293B] dark:text-slate-200">
              <Gift className="h-4 w-4 text-rose-400 shrink-0" />
              <span>
                <strong>Hadiah Pemenang:</strong> {state.rewardText}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRewardDraft(state.rewardText);
                setEditingReward(true);
              }}
              className="text-[11px] font-semibold text-rose-500 dark:text-pink-400 hover:underline shrink-0"
            >
              Ubah
            </button>
          </div>
        )}
      </div>

      {/* 3x3 Sanrio Board */}
      <div className="relative z-10 mx-auto grid max-w-[290px] grid-cols-3 gap-2.5">
        {state.board.map((cell, idx) => {
          const isWinningCell = state.winningLine?.includes(idx) ?? false;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCellClick(idx)}
              disabled={Boolean(state.winner) || cell !== null || !isMyTurn}
              className={`flex aspect-square items-center justify-center rounded-2xl border-2 transition-all ${
                isWinningCell
                  ? "border-rose-400 bg-[#FECDD3]/40 dark:bg-pink-900/40 shadow-sm scale-105"
                  : cell
                  ? "border-pink-100 dark:border-slate-700 bg-white dark:bg-slate-800"
                  : isMyTurn
                  ? "border-slate-200/80 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800/80 hover:border-sky-300 dark:hover:border-purple-500 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                  : "border-slate-100 dark:border-slate-800 bg-[#F8FAFC]/60 dark:bg-slate-900/60 cursor-not-allowed"
              }`}
            >
              {cell === "user_a" && (
                <SanrioBoardToken
                  svgPath={charA.svgPath}
                  alt={charA.name}
                  tilt={-12}
                />
              )}
              {cell === "user_b" && (
                <SanrioBoardToken
                  svgPath={charB.svgPath}
                  alt={charB.name}
                  tilt={12}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Winner Celebration or Footer Controls */}
      {state.winner ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-[#BAE6FD]/35 via-[#FECDD3]/40 to-[#E9D5FF]/35 dark:from-slate-800 dark:via-purple-950/40 dark:to-slate-800 border border-pink-200 dark:border-slate-700 p-4 text-center space-y-2 shadow-sm"
        >
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-white">
            <Trophy className="h-4 w-4 text-amber-500" />
            {state.winner === "draw" ? (
              <span>Seri! Sama-sama jago 🤝</span>
            ) : (
              <span>
                Pemenang:{" "}
                {state.winner === "user_a"
                  ? `${profile.userAName} ☁️`
                  : `${profile.userBName} 🎀`}
                !
              </span>
            )}
          </div>
          {state.winner !== "draw" && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Saatnya klaim hadiah: <strong className="text-pink-600 dark:text-pink-300">{state.rewardText}</strong>
            </p>
          )}
          <button
            type="button"
            onClick={handleResetBoard}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Main Ronde Baru</span>
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
          <button
            type="button"
            onClick={() => setAllowSoloBothSides((v) => !v)}
            className="underline hover:text-slate-600"
          >
            {allowSoloBothSides
              ? "Mode 1 HP Berdua: Aktif"
              : "Main di 1 HP yang sama? Klik di sini"}
          </button>

          <button
            type="button"
            onClick={handleResetBoard}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-500"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Papan</span>
          </button>
        </div>
      )}
    </div>
  );
}
