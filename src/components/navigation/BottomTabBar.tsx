"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookHeart, Gamepad2, Heart, MessageCircleHeart } from "lucide-react";
import { useAudio } from "@/context/AudioContext";
import type { AppTab } from "@/lib/types";

export interface BottomTabBarProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  hasUnreadPrompt?: boolean;
  unreadChatCount?: number;
}

const TABS: Array<{
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
}> = [
  {
    id: "home",
    label: "Beranda",
    icon: Heart,
    accentBg: "bg-[#BAE6FD]/90 dark:bg-sky-900/80",
  },
  {
    id: "chat",
    label: "Obrolan",
    icon: MessageCircleHeart,
    accentBg: "bg-[#FECDD3]/90 dark:bg-rose-900/80",
  },
  {
    id: "playground",
    label: "Main",
    icon: Gamepad2,
    accentBg: "bg-amber-100/90 dark:bg-amber-900/70",
  },
  {
    id: "journal",
    label: "Jurnal",
    icon: BookHeart,
    accentBg: "bg-rose-100/90 dark:bg-[#3B2E40]",
  },
];

export function BottomTabBar({
  activeTab,
  onChangeTab,
  hasUnreadPrompt = false,
  unreadChatCount = 0,
}: BottomTabBarProps) {
  const { playPop } = useAudio();

  const handleTabClick = (tab: AppTab) => {
    playPop();
    onChangeTab(tab);
  };

  return (
    <nav
      aria-label="Navigasi Utama Mobile"
      className="fixed bottom-3.5 inset-x-0 z-40 flex justify-center px-3 lg:hidden pointer-events-none transform-gpu will-change-transform"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        transform: "translateZ(0)",
      }}
    >
      <div className="pointer-events-auto flex w-full max-w-lg items-center justify-between rounded-full bg-[#FFFDF9]/95 dark:bg-[#221B25]/95 border-2 border-[#F3D8DF] dark:border-[#3B2E40] p-1.5 shadow-pill">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === "playground" &&
              (activeTab === "canvas" || activeTab === "play"));

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className="relative flex-1 flex min-h-10 items-center justify-center gap-1.5 rounded-full py-2 px-1 text-xs font-semibold active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation cursor-pointer"
            >
              {isActive && (
                <motion.span
                  layoutId="sanrio-bottom-tab-pill"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                    mass: 0.8,
                  }}
                  className={`absolute inset-0 rounded-full ${tab.accentBg} border border-white/80 dark:border-[#4E3B4D] shadow-2xs`}
                />
              )}

              <span className="relative z-10 flex items-center gap-1 text-[#2D232E] dark:text-[#FAF5F7]">
                <Icon
                  className={`h-4 w-4 transition-transform duration-100 ${
                    isActive
                      ? "scale-110 text-[#2D232E] dark:text-white"
                      : "text-[#6E5A68] dark:text-[#B8A6B5]"
                  }`}
                />
                <span
                  className={`text-xs ${
                    isActive
                      ? "font-bold text-[#2D232E] dark:text-white"
                      : "text-[#6E5A68] dark:text-[#B8A6B5]"
                  }`}
                >
                  {tab.label}
                </span>

                {/* Prompt badge on Home */}
                {tab.id === "home" && hasUnreadPrompt && !isActive && (
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                )}

                {/* Unread badge on Chat */}
                {tab.id === "chat" && unreadChatCount > 0 && !isActive && (
                  <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadChatCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
