"use client";

import React, { useState } from "react";
import {
  Brush,
  Grid3X3,
  Heart,
  HeartHandshake,
  Palette,
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
  canvasRefHandle: React.RefObject<CoopCanvasHandle | null>;
  stamps: CanvasStamp[];
  partnerCursor: PartnerCursor | null;
  onBroadcastStroke: (seg: Omit<StrokeSegment, "id" | "senderRole">) => void;
  onPlaceStamp: (
    stamp: Omit<CanvasStamp, "id" | "senderRole" | "createdAt">
  ) => void;
  onClearCanvas: () => void;
  onBroadcastCursor: (x: number, y: number, color: string) => void;
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
}> = [
  {
    id: "canvas",
    title: "Papan Gambar",
    badge: "Kanvas",
    icon: Palette,
  },
  {
    id: "truthdare",
    title: "Jujur / Tantangan",
    badge: "Kartu",
    icon: Heart,
  },
  {
    id: "telepathy",
    title: "Uji Telepati",
    badge: "Sehati",
    icon: HeartHandshake,
  },
  {
    id: "tictac",
    title: "Tic-Tac-Sanrio",
    badge: "3 Baris",
    icon: Grid3X3,
  },
  {
    id: "doodle",
    title: "Tebak Gambar",
    badge: "Kuis",
    icon: Brush,
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
      <div className="rounded-3xl bg-[#FFFDF9] dark:bg-[#221B25] border-2 border-[#F3D8DF] dark:border-[#3B2E40] p-2 sm:p-2.5 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSwitchSubTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-rose-500 text-white shadow-2xs"
                    : "bg-[#FFF5F7] dark:bg-[#2E2433] border border-[#F3D8DF] dark:border-[#3B2E40] text-[#2D232E] dark:text-[#FAF5F7] hover:border-rose-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.title}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold hidden md:inline ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white dark:bg-[#221B25] text-[#6E5A68] dark:text-[#B8A6B5]"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
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
