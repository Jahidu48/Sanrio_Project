"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Brush,
  Gamepad2,
  Grid3X3,
  HeartHandshake,
  Palette,
  Sparkles,
} from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import {
  CoopCanvasTab,
  type CoopCanvasHandle,
} from "@/components/canvas/CoopCanvasTab";
import { TelepathyGame } from "@/components/play/TelepathyGame";
import { TicTacSanrioGame } from "@/components/play/TicTacSanrioGame";
import {
  DoodleGuessGame,
  type MiniDoodleCanvasHandle,
} from "@/components/play/DoodleGuessGame";
import { TruthOrDareGame } from "@/components/play/TruthOrDareGame";
import type {
  ActiveGameId,
  CanvasStamp,
  CoupleGamesState,
  CoupleProfile,
  PartnerCursor,
  StrokeSegment,
} from "@/lib/types";

export type PlaygroundSubTab = "canvas" | ActiveGameId;

export interface PlaygroundTabProps {
  profile: CoupleProfile;
  gamesState: CoupleGamesState;
  onUpdateGamesState: (
    updater: (prev: CoupleGamesState) => CoupleGamesState
  ) => void;
  // Canvas props
  canvasRefHandle: React.RefObject<CoopCanvasHandle | null>;
  stamps: CanvasStamp[];
  partnerCursor: PartnerCursor | null;
  onBroadcastStroke: (seg: Omit<StrokeSegment, "id" | "senderRole">) => void;
  onPlaceStamp: (
    stamp: Omit<CanvasStamp, "id" | "senderRole" | "createdAt">
  ) => void;
  onClearCanvas: () => void;
  onBroadcastCursor: (x: number, y: number, color: string) => void;
  // Mini Doodle
  miniCanvasRef: React.RefObject<MiniDoodleCanvasHandle | null>;
  onBroadcastMiniStroke: (
    seg: Omit<StrokeSegment, "id" | "senderRole">
  ) => void;
  onClearMiniDoodle: () => void;
  onSendDareProof?: (type: "photo" | "voice" | "text", promptText: string) => void;
  onNavigateToChat?: () => void;
}

const SUB_TABS: Array<{
  id: PlaygroundSubTab;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
}> = [
  {
    id: "canvas",
    title: "Papan Gambar",
    badge: "Shared Canvas",
    icon: Palette,
    accentBg: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    id: "truthdare",
    title: "Truth / Dare",
    badge: "Kartu Rahasia",
    icon: Sparkles,
    accentBg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    id: "telepathy",
    title: "Telepati Cinta",
    badge: "1 Frekuensi",
    icon: HeartHandshake,
    accentBg: "bg-rose-100 text-rose-800 dark:bg-pink-950 dark:text-pink-300",
  },
  {
    id: "tictac",
    title: "Tic-Tac-Sanrio",
    badge: "Taruhan Manis",
    icon: Grid3X3,
    accentBg: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  },
  {
    id: "doodle",
    title: "Tebak Gambar",
    badge: "Live Doodle",
    icon: Brush,
    accentBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
];

export function PlaygroundTab({
  profile,
  gamesState,
  onUpdateGamesState,
  canvasRefHandle,
  stamps,
  partnerCursor,
  onBroadcastStroke,
  onPlaceStamp,
  onClearCanvas,
  onBroadcastCursor,
  miniCanvasRef,
  onBroadcastMiniStroke,
  onClearMiniDoodle,
  onSendDareProof,
  onNavigateToChat,
}: PlaygroundTabProps) {
  const { playPop } = useAudio();
  const [activeSubTab, setActiveSubTab] = useState<PlaygroundSubTab>(
    () => gamesState.activeSubTab || "canvas"
  );

  React.useEffect(() => {
    if (gamesState.activeSubTab) {
      setActiveSubTab(gamesState.activeSubTab);
    }
  }, [gamesState.activeSubTab]);

  const handleSwitchSubTab = (tabId: PlaygroundSubTab) => {
    playPop();
    setActiveSubTab(tabId);
    onUpdateGamesState((prev) => ({
      ...prev,
      activeSubTab: tabId,
      activeGame: tabId !== "canvas" ? tabId : prev.activeGame,
    }));
  };

  return (
    <div className="space-y-5">
      {/* Top Navigation Pill Bar */}
      <div className="rounded-[28px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-pink-100/80 dark:border-slate-800 p-2 sm:p-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSwitchSubTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-pink-500 to-rose-400 dark:from-purple-600 dark:to-pink-600 text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-pink-50/50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.title}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold hidden md:inline ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {tab.badge}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div>
        {activeSubTab === "canvas" && (
          <div className="max-w-5xl mx-auto">
            <CoopCanvasTab
              canvasRefHandle={canvasRefHandle}
              stamps={stamps}
              partnerCursor={partnerCursor}
              onBroadcastStroke={onBroadcastStroke}
              onPlaceStamp={onPlaceStamp}
              onClearCanvas={onClearCanvas}
              onBroadcastCursor={onBroadcastCursor}
            />
          </div>
        )}

        {activeSubTab === "truthdare" && (
          <div className="max-w-4xl mx-auto">
            <TruthOrDareGame
              profile={profile}
              state={gamesState.truthdare}
              onUpdate={(updater) =>
                onUpdateGamesState((prev) => ({
                  ...prev,
                  truthdare: updater(prev.truthdare),
                }))
              }
              onSendDareProof={onSendDareProof}
              onNavigateToChat={onNavigateToChat}
            />
          </div>
        )}

        {activeSubTab === "telepathy" && (
          <div className="max-w-4xl mx-auto">
            <TelepathyGame
              profile={profile}
              state={gamesState.telepathy}
              onUpdate={(updater) =>
                onUpdateGamesState((prev) => ({
                  ...prev,
                  telepathy: updater(prev.telepathy),
                }))
              }
            />
          </div>
        )}

        {activeSubTab === "tictac" && (
          <div className="max-w-4xl mx-auto">
            <TicTacSanrioGame
              profile={profile}
              state={gamesState.tictac}
              onUpdate={(updater) =>
                onUpdateGamesState((prev) => ({
                  ...prev,
                  tictac: updater(prev.tictac),
                }))
              }
            />
          </div>
        )}

        {activeSubTab === "doodle" && (
          <div className="max-w-4xl mx-auto">
            <DoodleGuessGame
              profile={profile}
              state={gamesState.doodle}
              miniCanvasRef={miniCanvasRef}
              onUpdate={(updater) =>
                onUpdateGamesState((prev) => ({
                  ...prev,
                  doodle: updater(prev.doodle),
                }))
              }
              onBroadcastStroke={onBroadcastMiniStroke}
              onClearMiniDoodle={onClearMiniDoodle}
            />
          </div>
        )}
      </div>
    </div>
  );
}
