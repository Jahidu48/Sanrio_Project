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
    label: "Home",
    icon: Heart,
    accentBg: "bg-[#BAE6FD]/85 dark:bg-sky-900/80",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircleHeart,
    accentBg: "bg-[#FECDD3]/85 dark:bg-pink-900/80",
  },
  {
    id: "playground",
    label: "Playground",
    icon: Gamepad2,
    accentBg: "bg-amber-100/90 dark:bg-amber-950/80",
  },
  {
    id: "journal",
    label: "Journal",
    icon: BookHeart,
    accentBg: "bg-[#E9D5FF]/85 dark:bg-purple-900/80",
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
      <div className="pointer-events-auto flex w-full max-w-lg items-center justify-between rounded-full bg-white/92 dark:bg-slate-900/92 backdrop-blur-md border border-pink-100 dark:border-slate-800 p-1.5 shadow-pill">
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
              className="relative flex-1 flex items-center justify-center gap-1 rounded-full py-2 px-1 text-xs font-semibold active:scale-[0.96] transition-transform duration-100 ease-out select-none touch-manipulation focus:outline-none cursor-pointer"
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
                  className={`absolute inset-0 rounded-full ${tab.accentBg} border border-white/80 dark:border-slate-700 shadow-sm`}
                />
              )}

              <span className="relative z-10 flex items-center gap-1 text-[#1E293B] dark:text-white">
                <Icon
                  className={`h-4 w-4 transition-transform duration-100 ${
                    isActive
                      ? "scale-110 text-[#1E293B] dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span
                  className={`text-[11px] ${
                    isActive
                      ? "font-bold text-[#1E293B] dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {tab.label}
                </span>

                {/* Prompt badge on Home */}
                {tab.id === "home" && hasUnreadPrompt && !isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                )}

                {/* Unread badge on Chat */}
                {tab.id === "chat" && unreadChatCount > 0 && !isActive && (
                  <span className="flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
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
