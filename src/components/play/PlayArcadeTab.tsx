"use client";

import React from "react";
import { motion } from "framer-motion";
import { Brush, Grid3X3, HeartHandshake, Sparkles } from "lucide-react";
import { TelepathyGame } from "./TelepathyGame";
import { TicTacSanrioGame } from "./TicTacSanrioGame";
import {
  DoodleGuessGame,
  type MiniDoodleCanvasHandle,
} from "./DoodleGuessGame";
import { TruthOrDareGame } from "./TruthOrDareGame";
import type {
  ActiveGameId,
  CoupleGamesState,
  CoupleProfile,
  StrokeSegment,
} from "@/lib/types";

export interface PlayArcadeTabProps {
  profile: CoupleProfile;
  gamesState: CoupleGamesState;
  miniCanvasRef: React.RefObject<MiniDoodleCanvasHandle | null>;
  onUpdateGamesState: (
    updater: (prev: CoupleGamesState) => CoupleGamesState
  ) => void;
  onBroadcastMiniStroke: (
    seg: Omit<StrokeSegment, "id" | "senderRole">
  ) => void;
  onClearMiniDoodle: () => void;
  onSendDareProof?: (type: "photo" | "voice" | "text", promptText: string) => void;
  onNavigateToChat?: () => void;
}

const GAME_TABS: Array<{
  id: ActiveGameId;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBadge: string;
  glowClass: string;
  activeRing: string;
}> = [
  {
    id: "telepathy",
    title: "Telepati",
    badge: "Satu Frekuensi",
    icon: HeartHandshake,
    iconBadge: "bg-rose-100/90 text-rose-600",
    glowClass: "bg-rose-300/35",
    activeRing: "ring-2 ring-pink-300/80 border-pink-200",
  },
  {
    id: "tictac",
    title: "Tic-Tac-Sanrio",
    badge: "Taruhan Manis",
    icon: Grid3X3,
    iconBadge: "bg-sky-100/90 text-sky-700",
    glowClass: "bg-sky-300/35",
    activeRing: "ring-2 ring-sky-300/80 border-sky-200",
  },
  {
    id: "doodle",
    title: "Tebak Gambar",
    badge: "Live Doodle",
    icon: Brush,
    iconBadge: "bg-violet-100/90 text-violet-700",
    glowClass: "bg-purple-300/35",
    activeRing: "ring-2 ring-purple-300/80 border-purple-200",
  },
  {
    id: "truthdare",
    title: "Truth / Dare",
    badge: "Kartu Rahasia",
    icon: Sparkles,
    iconBadge: "bg-amber-100/90 text-amber-700",
    glowClass: "bg-amber-200/40",
    activeRing: "ring-2 ring-amber-300/80 border-amber-200",
  },
];

export function PlayArcadeTab({
  profile,
  gamesState,
  miniCanvasRef,
  onUpdateGamesState,
  onBroadcastMiniStroke,
  onClearMiniDoodle,
  onSendDareProof,
  onNavigateToChat,
}: PlayArcadeTabProps) {
  const selectGame = (gameId: ActiveGameId) => {
    onUpdateGamesState((prev) => ({ ...prev, activeGame: gameId }));
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Couple Arcade Selector Cards (SaaS Pastel Glow Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {GAME_TABS.map((g) => {
          const Icon = g.icon;
          const active = gamesState.activeGame === g.id;
          return (
            <motion.button
              key={g.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => selectGame(g.id)}
              className={`saas-glow-card flex flex-col items-start p-4 text-left ${
                active ? g.activeRing : ""
              }`}
            >
              <div
                className={`pointer-events-none absolute -right-4 -bottom-4 h-20 w-20 rounded-full blur-2xl transition-opacity ${
                  active ? "opacity-100" : "opacity-55"
                } ${g.glowClass}`}
              />
              <div className="relative z-10 flex w-full items-center justify-between mb-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl ${g.iconBadge}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {active && (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0284C7] animate-pulse" />
                )}
              </div>
              <span className="relative z-10 text-xs sm:text-sm font-bold leading-tight text-[#1E293B] dark:text-white">
                {g.title}
              </span>
              <span className="relative z-10 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {g.badge}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Active Game Stage */}
      {gamesState.activeGame === "telepathy" && (
        <TelepathyGame
          profile={profile}
          state={gamesState.telepathy}
          onUpdate={(subUpdater) =>
            onUpdateGamesState((prev) => ({
              ...prev,
              telepathy: subUpdater(prev.telepathy),
            }))
          }
        />
      )}

      {gamesState.activeGame === "tictac" && (
        <TicTacSanrioGame
          profile={profile}
          state={gamesState.tictac}
          onUpdate={(subUpdater) =>
            onUpdateGamesState((prev) => ({
              ...prev,
              tictac: subUpdater(prev.tictac),
            }))
          }
        />
      )}

      {/* Keep DoodleGuessGame mounted via CSS visibility so incoming strokes persist */}
      <div className={gamesState.activeGame === "doodle" ? "block" : "hidden"}>
        <DoodleGuessGame
          profile={profile}
          state={gamesState.doodle}
          miniCanvasRef={miniCanvasRef}
          onUpdate={(subUpdater) =>
            onUpdateGamesState((prev) => ({
              ...prev,
              doodle: subUpdater(prev.doodle),
            }))
          }
          onBroadcastStroke={onBroadcastMiniStroke}
          onClearMiniDoodle={onClearMiniDoodle}
        />
      </div>

      {gamesState.activeGame === "truthdare" && (
        <TruthOrDareGame
          profile={profile}
          state={gamesState.truthdare}
          onUpdate={(subUpdater) =>
            onUpdateGamesState((prev) => ({
              ...prev,
              truthdare: subUpdater(prev.truthdare),
            }))
          }
          onSendDareProof={onSendDareProof}
          onNavigateToChat={onNavigateToChat}
        />
      )}
    </div>
  );
}
